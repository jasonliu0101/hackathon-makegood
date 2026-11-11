"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Mrs_Saint_Delafield } from "next/font/google";
import s from "./app.module.css";
import c from "./caseroom.module.css";
import { StagePill, initials } from "./AppShell";
import type { CaseFile, Stage } from "@/lib/types";
import { NOTARY, REVIEWER, REVIEW_FEE_USD, TEMPLATE } from "@/lib/types";
import type { CaseAction } from "@/lib/actions";

const signature = Mrs_Saint_Delafield({ weight: "400", subsets: ["latin"], display: "swap" });

export type Viewer = "responsible" | "affected" | "reviewer" | "notary";

const STEPS: { key: string; label: string; reached: (st: Stage) => boolean }[] = [
  { key: "draft", label: "Drafted", reached: () => true },
  { key: "review", label: "Checked", reached: (st) => ["awaiting_signatures", "awaiting_funds", "held", "released", "disputed"].includes(st) },
  { key: "sign", label: "Signed", reached: (st) => ["awaiting_funds", "held", "released", "disputed"].includes(st) },
  { key: "hold", label: "Paid in", reached: (st) => ["held", "released", "disputed"].includes(st) },
  { key: "done", label: "Made good", reached: (st) => st === "released" },
];

/** Which clause each checklist item verifies, so every tick points at a line of the agreement. */
const CHECK_TO_CLAUSE: Record<string, string[]> = {
  parties: ["Parties", "Signatures"],
  facts: ["What happened"],
  amount: ["What will be done", "Payment hold"],
  deadline: ["What will be done", "If it goes wrong"],
  release: ["Release"],
  scope: ["What happened"],
};

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const when = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
const dateOnly = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
const first = (name: string) => name.split(/\s+/)[0] ?? name;

