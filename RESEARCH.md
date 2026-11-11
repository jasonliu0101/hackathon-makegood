# MakeGood — research notes (2026-11-11)

Product: AI-drafted settlement for $50–$2,000 everyday disputes, checked by a $15/case non-lawyer reviewer, paid through a payment hold that releases when the damage is made good.
Fit: YC Winter 2027 RFS "The $15-an-Hour Expert" (Brad Flora) — https://www.ycombinator.com/rfs

Items marked (snippet) were read from search-result snippets, not the full source. [U] = unverified.

## 1. YC: what applies
- No official YC hackathon exists for the W27 RFS (ycombinator.com/events checked). Use YC's application criteria as the rubric.
- W27 batch: Jan–Mar 2027, in person in SF. On-time deadline Nov 2, 2026 has passed; late applications accepted. Deal: $125K for 7% (post-money SAFE) + $375K uncapped MFN SAFE.
- PG "How to apply": first sentence matter-of-fact; "X for Y"; disclose the flaws before partners find them; insight over execution; name how you get the first users; submit the video; a working demo beats slides.
- Bear cases on this RFS (postdigitalist.xyz, the-founders-corner.com, ycinsight.com):
  - Credentials are often legal barriers (UPL).
  - "The company is the workforce": hiring, training, QA and margins are the real problems.
  - "Which expert task does your customer need, and how will you measure quality?"
- Pre-empt: neutral two-party facilitation, checklist-only reviewers, attorney-authored templates, licensed payment partner, and published QA metrics (reviewer override rate, release vs dispute rate, days to resolution).

## 2. Demand
- Commonest Reddit pattern: "agreed to pay out of pocket, now ghosting me" (r/legaladvice, r/Insurance, r/Smallclaims).
- Winning small claims ≠ getting paid. CA courts: "The court does not do it for you." 55% of winning plaintiffs collected nothing (Fordham Urban L.J., 1994, snippet).
- Lawyer time costs $362/hour on average (Clio 2026, snippet).
- 15.4% of US drivers were uninsured in 2023 (IRC via iii.org, snippet).
- 92% of low-income Americans' civil legal problems got no or inadequate help (LSC Justice Gap 2022). Only 49% of everyday legal problems get resolved (IAALS/HiiL 2021).
- Taiwan: township mediation committees closed ~141k cases in 2025 at an 83.6% settlement rate (MOI, snippet). People settle when the process is cheap and structured.
- Personas:
  1. Fender-bender cash settler.
  2. Homeowner with a small job gone wrong.
  3. Neighbor or roommate damage.

## 3. Competitors
| Name | Model | Gap |
|---|---|---|
| PettyLawsuit | AI demand letters + small-claims forms, $29–49 | Adversarial; no two-party agreement; no payment guarantee |
| DoNotPay | "Robot lawyer" | FTC order (2025): $193K; may not claim to replace professionals without evidence |
| Rocket Lawyer / LegalZoom | Templates + subscription | Too expensive for one $200 dispute; one-sided |
| Utah small-claims ODR | Court-run; volunteer non-lawyer facilitators | Validates trained non-lawyer neutrals; only after filing |
| eBay/PayPal resolution | ~60M disputes/yr | Only inside the marketplace |
| Escrow.com | Licensed escrow, $50 minimum | Minimum fee kills sub-$300 cases |

The YC directory shows no company doing consumer two-party settlements.

## 4. Rules the product follows
1. **Scrivener model.**
   - The parties enter the facts, amount and deadline.
   - The AI structures their words into an attorney-authored template.
   - Both sides see identical, neutral text.
2. **Reviewers check, never advise** (line from 16 CCR §3950, CA LDA contract).
   - They work from a completeness checklist.
   - They may flag "field X is missing or inconsistent".
   - They may not say "ask for more" or "you have a strong claim".
   - Reviewer pool: CA-registered LDAs, AZ certified legal document preparers, and law students under a supervising attorney.
3. **Out of scope** (routed to legal aid or a lawyer referral): injury, minors, landlord/tenant, an insurer already involved, over $2,000.
4. **Release.**
   - Scoped to this incident only, to avoid CA Civ. Code §1542 problems.
   - Mutual, and it takes effect only when payment is confirmed.
5. **Money.**
   - Never call it "escrow" in the UI. Stripe: "doesn't provide escrow services". Escrow is licensed under the CA Fin. Code §17000+.
   - Flow:
     - Destination charge into the payee's Stripe connected account.
     - Payouts on manual (US holds up to 2 years).
     - Release when the obligation is confirmed.
     - Auto-release after 7 days of silence.
     - Refund if the obligation is not met.
   - The platform takes only an application fee.
6. **E-signature** (ESIGN/UETA): record consent, timestamp, IP and document hash, and email the final PDF to both parties.
7. **Disclaimers:**
   - "MakeGood is not a law firm and is not a substitute for the advice of an attorney." (Tex. Gov't Code §81.101(c) wording)
   - "MakeGood is not an escrow agent."
8. **Launch:** California first (LDA regime, largest market), Arizona second (LDP/LP/ABS). Utah's sandbox closes in 2027.
9. **Taiwan angle:** a court-approved township mediation has the effect of a final judgment (鄉鎮市調解條例 §27). The product could prepare the mediation application.
