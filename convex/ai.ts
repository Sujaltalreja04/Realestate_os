import { action } from "./_generated/server";
import { v } from "convex/values";
import { sarvamChat } from "./lib/sarvam";
import { api } from "./_generated/api";

// Server-side proxies for third-party AI APIs so keys never reach the browser.
// One key powers chat and speech: `npx convex env set SARVAM_API_KEY ...`

const COPILOT_SYSTEM_PROMPT =
  "You are the AI assistant for RealEstate OS, a residential developer in Ahmedabad and GIFT City, India. For anything about specific projects, units, prices, leads or numbers, use only the facts provided in the conversation and say so if something isn't there; never invent figures. For general questions (RERA, home loans, stamp duty, the buying process) answer from general knowledge of Indian real estate. Be concise and warm, use ₹ Cr / L for money, and use short bullet lists when listing options. Reply in the user's language (English, Hindi or Gujarati).";

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
    const messages = args.messages
      .slice(-MAX_MESSAGES)
      .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }));
    return await sarvamChat([{ role: "system", content: COPILOT_SYSTEM_PROMPT }, ...messages]);
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

const COMPETITOR_PROMPT = `You are a real-estate market strategist for a residential developer in Ahmedabad / GIFT City, India.
Using OUR DATA below and your general knowledge of the named competitors, analyse what they are likely doing and what we should do.
Rules:
- You have no live internet access. Mark anything about competitors as "general knowledge" and do not invent exact prices, launch dates or sales figures; give ranges or say "verify".
- Ground every recommendation in OUR DATA (our projects, prices, channels, conversion).
Reply with ONLY this JSON:
{"competitors":[{"name":"...","positioning":"...","likelyTactics":["..."],"strengths":["..."],"weaknesses":["..."],"confidence":"low"|"medium"|"high"}],
 "ourGaps":["..."],
 "opportunities":[{"title":"...","detail":"...","impact":"high"|"medium"|"low","effort":"high"|"medium"|"low"}],
 "watchlist":["what to monitor and where to verify it"]}`;

export const competitorAnalysis = action({
  args: { competitors: v.array(v.string()), focus: v.optional(v.string()) },
  returns: v.object({ content: v.string(), model: v.string() }),
  handler: async (ctx, args): Promise<{ content: string; model: string }> => {
    const names = args.competitors.map((c) => c.trim().slice(0, 80)).filter(Boolean).slice(0, 5);
    if (!names.length) throw new Error("Name at least one competitor");
    const [properties, leads] = await Promise.all([
      ctx.runQuery(api.properties.getProperties, {}),
      ctx.runQuery(api.leads.getLeads, {}),
    ]);
    const won = new Set(["Token Paid", "Loan Processing", "Registration", "Possession", "Booked"]);
    const bySource = new Map<string, { n: number; won: number }>();
    for (const l of leads) {
      const s = bySource.get(l.source ?? "Unknown") ?? { n: 0, won: 0 };
      s.n++;
      if (won.has(l.status)) s.won++;
      bySource.set(l.source ?? "Unknown", s);
    }
    const ours = [
      "OUR PROJECTS:",
      ...properties.map((p) => `- ${p.name.replace(/^Ai RealEstate OS /, "")} (${p.location}): ${p.bhk}, from ₹${(p.price / 1e7).toFixed(2)} Cr, ${p.status}, amenities: ${(p.amenities ?? []).slice(0, 4).join(", ")}`),
      `OUR PIPELINE: ${leads.length} leads, ${leads.filter((l) => won.has(l.status)).length} bookings.`,
      `LEADS BY CHANNEL: ${[...bySource].map(([k, s]) => `${k} ${s.n} (${s.won} won)`).join("; ")}`,
    ].join("\n");
    return await sarvamChat(
      [
        { role: "system", content: COMPETITOR_PROMPT },
        { role: "user", content: `${ours}\n\nCOMPETITORS: ${names.join(", ")}\nFOCUS: ${(args.focus ?? "overall strategy").slice(0, 300)}` },
      ],
      { temperature: 0.4, maxTokens: 3000 },
    );
  },
});
