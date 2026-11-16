/**
 * Live OpenStreetMap data via the Overpass API. Public servers are often busy, so requests rotate
 * across mirrors, are cached per area, and fail softly (the map keeps working without OSM layers).
 */

export type LngLat = [number, number]
export type BBox = { s: number; w: number; n: number; e: number }

export type PoiCategory = 'education' | 'health' | 'metro' | 'rail' | 'airport' | 'commercial' | 'park' | 'civic' | 'utility'

export const POI_META: Record<PoiCategory, { label: string; color: string }> = {
  education: { label: 'Schools & colleges', color: '#2563eb' },
  health: { label: 'Hospitals & clinics', color: '#dc2626' },
  metro: { label: 'Metro stations', color: '#7c3aed' },
  rail: { label: 'Railway stations', color: '#0f766e' },
  airport: { label: 'Airports', color: '#0ea5e9' },
  commercial: { label: 'Shopping, banks & food', color: '#d97706' },
  park: { label: 'Parks & sports', color: '#16a34a' },
  civic: { label: 'Police, fire & civic', color: '#475569' },
  utility: { label: 'Utilities', color: '#78716c' },
}

export interface OsmElement {
  /** e.g. "way/123456" — also the OSM URL path. */
  id: string
  name?: string
  tags: Record<string, string>
  center: LngLat
}
export interface OsmPoi extends OsmElement {
  category: PoiCategory
}
export interface OsmArea extends OsmElement {
  kind: 'building' | 'landuse' | 'road'
  geometry: GeoJSON.Polygon | GeoJSON.LineString
}

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]
let endpointIdx = 0

const memory = new Map<string, unknown>()

interface RawEl {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  geometry?: { lat: number; lon: number }[]
  tags?: Record<string, string>
}

