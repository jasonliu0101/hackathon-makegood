import { applyAction } from "@/lib/actions";
import { confirmHold, stripeErrorMessage } from "@/lib/payments";
import { getCase, putCase } from "@/lib/store";

/** Stripe Checkout success_url: verify the authorisation server-side, then mark the money held. */
export async function GET(req: Request, ctx: RouteContext<"/api/cases/[id]/pay/return">) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const back = new URL(`/case/${id}?as=responsible`, url.origin);
  const c = await getCase(id);
  if (!c) return Response.redirect(new URL("/", url.origin), 303);
  const sessionId = url.searchParams.get("session_id") ?? "";
  try {
    if (c.stage === "awaiting_funds" && (await confirmHold(c, sessionId))) {
      applyAction(c, { type: "fund" });
      c.events[c.events.length - 1].text += ` Card authorised on Stripe (${c.hold.stripe?.paymentIntentId}), not yet charged.`;
      await putCase(c);
    }
  } catch (err) {
    console.error("[pay/return]", stripeErrorMessage(err));
  }
  return Response.redirect(back, 303);
}
