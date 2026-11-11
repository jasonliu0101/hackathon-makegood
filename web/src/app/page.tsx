import Link from "next/link";
import s from "./landing.module.css";
import { StageSlider } from "@/components/StageSlider";
import { Showcase } from "@/components/Showcase";
import { Switches } from "@/components/Switches";
import { StartDialog } from "@/components/StartDialog";
import { RevealObserver } from "@/components/RevealObserver";
import { Wordmark } from "@/components/Wordmark";
import { SCENARIOS, scenarioById } from "@/lib/scenarios";

const startHref = (id: string) => `/start?scenario=${id}&role=responsible`;

/** A hero tile is a way in: the figure and the case, linked straight to its intake. */
function Tile({ id, tone, className = "" }: { id: string; tone: string; className?: string }) {
  const sc = scenarioById(id)!;
  return (
    <Link href={startHref(id)} className={`${s.cell} ${s.tile} ${tone} ${className}`}>
      <span className={`${s.tileFigure} tnum`}>${sc.amountUsd}</span>
      <span className={s.tileNote}>{sc.name}</span>
    </Link>
  );
}

const PLANS = [
  { price: 19, range: "Damage under $300", tone: s.planYellow, lines: ["Drafted from your words", "Checked by a person", "Payment held until fixed"] },
  { price: 29, range: "$300 to $1,000", tone: s.planPink, lines: ["Everything in $19", "Repair quote attached"] },
  { price: 39, range: "$1,000 to $2,000", tone: s.planWhite, lines: ["Everything in $29", "Pay in two parts", "Lawyer referral if it fails"] },
];

const FAQ = [
  { q: "Is this legal advice?", a: "No. You set every term; we put your words into an attorney-approved template." },
  { q: "Who checks it?", a: "A trained paralegal or law student, against six fixed points. Not a lawyer." },
  { q: "Where is the money?", a: "With our payment provider, paused until you both confirm. Never with us." },
  { q: "What if they never pay?", a: "The release never takes effect, the hold is refunded and you keep every right." },
];

const QUEUE = SCENARIOS.slice(0, 4);

