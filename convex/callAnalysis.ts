import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v, type Infer } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { extractJson, sarvamChat } from "./lib/sarvam";

/**
 * After an AI call: should the sales team keep investing time in this lead?
 * The model reads the transcript plus the lead's profile and returns a verdict with reasons.
 * If the model is unavailable, a transparent rule-based score is used instead (model = "rules").
 */

const analysisValidator = v.object({
  verdict: v.union(v.literal("pursue"), v.literal("nurture"), v.literal("drop")),
  score: v.number(),
  summary: v.string(),
  buyingSignals: v.array(v.string()),
  concerns: v.array(v.string()),
  nextAction: v.string(),
  followUpInDays: v.number(),
  model: v.string(),
  analyzedAt: v.number(),
});
type Analysis = Infer<typeof analysisValidator>;

export const getCallContext = internalQuery({
  args: { callId: v.id("voiceCalls") },
  handler: async (ctx, { callId }) => {
    const call = await ctx.db.get("voiceCalls", callId);
    if (!call) return null;
    const lead = await ctx.db.get("leads", call.leadId);
    const properties = await ctx.db.query("properties").collect();
    const property = properties.find((p) => lead && (p.name === lead.project || p.name.endsWith(lead.project)));
    const leadIdStr = call.leadId as string;
    const followups = (await ctx.db.query("followups").collect()).filter((f) => f.leadId === leadIdStr);
    const visits = (await ctx.db.query("siteVisits").collect()).filter((s) => s.leadId === leadIdStr);
    const priorCalls = await ctx.db
      .query("voiceCalls")
      .withIndex("by_leadId", (q) => q.eq("leadId", call.leadId))
      .take(20);
    return { call, lead, property, followups, visits, priorCallCount: priorCalls.length - 1 };
  },
});

export const saveAnalysis = internalMutation({
  args: { callId: v.id("voiceCalls"), analysis: analysisValidator },
  handler: async (ctx, { callId, analysis }) => {
    await ctx.db.patch("voiceCalls", callId, { analysis });
  },
});

type Ctx = NonNullable<{
  call: Doc<"voiceCalls">;
  lead: Doc<"leads"> | null;
  property: Doc<"properties"> | undefined;
  followups: Doc<"followups">[];
  visits: Doc<"siteVisits">[];
  priorCallCount: number;
}>;

function profileLines(c: Ctx): string[] {
  const l = c.lead;
  const lines: string[] = [];
  if (l) {
    lines.push(`Lead: ${l.name}; CRM stage ${l.status}; lead score ${l.score}/100; source ${l.source ?? "unknown"}`);
    if (l.budget) lines.push(`Stated budget: ₹${(l.budget / 1e7).toFixed(2)} Cr`);
    if (l.bhkPreference) lines.push(`Wants: ${l.bhkPreference}${l.purpose ? `, purpose ${l.purpose}` : ""}`);
    if (l.loanRequired != null) lines.push(`Home loan needed: ${l.loanRequired ? "yes" : "no"}`);
  }
  if (c.property) lines.push(`Project discussed: ${c.property.name} (${c.property.location}), from ₹${(c.property.price / 1e7).toFixed(2)} Cr, ${c.property.status}`);
  lines.push(`History: ${c.priorCallCount} earlier calls, ${c.visits.length} site visits, ${c.followups.filter((f) => f.status === "Completed").length} follow-ups done, ${c.followups.filter((f) => f.status !== "Completed").length} pending`);
  return lines;
}

