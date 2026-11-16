import { useSyncExternalStore } from 'react'
import type { LngLat } from '@/features/map/osm'
import { SHIVALIK_RECORDS, SHIVALIK_SHILP } from '@/features/buildings/shivalikShilp'

/**
 * Asset register for the demo: stored in this browser (localStorage). Every change is picked up live by the map, the
 * 3D explorer and other open tabs. Export/import JSON to move data between browsers until a shared backend exists.
 */

export type AssetKind = 'office' | 'retail' | 'residential' | 'mixed' | 'other'
export type UnitStatus = 'occupied' | 'vacant' | 'for-sale' | 'for-lease' | 'unknown'

export interface Unit {
  id: string
  /** 0 = ground floor; negative = basement. */
  floor: number
  unit: string
  /** Company or person using the unit. */
  occupant?: string
  owner?: string
  areaSqft?: number
  status: UnitStatus
  notes?: string
  /** Where the row came from (e.g. "Company registry", "Admin upload"). */
  source?: string
  /** 360° photo of the office (media id, see media.ts). */
  panoId?: string
  /** 3D scan of the office, .glb (media id). */
  scanId?: string
}

export interface Asset {
  id: string
  name: string
  kind: AssetKind
  center: LngLat
  /** Floors above ground (top floor number). */
  floors: number
  basements?: number
  address?: string
  developer?: string
  status?: string
  builtUpSqft?: number
  perFloorSqft?: number
  /** Footprint rotation in degrees (clockwise from east–west). */
  rotationDeg?: number
  /** 'shivalik-shilp' uses the hand-built model; everything else gets a generated tower. */
  model?: 'shivalik-shilp' | 'generic'
  description?: string
  facts?: { label: string; value: string; source?: string; href?: string }[]
  /** Drone / photogrammetry scan of the exterior, .glb (media id). Replaces the generated model when present. */
  exteriorScanId?: string
  /** Metres per model unit for the exterior scan (1 when the scan is already in metres). */
  scanScale?: number
  /** 360° lobby photo per floor: floor number → media id. */
  lobbyPanos?: Record<string, string>
  units: Unit[]
  updatedAt: number
}

const KEY = 'reos-assets:v1'
const uid = () => Math.random().toString(36).slice(2, 10)

function seed(): Asset[] {
  const grouped = new Map<string, Unit>()
  for (const r of SHIVALIK_RECORDS) {
    const k = `${r.floor}:${r.unit}`
    const u = grouped.get(k)
    if (u) u.occupant = `${u.occupant}; ${r.company}`
    else grouped.set(k, { id: uid(), floor: r.floor, unit: r.unit, occupant: r.company, status: 'unknown', source: 'Company registry (registered office)' })
  }
  return [
    {
      id: SHIVALIK_SHILP.id,
      name: SHIVALIK_SHILP.name,
      kind: 'mixed',
      center: SHIVALIK_SHILP.center,
      floors: SHIVALIK_SHILP.topFloor,
      basements: 1,
      address: SHIVALIK_SHILP.address,
      developer: SHIVALIK_SHILP.developer,
      status: SHIVALIK_SHILP.status,
      builtUpSqft: SHIVALIK_SHILP.builtUpSqft,
      perFloorSqft: SHIVALIK_SHILP.perFloorSqft,
      model: 'shivalik-shilp',
      description: 'Ground + 13 storey retail and office building at Iskcon Cross Road, on S.G. Highway.',
      facts: [
        { label: 'Unit sizes', value: '≈ 490 – 2,593 sq.ft', source: 'Housing.com', href: 'https://housing.com/commercial/shivalik-shilp-in-iscon-ambli-road-ahmedabad-cpid-134098' },
        { label: 'Offices from', value: '≈ 574 sq.ft (showrooms from ≈ 1,196 sq.ft)', source: 'Realty+', href: 'https://www.rprealtyplus.com/realty-spotlight/realty-project-watch-shivalik-shilp-1-by-shilp-group-76399.html' },
        { label: 'RERA timeline', value: 'Approved 3 Oct 2017 · completed 30 Jul 2019', source: 'Aurum PropTech (RERA)', href: 'https://www.aurumproptech.in/pulse/rera/gujarat/ahmedabad/shivalik-shilp/833' },
        { label: 'Architecture', value: 'Ground + 13 storeys, retail and offices', source: 'Ini Design Studio', href: 'https://inidesignstudio.com/portfolio/shivalik-shilp/' },
        { label: 'Amenities', value: SHIVALIK_SHILP.amenities.join(', '), source: 'CityInfo Services', href: SHIVALIK_SHILP.sources[0]!.href },
      ],
      units: [...grouped.values()],
      updatedAt: Date.now(),
    },
  ]
}

