import Stripe from "stripe";
import type { CaseFile } from "./types";

/**
 * Payment hold on Stripe Connect (test mode).
 *
 * - The responsible party pays through Checkout. The PaymentIntent uses capture_method "manual",
 *   so the card is authorised but not charged: the money is held.
 * - If the affected party has a Connect Express account with charges enabled, the charge is a
 *   destination charge (transfer_data.destination) and MakeGood only keeps its application fee.
 * - "Made good" captures the PaymentIntent; a refund before release cancels it, which voids the hold.
 *
 * With no STRIPE_SECRET_KEY the app keeps the simulated hold, so the demo never breaks.
 */
let client: Stripe | null = null;

export function paymentsMode(): "stripe" | "simulated" {
  return process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") ? "stripe" : "simulated";
}

function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith("sk_test_")) throw new Error("Stripe is not configured (test-mode key required).");
  client ??= new Stripe(key);
  return client;
}

const cents = (usd: number) => Math.round(usd * 100);

/** Checkout for the responsible party: the settlement amount plus their half of the flat fee. */
export async function createHoldCheckout(c: CaseFile, origin: string): Promise<string> {
  const halfFee = cents(c.hold.feeUsd / 2);
  const destination = c.affected.payoutsReady ? c.affected.stripeAccountId : undefined;
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: c.responsible.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: cents(c.hold.amountUsd),
          product_data: { name: `Settlement ${c.id}`, description: `Held for ${c.affected.name} until it’s made good` },
        },
      },
      {
        quantity: 1,
        price_data: { currency: "usd", unit_amount: halfFee, product_data: { name: "MakeGood flat fee (your half)" } },
      },
    ],
    payment_intent_data: {
      capture_method: "manual",
      description: `MakeGood ${c.id}: ${c.agreement.title}`,
      metadata: { caseId: c.id },
      ...(destination ? { transfer_data: { destination }, application_fee_amount: halfFee } : {}),
    },
    metadata: { caseId: c.id },
    success_url: `${origin}/api/cases/${c.id}/pay/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/case/${c.id}?as=responsible`,
  });
  c.hold.stripe = { sessionId: session.id, destination };
  if (!session.url) throw new Error("Stripe did not return a Checkout URL.");
  return session.url;
}

/** After Checkout: true when the card is authorised and the money is held. */
export async function confirmHold(c: CaseFile, sessionId: string): Promise<boolean> {
  if (c.hold.stripe?.sessionId !== sessionId) return false;
  const session = await stripe().checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
  const pi = session.payment_intent;
  if (!pi || typeof pi === "string") return false;
  c.hold.stripe = { ...c.hold.stripe, paymentIntentId: pi.id, status: pi.status };
  return pi.status === "requires_capture";
}

/** Made good: capture the authorised amount. With a destination it lands in the payee's account. */
export async function captureHold(c: CaseFile): Promise<void> {
  const id = c.hold.stripe?.paymentIntentId;
  if (!id) return;
  const pi = await stripe().paymentIntents.capture(id);
  c.hold.stripe = { ...c.hold.stripe, status: pi.status };
}

/** Void the hold (refund before capture). */
export async function cancelHold(c: CaseFile): Promise<void> {
  const id = c.hold.stripe?.paymentIntentId;
  if (!id) return;
  const pi = await stripe().paymentIntents.cancel(id);
  c.hold.stripe = { ...c.hold.stripe, status: pi.status };
}

/** Connect Express onboarding for the affected party, so the money can go straight to them. */
export async function payeeOnboardingLink(c: CaseFile, origin: string): Promise<string> {
  const s = stripe();
  if (!c.affected.stripeAccountId) {
    const acct = await s.accounts.create({
      type: "express",
      country: "US",
      email: c.affected.email,
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      metadata: { caseId: c.id },
    });
    c.affected.stripeAccountId = acct.id;
  }
  const link = await s.accountLinks.create({
    account: c.affected.stripeAccountId,
    type: "account_onboarding",
    refresh_url: `${origin}/api/cases/${c.id}/payee`,
    return_url: `${origin}/api/cases/${c.id}/payee/return`,
  });
  return link.url;
}

export async function refreshPayee(c: CaseFile): Promise<void> {
  if (!c.affected.stripeAccountId) return;
  const acct = await stripe().accounts.retrieve(c.affected.stripeAccountId);
  c.affected.payoutsReady = Boolean(acct.charges_enabled);
}

export function stripeErrorMessage(err: unknown): string {
  if (err instanceof Stripe.errors.StripeError) return `Stripe: ${err.message}`;
  return err instanceof Error ? err.message : "Payment error.";
}
