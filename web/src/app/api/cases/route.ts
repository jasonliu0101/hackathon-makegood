import { draftAgreement } from "@/lib/draft";
import { gmiModel } from "@/lib/gmi";
import { listCases, newId, putCase } from "@/lib/store";
import {
  MAX_AMOUNT_USD,
  REVIEW_CHECKLIST,
  TEMPLATE,
  feeFor,
  type CaseFile,
  type Intake,
} from "@/lib/types";

export async function GET() {
  return Response.json({ cases: await listCases() });
}

export async function POST(req: Request) {
  let body: Partial<Intake> & { draftOn?: string };
  try {
    body = (await req.json()) as Partial<Intake> & { draftOn?: string };
  } catch {
    return Response.json({ error: "Send the form as JSON." }, { status: 400 });
  }

  const intake: Intake = {
    story: String(body.story ?? "").slice(0, 4000),
    amountUsd: Math.round(Number(body.amountUsd ?? 0) * 100) / 100,
    remedy: body.remedy === "repair" || body.remedy === "replacement" ? body.remedy : "payment",
    dueBy: String(body.dueBy ?? ""),
    incidentDate: String(body.incidentDate ?? ""),
    location: String(body.location ?? "").slice(0, 200),
    responsibleName: String(body.responsibleName ?? "").slice(0, 80),
    responsibleEmail: String(body.responsibleEmail ?? "").slice(0, 120),
    affectedName: String(body.affectedName ?? "").slice(0, 80),
    affectedEmail: String(body.affectedEmail ?? "").slice(0, 120),
    outOfScope: Array.isArray(body.outOfScope) ? body.outOfScope.map(String) : [],
  };

  const missing = (["story", "dueBy", "incidentDate", "responsibleName", "responsibleEmail", "affectedName", "affectedEmail"] as const).filter(
    (k) => !intake[k].trim(),
  );
  if (missing.length) return Response.json({ error: `Missing: ${missing.join(", ")}` }, { status: 400 });
  if (!(intake.amountUsd >= 1)) return Response.json({ error: "Enter the amount in dollars." }, { status: 400 });

  const where = body.draftOn === "gmi" && gmiModel() ? "gmi" : "claude";
  const { agreement, by, model } = await draftAgreement(intake, where);
  // The parties' own answers decide the referral. A model's opinion only flags it for the human reviewer.
  const outOfScope = intake.outOfScope.length > 0 || intake.amountUsd > MAX_AMOUNT_USD;
  if (!outOfScope && agreement.needsAttorney) agreement.flags.push("The drafting model thinks this may need an attorney: check scope.");

  const c: CaseFile = {
    id: newId(),
    createdAt: new Date().toISOString(),
    stage: outOfScope ? "escalated" : "drafted",
    responsible: { name: intake.responsibleName, email: intake.responsibleEmail },
    affected: { name: intake.affectedName, email: intake.affectedEmail },
    agreement,
    draftedBy: by,
    draftModel: model,
    checklist: REVIEW_CHECKLIST.map((x) => ({ ...x, done: false })),
    hold: { amountUsd: intake.amountUsd, feeUsd: feeFor(intake.amountUsd) },
    intake,
    events: [
      {
        at: new Date().toISOString(),
        who: "MakeGood",
        text: outOfScope
          ? "This one is outside what a non-lawyer may handle. Referred to a licensed attorney."
          : `Template ${TEMPLATE.id} v${TEMPLATE.version} filled ${by === "claude" ? "by Claude" : by === "gmi" ? `on our own model at GMI Cloud (${model})` : "with the parties' words"}. Waiting for a reviewer.`,
      },
    ],
  };
  await putCase(c);
  return Response.json({ case: c }, { status: 201 });
}
