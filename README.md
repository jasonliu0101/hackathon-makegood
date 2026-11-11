# MakeGood

**Settle it small.** MakeGood settles everyday damage without a lawyer: a scraped scooter, a knocked-off mirror, a crushed plant pot. Claude drafts a neutral settlement from both people's own words. A non-lawyer reviewer checks it against six fixed points for $15. Both people sign, and the money is held until the damage is made good.

Built for YC's Winter 2027 Request for Startups, [**The $15-an-Hour Expert**](https://www.ycombinator.com/rfs): *"Anywhere a credential is the bottleneck, this model works."*

## Why

- A $180 scooter scrape isn't worth a $362 lawyer hour. Most people settle with a handshake, and then the other person ghosts.
- Winning in small claims doesn't mean getting paid. In one study, 55% of winning plaintiffs collected nothing.
- MakeGood fixes the two things that break: **a written agreement both sides sign**, and **money that is already there**.

## How it works

```
intake ──► AI draft ──► $15 reviewer ──► both sign ──► payment hold ──► made good
 (parties'   (Claude,      (6-point          (e-sign)     (released on     (release clause
  own words)  structured    checklist,                      confirmation or   takes effect)
              output)       each check →                    7 days after due)
                            a clause)
```

**Trust design.** These rules come from research; see [RESEARCH.md](RESEARCH.md).

- **Scrivener model.** The parties type every term. The AI only fills an attorney-certified template (`TW-SR-01 v1.2`): the same seven clauses, in the same order, every time. A clause a model drops or renames is filled from the template wording. It never suggests amounts or strategy.
- **Our own model, or Claude.** Drafts can run on our own open-weight model hosted on GMI Cloud (OpenAI-compatible inference, output constrained to the agreement's JSON schema), so the parties' story is not sent to a third-party AI API. Claude is the other option; a deterministic template is the fallback.
- **Partner notary (Taiwan).** After both sign, either party can ask a partner private notary to notarise. The notary checks both IDs, authenticates the signatures and seals a deed with a direct-enforcement clause (Notary Act, Art. 13): if the money is never paid, it can be enforced without a lawsuit. Fee NT$1,000 for deeds of NT$200,000 or less (Art. 109). When the money is released, the notary certifies the transfer against the deed.
- **Reviewers check; they never advise.** They work through a completeness checklist (the CA LDA line, 16 CCR §3950). Each check is linked to the clause it verifies.
- **Hard scope limits.** Cases involving injury, an insurer, a minor, a landlord–tenant dispute, or more than $2,000 are referred to an attorney or legal aid.
- **The release covers this incident only.** It takes effect only when the money is released.
- **Payment hold, not escrow.** It is a Stripe Connect destination charge into the payee's connected account, authorised at signing and captured when the damage is made good. MakeGood never holds the funds.

## Run it

```bash
cd web
npm install
cp .env.example .env.local   # optional: add ANTHROPIC_API_KEY to draft with Claude
npm run dev
```

- Without an API key, drafting falls back to a deterministic template, so the demo always works.
- With `GMI_API_KEY` and `GMI_MODEL` (and optionally `GMI_BASE_URL`), the intake form offers "Drafted by: Our model · GMI Cloud". Any OpenAI-compatible server works, e.g. `GMI_BASE_URL=http://127.0.0.1:11434/v1` for a model run locally.
- With a Stripe **test** key (`STRIPE_SECRET_KEY=sk_test_…`), the payment hold runs on Stripe Connect:
  - **Hold.** The payer goes through Checkout. The PaymentIntent uses `capture_method: manual`, so the card is authorised but not charged.
  - **Destination charge.** If the payee has connected an Express account ("Get paid with Stripe"), the charge goes straight to them and MakeGood keeps only the application fee.
  - **Release.** "Made good" captures the PaymentIntent.
  - **Setup.** Connect must be enabled on the Stripe account. Pay with test card `4242 4242 4242 4242`.
- **Deploy on Vercel.** Import the repo with Root Directory `web`, then add **Upstash for Redis** from the Vercel Marketplace (it sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`). Without it, cases are kept in `web/.data/cases.json`, which only works on a machine with a writable disk.
- **Reset the demo.** `npm run reset:demo` clears local `.data/`, or the Upstash data when the KV variables are set (`vercel env pull .env.local && node --env-file=.env.local scripts/reset-demo.mjs`). The seed queue comes back on the next request.
- Open `/case/<id>` in two windows, switch "View as" between the two parties and the reviewer, and watch both sides update.

| Route | What |
|---|---|
| `/` | Landing page |
| `/start` | Scenario picker + intake |
| `/case/[id]` | Case room: agreement, review checklist, signatures, payment hold, audit record |
| `/review` | Reviewer desk: the $15 job queue |
| `POST /api/cases` | Create a case and draft it (Claude `claude-opus-5-5`, structured output via Zod) |
| `POST /api/cases/[id]/pay` → `GET …/pay/return` | Stripe Checkout (manual capture) and server-side verification of the authorisation |
| `POST /api/cases/[id]/payee` → `GET …/payee/return` | Stripe Connect Express onboarding for the payee |
| `POST /api/cases/[id]` | State machine actions: `claim`, `check`, `approve`, `request_changes`, `escalate`, `sign`, `fund`, `confirm`, `dispute`, `notary_request`, `notarize` |

**Stack:**

- Next.js 16 (App Router) and TypeScript
- `@anthropic-ai/sdk` with structured outputs and server-side refusal fallback
- Plain CSS modules
- Upstash Redis on Vercel, JSON file locally (hackathon scope)

**Media credits** are listed in the site footer: Wikimedia Commons / rawpixel / WordPress Photo Directory, under CC0, CC BY and CC BY-SA.

> MakeGood is not a law firm and is not a substitute for the advice of an attorney. MakeGood is not an escrow agent.
