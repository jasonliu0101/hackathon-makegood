"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SCENARIOS } from "@/lib/scenarios";
import s from "./startdialog.module.css";

type Role = "responsible" | "affected";
const OTHER = "other";

/** The product's first screen, already open: pick the case, pick your side, go. */
export function StartDialog() {
  const router = useRouter();
  const [scenario, setScenario] = useState(SCENARIOS[0].id);
  const [role, setRole] = useState<Role>("responsible");
  return (
    <form
      data-ui
      className={s.dialog}
      onSubmit={(e) => {
        e.preventDefault();
        const q = new URLSearchParams(scenario === OTHER ? { role } : { scenario, role });
        router.push(`/start?${q.toString()}`);
      }}
    >
      <fieldset className={s.cases}>
        <legend className={s.legend}>What happened?</legend>
        {[...SCENARIOS.map((c) => ({ id: c.id, name: c.name, amount: `$${c.amountUsd}` })), { id: OTHER, name: "Something else", amount: "" }].map((c) => (
          <label key={c.id} className={`${s.case} ${scenario === c.id ? s.caseOn : ""}`}>
            <input type="radio" name="scenario" value={c.id} checked={scenario === c.id} onChange={() => setScenario(c.id)} />
            <span>{c.name}</span>
            <span className="tnum">{c.amount}</span>
          </label>
        ))}
      </fieldset>
      <fieldset className={s.seg}>
        <legend className="sr-only">Your side</legend>
        <label className={role === "responsible" ? s.segOn : undefined}>
          <input type="radio" name="role" value="responsible" checked={role === "responsible"} onChange={() => setRole("responsible")} />I did it
        </label>
        <label className={role === "affected" ? s.segOn : undefined}>
          <input type="radio" name="role" value="affected" checked={role === "affected"} onChange={() => setRole("affected")} />
          It’s mine
        </label>
      </fieldset>
      <button type="submit" className={`btn ${s.submit}`}>
        Start this settlement
      </button>
    </form>
  );
}
