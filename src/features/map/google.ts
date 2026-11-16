/**
 * Google Maps Platform, used carefully:
 *  - 2D base map tiles (Map Tiles API) with region=IN, so borders follow India's official depiction.
 *    A tile session is created only when that map type is first shown and is reused (memory + localStorage)
 *    until shortly before it expires (~2 weeks), instead of on every page load.
 *  - Photorealistic 3D (Maps JavaScript API, Map3DElement) is loaded only when the user opens "Real 3D".
 *  - Search and address lookup stay on free OpenStreetMap services, so they never bill Google.
 *
 * The key is a browser key (it has to reach the browser to load tiles). Protect it in Google Cloud Console with
 * HTTP-referrer and API restrictions, plus quotas / budget alerts.
 */

export const GOOGLE_KEY = ((import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ?? '').trim()
export const hasGoogle = GOOGLE_KEY.length > 0

export type GoogleMapType = 'roadmap' | 'satellite'

interface Session {
  session: string
  /** Seconds since epoch. */
  expiry: number
}

const sessions = new Map<GoogleMapType, Promise<Session>>()
// Key suffix in the storage name so a changed key never reuses another key's session.
const storageKey = (t: GoogleMapType) => `gmaps-session:${t}:${GOOGLE_KEY.slice(-6)}`

function readCached(t: GoogleMapType): Session | null {
  try {
    const s = JSON.parse(localStorage.getItem(storageKey(t)) ?? 'null') as Session | null
    // Keep a 6-hour margin so an open tab never runs past expiry.
    return s && s.expiry * 1000 > Date.now() + 6 * 3600e3 ? s : null
  } catch {
    return null
  }
}

/** Tile session for a map type, created at most once per ~2 weeks per browser. */
export function googleSession(type: GoogleMapType): Promise<string> {
  if (!hasGoogle) return Promise.reject(new Error('No Google Maps API key configured'))
  if (!sessions.has(type)) {
    const p = (async () => {
      const cached = readCached(type)
      if (cached) return cached
      const body =
        type === 'satellite'
          ? { mapType: 'satellite', language: 'en-IN', region: 'IN', layerTypes: ['layerRoadmap'] } // hybrid: roads + labels on imagery
          : { mapType: 'roadmap', language: 'en-IN', region: 'IN' }
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 12000)
      try {
        const r = await fetch(`https://tile.googleapis.com/v1/createSession?key=${encodeURIComponent(GOOGLE_KEY)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: ctrl.signal,
        })
        if (!r.ok) throw new Error(`Google Map Tiles session failed (HTTP ${r.status})`)
        const j = (await r.json()) as { session: string; expiry: string }
        const s: Session = { session: j.session, expiry: Number(j.expiry) }
        try {
          localStorage.setItem(storageKey(type), JSON.stringify(s))
        } catch {
          /* storage unavailable: the in-memory copy still prevents repeat calls this visit */
        }
        return s
      } finally {
        clearTimeout(t)
      }
    })()
    // A failed attempt is not cached, but it is not retried automatically either; the caller decides.
    sessions.set(type, p)
    p.catch(() => sessions.delete(type))
  }
  return sessions.get(type)!.then((s) => s.session)
}

/** Forget a session (e.g. when its tiles start failing) so the next request makes a fresh one. */
export function dropGoogleSession(type: GoogleMapType) {
  sessions.delete(type)
  try {
    localStorage.removeItem(storageKey(type))
  } catch {
    /* ignore */
  }
}

export const googleTileUrl = (session: string) => `https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=${session}&key=${encodeURIComponent(GOOGLE_KEY)}`

export const GOOGLE_ATTRIBUTION = `Map data ©${new Date().getFullYear()} Google`

/* ── Maps JavaScript API (only for Photorealistic 3D) ─────────────────────────────────────────── */

interface GoogleNS {
  maps: { importLibrary: (name: string) => Promise<Record<string, unknown>> }
}
type GoogleWindow = Window & { google?: GoogleNS; __reosGmapsReady?: () => void; gm_authFailure?: () => void }

let jsLoad: Promise<GoogleNS> | null = null
const authListeners = new Set<() => void>()

/** Load the Maps JavaScript API once, on demand. */
export function loadMapsJs(): Promise<GoogleNS> {
  const w = window as GoogleWindow
  if (!hasGoogle) return Promise.reject(new Error('No Google Maps API key configured'))
  if (w.google?.maps?.importLibrary) return Promise.resolve(w.google)
  if (!jsLoad) {
    jsLoad = new Promise<GoogleNS>((resolve, reject) => {
      w.__reosGmapsReady = () => resolve(w.google!)
      // Google calls this when the key is invalid, restricted or billing is off.
      w.gm_authFailure = () => authListeners.forEach((f) => f())
      const s = document.createElement('script')
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_KEY)}&v=beta&loading=async&region=IN&language=en-IN&callback=__reosGmapsReady`
      s.async = true
      s.onerror = () => {
        jsLoad = null
        s.remove()
        reject(new Error('Could not load Google Maps'))
      }
      document.head.appendChild(s)
    })
  }
  return jsLoad
}

export function onGoogleAuthFailure(f: () => void) {
  authListeners.add(f)
  return () => void authListeners.delete(f)
}

/** Camera distance (m) that roughly matches a MapLibre zoom level. */
export const rangeForZoom = (zoom: number, lat: number) => Math.min(250000, Math.max(250, (40075016 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom))
