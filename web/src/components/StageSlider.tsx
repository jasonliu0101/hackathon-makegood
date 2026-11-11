"use client";
import { useState } from "react";
import s from "./stages.module.css";

const STAGES = [
  { name: "Tell it", clause: ["Tell it once,", "in your words."] },
  { name: "Check it", clause: ["A person checks", "every line."] },
  { name: "Sign it", clause: ["You both sign", "the same page."] },
  { name: "Settle it", clause: ["The money waits", "until it’s fixed."] },
];

function Fragment({ stage }: { stage: number }) {
  if (stage === 0)
    return (
      <div data-ui className={s.ui}>
        <p className={s.uiTitle}>What happened?</p>
        <p className={s.uiField}>
          I backed out of a parking spot on Dunhua South Road and scraped the side panel of a parked white scooter. The owner came back. I said I’d pay for it.
        </p>
        <div className={s.uiRow}>
          <span className={s.uiLabel}>Amount</span>
          <span className={`${s.uiValue} tnum`}>$180.00</span>
        </div>
        <div className={s.uiRow}>
          <span className={s.uiLabel}>Remedy</span>
          <span className={s.uiSeg}>
            <b>Payment</b>
            <span>Repair</span>
            <span>Replace</span>
          </span>
        </div>
        <div className={s.uiRow}>
          <span className={s.uiLabel}>Pay by</span>
          <span className={`${s.uiValue} tnum`}>Nov 25, 2026</span>
        </div>
      </div>
    );
  if (stage === 1)
    return (
      <div data-ui className={s.ui}>
        <p className={s.uiTitle}>Review · MG-7KQ2PX</p>
        <ul className={s.uiChecks}>
          {[
            ["Both parties named and reachable", true],
            ["Neutral description of the incident", true],
            ["Amount matches the repair quote", true],
            ["Every obligation has a date", true],
            ["Release covers this incident only", true],
            ["No injury, insurer or minor", false],
          ].map(([label, done]) => (
            <li key={label as string} className={done ? s.done : undefined}>
              <span className={s.box} aria-hidden="true">
                {done ? "✓" : ""}
              </span>
              {label}
            </li>
          ))}
        </ul>
        <p className={s.uiFoot}>Liu J. · paralegal · 11 min so far</p>
      </div>
    );
  if (stage === 2)
    return (
      <div data-ui className={s.ui}>
        <p className={s.uiTitle}>Settlement of damage claim</p>
        <p className={s.uiClause}>
          <b>What will be done.</b> Jack Huang will pay Jason Liu $180.00 no later than November 25, 2026.
        </p>
        <p className={s.uiClause}>
          <b>Release.</b> When the money is released, each party gives up any claim about this incident only.
        </p>
        <div className={s.uiSigs}>
          <span>
            <i>Jack Huang</i>
            Signed Nov 11, 9:42 pm
          </span>
          <span>
            <i>Jason Liu</i>
            Signed Nov 11, 9:57 pm
          </span>
        </div>
      </div>
    );
  return (
    <div data-ui className={s.ui}>
      <p className={s.uiTitle}>Payment hold</p>
      <p className={`${s.uiBig} tnum`}>$180.00</p>
      <p className={s.uiStatus}>Held for Jason Liu</p>
      <div className={s.uiRow}>
        <span className={s.uiLabel}>Paid in</span>
        <span className="tnum">Nov 11, 10:03 pm</span>
      </div>
      <div className={s.uiRow}>
        <span className={s.uiLabel}>Releases</span>
        <span className="tnum">when Jason confirms, or Dec 2</span>
      </div>
      <span className={s.uiButton}>Confirm it’s made good</span>
    </div>
  );
}

export function StageSlider() {
  const [stage, setStage] = useState(0);
  const pct = (stage / (STAGES.length - 1)) * 100;
  return (
    <div className={s.wrap}>
      <div className={`${s.left} field-black`}>
        <h2 className={`${s.clause} display`} key={stage} aria-live="polite">
          <span>{STAGES[stage].clause[0]}</span> <span>{STAGES[stage].clause[1]}</span>
        </h2>
      </div>
      <div className={`${s.right} field-yellow`}>
        <div className={s.fragment} key={stage}>
          <Fragment stage={stage} />
        </div>
      </div>
      <div className={s.control}>
        <label htmlFor="stage" className="sr-only">
          Stage of a settlement
        </label>
        <div className={s.track} style={{ ["--p" as string]: `${pct}%` }}>
          <input
            id="stage"
            type="range"
            min={0}
            max={STAGES.length - 1}
            step={1}
            value={stage}
            onChange={(e) => setStage(Number(e.target.value))}
            aria-valuetext={STAGES[stage].name}
            className={s.range}
          />
        </div>
        <ol className={s.names}>
          {STAGES.map((st, i) => (
            <li key={st.name}>
              <button type="button" onClick={() => setStage(i)} className={i === stage ? s.current : undefined} aria-pressed={i === stage}>
                {st.name}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
