import type { PoiCategory } from './osm'

/**
 * Natural-language map search. The model only translates the question into filters;
 * results always come from real map data, so the AI cannot invent properties.
 */
export interface MapQuery {
  target: 'projects' | 'amenities' | 'place'
  bhk?: number
  minPriceCr?: number
  maxPriceCr?: number
  status?: 'Ready to Move' | 'Under Construction' | 'Newly Launched'
  /** Place to search around (locality, landmark or amenity name). */
  near?: string
  radiusKm?: number
  category?: PoiCategory
  /** Plain-English restatement shown to the user. */
  summary: string
  interpretedBy: 'ai' | 'rules'
}

const CATEGORIES: PoiCategory[] = ['education', 'health', 'metro', 'rail', 'airport', 'commercial', 'park', 'civic', 'utility']

const PROMPT = `Convert the user's real-estate map question into JSON filters. Reply with ONLY a JSON object, no prose.
Schema: {"target":"projects"|"amenities"|"place","bhk":number?,"minPriceCr":number?,"maxPriceCr":number?,"status":"Ready to Move"|"Under Construction"|"Newly Launched"?,"near":string?,"radiusKm":number?,"category":${CATEGORIES.map((c) => `"${c}"`).join('|')}?,"summary":string}
Rules: prices in crore (1 Cr = 100 lakh; "80 lakh" = 0.8). "projects" = homes for sale; "amenities" = schools, hospitals, metro etc; "place" = just go to a location. "near" is a place name exactly as the user wrote it. "summary" restates the request in under 12 words.
Question: `

/** Rule-based fallback so search still works without the AI service. */
export function parseWithRules(text: string): MapQuery {
  const t = text.toLowerCase()
  const q: MapQuery = { target: 'projects', summary: text, interpretedBy: 'rules' }
  const bhk = t.match(/(\d)\s*bhk/)
  if (bhk) q.bhk = Number(bhk[1])
  const money = [...t.matchAll(/(\d+(?:\.\d+)?)\s*(cr|crore|l|lakh|lac)/g)].map((m) => Number(m[1]) / (m[2]!.startsWith('l') ? 100 : 1))
  if (money.length) {
    if (/(above|over|more than|min)/.test(t)) q.minPriceCr = money[0]
    else if (/between/.test(t) && money.length > 1) [q.minPriceCr, q.maxPriceCr] = [Math.min(...money), Math.max(...money)]
    else q.maxPriceCr = money[0]
  }
  if (/ready/.test(t)) q.status = 'Ready to Move'
  else if (/under construction|upcoming/.test(t)) q.status = 'Under Construction'
  else if (/new launch|newly launched/.test(t)) q.status = 'Newly Launched'
  const cat: [RegExp, PoiCategory][] = [
    [/school|college|universit/, 'education'],
    [/hospital|clinic|medical/, 'health'],
    [/metro/, 'metro'],
    [/railway|train/, 'rail'],
    [/airport/, 'airport'],
    [/mall|shop|bank|restaurant|cafe/, 'commercial'],
    [/park|garden|sport/, 'park'],
  ]
  const found = cat.find(([re]) => re.test(t))
  const near = t.match(/(?:near|around|close to|in)\s+([a-z][a-z .'-]{2,40}?)(?:\s+(?:under|below|with|for|within|above|ready|$)|[,?.]|$)/)
  if (near) q.near = near[1]!.trim()
  const r = t.match(/within\s+(\d+(?:\.\d+)?)\s*km/)
  if (r) q.radiusKm = Number(r[1])
  if (found && !bhk && !money.length && !/home|flat|apartment|villa|project|property|house/.test(t)) {
    q.target = 'amenities'
    q.category = found[1]
  } else if (found) {
    // "homes near a metro" → projects near the nearest such amenity
    q.category = found[1]
  }
  return q
}

export async function interpret(
  text: string,
  chat: (args: { messages: { role: 'user'; content: string }[] }) => Promise<{ content: string; model: string }>,
): Promise<MapQuery> {
  try {
    const res = await Promise.race([
      chat({ messages: [{ role: 'user', content: PROMPT + text }] }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 15000)),
    ])
    const json = res.content.match(/\{[\s\S]*\}/)?.[0]
    if (!json) throw new Error('no json')
    const raw = JSON.parse(json) as Partial<MapQuery>
    const q: MapQuery = {
      target: raw.target === 'amenities' || raw.target === 'place' ? raw.target : 'projects',
      summary: typeof raw.summary === 'string' && raw.summary ? raw.summary : text,
      interpretedBy: 'ai',
    }
    if (typeof raw.bhk === 'number') q.bhk = raw.bhk
    if (typeof raw.minPriceCr === 'number') q.minPriceCr = raw.minPriceCr
    if (typeof raw.maxPriceCr === 'number') q.maxPriceCr = raw.maxPriceCr
    if (raw.status && ['Ready to Move', 'Under Construction', 'Newly Launched'].includes(raw.status)) q.status = raw.status
    if (typeof raw.near === 'string' && raw.near.trim()) q.near = raw.near.trim()
    if (typeof raw.radiusKm === 'number' && raw.radiusKm > 0) q.radiusKm = Math.min(raw.radiusKm, 50)
    if (raw.category && CATEGORIES.includes(raw.category)) q.category = raw.category
    return q
  } catch {
    return parseWithRules(text)
  }
}
