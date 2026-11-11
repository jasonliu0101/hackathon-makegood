import { AUTO_RELEASE_DAYS, NOTARY, type CaseFile } from "./types";

export type CaseAction =
  | { type: "claim"; reviewer: string; credential: string }
  | { type: "check"; id: string; done: boolean }
  | { type: "approve"; notes?: string }
  | { type: "request_changes"; notes: string }
  | { type: "escalate"; notes: string }
  | { type: "sign"; party: "responsible" | "affected" }
  | { type: "fund" }
  | { type: "confirm" }
  | { type: "dispute"; notes: string }
  | { type: "notary_request"; party: "responsible" | "affected" }
  | { type: "notarize" };

const now = () => new Date().toISOString();

/** The case state machine. Returns an error string when the action is not allowed. */
export function applyAction(c: CaseFile, a: CaseAction): string | null {
  const log = (who: string, text: string) => c.events.push({ at: now(), who, text });
  switch (a.type) {
    case "claim":
      if (c.stage !== "drafted" && c.stage !== "changes_requested") return "This case is not waiting for a reviewer.";
      c.reviewer = { name: a.reviewer, credential: a.credential, claimedAt: now() };
      c.stage = "in_review";
      log(a.reviewer, "Picked up the review.");
      return null;
    case "check": {
      if (c.stage !== "in_review") return "Only a case in review can be checked.";
      const item = c.checklist.find((x) => x.id === a.id);
      if (!item) return "Unknown checklist item.";
      item.done = a.done;
      return null;
    }
    case "approve":
      if (c.stage !== "in_review") return "Only a case in review can be approved.";
      if (c.checklist.some((x) => !x.done)) return "Every checklist item must be ticked first.";
      c.stage = "awaiting_signatures";
      if (c.reviewer) c.reviewer.notes = a.notes;
      log(c.reviewer?.name ?? "Reviewer", "Checklist complete. Sent to both parties to sign.");
      return null;
    case "request_changes":
      if (c.stage !== "in_review") return "Only a case in review can be sent back.";
      c.stage = "changes_requested";
      if (c.reviewer) c.reviewer.notes = a.notes;
      log(c.reviewer?.name ?? "Reviewer", `Asked for changes: ${a.notes}`);
      return null;
    case "escalate":
      c.stage = "escalated";
      log(c.reviewer?.name ?? "MakeGood", `Referred to a licensed attorney: ${a.notes}`);
      return null;
    case "sign": {
      if (c.stage !== "awaiting_signatures") return "This agreement is not ready to sign.";
      const p = c[a.party];
      if (p.signedAt) return `${p.name} has already signed.`;
      p.signedAt = now();
      log(p.name, "Signed the agreement.");
      if (c.responsible.signedAt && c.affected.signedAt) c.stage = "awaiting_funds";
      return null;
    }
    case "fund": {
      if (c.stage !== "awaiting_funds") return "Both parties must sign before the money is held.";
      c.hold.fundedAt = now();
      const due = new Date(c.intake.dueBy + "T23:59:00");
      due.setDate(due.getDate() + AUTO_RELEASE_DAYS);
      c.hold.autoReleaseAt = due.toISOString();
      c.stage = "held";
      log(c.responsible.name, `Paid $${c.hold.amountUsd} into the payment hold.`);
      return null;
    }
    case "confirm":
      if (c.stage !== "held") return "There is nothing held to release.";
      c.hold.releasedAt = now();
      c.stage = "released";
      log(c.affected.name, "Confirmed it is made good. Money released; the release clause is now in effect.");
      if (c.notary?.notarizedAt) {
        c.notary.certifiedAt = c.hold.releasedAt;
        log(NOTARY.name, `Certified the $${c.hold.amountUsd} transfer to ${c.affected.name} against deed ${c.notary.deedNo}.`);
      }
      return null;
    case "dispute":
      if (c.stage !== "held") return "Only held money can be disputed.";
      c.stage = "disputed";
      log(c.affected.name, `Reported a problem: ${a.notes}`);
      return null;
    case "notary_request": {
      if (!["awaiting_funds", "held"].includes(c.stage)) return "Both parties sign before a notary seals it.";
      if (c.notary) return "A notary is already on this case.";
      c.notary = { requestedAt: now(), requestedBy: a.party };
      log(c[a.party].name, `Asked ${NOTARY.name}, a partner notary, to notarise the agreement.`);
      return null;
    }
    case "notarize": {
      if (!c.notary) return "No notary was asked for.";
      if (c.notary.notarizedAt) return "Already notarised.";
      if (!["awaiting_funds", "held"].includes(c.stage)) return "This case can no longer be notarised.";
      c.notary.notarizedAt = now();
      c.notary.deedNo = `TPE-${new Date().getFullYear()}-${c.id.replace(/^MG-/, "")}`;
      log(NOTARY.name, `Checked both IDs, authenticated both signatures and sealed deed ${c.notary.deedNo} with a direct-enforcement clause (Notary Act, Art. 13).`);
      return null;
    }
  }
}
