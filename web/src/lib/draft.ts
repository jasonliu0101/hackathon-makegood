import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { AgreementSchema, type Agreement, type Intake } from "./types";

const SYSTEM = `You are the drafting engine of MakeGood, a neutral settlement service for small everyday property-damage disputes between two private people (US$50-2,000).

You work as a scrivener, not a lawyer:
- Use ONLY the facts, amount, remedy and deadline the parties typed. Never suggest a different amount, never judge who is at fault beyond what the responsible party has accepted, never advise either side on strategy, rights or options.
- Write in neutral, plain English that both parties can sign. No legalese where a plain word works.
- The agreement is a settlement and mutual release scoped to THIS incident only. The release takes effect only when the payment is confirmed or the repair/replacement is confirmed done.
- Money moves through a payment hold: the responsible party pays into the hold when both have signed; it is released to the affected party when they confirm, or automatically 7 days after the due date if they say nothing; if the responsible party does not fulfil the obligation by the due date the affected party keeps all their rights.
- title: just the place, 2-5 words, e.g. "Dunhua South Road".
- clauses: 5-7 short clauses (Parties, What happened, What will be done, Payment hold, Release, If it goes wrong, Signatures). Each body 1-3 sentences.
- plainEnglish: 3-5 sentences a teenager would understand, in second person to both parties ("Alex pays...").
- flags: concrete gaps a checklist reviewer should look at (missing evidence, vague location, deadline in the past, amount with no quote). Do NOT write advice. Empty array if none.
- needsAttorney: true if the story mentions injury, an insurer, a minor, a landlord/tenant relationship, threats, criminal conduct, or anything over $2,000.
- Dates as ISO yyyy-mm-dd.
- Never print email addresses in the agreement; refer to each party by name ("verified by email").`;

export async function draftAgreement(intake: Intake): Promise<{ agreement: Agreement; by: "claude" | "template" }> {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return { agreement: templateDraft(intake), by: "template" };
  }
  try {
    const client = new Anthropic();
    const res = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      output_config: { effort: "low", format: betaZodOutputFormat(AgreementSchema) },
      // On a policy decline the API re-runs the request on a fallback model in the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [{ role: "user", content: `Parties' own words, as JSON:\n${JSON.stringify(intake, null, 2)}` }],
    });
    if (res.stop_reason === "refusal" || !res.parsed_output) {
      return { agreement: templateDraft(intake), by: "template" };
    }
    // The parties' own numbers always win over anything the model wrote.
    const a = res.parsed_output;
    return {
      agreement: { ...a, amountUsd: intake.amountUsd, remedy: intake.remedy },
      by: "claude",
    };
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error(`[draft] Claude API ${err.status}: ${err.message}; using template`);
    } else {
      console.error("[draft] unexpected error; using template", err);
    }
    return { agreement: templateDraft(intake), by: "template" };
  }
}

const usd = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const longDate = (d: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : d;

/** Deterministic fallback so the demo works with no API key. Same shape as Claude's output. */
export function templateDraft(i: Intake): Agreement {
  const R = i.responsibleName || "The responsible party";
  const A = i.affectedName || "The affected party";
  const what =
    i.remedy === "payment"
      ? `pay ${A} ${usd(i.amountUsd)}`
      : i.remedy === "repair"
        ? `have the damage repaired, up to ${usd(i.amountUsd)}, by a repairer ${A} agrees to`
        : `replace the damaged item with an equivalent one worth up to ${usd(i.amountUsd)}`;
  const story = i.story.trim().replace(/\s+/g, " ");
  const place = i.location.split(",")[0].trim();
  const due = longDate(i.dueBy);
  const flags: string[] = [];
  if (i.amountUsd >= 300) flags.push("Amount is $300 or more: check there is a written quote or receipt.");
  if (!i.location.trim()) flags.push("Location of the incident is empty.");
  if (story.length < 60) flags.push("The description is short: check both sides would recognise it.");
  if (i.dueBy && i.dueBy < new Date().toISOString().slice(0, 10)) flags.push("The due date is in the past.");
  return {
    title: place || "Settlement",
    summary: `${R} will ${what} by ${due}. When that is confirmed, both sides release each other from claims about this incident.`,
    incident: { date: i.incidentDate, location: i.location, description: story },
    remedy: i.remedy,
    amountUsd: i.amountUsd,
    obligations: [
      { party: "responsible", action: `${R} pays ${usd(i.amountUsd)} into the MakeGood payment hold after both parties sign.`, dueBy: i.dueBy },
      ...(i.remedy !== "payment"
        ? [{ party: "responsible" as const, action: `${R} arranges the ${i.remedy}; the held money pays for it.`, dueBy: i.dueBy }]
        : []),
      { party: "affected", action: `${A} confirms in MakeGood once the ${i.remedy === "payment" ? "money has arrived" : i.remedy + " is done"}.`, dueBy: i.dueBy },
    ],
    releaseCondition: `Released to ${A} when ${A} confirms, or automatically 7 days after ${due} if ${A} raises no problem.`,
    clauses: [
      { heading: "Parties", body: `${R} and ${A}, each verified by email.` },
      { heading: "What happened", body: `On ${longDate(i.incidentDate)} at ${i.location || "the place described"}: ${story}` },
      { heading: "What will be done", body: `${R} will ${what} no later than ${due}.` },
      {
        heading: "Payment hold",
        body: `${R} pays ${usd(i.amountUsd)} into a payment hold processed by our payment provider. It is paid out to ${A} on confirmation, or automatically 7 days after the due date unless ${A} reports a problem.`,
      },
      {
        heading: "Release",
        body: `When the money is released, each party gives up any claim against the other about this incident only. Nothing else is released.`,
      },
      {
        heading: "If it goes wrong",
        body: `If the obligation is not met by ${due}, the release never takes effect, any held money is refunded, and ${A} keeps every right they had before signing.`,
      },
      { heading: "Signatures", body: `Both parties sign electronically. Each receives a copy of the signed agreement by email.` },
    ],
    plainEnglish: [
      `${R} agrees to ${what} by ${due}.`,
      `The money waits in a hold, so ${A} knows it is really there.`,
      `When ${A} says it is done, the money is released and the matter is closed for both of you.`,
      `If it is not done, nobody gives anything up.`,
    ],
    flags,
    needsAttorney: i.outOfScope.length > 0 || i.amountUsd > 2000,
  };
}
