import { payeeOnboardingLink, paymentsMode, stripeErrorMessage } from "@/lib/payments";
import { getCase, putCase } from "@/lib/store";

/** Connect Express onboarding for the affected party. GET doubles as Stripe's refresh_url. */
async function link(req: Request, id: string, redirect: boolean) {
  const c = await getCase(id);
  if (!c) return Response.json({ error: "No such case." }, { status: 404 });
  if (paymentsMode() !== "stripe") return Response.json({ error: "Stripe is not configured." }, { status: 400 });
  try {
    const url = await payeeOnboardingLink(c, new URL(req.url).origin);
    await putCase(c);
    return redirect ? Response.redirect(url, 303) : Response.json({ url });
  } catch (err) {
    return Response.json({ error: stripeErrorMessage(err) }, { status: 502 });
  }
}

export async function POST(req: Request, ctx: RouteContext<"/api/cases/[id]/payee">) {
  return link(req, (await ctx.params).id, false);
}

export async function GET(req: Request, ctx: RouteContext<"/api/cases/[id]/payee">) {
  return link(req, (await ctx.params).id, true);
}
