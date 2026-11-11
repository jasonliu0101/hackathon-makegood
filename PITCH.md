# MakeGood — 90-second demo + pitch notes

## The one sentence
MakeGood turns "I'll pay for that" into a signed agreement. A $15 non-lawyer reviewer checks it, and the money is held until the damage is made good.

## 90-second video script (English, on screen)

| Time | Screen | Voice-over |
|---|---|---|
| 0:00–0:08 | Landing hero: the mosaic, Taipei Bridge clip, "Settle it small." | "Taipei has more scooters than parking spots. Scrapes happen every day. Nobody hires a lawyer for a $180 side panel." |
| 0:08–0:15 | Scroll to showcase: "Scraped a parked scooter $180" | "So people shake hands. Then the other person ghosts. And even if you win in small claims, 55% of winners never collect." |
| 0:15–0:30 | Click "Settle this one" → /start, scooter scenario prefilled → Draft | "MakeGood starts from your own words. Pick what happened, confirm the amount and the date. Claude drafts a neutral settlement both sides can sign. It never suggests an amount and it never takes a side." |
| 0:30–0:50 | Case room → View as Reviewer → tick checks; hovering a check lights up its clause | "This is the $15-an-hour expert. A paralegal or law student, no bar card, checks six fixed points. Every check points at the clause it verifies. They flag gaps; they never give advice. That's the line that keeps it legal." |
| 0:50–1:05 | Switch to Jack → Sign; switch to Jason → Sign; Jack → Pay into hold | "Both sign. Jack pays into a payment hold. The money is real and visible to Jason, but it only moves when the scooter is fixed." |
| 1:05–1:15 | Jason → "Confirm it's made good" → progress rail turns green, record shows every step | "Jason confirms, the money is released, and only then does the release clause take effect. Every step is on the record." |
| 1:15–1:30 | Reviewer desk with earnings; then the footer wordmark | "Each case pays a reviewer $15 for about 15 minutes of work. Scooter scrapes today, then every small dispute: mirrors, fences, borrowed cameras. AI doesn't replace the expert. It makes a new one." |

**Recording tips**

- Use two browser windows side by side, one for each party. The case room polls, so both update live.
- Start from a fresh case: delete `web/.data/cases.json` and restart `npm run dev`.

## Judges: what each one will probe

- **Verification** (Saphira AI ×2, Traverse, Hexclave, Partcl). Show each check mapped to a clause, the hard scope limits, and the audit record. Make the point that the AI structures the parties' words but never decides.
- **Does it actually run** (Freestyle, Circleback ×2, s2.dev, YC product engineer). Run it live end to end: real Claude structured output with a Zod schema and a refusal fallback, a template fallback with no key, and an explicit state machine that rejects illegal transitions, and a real Stripe Connect test-mode hold (Checkout with manual capture → capture on "made good", destination charge to the payee's Express account).
- **Business** (Boris Jabes, Domu COO, CDIB VC).
  - Fee: $19 / $29 / $39 per case, of which $15 goes to the reviewer.
  - Wedge: Taipei scooter density.
  - Expansion: a trust and payment layer for every off-platform dispute (marketplaces, rentals, insurance deductibles).
  - Taiwan angle: a court-approved township mediation (鄉鎮市調解) has the force of a judgment, so MakeGood can prepare that filing.

## Bear cases → answers
- **"Isn't this unauthorised practice of law?"** No. It's a scrivener model:
  - The parties type every term into attorney-authored templates.
  - Reviewers do completeness checks only (the CA LDA line).
  - Injury, insurer, minor, tenancy and >$2,000 cases are referred out.
  - Copy follows the DoNotPay/FTC lesson: never "AI lawyer".
- **"Escrow needs a licence."** We don't hold funds. In production it's a Stripe Connect destination charge into the payee's account with payouts paused. It's called a payment hold, not escrow.
- **"Is the margin BPO-like?"** The AI does the drafting and the reviewer's 15 minutes is the only labour. Quality is measurable: reviewer override rate and release-vs-dispute rate.

## Facts we cite (sources in RESEARCH.md)
- $362/hour average US lawyer rate (Clio 2026).
- 55% of winning small-claims plaintiffs collected nothing (Fordham Urban L.J., 1994).
- 1 in 7 US drivers uninsured (IRC 2023).
- 83.6% settlement rate at Taiwan township mediation committees (MOI 2025).