async function overpass(query: string, cacheKey: string): Promise<RawEl[]> {
  if (memory.has(cacheKey)) return memory.get(cacheKey) as RawEl[]
  try {
    const cached = sessionStorage.getItem('osm:' + cacheKey)
    if (cached) {
      const v = JSON.parse(cached) as RawEl[]
      memory.set(cacheKey, v)
      return v
    }
  } catch {
    /* storage unavailable */
  }
  let lastErr: unknown
  for (let attempt = 0; attempt < ENDPOINTS.length; attempt++) {
    const url = ENDPOINTS[(endpointIdx + attempt) % ENDPOINTS.length]!
    try {
      const ctrl = new AbortController()
      // Short timeout per mirror: a busy server should hand over quickly rather than stall the map.
      const timer = setTimeout(() => ctrl.abort(), 15000)
      const res = await fetch(url, { method: 'POST', body: new URLSearchParams({ data: query }), signal: ctrl.signal })
      clearTimeout(timer)
      if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`)
      const json = (await res.json()) as { elements: RawEl[] }
      endpointIdx = (endpointIdx + attempt) % ENDPOINTS.length // stick with the server that worked
      memory.set(cacheKey, json.elements)
      try {
        sessionStorage.setItem('osm:' + cacheKey, JSON.stringify(json.elements))
      } catch {
        /* quota exceeded: memory cache still works */
      }
      return json.elements
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('OpenStreetMap is unavailable')
}

const bboxStr = (b: BBox) => `${b.s.toFixed(4)},${b.w.toFixed(4)},${b.n.toFixed(4)},${b.e.toFixed(4)}`

/** Snap a viewport to a coarse grid so panning reuses cached areas. */
export function snapBBox(b: BBox, step: number): BBox {
  return {
    s: Math.floor(b.s / step) * step,
    w: Math.floor(b.w / step) * step,
    n: Math.ceil(b.n / step) * step,
    e: Math.ceil(b.e / step) * step,
  }
}

export function poiCategory(t: Record<string, string>): PoiCategory | null {
  const a = t.amenity
  if (t.aeroway === 'aerodrome') return 'airport'
  if (t.railway === 'station' || t.railway === 'halt' || t.public_transport === 'station') {
    const metro = t.station === 'subway' || t.station === 'light_rail' || /metro/i.test(`${t.network ?? ''} ${t.name ?? ''} ${t.operator ?? ''}`)
    return metro ? 'metro' : 'rail'
  }
  if (a && /^(school|college|university|kindergarten)$/.test(a)) return 'education'
  if (a && /^(hospital|clinic|doctors|pharmacy|dentist)$/.test(a)) return 'health'
  if ((a && /^(bank|restaurant|cafe|marketplace|fast_food|cinema|theatre)$/.test(a)) || (t.shop && /^(mall|supermarket|department_store)$/.test(t.shop))) return 'commercial'
  if (t.leisure && /^(park|sports_centre|stadium|garden)$/.test(t.leisure)) return 'park'
  if (a && /^(police|fire_station|townhall|courthouse|post_office|fuel)$/.test(a)) return 'civic'
  if (t.power === 'substation' || (t.man_made && /^(water_works|wastewater_plant|water_tower)$/.test(t.man_made))) return 'utility'
  return null
}

const POI_SELECTORS = (area: string) => `
  nwr["amenity"~"^(school|college|university|kindergarten|hospital|clinic|doctors|pharmacy|bank|restaurant|cafe|marketplace|cinema|theatre|police|fire_station|townhall|post_office|fuel)$"](${area});
  nwr["shop"~"^(mall|supermarket|department_store)$"](${area});
  nwr["leisure"~"^(park|sports_centre|stadium)$"](${area});
  nwr["railway"~"^(station|halt)$"](${area});
  nwr["aeroway"="aerodrome"](${area});
  nwr["power"="substation"](${area});
  nwr["man_made"~"^(water_works|wastewater_plant)$"](${area});`

function toPoi(el: RawEl): OsmPoi | null {
  const t = el.tags ?? {}
  const category = poiCategory(t)
  const c = el.center ?? (el.lat != null ? { lat: el.lat, lon: el.lon! } : undefined)
  if (!category || !c) return null
  return { id: `${el.type}/${el.id}`, name: t.name ?? t['name:en'], tags: t, center: [c.lon, c.lat], category }
}

export async function fetchPois(b: BBox): Promise<OsmPoi[]> {
  const q = `[out:json][timeout:25];(${POI_SELECTORS(bboxStr(b))});out tags center;`
  const els = await overpass(q, 'poi:' + bboxStr(b))
  return els.map(toPoi).filter((x): x is OsmPoi => !!x)
}

export async function fetchPoisAround(center: LngLat, radiusM: number): Promise<OsmPoi[]> {
  const area = `around:${radiusM},${center[1].toFixed(5)},${center[0].toFixed(5)}`
  const q = `[out:json][timeout:25];(${POI_SELECTORS(area)});out tags center;`
  const els = await overpass(q, `around:${radiusM}:${center[1].toFixed(3)},${center[0].toFixed(3)}`)
  return els.map(toPoi).filter((x): x is OsmPoi => !!x)
}

export async function countBuildingsAround(center: LngLat, radiusM: number): Promise<number> {
  const q = `[out:json][timeout:25];way["building"](around:${radiusM},${center[1].toFixed(5)},${center[0].toFixed(5)});out count;`
  const els = await overpass(q, `bcount:${radiusM}:${center[1].toFixed(3)},${center[0].toFixed(3)}`)
  const tags = (els[0]?.tags ?? {}) as Record<string, string>
  return Number(tags.ways ?? tags.total ?? 0)
}

/** Buildings, land-use areas and roads with full geometry for a (small) area. */
export async function fetchAreas(b: BBox): Promise<OsmArea[]> {
  const bb = bboxStr(b)
  const q = `[out:json][timeout:30];(
    way["building"](${bb});
    way["landuse"](${bb});
    way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|motorway_link|trunk_link|primary_link)$"](${bb});
  );out tags geom;`
  const els = await overpass(q, 'area:' + bb)
  const out: OsmArea[] = []
  for (const el of els) {
    const t = el.tags ?? {}
    const pts = el.geometry?.map((p) => [p.lon, p.lat] as LngLat)
    if (!pts || pts.length < 2) continue
    const kind: OsmArea['kind'] = t.building ? 'building' : t.landuse ? 'landuse' : 'road'
    const closed = pts.length > 3 && pts[0]![0] === pts.at(-1)![0] && pts[0]![1] === pts.at(-1)![1]
    if (kind !== 'road' && !closed) continue
    const geometry: OsmArea['geometry'] = kind === 'road' ? { type: 'LineString', coordinates: pts } : { type: 'Polygon', coordinates: [pts] }
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length
    const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length
    out.push({ id: `way/${el.id}`, name: t.name ?? t['name:en'], tags: t, center: [cx, cy], kind, geometry })
  }
  return out
}

/** Height in metres from OSM tags, and whether it was tagged or estimated from levels. */
export function buildingHeight(t: Record<string, string>): { m: number; source: 'verified' | 'estimate' } {
  const h = parseFloat(t.height ?? '')
  if (!Number.isNaN(h) && h > 0) return { m: h, source: 'verified' }
  const lv = parseFloat(t['building:levels'] ?? '')
  if (!Number.isNaN(lv) && lv > 0) return { m: lv * 3.2, source: 'estimate' }
  return { m: 7, source: 'estimate' }
}

export const osmUrl = (id: string) => `https://www.openstreetmap.org/${id}`
