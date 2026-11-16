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

/** Search for a place name with OpenStreetMap Nominatim, biased to Ahmedabad–Gandhinagar. */
export async function geocode(q: string): Promise<{ name: string; center: LngLat; osmId?: string } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&viewbox=72.40,23.30,72.80,22.90&bounded=1&q=${encodeURIComponent(q)}`
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' } })
    const j = (await r.json()) as { lat: string; lon: string; display_name: string; osm_type?: string; osm_id?: number }[]
    if (!j[0]) return null
    return {
      name: j[0].display_name.split(',').slice(0, 2).join(','),
      center: [Number(j[0].lon), Number(j[0].lat)],
      osmId: j[0].osm_type ? `${j[0].osm_type}/${j[0].osm_id}` : undefined,
    }
  } catch {
    return null
  }
}
