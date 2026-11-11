import { refreshPayee, stripeErrorMessage } from "@/lib/payments";
import { getCase, putCase } from "@/lib/store";

/** Back from Connect onboarding: record whether the payee can now receive the money directly. */
export async function GET(req: Request, ctx: RouteContext<"/api/cases/[id]/payee/return">) {
  const { id } = await ctx.params;
  const origin = new URL(req.url).origin;
  const c = await getCase(id);
  if (!c) return Response.redirect(new URL("/", origin), 303);
  try {
    await refreshPayee(c);
    if (c.affected.payoutsReady) {
      c.events.push({ at: new Date().toISOString(), who: c.affected.name, text: `Connected a Stripe account (${c.affected.stripeAccountId}) to receive the money.` });
    }
    await putCase(c);
  } catch (err) {
    console.error("[payee/return]", stripeErrorMessage(err));
  }
  return Response.redirect(new URL(`/case/${id}?as=affected`, origin), 303);
}