/* ── Store ───────────────────────────────────────────────────── */

let cache: Asset[] | null = null
const listeners = new Set<() => void>()

function load(): Asset[] {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(KEY)
    cache = raw ? (JSON.parse(raw) as Asset[]) : seed()
  } catch {
    cache = seed()
  }
  return cache
}

function commit(next: Asset[]) {
  cache = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* storage full or blocked: keep working in memory */
  }
  listeners.forEach((l) => l())
}

if (typeof window !== 'undefined') {
  // Another tab changed the register.
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return
    cache = null
    listeners.forEach((l) => l())
  })
}

const subscribe = (l: () => void) => (listeners.add(l), () => void listeners.delete(l))

export function useAssets(): Asset[] {
  return useSyncExternalStore(subscribe, load, load)
}

export const getAssets = load

export function saveAsset(a: Asset) {
  const list = load()
  const next = { ...a, updatedAt: Date.now() }
  commit(list.some((x) => x.id === a.id) ? list.map((x) => (x.id === a.id ? next : x)) : [...list, next])
}

export function deleteAsset(id: string) {
  commit(load().filter((a) => a.id !== id))
}

export function resetAssets() {
  commit(seed())
}

export function newAsset(center: LngLat): Asset {
  return { id: `asset-${uid()}`, name: 'New asset', kind: 'office', center, floors: 10, perFloorSqft: 10000, model: 'generic', units: [], updatedAt: Date.now() }
}

export const newUnit = (floor = 1): Unit => ({ id: uid(), floor, unit: '', status: 'unknown', source: 'Admin' })

/* ── Import / export ─────────────────────────────────────────── */

export function exportJson(): string {
  return JSON.stringify({ format: 'reos-assets', version: 1, exportedAt: new Date().toISOString(), assets: load() }, null, 2)
}

export function importJson(text: string): number {
  const j = JSON.parse(text) as { assets?: Asset[] } | Asset[]
  const assets = Array.isArray(j) ? j : j.assets
  if (!Array.isArray(assets) || !assets.every((a) => a && typeof a.id === 'string' && typeof a.name === 'string' && Array.isArray(a.center) && Array.isArray(a.units)))
    throw new Error('This file is not an asset export.')
  const byId = new Map(load().map((a) => [a.id, a]))
  for (const a of assets) byId.set(a.id, { ...a, updatedAt: Date.now() })
  commit([...byId.values()])
  return assets.length
}

const STATUSES: UnitStatus[] = ['occupied', 'vacant', 'for-sale', 'for-lease', 'unknown']

/** Minimal CSV parser (quoted fields, commas, newlines). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!
    if (q) {
      if (c === '"' && text[i + 1] === '"') (cell += '"'), i++
      else if (c === '"') q = false
      else cell += c
    } else if (c === '"') q = true
    else if (c === ',') row.push(cell), (cell = '')
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      if (row.some((x) => x.trim())) rows.push(row)
      row = []
      cell = ''
    } else cell += c
  }
  row.push(cell)
  if (row.some((x) => x.trim())) rows.push(row)
  return rows
}

export const CSV_TEMPLATE = 'floor,unit,occupant,owner,areaSqft,status,notes\n4,411,Example Company Pvt. Ltd.,,850,occupied,\n4,412,,,620,for-lease,Corner office\n'

/** Units from a CSV with headers floor, unit, occupant, owner, areaSqft, status, notes ("G" = ground). */
export function unitsFromCsv(text: string): { units: Unit[]; skipped: number } {
  const [head, ...rows] = parseCsv(text)
  if (!head) return { units: [], skipped: 0 }
  const idx = (name: string) => head.findIndex((h) => h.trim().toLowerCase().replace(/[^a-z]/g, '') === name.toLowerCase())
  const col = { floor: idx('floor'), unit: idx('unit'), occupant: idx('occupant'), owner: idx('owner'), area: idx('areasqft'), status: idx('status'), notes: idx('notes') }
  if (col.floor < 0 || col.unit < 0) throw new Error('The CSV needs at least "floor" and "unit" columns.')
  const units: Unit[] = []
  let skipped = 0
  for (const r of rows) {
    const get = (i: number) => (i >= 0 ? (r[i] ?? '').trim() : '')
    const fRaw = get(col.floor).toUpperCase()
    const floor = fRaw === 'G' || fRaw === 'GF' ? 0 : fRaw.startsWith('B') ? -Number(fRaw.slice(1) || 1) : Number(fRaw)
    const unit = get(col.unit)
    if (!unit || Number.isNaN(floor)) {
      skipped++
      continue
    }
    const st = get(col.status).toLowerCase().replace(/\s+/g, '-') as UnitStatus
    const area = Number(get(col.area).replace(/,/g, ''))
    units.push({
      id: uid(),
      floor,
      unit,
      occupant: get(col.occupant) || undefined,
      owner: get(col.owner) || undefined,
      areaSqft: area > 0 ? area : undefined,
      status: STATUSES.includes(st) ? st : 'unknown',
      notes: get(col.notes) || undefined,
      source: 'Admin upload (CSV)',
    })
  }
  return { units, skipped }
}

