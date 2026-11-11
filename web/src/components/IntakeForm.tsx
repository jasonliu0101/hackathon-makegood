"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import s from "./app.module.css";
import f from "./intake.module.css";
import { MAX_AMOUNT_USD, SAMPLE_PARTIES, feeFor } from "@/lib/types";
import { SCENARIOS, scenarioById } from "@/lib/scenarios";

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const shortDate = (d: string) => (d ? new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—");

type Remedy = "payment" | "repair" | "replacement";
const REMEDY_LABEL: Record<Remedy, string> = { payment: "Pay money", repair: "Repair it", replacement: "Replace it" };
const OTHER = "other";

export function IntakeForm({
  initialScenario,
  initialStory,
  initialRole,
  ownModel,
}: {
  initialScenario?: string;
  initialStory: string;
  initialRole: "responsible" | "affected";
  /** Our own model on GMI Cloud, when configured. */
  ownModel?: string | null;
}) {
  const router = useRouter();
  const first = scenarioById(initialScenario);
  const firstPeople = first ? SAMPLE_PARTIES[first.id] : undefined;

  const [picked, setPicked] = useState<string | null>(first ? first.id : initialStory ? OTHER : null);
  const [role, setRole] = useState(initialRole);
  const [story, setStory] = useState(first?.story ?? initialStory);
  const [location, setLocation] = useState(first?.location ?? "");
  const [incidentDate, setIncidentDate] = useState(today());
  const [amount, setAmount] = useState(first ? String(first.amountUsd) : "");
  const [remedy, setRemedy] = useState<Remedy>(first?.remedy ?? "payment");
  const [dueBy, setDueBy] = useState(inDays(14));
  const [rName, setRName] = useState(firstPeople?.responsibleName ?? "");
  const [rEmail, setREmail] = useState(firstPeople?.responsibleEmail ?? "");
  const [aName, setAName] = useState(firstPeople?.affectedName ?? "");
  const [aEmail, setAEmail] = useState(firstPeople?.affectedEmail ?? "");
  const [draftOn, setDraftOn] = useState<"gmi" | "claude">(ownModel ? "gmi" : "claude");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const amountNum = Number(amount);
  const tooBig = amountNum > MAX_AMOUNT_USD;
  const outside = tooBig;

  function pick(id: string) {
    setPicked(id);
    const sc = scenarioById(id);
    const people = sc ? SAMPLE_PARTIES[sc.id] : undefined;
    setStory(sc?.story ?? "");
    setLocation(sc?.location ?? "");
    setAmount(sc ? String(sc.amountUsd) : "");
    setRemedy(sc?.remedy ?? "payment");
    setRName(people?.responsibleName ?? "");
    setREmail(people?.responsibleEmail ?? "");
    setAName(people?.affectedName ?? "");
    setAEmail(people?.affectedEmail ?? "");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          story,
          location,
          incidentDate,
          amountUsd: amountNum,
          remedy,
          dueBy,
          responsibleName: rName,
          responsibleEmail: rEmail,
          affectedName: aName,
          affectedEmail: aEmail,
          outOfScope: [],
          draftOn,
        }),
      });
      const data = (await res.json()) as { case?: { id: string }; error?: string };
      if (!res.ok || !data.case) throw new Error(data.error ?? "The draft could not be written. Try again.");
      router.push(`/case/${data.case.id}?as=${role}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The draft could not be written. Try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <h1 className={`${s.h1} ${f.title}`}>What happened?</h1>

      <fieldset className={f.picker} data-picked={picked ? "" : undefined}>
        <legend className="sr-only">Pick what happened</legend>
        {SCENARIOS.map((sc) => (
          <label key={sc.id} className={f.tile} data-on={picked === sc.id ? "" : undefined}>
            <input type="radio" name="scenario" value={sc.id} checked={picked === sc.id} onChange={() => pick(sc.id)} />
            <span className={f.tilePic}>
              {sc.img ? (
                <img src={sc.img} alt="" loading="eager" />
              ) : (
                <span className={f.plus} aria-hidden="true" />
              )}
              <span className={`${f.tileAmt} tnum`}>${sc.amountUsd}</span>
            </span>
            <span className={f.tileText}>
              <span className={f.tileName}>{sc.name}</span>
            </span>
          </label>
        ))}
        <label className={f.tile} data-on={picked === OTHER ? "" : undefined}>
          <input type="radio" name="scenario" value={OTHER} checked={picked === OTHER} onChange={() => pick(OTHER)} />
          <span className={`${f.tilePic} ${f.tileBlank}`}>
            <span className={f.plus} aria-hidden="true" />
          </span>
          <span className={f.tileText}>
            <span className={f.tileName}>Something else</span>
          </span>
        </label>
      </fieldset>

      {picked && (
        <div className={f.layout} key={picked === OTHER ? OTHER : "scenario"}>
          <div>
            {error && (
              <p className={s.error} role="alert">
                {error}
              </p>
            )}

            <section className={`${s.panel} ${f.block}`} aria-labelledby="h-what">
              <div className={f.blockHead}>
                <h2 id="h-what" className={s.panelTitle}>
                  The incident
                </h2>
                <fieldset className={f.seg}>
                  <legend className="sr-only">You are the one who</legend>
                  <div className={f.segRow}>
                    {(["responsible", "affected"] as const).map((r) => (
                      <label key={r} className={role === r ? f.segOn : undefined}>
                        <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} />
                        {r === "responsible" ? "I caused it" : "It happened to me"}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
              <div className={s.field}>
                <label className={s.label} htmlFor="story">
                  In your own words
                </label>
                <textarea id="story" className={s.textarea} rows={4} required value={story} onChange={(e) => setStory(e.target.value)} />
              </div>
              <div className={f.grid21}>
                <div className={s.field}>
                  <label className={s.label} htmlFor="loc">
                    Where
                  </label>
                  <input id="loc" className={s.input} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Street, city" />
                </div>
                <div className={s.field}>
                  <label className={s.label} htmlFor="date">
                    When
                  </label>
                  <input id="date" type="date" className={s.input} required value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} />
                </div>
              </div>
            </section>

            <section className={`${s.panel} ${f.block}`} aria-labelledby="h-fix">
              <h2 id="h-fix" className={s.panelTitle}>
                Making it good
              </h2>
              <fieldset className={f.seg}>
                <legend className="sr-only">Remedy</legend>
                <div className={f.segRow3}>
                  {(["payment", "repair", "replacement"] as const).map((r) => (
                    <label key={r} className={remedy === r ? f.segOn : undefined}>
                      <input type="radio" name="remedy" value={r} checked={remedy === r} onChange={() => setRemedy(r)} />
                      {REMEDY_LABEL[r]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className={s.grid2}>
                <div className={s.field}>
                  <label className={s.label} htmlFor="amt">
                    Amount, US dollars
                  </label>
                  <div className={f.money}>
                    <span aria-hidden="true">$</span>
                    <input
                      id="amt"
                      className={`${s.input} tnum`}
                      inputMode="decimal"
                      required
                      value={amount}
                      aria-invalid={tooBig || undefined}
                      aria-describedby={tooBig ? "amt-max" : undefined}
                      onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                    />
                  </div>
                  {tooBig && (
                    <p className={f.fieldErr} id="amt-max">
                      Over ${MAX_AMOUNT_USD.toLocaleString("en-US")}
                    </p>
                  )}
                </div>
                <div className={s.field}>
                  <label className={s.label} htmlFor="due">
                    Done by
                  </label>
                  <input id="due" type="date" className={s.input} required value={dueBy} min={today()} onChange={(e) => setDueBy(e.target.value)} />
                </div>
              </div>
            </section>

            <section className={`${s.panel} ${f.block}`} aria-labelledby="h-who">
              <h2 id="h-who" className={s.panelTitle}>
                Who
              </h2>
              <div className={s.grid2}>
                <div className={f.person}>
                  <p className={f.who}>
                    Caused it{role === "responsible" && <span className={f.you}>You</span>}
                  </p>
                  <label className="sr-only" htmlFor="rn">
                    Name of the person who caused it
                  </label>
                  <input id="rn" className={s.input} required value={rName} onChange={(e) => setRName(e.target.value)} placeholder="Name" autoComplete={role === "responsible" ? "name" : "off"} />
                  <label className="sr-only" htmlFor="re">
                    Email of the person who caused it
                  </label>
                  <input id="re" type="email" className={s.input} required value={rEmail} onChange={(e) => setREmail(e.target.value)} placeholder="Email" autoComplete={role === "responsible" ? "email" : "off"} />
                </div>
                <div className={f.person}>
                  <p className={f.who}>
                    Affected{role === "affected" && <span className={f.you}>You</span>}
                  </p>
                  <label className="sr-only" htmlFor="an">
                    Name of the person affected
                  </label>
                  <input id="an" className={s.input} required value={aName} onChange={(e) => setAName(e.target.value)} placeholder="Name" autoComplete={role === "affected" ? "name" : "off"} />
                  <label className="sr-only" htmlFor="ae">
                    Email of the person affected
                  </label>
                  <input id="ae" type="email" className={s.input} required value={aEmail} onChange={(e) => setAEmail(e.target.value)} placeholder="Email" autoComplete={role === "affected" ? "email" : "off"} />
                </div>
              </div>
            </section>

          </div>

          <aside className={f.side}>
            <div className={`${s.panel} ${f.summary}`} data-outside={outside ? "" : undefined}>
              <h2 className="sr-only">Your settlement</h2>
              <p className={`${f.sumAmt} tnum`} aria-label="Amount">
                {amountNum > 0 ? `$${amountNum.toLocaleString("en-US")}` : "$0"}
              </p>
              <p className={f.sumWhat}>{REMEDY_LABEL[remedy]}</p>
              <dl className={f.sumList}>
                <div>
                  <dt>To</dt>
                  <dd>{aName || "—"}</dd>
                </div>
                <div>
                  <dt>By</dt>
                  <dd className="tnum">{shortDate(dueBy)}</dd>
                </div>
                <div>
                  <dt>Flat fee, split</dt>
                  <dd className="tnum">{amountNum > 0 ? `$${feeFor(amountNum)}` : "—"}</dd>
                </div>
              </dl>
              {ownModel && !outside && (
                <fieldset className={f.engine}>
                  <legend>Drafted by</legend>
                  <div>
                    {(
                      [
                        ["gmi", "Our model", "GMI Cloud"],
                        ["claude", "Claude", "Anthropic"],
                      ] as const
                    ).map(([v, name, where]) => (
                      <label key={v} data-on={draftOn === v ? "" : undefined}>
                        <input type="radio" name="draftOn" value={v} checked={draftOn === v} onChange={() => setDraftOn(v)} />
                        <b>{name}</b>
                        <span>{where}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              {outside && (
                <p className={f.refer} role="status">
                  Needs a licensed attorney
                </p>
              )}
              <button type="submit" className={`btn ${outside ? "btn-ink" : ""} ${f.submit}`} disabled={busy} aria-busy={busy || undefined}>
                {busy ? <span className={f.busy}>Drafting</span> : outside ? "Write up and refer" : "Draft the agreement"}
              </button>
            </div>
          </aside>
        </div>
      )}
    </form>
  );
}
