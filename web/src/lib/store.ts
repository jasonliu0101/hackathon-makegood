import { promises as fs } from "node:fs";
import path from "node:path";
import { templateDraft } from "./draft";
import { scenarioById } from "./scenarios";
import { REVIEWER, REVIEW_CHECKLIST, SAMPLE_PARTIES, feeFor, type CaseFile, type Intake } from "./types";

/**
 * Persistence. On Vercel: Upstash Redis over its REST API (one hash, a field per case), so every
 * serverless instance sees the same cases. Locally, with no Redis configured: one JSON file on disk.
 * Swap for a real database before anyone's money depends on it.
 */
const KEY = "mg:cases";
const SEEDED = "mg:seeded";

const redisUrl = () => (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL)?.trim().replace(/\/$/, "");
const redisToken = () => (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN)?.trim();
const onRedis = () => !!(redisUrl() && redisToken());

async function redis<T>(...command: (string | number)[]): Promise<T> {
  const res = await fetch(redisUrl()!, {
    method: "POST",
    headers: { authorization: `Bearer ${redisToken()}`, "content-type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const data = (await res.json()) as { result?: T; error?: string };
  if (!res.ok || data.error) throw new Error(`Upstash ${command[0]}: ${data.error ?? res.status}`);
  return data.result as T;
}

/** Seed the demo queue once per database. */
async function ensureSeeded() {
  if ((await redis<string | null>("SET", SEEDED, "1", "NX")) !== "OK") return;
  for (const c of seedCases()) await redis("HSETNX", KEY, c.id, JSON.stringify(c));
}

const FILE = path.join(process.cwd(), ".data", "cases.json");

type Db = { cases: Record<string, CaseFile> };
const g = globalThis as unknown as { __makegoodDbV6?: Db };

async function load(): Promise<Db> {
  if (g.__makegoodDbV6) return g.__makegoodDbV6;
  try {
    g.__makegoodDbV6 = JSON.parse(await fs.readFile(FILE, "utf8")) as Db;
  } catch {
    g.__makegoodDbV6 = { cases: {} };
    for (const c of seedCases()) g.__makegoodDbV6.cases[c.id] = c;
  }
  return g.__makegoodDbV6;
}

async function save(db: Db) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(db, null, 2));
}

export async function listCases(): Promise<CaseFile[]> {
  let all: CaseFile[];
  if (onRedis()) {
    await ensureSeeded();
    all = (await redis<string[]>("HVALS", KEY)).map((v) => JSON.parse(v) as CaseFile);
  } else {
    all = Object.values((await load()).cases);
  }
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getCase(id: string): Promise<CaseFile | undefined> {
  if (onRedis()) {
    await ensureSeeded();
    const v = await redis<string | null>("HGET", KEY, id);
    return v ? (JSON.parse(v) as CaseFile) : undefined;
  }
  return (await load()).cases[id];
}

export async function putCase(c: CaseFile): Promise<CaseFile> {
  if (onRedis()) {
    await redis("HSET", KEY, c.id, JSON.stringify(c));
    return c;
  }
  const db = await load();
  db.cases[c.id] = c;
  await save(db);
  return c;
}

export function newId(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `MG-${s}`;
}

const MIN = 60_000;
const day = (daysFromNow: number) => new Date(Date.now() + daysFromNow * 864e5).toISOString().slice(0, 10);

/** Seed queue: Taipei scooter-parking cases. Runs once per database (no .data/cases.json, or a fresh Redis). */
const SEEDS: { id: string; scenario: string; minsAgo: number; done?: boolean }[] = [
  { id: "MG-Q8M4ZT", scenario: "tipped-over", minsAgo: 26 },
  { id: "MG-3HD9WA", scenario: "mirror", minsAgo: 74 },
  { id: "MG-L2C7NB", scenario: "plant-pot", minsAgo: 26 * 60, done: true },
];

function seedCases(): CaseFile[] {
  return SEEDS.flatMap(({ id, scenario, minsAgo, done }) => {
    const sc = scenarioById(scenario);
    const people = SAMPLE_PARTIES[scenario];
    if (!sc || !people) return [];
    /** A moment `afterMins` minutes after the case was opened. */
    const at = (afterMins: number) => new Date(Date.now() - (minsAgo - afterMins) * MIN).toISOString();
    const intake: Intake = {
      story: sc.story,
      amountUsd: sc.amountUsd,
      remedy: sc.remedy,
      dueBy: day(done ? 6 : 14),
      incidentDate: day(done ? -1 : 0),
      location: sc.location,
      ...people,
      outOfScope: [],
    };
    const c: CaseFile = {
      id,
      createdAt: at(0),
      stage: "drafted",
      responsible: { name: intake.responsibleName, email: intake.responsibleEmail },
      affected: { name: intake.affectedName, email: intake.affectedEmail },
      agreement: templateDraft(intake),
      draftedBy: "template",
      checklist: REVIEW_CHECKLIST.map((x) => ({ ...x, done: false })),
      hold: { amountUsd: intake.amountUsd, feeUsd: feeFor(intake.amountUsd) },
      intake,
      events: [{ at: at(0), who: "MakeGood", text: "Draft written from the standard template. Waiting for a reviewer." }],
    };
    if (done) {
      c.stage = "released";
      c.reviewer = { ...REVIEWER, claimedAt: at(9) };
      c.checklist.forEach((x) => (x.done = true));
      c.responsible.signedAt = at(31);
      c.affected.signedAt = at(48);
      c.hold.fundedAt = at(52);
      c.hold.releasedAt = at(23 * 60);
      c.events.push(
        { at: at(9), who: REVIEWER.name, text: "Picked up the review." },
        { at: at(14), who: REVIEWER.name, text: "Approved. Sent to both parties to sign." },
        { at: at(31), who: intake.responsibleName, text: "Signed the agreement." },
        { at: at(48), who: intake.affectedName, text: "Signed the agreement." },
        { at: at(52), who: intake.responsibleName, text: `Paid $${intake.amountUsd} into the payment hold.` },
        { at: at(23 * 60), who: intake.affectedName, text: "Confirmed it is made good. Money released; the release clause is now in effect." },
      );
    }
    return [c];
  });
}