export default function Home() {
  return (
    <>
      <RevealObserver />

      <header className={`${s.hero} field-blue`}>
        <div className={s.band}>
          <nav className={s.nav} aria-label="Main">
            <Link href="/" className={s.navMark}>
              MakeGood
            </Link>
            <div className={s.navTab}>
              <a href="#how">How it works</a>
              <a href="#pricing">Pricing</a>
              <Link href="/review">For reviewers</Link>
            </div>
            <Link href="/start" className={s.navAction}>
              Start a settlement
            </Link>
          </nav>
          <div className={s.mosaic}>
            <figure className={`${s.cell} ${s.cellWide} ${s.hidePhone}`}>
              <img src="/img/taipei-scooters-above.jpg" alt="Scooters packed at a Taipei crossing, seen from above" width={1600} height={1067} />
            </figure>
            <Tile id="scooter-scrape" tone={s.tileYellow} className={s.cellTall} />
            <figure className={`${s.cell} ${s.hidePhone}`}>
              <img src="/img/plant-pot.jpg" alt="A terracotta plant pot on a stone step" width={1200} height={1600} />
            </figure>
            <Tile id="plant-pot" tone={s.tilePink} />
            <figure className={s.cell}>
              <img src="/img/vespa.jpg" alt="A white scooter parked outside a shop" width={1600} height={1066} />
            </figure>
            <Tile id="mirror" tone={s.tileBlack} />
            <figure className={s.cell}>
              <video
                className={s.video}
                autoPlay
                muted
                loop
                playsInline
                poster="/video/taipei-bridge-poster.jpg"
                aria-label="Rush-hour scooters pouring off Taipei Bridge"
              >
                <source src="/video/taipei-bridge.webm" type="video/webm" />
                <source src="/video/taipei-bridge.mp4" type="video/mp4" />
              </video>
            </figure>
            <figure className={`${s.cell} ${s.cellWide} ${s.hidePhone}`}>
              <img src="/img/guanqian-road.jpg" alt="Scooters waiting at a traffic light on Guanqian Road, Taipei" width={1600} height={1067} />
            </figure>
            <Tile id="tipped-over" tone={s.tileWhite} />
          </div>
        </div>
        <div className={s.heroBody}>
          <div className={s.heroLeft} data-after-title>
            <p className={s.standfirst}>
              Scraped someone’s scooter? Get a signed settlement, checked by a person for $15, with the payment held until it’s fixed.
            </p>
            <Link href="/start" className="btn">
              Start a settlement
            </Link>
          </div>
          <h1 className={`${s.title} display lines`}>
            <span className="line">
              <span data-line style={{ ["--i" as string]: 0 }}>Settle it</span>
            </span>
            <span className="line">
              <span data-line style={{ ["--i" as string]: 1 }}>small.</span>
            </span>
          </h1>
        </div>
      </header>

      <main>
        <section id="how" aria-label="How it works">
          <StageSlider />
        </section>

        <section className="field-white" aria-labelledby="sizes">
          <Showcase />
        </section>

        <section className="field-black" aria-labelledby="why">
          <h2 id="why" className={`${s.whyHead} display`} data-reveal>
            A handshake isn’t enough.
          </h2>
          <Switches />
        </section>

        <section id="reviewers" className={`${s.reviewers} field-pink`} aria-labelledby="reviewers-head">
          <div className={s.reviewersText}>
            <h2 id="reviewers-head" className={`${s.reviewersHead} display`} data-reveal>
              The $15 expert.
            </h2>
            <ul className={s.reviewerFacts} data-reveal style={{ ["--d" as string]: 1 }}>
              <li>
                <span className="tnum">$15</span> per case
              </li>
              <li>
                <span className="tnum">6</span> fixed checks
              </li>
              <li>
                <span className="tnum">0</span> bar cards
              </li>
            </ul>
            <div data-reveal style={{ ["--d" as string]: 2 }}>
              <Link href="/review" className="btn btn-ink">
                Open the reviewer desk
              </Link>
            </div>
          </div>
          <div className={s.reviewersUi} data-reveal style={{ ["--d" as string]: 2 }}>
            <div data-ui className={s.queue}>
              <div className={s.queueBar}>
                <strong>Open cases</strong>
                <span className="tnum">{QUEUE.length} waiting</span>
              </div>
              <ul>
                {QUEUE.map((c, i) => (
                  <li key={c.id} className={i === 0 ? s.queueActive : undefined}>
                    <span className={s.queueWhat}>{c.name}</span>
                    <span className="tnum">${c.amountUsd}</span>
                    <span className={s.queueCity}>{c.location.split(",")[0]}</span>
                    <span className={s.queuePay}>Earn $15</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="pricing" className={`${s.pricing} field-blue`} aria-labelledby="pricing-head">
          <h2 id="pricing-head" className={`${s.pricingHead} display`} data-reveal>
            One flat fee.
          </h2>
          <ul className={s.plans}>
            {PLANS.map((p, i) => (
              <li key={p.price} className={`${s.plan} ${p.tone}`} data-reveal style={{ ["--d" as string]: i + 1 }}>
                <div className={s.planBody}>
                  <h3 className={`${s.planPrice} tnum`}>${p.price}</h3>
                  <p className={s.planRange}>{p.range}</p>
                  <ul className={s.planLines}>
                    {p.lines.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </div>
                <Link href="/start" className={s.planStrip}>
                  <span>Start for ${p.price}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section id="faq" className={s.faq} aria-labelledby="faq-head">
          <div className={`${s.faqHead} field-pink`}>
            <h2 id="faq-head" className="display" data-reveal>
              Fair questions.
            </h2>
          </div>
          <dl>
            {FAQ.map((f, i) => (
              <div key={f.q} className={`${s.faqBand} ${i % 2 ? "field-white" : "field-yellow"}`}>
                <dt className={s.faqQ} data-reveal>
                  {f.q}
                </dt>
                <dd className={s.faqA} data-reveal style={{ ["--d" as string]: 1 }}>
                  {f.a}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={`${s.cta} field-blue`} aria-labelledby="cta">
          <div className={s.ctaText}>
            <h2 id="cta" className={`${s.ctaHead} display`} data-reveal>
              Make it good.
            </h2>
            <figure className={s.ctaPhoto} data-reveal style={{ ["--d" as string]: 1 }}>
              <img src="/img/guanqian-road.jpg" alt="Scooters waiting at a traffic light on Guanqian Road, Taipei" width={1600} height={1067} loading="lazy" />
            </figure>
          </div>
          <div className={s.ctaUi} data-reveal style={{ ["--d" as string]: 1 }}>
            <StartDialog />
          </div>
        </section>
      </main>

      <footer className={`${s.footer} field-black`}>
        <Wordmark />
        <div className={s.footRow}>
          <ul className={s.footLinks}>
            <li>
              <Link href="/start">Start a settlement</Link>
            </li>
            <li>
              <a href="#how">How it works</a>
            </li>
            <li>
              <a href="#pricing">Pricing</a>
            </li>
            <li>
              <Link href="/review">Reviewer desk</Link>
            </li>
            <li>
              <a href="https://www.lawhelp.org" rel="noreferrer">
                Find legal aid
              </a>
            </li>
          </ul>
          <p className={s.footLegal}>
            MakeGood is not a law firm and does not give legal advice. Reviewers are not attorneys. Payments are held by our payment provider, not by MakeGood.
          </p>
        </div>
        <p className={s.credits}>
          Film: <a href="https://commons.wikimedia.org/w/index.php?curid=134769417">Taipei Bridge</a>, Tze Chiang Hao, <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>. Photos:{" "}
          <a href="https://commons.wikimedia.org/w/index.php?curid=15530725">allenhsudesign</a>, <a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a>;{" "}
          <a href="https://commons.wikimedia.org/w/index.php?curid=4226492">Jim Epler</a>, <a href="https://creativecommons.org/licenses/by/2.0/">CC BY 2.0</a>;{" "}
          <a href="https://wordpress.org/photos/photo/98867d8fb4/">Yam B Chhetri</a>, <a href="https://commons.wikimedia.org/w/index.php?curid=71796220">Daderot</a> and{" "}
          <a href="https://www.rawpixel.com/image/3290249/free-photo-image-motorcycle-city-people-building">rawpixel</a>, CC0.
        </p>
        <p className={s.footLast}>© 2026 MakeGood. Built at c0mpiled Taipei.</p>
      </footer>
    </>
  );
}
