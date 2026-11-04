import { action } from "./_generated/server";
import { v } from "convex/values";

// Server-side proxies for third-party AI APIs so keys never reach the browser.
// Keys are set on the deployment: `npx convex env set GROQ_API_KEY ...` / `SARVAM_API_KEY ...`

const COPILOT_MODEL = "openai/gpt-oss-20b";
const COPILOT_SYSTEM_PROMPT =
  "You are Ai RealEstate OS Copilot, an elite AI Real Estate Advisor for Ai RealEstate OS Group in Ahmedabad. Provide extremely precise details on Sunlight Indexes, CAGR appreciation growth, layouts, construction, and neighborhood infrastructure. Be concise, polite, and structure output with bullet points where necessary.";

// Basic abuse limits: these actions are public, so cap request size.
const MAX_MESSAGES = 30;
const MAX_MESSAGE_CHARS = 4000;
const MAX_TTS_CHARS = 500;

export const copilotChat = action({
  args: {
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      })
    ),
  },
  returns: v.object({ content: v.string(), model: v.string() }),
  handler: async (_ctx, args) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is not set on the Convex deployment");

    const messages = args.messages
      .slice(-MAX_MESSAGES)
      .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }));

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: COPILOT_MODEL,
        messages: [{ role: "system", content: COPILOT_SYSTEM_PROMPT }, ...messages],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });
    if (!res.ok) throw new Error(`Groq HTTP ${res.status}: ${await res.text()}`);

    const data = await res.json();
    return { content: data.choices?.[0]?.message?.content ?? "", model: COPILOT_MODEL };
  },
});

export const textToSpeech = action({
  args: {
    text: v.string(),
    languageCode: v.union(v.literal("en-IN"), v.literal("hi-IN"), v.literal("gu-IN")),
    speaker: v.string(),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (_ctx, args) => {
    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) throw new Error("SARVAM_API_KEY is not set on the Convex deployment");

    const res = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: { "api-subscription-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        inputs: [args.text.slice(0, MAX_TTS_CHARS)],
        target_language_code: args.languageCode,
        speaker: args.speaker,
        pace: 1.0,
        speech_sample_rate: 22050,
        enable_preprocessing: true,
        model: "bulbul:v3",
        output_audio_codec: "wav",
      }),
    });
    if (!res.ok) throw new Error(`Sarvam HTTP ${res.status}`);

    const data = await res.json();
    return data?.audios?.[0] ?? null;
  },
});
