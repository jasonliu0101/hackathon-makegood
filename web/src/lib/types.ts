import { z } from "zod";

/** What Claude (or the template fallback) returns: a neutral settlement & release. */
export const AgreementSchema = z.object({
  title: z.string(),
  summary: z.string(),
  incident: z.object({
    date: z.string(),
    location: z.string(),
    description: z.string(),
  }),
  remedy: z.enum(["payment", "repair", "replacement"]),
  amountUsd: z.number(),
  obligations: z.array(
    z.object({
      party: z.enum(["responsible", "affected"]),
      action: z.string(),
      dueBy: z.string(),
    }),
  ),
  releaseCondition: z.string(),
  clauses: z.array(z.object({ heading: z.string(), body: z.string() })),
  plainEnglish: z.array(z.string()),
  /** Things the reviewer must look at. Never advice, only gaps. */
  flags: z.array(z.string()),
  /** True when the facts look outside what a non-lawyer may handle. */
  needsAttorney: z.boolean(),
});
export type Agreement = z.infer<typeof AgreementSchema>;

export type Stage =
  | "drafted"
  | "in_review"
  | "changes_requested"
  | "awaiting_signatures"
  | "awaiting_funds"
  | "held"
  | "released"
  | "disputed"
  | "escalated";

export type Party = {
  name: string;
  email: string;
  signedAt?: string;
  /** Stripe Connect Express account (affected party only). */
  stripeAccountId?: string;
  payoutsReady?: boolean;
};

export type ChecklistItem = { id: string; label: string; done: boolean };

export type CaseEvent = { at: string; who: string; text: string };

export type CaseFile = {
  id: string;
  createdAt: string;
  stage: Stage;
  responsible: Party;
  affected: Party;
  agreement: Agreement;
  draftedBy: "claude" | "template";
  reviewer?: { name: string; credential: string; claimedAt: string; notes?: string };
  checklist: ChecklistItem[];
  /** Payment hold: in production a destination charge into the payee's Stripe connected account with manual payouts. */
  hold: {
    amountUsd: number;
    feeUsd: number;
    fundedAt?: string;
    releasedAt?: string;
    autoReleaseAt?: string;
    /** Present when the hold runs on Stripe (test mode): a manual-capture PaymentIntent from Checkout. */
    stripe?: { sessionId?: string; paymentIntentId?: string; destination?: string; status?: string };
  };
  intake: Intake;
  events: CaseEvent[];
};

export const REVIEW_CHECKLIST: Omit<ChecklistItem, "done">[] = [
  { id: "parties", label: "Both parties are named and reachable by email" },
  { id: "facts", label: "The incident is described in neutral words both sides can sign" },
  { id: "amount", label: "The amount matches the evidence (quote, receipt or photo)" },
  { id: "deadline", label: "Every obligation has a who, a what and a date" },
  { id: "release", label: "The release covers this incident only, nothing wider" },
  { id: "scope", label: "No injury, insurance claim, minor or criminal matter is involved" },
];

export const REVIEW_FEE_USD = 15;
export const PLATFORM_FEE_USD = 4;
/** Flat fee by size of the claim; $15 of it always goes to the reviewer. */
export function feeFor(amountUsd: number): number {
  return amountUsd < 300 ? 19 : amountUsd <= 1000 ? 29 : 39;
}

/** What the parties type themselves (scrivener model: the AI structures, never decides). */
export type Intake = {
  story: string;
  amountUsd: number;
  remedy: "payment" | "repair" | "replacement";
  dueBy: string;
  incidentDate: string;
  location: string;
  responsibleName: string;
  responsibleEmail: string;
  affectedName: string;
  affectedEmail: string;
  outOfScope: string[];
};

export const OUT_OF_SCOPE = [
  { id: "injury", label: "Someone was hurt" },
  { id: "insurer", label: "An insurer is already involved" },
  { id: "minor", label: "A person under 18 is a party" },
  { id: "tenancy", label: "It is between a landlord and a tenant" },
] as const;

export const MAX_AMOUNT_USD = 2000;
export const AUTO_RELEASE_DAYS = 7;

/** Sample people for each scenario, so a picked scenario is a complete case. Replace with real parties in production. */
export type SampleParties = { responsibleName: string; responsibleEmail: string; affectedName: string; affectedEmail: string };
export const SAMPLE_PARTIES: Record<string, SampleParties> = {
  "scooter-scrape": { responsibleName: "Kai Lin", responsibleEmail: "kai.lin@example.com", affectedName: "Mei Wu", affectedEmail: "meiwu.tpe@example.com" },
  mirror: { responsibleName: "Wei Chang", responsibleEmail: "wei.chang@example.com", affectedName: "Yu-ting Huang", affectedEmail: "yuting.h@example.com" },
  "tipped-over": { responsibleName: "Hao Chen", responsibleEmail: "haochen88@example.com", affectedName: "Jia Lee", affectedEmail: "jia.lee@example.com" },
  "plant-pot": { responsibleName: "Ting Hsu", responsibleEmail: "ting.hsu@example.com", affectedName: "Ruby Lo", affectedEmail: "ruby.lo@example.com" },
  fence: { responsibleName: "Dana Ortiz", responsibleEmail: "dana.ortiz@example.com", affectedName: "Sam Park", affectedEmail: "sam.park@example.com" },
};

/** The demo reviewer. */
export const REVIEWER = { name: "Lin H.", credential: "Paralegal certificate, CA LDA #4471" };
