import { z } from "zod";
import { AgreementSchema, type Agreement } from "./types";

/**
 * Drafting on our own open-weight model, hosted in GMI Cloud's data centre.
 * GMI's inference engine serves an OpenAI-compatible /v1/chat/completions; any compatible
 * server (vLLM, Ollama's /v1) works by changing GMI_BASE_URL.
 */
const baseUrl = () => (process.env.GMI_BASE_URL?.trim() || "https://api.gmi-serving.com/v1").replace(/\/$/, "");

export function gmiModel(): string | null {
  const model = process.env.GMI_MODEL?.trim();
  if (!model) return null;
  // A hosted endpoint needs a key; a self-run server on this machine may not.
  const local = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(baseUrl() + "/");
  return process.env.GMI_API_KEY?.trim() || local ? model : null;
}

const SCHEMA = z.toJSONSchema(AgreementSchema);

export async function draftOnGmi(system: string, user: string): Promise<{ agreement: Agreement; model: string } | null> {
  const model = gmiModel();
  if (!model) return null;
  try {
    const res = await fetch(`${baseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.GMI_API_KEY ? { authorization: `Bearer ${process.env.GMI_API_KEY.trim()}` } : {}),
      },
      signal: AbortSignal.timeout(120_000),
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 4000,
        // Constrained decoding: the model can only emit JSON matching the agreement schema.
        response_format: { type: "json_schema", json_schema: { name: "agreement", strict: true, schema: SCHEMA } },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) {
      console.error(`[draft:gmi] ${model} answered ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return null;
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = (data.choices?.[0]?.message?.content ?? "").replace(/^```(?:json)?\s*|\s*```$/g, "");
    const parsed = AgreementSchema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      console.error(`[draft:gmi] ${model} returned an off-schema draft`);
      return null;
    }
    return { agreement: parsed.data, model };
  } catch (err) {
    console.error(`[draft:gmi] ${model} at ${baseUrl()} failed:`, err instanceof Error ? err.message : err);
    return null;
  }
}
