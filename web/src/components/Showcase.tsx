"use client";
import { useState } from "react";
import Link from "next/link";
import { SCENARIOS } from "@/lib/scenarios";
import s from "./showcase.module.css";

const DISCS = ["var(--blue)", "var(--pink)", "var(--yellow)", "var(--black)", "var(--blue)"];
const ALTS: Record<string, string> = {
  "scooter-scrape": "A white scooter parked outside a shop",
  mirror: "Scooters packed at a Taipei crossing, seen from above",
  "tipped-over": "Scooters waiting at a traffic light on Guanqian Road, Taipei",
  "plant-pot": "A terracotta plant pot with green foliage on a stone step",
  fence: "A bamboo garden fence",
};

export function Showcase() {
  const [i, setI] = useState(0);
  const it = SCENARIOS[i];
  return (
    <div className={s.wrap}>
      <div className={s.stage}>
        <div className={s.disc} style={{ background: DISCS[i % DISCS.length] }} />
        {it.img && <img key={it.id} className={s.object} src={it.img} alt={ALTS[it.id] ?? ""} width={1200} height={1200} loading="lazy" />}
        <div className={s.fact} key={`f-${it.id}`}>
          <span className={`${s.amount} tnum`}>${it.amountUsd}</span>
          <span className={s.place}>{it.location.split(",")[0]}</span>
          <Link href={`/start?scenario=${it.id}&role=responsible`} className={`btn ${s.go}`}>
            Settle this one
          </Link>
        </div>
      </div>
      <div className={s.list}>
        <h2 id="sizes" className={s.heading}>
          Too small for court.
        </h2>
        <ul role="list">
          {SCENARIOS.map((x, k) => (
            <li key={x.id}>
              <button type="button" className={k === i ? s.on : undefined} aria-pressed={k === i} onClick={() => setI(k)} onMouseEnter={() => setI(k)}>
                {x.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
