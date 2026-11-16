import type { LngLat } from './osm'

/** Great-circle distance in km. */
export function haversineKm(a: LngLat, b: LngLat) {
  const R = 6371
  const dLat = ((b[1] - a[1]) * Math.PI) / 180
  const dLng = ((b[0] - a[0]) * Math.PI) / 180
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a[1] * Math.PI) / 180) * Math.cos((b[1] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

/** Planar area of a lng/lat ring in m² (accurate enough at city scale). */
export function ringAreaM2(ring: LngLat[]) {
  if (ring.length < 3) return 0
  const lat0 = (ring.reduce((s, p) => s + p[1], 0) / ring.length) * (Math.PI / 180)
  const mx = 111320 * Math.cos(lat0)
  const my = 110540
  let a = 0
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i]!
    const [x2, y2] = ring[i + 1]!
    a += x1 * mx * (y2 * my) - x2 * mx * (y1 * my)
  }
  return Math.abs(a / 2)
}

export const fmtKm = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`)
export const fmtMin = (min: number) => (min < 60 ? `${Math.round(min)} min` : `${Math.floor(min / 60)} h ${Math.round(min % 60)} min`)
export const fmtCoord = (c: LngLat) => `${c[1].toFixed(5)}° N, ${c[0].toFixed(5)}° E`

export interface Route {
  km: number
  min: number
  /** 'osrm' = real road route (no live traffic); 'straight' = straight-line fallback. */
  method: 'osrm' | 'straight'
}

const routeCache = new Map<string, Promise<Route>>()

/** Road distance/time via the public OSRM router; falls back to a straight-line estimate. */
export function routeBetween(a: LngLat, b: LngLat): Promise<Route> {
  const key = `${a[0].toFixed(4)},${a[1].toFixed(4)};${b[0].toFixed(4)},${b[1].toFixed(4)}`
  if (!routeCache.has(key)) {
    routeCache.set(
      key,
      (async () => {
        try {
          const ctrl = new AbortController()
          const t = setTimeout(() => ctrl.abort(), 12000)
          const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${key}?overview=false`, { signal: ctrl.signal })
          clearTimeout(t)
          const j = (await r.json()) as { code: string; routes?: { distance: number; duration: number }[] }
          if (j.code !== 'Ok' || !j.routes?.[0]) throw new Error(j.code)
          return { km: j.routes[0].distance / 1000, min: j.routes[0].duration / 60, method: 'osrm' as const }
        } catch {
          const km = haversineKm(a, b) * 1.35 // typical road detour factor
          return { km, min: (km / 28) * 60, method: 'straight' as const } // ~28 km/h city average
        }
      })(),
    )
  }
  return routeCache.get(key)!
}

/* ── Place search and reverse geocoding (OpenStreetMap Nominatim) ───────────────────────────── */

/** Postal-style address broken into the parts Indian addresses use. */
export interface Address {
  /** House number and road. */
  street?: string
  /** Suburb, neighbourhood or village. */
  locality?: string
  city?: string
  /** Taluka / tehsil (Nominatim "county" in India). */
  taluka?: string
  district?: string
  state?: string
  postcode?: string
  country?: string
}

export interface PlaceHit {
  name: string
  /** One-line address under the name. */
  label: string
  center: LngLat
  osmId?: string
  address?: Address
  /** Zoom that frames the place (from its bounding box). */
  zoom?: number
}

const NOMINATIM = 'https://nominatim.openstreetmap.org'

interface NominatimResult {
  lat: string
  lon: string
  name?: string
  display_name: string
  osm_type?: string
  osm_id?: number
  boundingbox?: [string, string, string, string]
  address?: Record<string, string>
}

