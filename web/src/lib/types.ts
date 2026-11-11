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

export type DraftEngine = "claude" | "gmi" | "template";

export type Notarization = {
  requestedAt: string;
  requestedBy: "responsible" | "affected";
  notarizedAt?: string;
  deedNo?: string;
  /** Set when the money is released: the notary records the transfer against the deed. */
  certifiedAt?: string;
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
  draftedBy: DraftEngine;
  /** The model that wrote the draft, e.g. "claude-opus-5-5" or a local model tag. */
  draftModel?: string;
  /** Optional notarisation by a partner notary (Taiwan Notary Act): an enforceable deed, and the transfer certified on release. */
  notary?: Notarization;
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
  "scooter-scrape": { responsibleName: "Jack Huang", responsibleEmail: "jack.huang@example.com", affectedName: "Jason Liu", affectedEmail: "jason.liu@example.com" },
  mirror: { responsibleName: "Jack Huang", responsibleEmail: "jack.huang@example.com", affectedName: "Jason Liu", affectedEmail: "jason.liu@example.com" },
  "tipped-over": { responsibleName: "Jack Huang", responsibleEmail: "jack.huang@example.com", affectedName: "Jason Liu", affectedEmail: "jason.liu@example.com" },
  "plant-pot": { responsibleName: "Jack Huang", responsibleEmail: "jack.huang@example.com", affectedName: "Jason Liu", affectedEmail: "jason.liu@example.com" },
  fence: { responsibleName: "Jack Huang", responsibleEmail: "jack.huang@example.com", affectedName: "Jason Liu", affectedEmail: "jason.liu@example.com" },
};

/**
 * The demo partner notary. Fee per the Notary Act, Art. 109: NT$1,000 for a deed of NT$200,000 or less.
 * A deed with a direct-enforcement clause (Art. 13) can be enforced without suing if the money is not paid.
 */
export const NOTARY = { name: "J. Liu", office: "Private notary, Taipei District Court", feeTwd: 1000 };

/**
 * The attorney-certified template every draft fills in. Models only put the parties' words into these clauses.
 * Sample certification for the demo; replace with the real certifying attorney.
 */
export const TEMPLATE = {
  id: "TW-SR-01",
  version: "1.2",
  name: "Small damage settlement and release",
  certifiedBy: "Atty. Liu J.",
  bar: "Taipei Bar Association",
  clauses: ["Parties", "What happened", "What will be done", "Payment hold", "Release", "If it goes wrong", "Signatures"],
};

/** The demo reviewer. */
export const REVIEWER = { name: "Liu J.", credential: "Paralegal certificate, CA LDA #4471" };
