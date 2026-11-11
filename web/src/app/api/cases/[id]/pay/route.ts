import { createHoldCheckout, paymentsMode, stripeErrorMessage } from "@/lib/payments";
import { getCase, putCase } from "@/lib/store";

/** Start the payment hold: returns a Stripe Checkout URL for the responsible party. */
export async function POST(req: Request, ctx: RouteContext<"/api/cases/[id]/pay">) {
  const { id } = await ctx.params;
  const c = await getCase(id);
  if (!c) return Response.json({ error: "No such case." }, { status: 404 });
  if (paymentsMode() !== "stripe") return Response.json({ error: "Stripe is not configured." }, { status: 400 });
  if (c.stage !== "awaiting_funds") return Response.json({ error: "Both parties must sign before the money is held." }, { status: 409 });
  try {
    const url = await createHoldCheckout(c, new URL(req.url).origin);
    await putCase(c);
    return Response.json({ url });
  } catch (err) {
    return Response.json({ error: stripeErrorMessage(err) }, { status: 502 });
  }
}