// The public Nominatim server allows at most one request per second, so requests are queued.
let queue: Promise<unknown> = Promise.resolve()
let lastRequest = 0
function nominatim<T>(path: string): Promise<T> {
  const run = async () => {
    const wait = lastRequest + 1100 - Date.now()
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    lastRequest = Date.now()
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 12000)
    try {
      const r = await fetch(`${NOMINATIM}${path}`, { headers: { Accept: 'application/json' }, signal: ctrl.signal })
      if (!r.ok) throw new Error(`Nominatim HTTP ${r.status}`)
      return (await r.json()) as T
    } finally {
      clearTimeout(t)
    }
  }
  const p = queue.then(run, run)
  queue = p.catch(() => undefined)
  return p
}

function toAddress(a?: Record<string, string>): Address | undefined {
  if (!a) return undefined
  const street = [a.house_number, a.road].filter(Boolean).join(' ') || undefined
  const locality = a.suburb ?? a.neighbourhood ?? a.quarter ?? a.residential ?? a.hamlet ?? a.village
  const city = a.city ?? a.town ?? a.municipality ?? (a.village !== locality ? a.village : undefined)
  return { street, locality, city, taluka: a.county ?? a.subdistrict, district: a.state_district ?? a.district, state: a.state, postcode: a.postcode, country: a.country }
}

/** Short, de-duplicated one-line address. */
export function addressLine(a?: Address, skip?: string) {
  if (!a) return ''
  const parts = [a.locality, a.city, a.district, a.state].filter((p): p is string => !!p && p !== skip)
  return [...new Set(parts)].join(', ')
}

function zoomForBox(b?: [string, string, string, string]) {
  if (!b) return undefined
  const span = Math.max(Number(b[1]) - Number(b[0]), Number(b[3]) - Number(b[2]), 0.001)
  return Math.min(16.5, Math.max(4.5, Math.log2(360 / span) - 0.6))
}

function toHit(r: NominatimResult): PlaceHit {
  const address = toAddress(r.address)
  const name = r.name || address?.street || address?.locality || r.display_name.split(',')[0]!.trim()
  return {
    name,
    label: addressLine(address, name) || r.display_name.split(',').slice(1, 4).join(',').trim(),
    center: [Number(r.lon), Number(r.lat)],
    osmId: r.osm_type && r.osm_id ? `${r.osm_type}/${r.osm_id}` : undefined,
    address,
    zoom: zoomForBox(r.boundingbox),
  }
}

/** Search places anywhere in India, ranking results near `near` (the current map view) higher. */
export async function searchPlaces(q: string, near?: { w: number; s: number; e: number; n: number }, limit = 6): Promise<PlaceHit[]> {
  const box = near ? `&viewbox=${near.w.toFixed(3)},${near.n.toFixed(3)},${near.e.toFixed(3)},${near.s.toFixed(3)}` : ''
  try {
    const j = await nominatim<NominatimResult[]>(`/search?format=jsonv2&addressdetails=1&accept-language=en&countrycodes=in&limit=${limit}${box}&q=${encodeURIComponent(q)}`)
    return j.map(toHit)
  } catch {
    return []
  }
}

const AHMEDABAD_BOX = { w: 72.4, s: 22.9, e: 72.8, n: 23.3 }

/** Best single match for a place name, preferring Ahmedabad–Gandhinagar but searching all of India. */
export async function geocode(q: string): Promise<PlaceHit | null> {
  return (await searchPlaces(q, AHMEDABAD_BOX, 1))[0] ?? null
}

const reverseCache = new Map<string, Promise<PlaceHit | null>>()

/** Nearest address for a point on the map. */
export function reverseGeocode(c: LngLat): Promise<PlaceHit | null> {
  const key = `${c[1].toFixed(5)},${c[0].toFixed(5)}`
  if (!reverseCache.has(key)) {
    reverseCache.set(
      key,
      nominatim<NominatimResult & { error?: string }>(`/reverse?format=jsonv2&addressdetails=1&accept-language=en&zoom=18&lat=${c[1].toFixed(6)}&lon=${c[0].toFixed(6)}`)
        .then((r) => (r.error ? null : toHit(r)))
        .catch(() => {
          reverseCache.delete(key)
          return null
        }),
    )
  }
  return reverseCache.get(key)!
}
