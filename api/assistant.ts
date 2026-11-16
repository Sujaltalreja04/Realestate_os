/**
 * POST /api/assistant: asset/building Q&A via Sarvam. Runs on Vercel (Edge runtime); in local dev the Vite server
 * mounts the same handler (see vite.config.ts). The Sarvam key stays on the server: set SARVAM_API_KEY in Vercel.
 *
 * Body: { messages: {role:'user'|'assistant', content}[], context: string }
 * The context is the asset data the page is showing; the model is told to answer only from it.
 */
export const config = { runtime: 'edge' }

const MODELS = [
  { url: 'https://api.sarvam.ai/v2/chat/completions', model: 'gemma4' },
  { url: 'https://api.sarvam.ai/v1/chat/completions', model: 'sarvam-105b-conversations' },
] as const

const MAX_MESSAGES = 12
const MAX_MESSAGE_CHARS = 2000
const MAX_CONTEXT_CHARS = 24000

const SYSTEM = `You are the asset assistant for RealEstate OS, a real-estate platform in Ahmedabad, India.
You answer questions about the buildings ("assets") described in the DATA block: their floors, offices, areas, occupants,
status and nearby buildings.
Rules:
- Use only the DATA block for facts about these buildings. If the answer is not there, say it is not in the data.
- Company records are registered-office addresses, not verified tenants or owners. Say so when it matters.
- Areas are in sq.ft; distances in metres. Be concise; use short bullet lists for lists.
- Reply in the user's language (English, Hindi or Gujarati).`

type Msg = { role: 'user' | 'assistant'; content: string }

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405)
  const apiKey = process.env.SARVAM_API_KEY
  if (!apiKey) return json({ error: 'The assistant is not configured (SARVAM_API_KEY is missing on the server).' }, 503)

  let body: { messages?: unknown; context?: unknown }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m): m is Msg => !!m && typeof m === 'object' && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }))
  if (!messages.length || messages.at(-1)!.role !== 'user') return json({ error: 'Ask a question first.' }, 400)
  const context = typeof body.context === 'string' ? body.context.slice(0, MAX_CONTEXT_CHARS) : ''

  const errors: string[] = []
  for (const { url, model } of MODELS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'api-subscription-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 1800,
          messages: [{ role: 'system', content: `${SYSTEM}\n\nDATA:\n${context || '(no data)'}` }, ...messages],
        }),
      })
      if (!res.ok) {
        errors.push(`${model}: HTTP ${res.status}`)
        continue
      }
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
      const content = (data.choices?.[0]?.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/g, '').trim()
      if (content) return json({ content, model })
      errors.push(`${model}: empty response`)
    } catch (e) {
      errors.push(`${model}: ${e instanceof Error ? e.message : 'network error'}`)
    }
  }
  return json({ error: `The AI service did not answer (${errors.join('; ')}).` }, 502)
}