/** Transparent fallback scoring, used only when the model can't be reached. */
function ruleBased(c: Ctx): Omit<Analysis, "analyzedAt"> {
  const l = c.lead;
  const text = c.call.transcript.filter((t) => t.sender === "lead").map((t) => t.text.toLowerCase()).join(" ");
  const signals: string[] = [];
  const concerns: string[] = [];
  let score = (l?.score ?? 50) * 0.45;
  if (/brochure|send|भेज|મોકલ/.test(text)) (score += 12), signals.push("Asked for the brochure and floor plans");
  if (/tomorrow|कल|કાલે|11/.test(text)) (score += 10), signals.push("Agreed to a follow-up call");
  if (/family|परिवार|પરિવાર/.test(text)) (score += 5), signals.push("Involving family in the decision");
  if (/not interested|no thanks|busy|later|नहीं|નથી/.test(text)) (score -= 25), concerns.push("Expressed reluctance on the call");
  if (l?.budget && c.property) {
    const gap = (c.property.price - l.budget) / l.budget;
    if (gap <= 0) (score += 15), signals.push("Budget covers the starting price");
    else if (gap < 0.2) (score += 5), concerns.push(`Starting price is ${Math.round(gap * 100)}% above stated budget`);
    else (score -= 15), concerns.push(`Starting price is ${Math.round(gap * 100)}% above stated budget`);
  }
  if (c.visits.length) (score += 8), signals.push("Has booked a site visit before");
  if (c.priorCallCount >= 3 && !c.visits.length) (score -= 10), concerns.push(`${c.priorCallCount} earlier calls without a site visit`);
  score = Math.max(0, Math.min(100, Math.round(score)));
  const verdict = score >= 65 ? "pursue" : score >= 40 ? "nurture" : "drop";
  return {
    verdict,
    score,
    summary:
      verdict === "pursue"
        ? "Engaged on the call and fits the project; worth active sales time."
        : verdict === "nurture"
          ? "Some interest but not ready; keep warm with low-effort touches."
          : "Weak fit or low intent; deprioritise.",
    buyingSignals: signals,
    concerns,
    nextAction: verdict === "pursue" ? "Offer two site-visit slots this week" : verdict === "nurture" ? "Add to a monthly WhatsApp update" : "Close the lead after one final message",
    followUpInDays: verdict === "pursue" ? 1 : verdict === "nurture" ? 14 : 60,
    model: "rules",
  };
}

const PROMPT = `You are a sales manager at an Indian residential real-estate developer. Decide whether the sales team should spend more time on this lead, using ONLY the call transcript and profile below. Do not invent facts.
Reply with ONLY this JSON:
{"verdict":"pursue"|"nurture"|"drop","score":0-100,"summary":"one sentence","buyingSignals":["..."],"concerns":["..."],"nextAction":"one concrete step","followUpInDays":number}
- pursue = clear intent and fit: invest active time now.
- nurture = interested but not ready (budget gap, timing, decision pending): low-effort touches.
- drop = poor fit or no intent: stop spending time.
Quote short evidence from the transcript in signals/concerns. Write in English.`;

export const analyzeCall = action({
  args: { callId: v.id("voiceCalls") },
  returns: analysisValidator,
  handler: async (ctx, { callId }): Promise<Analysis> => {
    const c: Ctx | null = await ctx.runQuery(internal.callAnalysis.getCallContext, { callId });
    if (!c) throw new Error("Call not found");

    const transcript = c.call.transcript.map((t) => `${t.sender === "agent" ? "Agent" : "Lead"}: ${t.text}`).join("\n");
    let result: Omit<Analysis, "analyzedAt">;
    try {
      const res = await sarvamChat(
        [
          { role: "system", content: PROMPT },
          { role: "user", content: `PROFILE\n${profileLines(c).join("\n")}\n\nTRANSCRIPT\n${transcript}` },
        ],
        { temperature: 0.2, maxTokens: 1500 },
      );
      const raw = extractJson<Partial<Analysis>>(res.content);
      if (!raw || !["pursue", "nurture", "drop"].includes(raw.verdict as string)) throw new Error("bad model output");
      const list = (x: unknown) => (Array.isArray(x) ? x.filter((s): s is string => typeof s === "string").slice(0, 5) : []);
      result = {
        verdict: raw.verdict as Analysis["verdict"],
        score: Math.max(0, Math.min(100, Math.round(Number(raw.score) || 0))),
        summary: String(raw.summary ?? "").slice(0, 300),
        buyingSignals: list(raw.buyingSignals),
        concerns: list(raw.concerns),
        nextAction: String(raw.nextAction ?? "").slice(0, 200),
        followUpInDays: Math.max(0, Math.min(180, Math.round(Number(raw.followUpInDays) || 3))),
        model: res.model,
      };
    } catch {
      result = ruleBased(c);
    }
    const analysis: Analysis = { ...result, analyzedAt: Date.now() };
    await ctx.runMutation(internal.callAnalysis.saveAnalysis, { callId, analysis });
    return analysis;
  },
});

