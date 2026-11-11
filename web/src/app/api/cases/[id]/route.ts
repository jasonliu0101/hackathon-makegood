import { applyAction, type CaseAction } from "@/lib/actions";
import { captureHold, paymentsMode, stripeErrorMessage } from "@/lib/payments";
import { getCase, putCase } from "@/lib/store";

export async function GET(_req: Request, ctx: RouteContext<"/api/cases/[id]">) {
  const { id } = await ctx.params;
  const c = await getCase(id);
  if (!c) return Response.json({ error: "No such case." }, { status: 404 });
  return Response.json({ case: c });
}

export async function POST(req: Request, ctx: RouteContext<"/api/cases/[id]">) {
  const { id } = await ctx.params;
  const c = await getCase(id);
  if (!c) return Response.json({ error: "No such case." }, { status: 404 });
  let action: CaseAction;
  try {
    action = (await req.json()) as CaseAction;
  } catch {
    return Response.json({ error: "Send the action as JSON." }, { status: 400 });
  }
  const onStripe = paymentsMode() === "stripe";
  // On Stripe, money is only "held" after Checkout authorises the card (see pay/return).
  if (onStripe && action.type === "fund") {
    return Response.json({ error: "Pay through Stripe Checkout." }, { status: 409 });
  }
  // Made good: capture the authorised payment before the release clause switches on.
  if (action.type === "confirm" && c.stage === "held" && c.hold.stripe?.paymentIntentId) {
    try {
      await captureHold(c);
    } catch (e) {
      return Response.json({ error: stripeErrorMessage(e) }, { status: 502 });
    }
  }
  const err = applyAction(c, action);
  if (!err && action.type === "confirm" && c.hold.stripe?.status === "succeeded") {
    c.events[c.events.length - 1].text += ` Captured on Stripe${c.hold.stripe.destination ? ` and paid to ${c.hold.stripe.destination}` : ""}.`;
  }
  if (err) return Response.json({ error: err }, { status: 409 });
  await putCase(c);
  return Response.json({ case: c });
}
