import s from "./wordmark.module.css";

const LETTERS: [string, string, number][] = [
  ["M", "var(--blue)", 100],
  ["A", "var(--yellow)", 78],
  ["K", "var(--pink)", 90],
  ["E", "var(--white)", 64],
  ["G", "var(--accent)", 96],
  ["O", "var(--yellow)", 72],
  ["O", "var(--blue)", 86],
  ["D", "var(--pink)", 100],
];

/** The name built from blocks: each letter knocked out of its own rectangle. */
export function Wordmark() {
  return (
    <div className={s.mark} role="img" aria-label="MakeGood">
      {LETTERS.map(([l, c, h], i) => (
        <span key={i} className={s.block} style={{ background: c, height: `${h}%` }}>
          <span className={s.letter}>{l}</span>
        </span>
      ))}
    </div>
  );
}
