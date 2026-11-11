import Link from "next/link";
import s from "./app.module.css";
import { SCENARIOS } from "@/lib/scenarios";

export function AppShell({ children, current }: { children: React.ReactNode; current?: "start" | "review" }) {
  return (
    <div className={s.shell}>
      <nav className={s.bar} aria-label="App">
        <Link href="/" className={s.barMark}>
          MakeGood
        </Link>
        <div className={s.barLinks}>
          <Link href="/start" aria-current={current === "start" ? "page" : undefined}>
            New settlement
          </Link>
          <Link href="/review" aria-current={current === "review" ? "page" : undefined}>
            Reviewer desk
          </Link>
        </div>
      </nav>
      <main className={s.main}>{children}</main>
    </div>
  );
}

export const STAGE_LABEL: Record<string, { text: string; cls: string }> = {
  drafted: { text: "Waiting for a reviewer", cls: s.pDraft },
  in_review: { text: "In review", cls: s.pReview },
  changes_requested: { text: "Changes requested", cls: s.pWarn },
  awaiting_signatures: { text: "Waiting for signatures", cls: s.pSign },
  awaiting_funds: { text: "Waiting for payment", cls: s.pSign },
  held: { text: "Money held", cls: s.pHeld },
  released: { text: "Made good", cls: s.pDone },
  disputed: { text: "Problem reported", cls: s.pWarn },
  escalated: { text: "Referred to an attorney", cls: s.pWarn },
};

export function StagePill({ stage }: { stage: string }) {
  const l = STAGE_LABEL[stage] ?? { text: stage, cls: s.pDraft };
  return <span className={`${s.pill} ${l.cls}`}>{l.text}</span>;
}

/** The scenario photo for a case drafted from one of the standard scenarios, matched on its story. */
export function photoFor(story: string): string | undefined {
  const head = story.trim().slice(0, 40);
  return SCENARIOS.find((x) => x.story.startsWith(head))?.img;
}

/** Initials for a person's mark: "Jason Liu" → "JL", "Liu J." → "LJ". */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