export function CaseRoom({ initial, initialViewer, payments = "simulated" }: { initial: CaseFile; initialViewer: Viewer; payments?: "stripe" | "simulated" }) {
  const [cf, setCf] = useState(initial);
  const [viewer, setViewer] = useState<Viewer>(initialViewer);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hover, setHover] = useState<string | null>(null);

  // Poll so two browser windows (one per party) stay in step.
  useEffect(() => {
    const t = setInterval(async () => {
      const r = await fetch(`/api/cases/${cf.id}`, { cache: "no-store" });
      if (r.ok) setCf(((await r.json()) as { case: CaseFile }).case);
    }, 2500);
    return () => clearInterval(t);
  }, [cf.id]);

  useEffect(() => {
    const u = new URL(window.location.href);
    u.searchParams.set("as", viewer);
    window.history.replaceState(null, "", u);
  }, [viewer]);

  /** Stripe hand-offs: Checkout for the payer, Connect onboarding for the payee. */
  const goStripe = useCallback(
    async (path: "pay" | "payee") => {
      setBusy(true);
      setError("");
      try {
        const r = await fetch(`/api/cases/${cf.id}/${path}`, { method: "POST" });
        const d = (await r.json()) as { url?: string; error?: string };
        if (d.url) {
          window.location.assign(d.url);
          return;
        }
        setError(d.error ?? "Stripe didn’t respond. Try again.");
      } catch {
        setError("No connection. Try again.");
      }
      setBusy(false);
    },
    [cf.id],
  );

  const act = useCallback(
    async (a: CaseAction) => {
      setBusy(true);
      setError("");
      try {
        const r = await fetch(`/api/cases/${cf.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(a) });
        const d = (await r.json()) as { case?: CaseFile; error?: string };
        if (d.case) setCf(d.case);
        if (!r.ok) setError(d.error ?? "That didn’t go through. Try again.");
      } catch {
        setError("No connection. Try again.");
      }
      setBusy(false);
    },
    [cf.id],
  );

  // Bring the clause a check points at into view, so the highlight is always seen.
  useEffect(() => {
    if (!hover) return;
    const t = setTimeout(() => {
      const els = [...document.querySelectorAll<HTMLElement>("[data-lit]")];
      if (els.length === 0) return;
      const top = Math.min(...els.map((e) => e.getBoundingClientRect().top));
      const bottom = Math.max(...els.map((e) => e.getBoundingClientRect().bottom));
      const vh = window.innerHeight;
      if (top >= 16 && bottom <= vh - 16) return;
      const delta = bottom - top > vh - 32 || top < 16 ? top - 24 : bottom - vh + 24;
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollBy({ top: delta, behavior: smooth ? "smooth" : "auto" });
    }, 140);
    return () => clearTimeout(t);
  }, [hover]);

  const sigsRef = useRef<HTMLDivElement>(null);
  // When a new signature lands, bring the signature lines into view so it is seen being written.
  const signedCount = Number(!!cf.responsible.signedAt) + Number(!!cf.affected.signedAt);
  const lastSigned = useRef(signedCount);
  useEffect(() => {
    if (signedCount <= lastSigned.current) return;
    lastSigned.current = signedCount;
    const el = sigsRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top >= 0 && r.bottom <= window.innerHeight) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" });
  }, [signedCount]);

  const a = cf.agreement;
  const lit = hover ? (CHECK_TO_CLAUSE[hover] ?? []) : [];
  const reachedCount = STEPS.filter((st) => st.reached(cf.stage)).length;
  const offTrack = cf.stage === "escalated" || cf.stage === "disputed";
  const signing = cf.stage === "awaiting_signatures";

  return (
    <div className={c.room}>
      <div className={c.head}>
        <div className={c.headText}>
          <p className={c.caseId}>
            <span className="tnum">{cf.id}</span>
            <span>
              {cf.draftedBy === "claude" ? "Drafted by Claude" : cf.draftedBy === "gmi" ? "Drafted on our model · GMI Cloud" : "Drafted from the template"}
            </span>
          </p>
          <h1 className={s.h1}>{a.title}</h1>
        </div>
        <div className={c.viewAs} role="group" aria-label="View this case as">
          {(cf.notary ? (["responsible", "affected", "reviewer", "notary"] as const) : (["responsible", "affected", "reviewer"] as const)).map((v) => {
            const name = v === "reviewer" ? "Reviewer" : v === "notary" ? "Notary" : cf[v].name;
            return (
              <button key={v} type="button" aria-pressed={viewer === v} onClick={() => setViewer(v)}>
                <span className={c.avatar} data-who={v} aria-hidden="true">
                  {v === "reviewer" ? initials(REVIEWER.name) : v === "notary" ? initials(NOTARY.name) : initials(name)}
                </span>
                {name}
              </button>
            );
          })}
        </div>
      </div>

      <ol className={c.steps} aria-label="Progress" data-off={offTrack ? "" : undefined}>
        {STEPS.map((st, i) => {
          const on = st.reached(cf.stage);
          const now = !offTrack && i === reachedCount && cf.stage !== "released";
          return (
            <li key={st.key} data-on={on ? "" : undefined} data-now={now ? "" : undefined} aria-current={now ? "step" : undefined}>
              <span className={c.stepBar} aria-hidden="true" />
              {st.label}
            </li>
          );
        })}
      </ol>

      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}

      <div className={c.cols}>
        <article className={`${s.panel} ${c.doc}`} aria-labelledby="doc-h">
          <div className={c.docHead}>
            <h2 id="doc-h" className={c.docTitle}>
              Settlement and release
            </h2>
            <p className={`${c.docAmt} tnum`}>{usd(a.amountUsd)}</p>
          </div>
          <p className={c.template}>
            Template <span className="tnum">{TEMPLATE.id} v{TEMPLATE.version}</span> · certified by {TEMPLATE.certifiedBy}, {TEMPLATE.bar}
          </p>
          <p className={c.summary}>{a.summary}</p>

          <div className={c.plain}>
            <h3 className={c.plainHead}>In plain English</h3>
            <ul>
              {a.plainEnglish.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>

          {a.clauses.map((cl, i) => (
            <section key={cl.heading} className={c.clause} data-lit={lit.includes(cl.heading) ? "" : undefined}>
              <h3>
                <span className={c.clauseNo}>{i + 1}</span>
                {cl.heading}
              </h3>
              <p>{cl.body}</p>
            </section>
          ))}

          {cf.reviewer && !["drafted", "in_review", "changes_requested"].includes(cf.stage) && cf.stage !== "escalated" && (
            <p className={c.checkedBy}>
              <span className={c.tick} aria-hidden="true" />
              Checked by {cf.reviewer.name}, {cf.reviewer.credential}
              <span className="tnum"> · {cf.checklist.filter((x) => x.done).length} of {cf.checklist.length}</span>
            </p>
          )}

          <div className={c.sigs} ref={sigsRef}>
            {(["responsible", "affected"] as const).map((p) => {
              const signed = cf[p].signedAt;
              const mine = signing && !signed && viewer === p;
              return (
                <div key={p} className={c.sig} data-mine={mine ? "" : undefined}>
                  <span className={`${c.sigInk} ${signature.className}`} aria-hidden={!signed}>
                    {signed ? cf[p].name : ""}
                  </span>
                  <span className={c.sigLine}>
                    <b>{cf[p].name}</b>
                    <span className="tnum">{signed ? when(signed) : mine ? "Sign here" : "Not signed"}</span>
                  </span>
                </div>
              );
            })}
          </div>
          {cf.notary?.notarizedAt && <NotarySeal cf={cf} />}
          <p className={c.legal}>MakeGood is not a law firm and does not give legal advice.</p>
        </article>

        <div className={c.rail}>
          <section className={`${s.panel} ${c.now}`} aria-labelledby="now-h" aria-live="polite">
            {viewer === "reviewer" ? (
              <ReviewerPanel cf={cf} busy={busy} act={act} setHover={setHover} />
            ) : viewer === "notary" ? (
              <NotaryDesk cf={cf} busy={busy} act={act} />
            ) : (
              <PartyPanel cf={cf} viewer={viewer} busy={busy} act={act} payments={payments} goStripe={goStripe} />
            )}
          </section>

          <HoldPanel cf={cf} payments={payments} />

          {viewer !== "notary" && <NotaryPanel cf={cf} viewer={viewer} busy={busy} act={act} />}

          <section className={`${s.panel} ${c.record}`} aria-labelledby="log-h">
            <h2 id="log-h" className={c.railTitle}>
              Record
            </h2>
            <ol className={c.log}>
              {[...cf.events].reverse().map((e, i) => (
                <li key={`${e.at}-${cf.events.length - i}`}>
                  <span className={c.logWhen}>
                    <span className="tnum">{when(e.at)}</span> · {e.who}
                  </span>
                  {e.text}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ── The hold: where the money is, shown as a place on a line ─────────── */
function HoldPanel({ cf, payments }: { cf: CaseFile; payments: "stripe" | "simulated" }) {
  const pos = cf.hold.releasedAt ? 2 : cf.hold.fundedAt ? 1 : 0;
  const state = cf.hold.releasedAt
    ? `Released to ${first(cf.affected.name)}`
    : cf.hold.fundedAt
      ? cf.stage === "disputed"
        ? "Held while it’s sorted out"
        : `Held · auto-release ${dateOnly(cf.hold.autoReleaseAt)}`
      : "Not paid in";
  return (
    <section className={`${s.panel} ${c.hold}`} data-pos={pos} aria-labelledby="hold-h">
      <h2 id="hold-h" className={c.railTitle}>
        Payment hold
      </h2>
      <p className={`${c.holdAmt} tnum`}>{usd(cf.hold.amountUsd)}</p>
      <p className={c.holdState}>{state}</p>
      {payments === "stripe" && (
        <p className={c.stripeLine}>
          Stripe test mode{cf.hold.stripe?.paymentIntentId ? ` · ${cf.hold.stripe.paymentIntentId}` : ""}
          {cf.affected.payoutsReady ? ` · to ${cf.affected.stripeAccountId}` : ""}
        </p>
      )}
      <div className={c.track} style={{ "--pos": pos } as React.CSSProperties} aria-hidden="true">
        <span className={c.trackLine} />
        <span className={c.trackFill} />
        <span className={c.tokenRail}>
          <span className={c.token} />
        </span>
        <span className={c.stop} />
        <span className={c.stop} />
        <span className={c.stop} />
      </div>
      <div className={c.trackLabels} aria-hidden="true">
        <span>{first(cf.responsible.name)}</span>
        <span>Hold</span>
        <span>{first(cf.affected.name)}</span>
      </div>
      <dl className={c.holdList}>
        <div>
          <dt>Flat fee</dt>
          <dd className="tnum">{usd(cf.hold.feeUsd)}</dd>
        </div>
        <div>
          <dt>To the reviewer</dt>
          <dd className="tnum">{usd(REVIEW_FEE_USD)}</dd>
        </div>
      </dl>
    </section>
  );
}

type PanelProps = {
  cf: CaseFile;
  busy: boolean;
  act: (a: CaseAction) => Promise<void>;
};

function NowTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 id="now-h" className={c.nowTitle}>
      {children}
    </h2>
  );
}

function Flags({ flags }: { flags: string[] }) {
  if (flags.length === 0) return null;
  return (
    <ul className={c.flags} aria-label="Flags from the draft">
      {flags.map((f) => (
        <li key={f}>{f}</li>
      ))}
    </ul>
  );
}

function ReviewerPanel({ cf, busy, act, setHover }: PanelProps & { setHover: (v: string | null) => void }) {
  const [mode, setMode] = useState<"none" | "changes">("none");
  const [notes, setNotes] = useState("");
  const clauseNo = (id: string) =>
    (CHECK_TO_CLAUSE[id] ?? [])
      .map((h) => cf.agreement.clauses.findIndex((cl) => cl.heading === h) + 1)
      .filter((n, i, arr) => n > 0 && arr.indexOf(n) === i);

  if (cf.stage === "drafted" || cf.stage === "changes_requested")
    return (
      <>
        <NowTitle>{cf.stage === "changes_requested" ? "Back for another look" : "Open for review"}</NowTitle>
        <p className={`${c.nowFigure} tnum`}>${REVIEW_FEE_USD}</p>
        <Flags flags={cf.agreement.flags} />
        <button type="button" className={`btn ${c.primary}`} disabled={busy} onClick={() => act({ type: "claim", reviewer: REVIEWER.name, credential: REVIEWER.credential })}>
          Pick up this review
        </button>
      </>
    );

  if (cf.stage === "in_review") {
    const done = cf.checklist.filter((x) => x.done).length;
    const allDone = done === cf.checklist.length;
    return (
      <>
        <div className={c.nowRow}>
          <NowTitle>Six checks</NowTitle>
          <p className={`${c.count} tnum`} data-full={allDone ? "" : undefined}>
            {done}/{cf.checklist.length}
          </p>
        </div>
        <div className={c.meter} aria-hidden="true">
          <span style={{ transform: `scaleX(${done / cf.checklist.length})` }} />
        </div>
        <Flags flags={cf.agreement.flags} />
        <ul className={c.checklist} onMouseLeave={() => setHover(null)}>
          {cf.checklist.map((x) => (
            <li key={x.id} onMouseEnter={() => setHover(x.id)} onFocus={() => setHover(x.id)} onBlur={() => setHover(null)}>
              <label data-done={x.done ? "" : undefined}>
                <input type="checkbox" checked={x.done} disabled={busy} onChange={(e) => act({ type: "check", id: x.id, done: e.target.checked })} />
                <span className={c.box} aria-hidden="true" />
                <span className={c.checkText}>{x.label}</span>
                <span className={`${c.refs} tnum`} aria-label={`Clause ${clauseNo(x.id).join(" and ")}`}>
                  {clauseNo(x.id).map((n) => (
                    <span key={n}>{n}</span>
                  ))}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <button type="button" className={`btn ${c.primary}`} disabled={busy || !allDone} onClick={() => act({ type: "approve" })}>
          Approve · send to sign
        </button>
        {mode === "changes" ? (
          <div className={c.notes}>
            <label className={s.label} htmlFor="rnotes">
              What’s missing
            </label>
            <textarea id="rnotes" className={s.textarea} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} autoFocus />
            <div className={c.btnRow}>
              <button type="button" className="btn btn-ink" disabled={busy || !notes.trim()} onClick={() => act({ type: "request_changes", notes })}>
                Send back
              </button>
              <button type="button" className={c.textBtn} onClick={() => setMode("none")}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className={c.minor}>
            <button type="button" className={c.textBtn} disabled={busy} onClick={() => setMode("changes")}>
              Ask for changes
            </button>
            <button type="button" className={c.textBtn} disabled={busy} onClick={() => act({ type: "escalate", notes: "Facts outside the checklist." })}>
              Needs an attorney
            </button>
          </div>
        )}
      </>
    );
  }

  if (cf.stage === "escalated")
    return (
      <>
        <NowTitle>Referred to an attorney</NowTitle>
        <StagePill stage={cf.stage} />
      </>
    );

  return (
    <>
      <div className={c.nowRow}>
        <NowTitle>Review done</NowTitle>
        <p className={`${c.count} tnum`} data-full="">
          +${REVIEW_FEE_USD}
        </p>
      </div>
      <ul className={c.doneList}>
        {cf.checklist.map((x) => (
          <li key={x.id}>
            <span className={c.tick} aria-hidden="true" />
            {x.label}
          </li>
        ))}
      </ul>
      <StagePill stage={cf.stage} />
    </>
  );
}

function PartyPanel({
  cf,
  viewer,
  busy,
  act,
  payments,
  goStripe,
}: PanelProps & { viewer: "responsible" | "affected"; payments: "stripe" | "simulated"; goStripe: (p: "pay" | "payee") => Promise<void> }) {
  const connect =
    payments === "stripe" && viewer === "affected" && !cf.affected.payoutsReady && ["awaiting_signatures", "awaiting_funds"].includes(cf.stage) ? (
      <button type="button" className={`btn btn-quiet ${c.connect}`} disabled={busy} onClick={() => goStripe("payee")}>
        Get paid with Stripe
      </button>
    ) : null;
  return (
    <>
      <PartyPanelBody cf={cf} viewer={viewer} busy={busy} act={act} payments={payments} goStripe={goStripe} />
      {connect}
    </>
  );
}

function PartyPanelBody({
  cf,
  viewer,
  busy,
  act,
  payments,
  goStripe,
}: PanelProps & { viewer: "responsible" | "affected"; payments: "stripe" | "simulated"; goStripe: (p: "pay" | "payee") => Promise<void> }) {
  const [reporting, setReporting] = useState(false);
  const [notes, setNotes] = useState("");
  const me = cf[viewer];
  const other = viewer === "responsible" ? cf.affected : cf.responsible;

  switch (cf.stage) {
    case "drafted":
      return <Waiting title="With a reviewer" who="Waiting for pickup" />;
    case "in_review":
      return <Waiting title="Being checked" who={cf.reviewer ? `${cf.reviewer.name} · ${cf.checklist.filter((x) => x.done).length} of 6` : ""} />;
    case "changes_requested":
      return (
        <>
          <NowTitle>Change asked</NowTitle>
          <blockquote className={c.quote}>{cf.reviewer?.notes}</blockquote>
        </>
      );
    case "awaiting_signatures":
      return me.signedAt ? (
        <Waiting title={`Waiting for ${first(other.name)}`} who={`You signed ${when(me.signedAt)}`} />
      ) : (
        <>
          <NowTitle>Your signature</NowTitle>
          <button type="button" className={`btn ${c.primary}`} disabled={busy} onClick={() => act({ type: "sign", party: viewer })}>
            Sign as {me.name}
          </button>
        </>
      );
    case "awaiting_funds":
      return viewer === "responsible" ? (
        <>
          <NowTitle>Both signed</NowTitle>
          <button
            type="button"
            className={`btn ${c.primary}`}
            disabled={busy}
            onClick={() => (payments === "stripe" ? goStripe("pay") : act({ type: "fund" }))}
          >
            Pay {usd(cf.hold.amountUsd)} into the hold
          </button>
        </>
      ) : (
        <Waiting title={`Waiting for ${first(cf.responsible.name)} to pay`} who="Both signed" />
      );
    case "held":
      return viewer === "affected" ? (
        <>
          <NowTitle>Is it made good?</NowTitle>
          <button type="button" className={`btn ${c.primary}`} disabled={busy} onClick={() => act({ type: "confirm" })}>
            Yes, release {usd(cf.hold.amountUsd)}
          </button>
          {reporting ? (
            <div className={c.notes}>
              <label className={s.label} htmlFor="dnotes">
                What’s wrong
              </label>
              <textarea id="dnotes" className={s.textarea} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} autoFocus />
              <div className={c.btnRow}>
                <button type="button" className="btn btn-ink" disabled={busy || !notes.trim()} onClick={() => act({ type: "dispute", notes })}>
                  Report it
                </button>
                <button type="button" className={c.textBtn} onClick={() => setReporting(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className={c.minor}>
              <button type="button" className={c.textBtn} disabled={busy} onClick={() => setReporting(true)}>
                Report a problem
              </button>
            </div>
          )}
        </>
      ) : (
        <Waiting title={`Waiting for ${first(cf.affected.name)}`} who="Paid in" />
      );
    case "released":
      return (
        <>
          <NowTitle>Made good</NowTitle>
          <p className={c.doneLine}>
            <span className={c.tick} aria-hidden="true" />
            <span>
              Released to {first(cf.affected.name)} <span className="tnum">{when(cf.hold.releasedAt)}</span>
            </span>
          </p>
        </>
      );
    case "disputed":
      return <Waiting title="Problem reported" who="Money stays held" />;
    case "escalated":
      return <NowTitle>Referred to an attorney</NowTitle>;
  }
}

/* ── Partner notary: an enforceable deed, and the transfer certified against it ── */
const twd = (n: number) => `NT$${n.toLocaleString("en-US")}`;

function NotarySeal({ cf }: { cf: CaseFile }) {
  const n = cf.notary!;
  return (
    <div className={c.seal}>
      <span className={c.sealMark} aria-hidden="true">
        <span>公證</span>
      </span>
      <dl className={c.sealText}>
        <div>
          <dt>Deed</dt>
          <dd className="tnum">{n.deedNo}</dd>
        </div>
        <div>
          <dt>Signing</dt>
          <dd>
            {cf.responsible.name} and {cf.affected.name}, IDs checked
          </dd>
        </div>
        <div>
          <dt>Enforceable</dt>
          <dd>Without a lawsuit · Notary Act, Art. 13</dd>
        </div>
        <div>
          <dt>Notary</dt>
          <dd>
            {NOTARY.name}, {NOTARY.office} <span className="tnum">· {dateOnly(n.notarizedAt)}</span>
          </dd>
        </div>
        {n.certifiedAt && (
          <div>
            <dt>Performance</dt>
            <dd>
              {usd(cf.hold.amountUsd)} to {cf.affected.name} certified <span className="tnum">· {dateOnly(n.certifiedAt)}</span>
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

function NotaryPanel({ cf, viewer, busy, act }: PanelProps & { viewer: Viewer }) {
  const n = cf.notary;
  const party = viewer === "responsible" || viewer === "affected" ? viewer : null;
  const canAsk = !n && party && (cf.stage === "awaiting_funds" || cf.stage === "held");
  if (!n && !canAsk) return null;
  return (
    <section className={`${s.panel} ${c.notary}`} data-sealed={n?.notarizedAt ? "" : undefined} aria-labelledby="notary-h">
      <div className={c.nowRow}>
        <h2 id="notary-h" className={c.railTitle}>
          Notary
        </h2>
        <p className={`${c.notaryFee} tnum`}>{twd(NOTARY.feeTwd)}</p>
      </div>
      {canAsk ? (
        <button type="button" className={`btn btn-quiet ${c.connect}`} disabled={busy} onClick={() => act({ type: "notary_request", party: party! })}>
          Ask a partner notary
        </button>
      ) : n?.certifiedAt ? (
        <p className={c.doneLine}>
          <span className={c.tick} aria-hidden="true" />
          <span>Transfer certified · {n.deedNo}</span>
        </p>
      ) : n?.notarizedAt ? (
        <p className={c.doneLine}>
          <span className={c.tick} aria-hidden="true" />
          <span>Sealed · {n.deedNo}</span>
        </p>
      ) : (
        <p className={c.waiting}>
          <span className={c.pulse} aria-hidden="true" />
          With {NOTARY.name}
        </p>
      )}
    </section>
  );
}

function NotaryDesk({ cf, busy, act }: PanelProps) {
  const [ids, setIds] = useState<Record<string, boolean>>({});
  const n = cf.notary;
  if (!n) return <Waiting title="No request" who={NOTARY.office} />;
  if (n.certifiedAt)
    return (
      <>
        <NowTitle>Transfer certified</NowTitle>
        <p className={c.doneLine}>
          <span className={c.tick} aria-hidden="true" />
          <span>
            {usd(cf.hold.amountUsd)} to {first(cf.affected.name)} · <span className="tnum">{n.deedNo}</span>
          </span>
        </p>
      </>
    );
  if (n.notarizedAt)
    return (
      <>
        <NowTitle>Sealed</NowTitle>
        <p className={`${c.nowFigure} tnum`}>{n.deedNo}</p>
        <p className={c.waiting}>
          <span className={c.pulse} aria-hidden="true" />
          {cf.stage === "held" ? `Waiting for ${first(cf.affected.name)} to release` : cf.stage === "disputed" ? "Problem reported" : `Waiting for ${first(cf.responsible.name)} to pay`}
        </p>
      </>
    );
  if (cf.stage !== "awaiting_funds" && cf.stage !== "held")
    return (
      <>
        <NowTitle>Not sealed</NowTitle>
        <StagePill stage={cf.stage} />
      </>
    );
  const people = [cf.responsible, cf.affected];
  const allIds = people.every((p) => ids[p.name]);
  return (
    <>
      <div className={c.nowRow}>
        <NowTitle>Seal this agreement</NowTitle>
        <p className={`${c.count} tnum`}>{twd(NOTARY.feeTwd)}</p>
      </div>
      <ul className={c.checklist}>
        {people.map((p) => (
          <li key={p.name}>
            <label data-done={ids[p.name] ? "" : undefined}>
              <input type="checkbox" checked={!!ids[p.name]} disabled={busy} onChange={(e) => setIds((m) => ({ ...m, [p.name]: e.target.checked }))} />
              <span className={c.box} aria-hidden="true" />
              <span className={c.checkText}>ID of {p.name}</span>
            </label>
          </li>
        ))}
      </ul>
      <button type="button" className={`btn ${c.primary}`} disabled={busy || !allIds} onClick={() => act({ type: "notarize" })}>
        Seal with enforcement clause
      </button>
    </>
  );
}

function Waiting({ title, who }: { title: string; who: string }) {
  return (
    <>
      <NowTitle>{title}</NowTitle>
      <p className={c.waiting}>
        <span className={c.pulse} aria-hidden="true" />
        {who}
      </p>
    </>
  );
}
