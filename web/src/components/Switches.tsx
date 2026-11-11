"use client";
import { useState } from "react";
import s from "./switches.module.css";

const ROWS = [
  { text: "Hold the money until it’s fixed.", then: "55% of small-claims winners never collect.", tone: "var(--yellow)" },
  { text: "Have a person check every line.", then: "$15, not a lawyer’s $362 hour.", tone: "var(--pink)" },
  { text: "Release this one incident only.", then: "Nothing else is given up.", tone: "var(--blue)", light: true },
  { text: "Lose nothing if it falls through.", then: "Miss the date and the hold is refunded.", tone: "var(--white)" },
  { text: "Skip the court date.", then: "No filing, no hearing, no months of waiting.", tone: "var(--accent)" },
];

export function Switches() {
  const [on, setOn] = useState<boolean[]>([true, true, false, false, false]);
  return (
    <ul className={s.list}>
      {ROWS.map((r, i) => {
        const id = `sw-${i}`;
        return (
          <li
            key={r.text}
            className={`${s.band} ${on[i] ? s.on : ""} ${r.light && on[i] ? s.light : ""}`}
            style={{ ["--tone" as string]: r.tone }}
          >
            <div className={s.copy}>
              <label htmlFor={id} className={s.sentence}>
                {r.text}
              </label>
              <p className={s.then} id={`${id}-then`} hidden={!on[i]}>
                {r.then}
              </p>
            </div>
            <button
              id={id}
              type="button"
              role="switch"
              aria-checked={on[i]}
              aria-describedby={`${id}-then`}
              data-ui
              className={s.toggle}
              onClick={() => setOn((o) => o.map((v, k) => (k === i ? !v : v)))}
            >
              <span className={s.knob} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