/* ── Helpers shared by the map and the 3D view ───────────────── */

export const FLOOR_HEIGHT_M = 3.8

/** Rectangle footprint (lng/lat ring) for assets without a drawn outline. */
export function footprint(a: Asset): LngLat[] {
  const area = Math.max(150, (a.perFloorSqft ?? 10000) * 0.0929)
  const w = Math.sqrt(area * 2) // 2:1 plan
  const d = area / w
  const rot = ((a.rotationDeg ?? 0) * Math.PI) / 180
  const mx = 111320 * Math.cos((a.center[1] * Math.PI) / 180)
  const my = 110540
  const pts = [
    [-w / 2, -d / 2],
    [w / 2, -d / 2],
    [w / 2, d / 2],
    [-w / 2, d / 2],
  ].map(([x, y]) => {
    const rx = x! * Math.cos(rot) - y! * Math.sin(rot)
    const ry = x! * Math.sin(rot) + y! * Math.cos(rot)
    return [a.center[0] + rx / mx, a.center[1] - ry / my] as LngLat
  })
  return [...pts, pts[0]!]
}

export const STATUS_META: Record<UnitStatus, { label: string; color: string }> = {
  occupied: { label: 'Occupied', color: '#0284c7' },
  vacant: { label: 'Vacant', color: '#16a34a' },
  'for-sale': { label: 'For sale', color: '#d97706' },
  'for-lease': { label: 'For lease', color: '#7c3aed' },
  unknown: { label: 'Registered / unverified', color: '#64748b' },
}

/** Compact text summary of assets for the AI assistant. */
export function assetContext(focus: Asset, all: Asset[], nearby: { name: string; distanceM: number; heightM: number; type: string }[]) {
  const unitLine = (u: Unit) =>
    `- Floor ${u.floor === 0 ? 'G' : u.floor}, office ${u.unit}: ${u.occupant ?? 'no occupant listed'}${u.owner ? `; owner ${u.owner}` : ''}${u.areaSqft ? `; ${u.areaSqft} sq.ft` : ''}; status ${STATUS_META[u.status].label}${u.source ? ` (${u.source})` : ''}`
  const lines = [
    `FOCUS ASSET: ${focus.name} (${focus.kind}) at ${focus.address ?? focus.center.join(', ')}`,
    `Developer: ${focus.developer ?? 'unknown'} · Status: ${focus.status ?? 'unknown'} · Floors: ${focus.basements ? `B${focus.basements} + ` : ''}G + ${focus.floors} · Built-up ≈ ${focus.builtUpSqft ?? 'unknown'} sq.ft · Per floor ≈ ${focus.perFloorSqft ?? 'unknown'} sq.ft`,
    focus.description ?? '',
    ...(focus.facts ?? []).map((f) => `${f.label}: ${f.value}${f.source ? ` [${f.source}]` : ''}`),
    `UNITS (${focus.units.length}):`,
    ...[...focus.units].sort((a, b) => a.floor - b.floor || a.unit.localeCompare(b.unit, 'en', { numeric: true })).map(unitLine),
    '',
    'OTHER ASSETS IN THE REGISTER:',
    ...all.filter((a) => a.id !== focus.id).map((a) => `- ${a.name} (${a.kind}), G + ${a.floors}, ${a.units.length} units, at ${a.address ?? a.center.join(', ')}`),
    '',
    'NEARBY BUILDINGS (OpenStreetMap, within ~400 m):',
    ...nearby.slice(0, 40).map((n) => `- ${n.name}: ${Math.round(n.distanceM)} m away, ~${Math.round(n.heightM)} m tall, ${n.type}`),
  ]
  return lines.join('\n')
}
