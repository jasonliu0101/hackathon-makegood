// Clears the demo data so the next request re-seeds a fresh queue.
// Local: removes .data/. Upstash: run with the Vercel env pulled, e.g.
//   vercel env pull .env.local && node --env-file=.env.local scripts/reset-demo.mjs
import { rm } from "node:fs/promises";

const url = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL)?.trim().replace(/\/$/, "");
const token = (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN)?.trim();

if (url && token) {
  const res = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(["DEL", "mg:cases", "mg:seeded"]),
  });
  console.log(res.ok ? "Upstash demo data cleared." : `Upstash error ${res.status}: ${await res.text()}`);
} else {
  await rm(new URL("../.data", import.meta.url), { recursive: true, force: true });
  console.log("Local .data cleared. Restart `npm run dev` to drop the in-memory copy.");
}
