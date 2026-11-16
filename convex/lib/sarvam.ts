// Shared Sarvam chat client for Convex actions. Not a Convex function module: plain helpers only.

// Tried in order. Gemma 4 runs on Sarvam's /v2 endpoint (beta-whitelisted keys);
// sarvam-105b-conversations on /v1 is the generally available fallback.
const CHAT_MODELS = [
  { url: "https://api.sarvam.ai/v2/chat/completions", model: "gemma4" },
  { url: "https://api.sarvam.ai/v1/chat/completions", model: "sarvam-105b-conversations" },
] as const;

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/** Some models emit hidden reasoning in <think> tags; never show it to users. */
const stripReasoning = (s: string) => s.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

export async function sarvamChat(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<{ content: string; model: string }> {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) throw new Error("SARVAM_API_KEY is not set on the Convex deployment");
  const errors: string[] = [];
  for (const { url, model } of CHAT_MODELS) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "api-subscription-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        temperature: opts.temperature ?? 0.5,
        // Generous budget: reasoning tokens count against max_tokens on Sarvam models.
        max_tokens: opts.maxTokens ?? 2000,
      }),
    });
    if (!res.ok) {
      errors.push(`${model}: HTTP ${res.status}`);
      continue;
    }
    const data = await res.json();
    const content = stripReasoning(data.choices?.[0]?.message?.content ?? "");
    if (content) return { content, model };
    errors.push(`${model}: empty response`);
  }
  throw new Error(`Sarvam chat failed (${errors.join("; ")})`);
}

/** Pull the first JSON object out of a model reply (models sometimes wrap it in prose or fences). */
export function extractJson<T>(text: string): T | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as T;
  } catch {
    return null;
  }
}
