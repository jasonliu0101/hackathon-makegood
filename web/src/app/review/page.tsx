import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AppShell, StagePill, initials, photoFor } from "@/components/AppShell";
import { listCases } from "@/lib/store";
import { REVIEWER, REVIEW_CHECKLIST, REVIEW_FEE_USD, type CaseFile } from "@/lib/types";
import s from "@/components/app.module.css";
import r from "@/components/review.module.css";

export const metadata: Metadata = { title: "Reviewer desk — MakeGood" };

const waited = (iso: string) => {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  return m < 60 ? `${m} min` : m < 48 * 60 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`;
};

function Thumb({ c }: { c: CaseFile }) {
  const img = photoFor(c.intake.story);
  return (
    <span className={r.thumb}>
      {img && <img src={img} alt="" />}
    </span>
  );
}

export default async function ReviewPage() {
  await connection();
  const cases = await listCases();
  const open = cases
    .filter((c) => c.stage === "drafted" || c.stage === "changes_requested" || c.stage === "in_review")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const reviewed = cases.filter((c) => c.reviewer && !["drafted", "in_review", "changes_requested"].includes(c.stage));
  const earned = reviewed.length * REVIEW_FEE_USD;

  return (
    <AppShell current="review">
      <div className={r.head}>
        <div className={r.me}>
          <span className={r.avatar} aria-hidden="true">
            {initials(REVIEWER.name)}
          </span>
          <div>
            <h1 className={s.h1}>Reviewer desk</h1>
            <p className={r.cred}>
              {REVIEWER.name} · {REVIEWER.credential}
            </p>
          </div>
        </div>
        <dl className={r.stats}>
          <div>
            <dt>Open</dt>
            <dd className="tnum">{open.length}</dd>
          </div>
          <div>
            <dt>Done</dt>
            <dd className="tnum">{reviewed.length}</dd>
          </div>
          <div className={r.earned}>
            <dt>Earned</dt>
            <dd className="tnum">${earned}</dd>
          </div>
        </dl>
      </div>

      <div className={r.cols}>
        <section className={s.panel} aria-labelledby="q-h">
          <div className={r.panelHead}>
            <h2 id="q-h" className={s.panelTitle}>
              Queue
            </h2>
          </div>
          {open.length === 0 ? (
            <p className={s.empty}>Queue clear.</p>
          ) : (
            <table className={r.table}>
              <thead>
                <tr>
                  <th scope="col">Case</th>
                  <th scope="col" className={r.num}>
                    Amount
                  </th>
                  <th scope="col" className={r.num}>
                    Waiting
                  </th>
                  <th scope="col">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {open.map((c, i) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/case/${c.id}?as=reviewer`} className={r.caseLink}>
                        <Thumb c={c} />
                        <span className={r.caseText}>
                          <span className={r.what}>{c.agreement.title}</span>
                          <span className={r.loc}>
                            <span className="tnum">{c.id}</span>
                            {c.agreement.flags.length > 0 && (
                              <span className={r.flag}>
                                {c.agreement.flags.length} flag{c.agreement.flags.length > 1 ? "s" : ""}
                              </span>
                            )}
                            {c.stage !== "drafted" && <StagePill stage={c.stage} />}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className={`${r.num} ${r.amt} tnum`}>${c.hold.amountUsd.toLocaleString("en-US")}</td>
                    <td className={`${r.num} ${r.wait} tnum`}>{waited(c.createdAt)}</td>
                    <td className={r.go}>
                      <Link href={`/case/${c.id}?as=reviewer`} className={i === 0 ? "btn" : "btn btn-ink"} tabIndex={-1}>
                        {c.stage === "in_review" ? "Continue" : `Review · $${REVIEW_FEE_USD}`}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reviewed.length > 0 && (
            <>
              <h2 className={`${s.panelTitle} ${r.doneHead}`}>Done</h2>
              <ul className={r.done}>
                {reviewed.slice(0, 5).map((c) => (
                  <li key={c.id}>
                    <Link href={`/case/${c.id}?as=reviewer`} className={r.caseLink}>
                      <Thumb c={c} />
                      <span className={r.caseText}>
                        <span className={r.what}>{c.agreement.title}</span>
                        <span className={r.loc}>
                          <StagePill stage={c.stage} />
                        </span>
                      </span>
                    </Link>
                    <span className={`${r.plus} tnum`}>+${REVIEW_FEE_USD}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <aside className={r.side}>
          <section className={`${s.panel} ${r.rules}`} aria-labelledby="rules-h">
            <h2 id="rules-h" className={s.panelTitle}>
              The six checks
            </h2>
            <ol>
              {REVIEW_CHECKLIST.map((x) => (
                <li key={x.id}>{x.label}</li>
              ))}
            </ol>
          </section>
          <section className={`${s.panel} ${r.line}`} aria-labelledby="line-h">
            <h2 id="line-h" className="sr-only">
              Where the line is
            </h2>
            <p className={r.can}>
              <b>Flag</b> gaps. Refer the rest to an attorney.
            </p>
            <p className={r.cannot}>
              <b>Never</b> judge the amount, the fault or the odds.
            </p>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
