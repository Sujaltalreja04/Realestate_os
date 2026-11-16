import type { LngLat } from '@/features/map/osm'
import { FLOOR_HEIGHT_M, STATUS_META, type Asset, type Unit } from './store'

/**
 * Building geometry shared by the standalone three.js viewer and the live map (MapLibre extrusions).
 * Local coordinates are metres: x = east, z = south, y = up, origin at the asset's centre, before rotation.
 */

export interface Box {
  x0: number
  x1: number
  z0: number
  z1: number
}
export interface FloorSpec {
  floor: number
  y: number
  h: number
  box: Box
  kind: 'podium' | 'office'
}


/** Shivalik Shilp: G–2 retail podium, flaring office body (3–9), set-back upper block (10–13). */
export function shilpFloors(): FloorSpec[] {
  const PODIUM_H = [5, 4.4, 4.4]
  const out: FloorSpec[] = []
  let y = 0
  PODIUM_H.forEach((h, f) => {
    out.push({ floor: f, y, h, box: { x0: -37, x1: 37, z0: -18, z1: 18 }, kind: 'podium' })
    y += h
  })
  const base = y + 0.5
  for (let i = 0; i < 7; i++) out.push({ floor: 3 + i, y: base + i * 3.8, h: 3.8, box: { x0: -31 - i * 1.9, x1: 31 + i * 0.7, z0: -14, z1: 12 }, kind: 'office' })
  const top = base + 7 * 3.8
  for (let j = 0; j < 4; j++) out.push({ floor: 10 + j, y: top + j * 3.8, h: 3.8, box: { x0: -4, x1: 35.2, z0: -13, z1: 11 }, kind: 'office' })
  return out
}

export function genericFloors(a: Asset): FloorSpec[] {
  const area = Math.max(150, (a.perFloorSqft ?? 10000) * 0.0929)
  const w = Math.sqrt(area * 2)
  const d = area / w
  const box = { x0: -w / 2, x1: w / 2, z0: -d / 2, z1: d / 2 }
  const out: FloorSpec[] = []
  let y = 0
  for (let f = 0; f <= a.floors; f++) {
    const h = f === 0 ? 4.8 : FLOOR_HEIGHT_M
    out.push({ floor: f, y, h, box, kind: f === 0 ? 'podium' : 'office' })
    y += h
  }
  return out
}

export const floorsFor = (a: Asset) => (a.model === 'shivalik-shilp' ? shilpFloors() : genericFloors(a))

/** Office blocks on a floor plate: two rows either side of a corridor, widths proportional to area. */
export function layoutUnits(box: Box, units: Unit[]) {
  const corridor = 2.4
  const rowDepth = (box.z1 - box.z0 - corridor) / 2
  const sorted = [...units].sort((a, b) => a.unit.localeCompare(b.unit, 'en', { numeric: true }))
  const withArea = sorted.filter((u) => u.areaSqft)
  const fallback = withArea.length ? withArea.reduce((s, u) => s + u.areaSqft!, 0) / withArea.length : 1
  const rows = [
    { units: [] as Unit[], total: 0 },
    { units: [] as Unit[], total: 0 },
  ]
  for (const u of sorted) {
    const r = rows[0]!.total <= rows[1]!.total ? rows[0]! : rows[1]!
    r.units.push(u)
    r.total += u.areaSqft ?? fallback
  }
  const width = box.x1 - box.x0
  const cells: { unit: Unit; x0: number; x1: number; z0: number; z1: number }[] = []
  rows.forEach((r, i) => {
    let x = box.x0
    const z0 = i === 0 ? box.z0 : box.z0 + rowDepth + corridor
    for (const u of r.units) {
      const w = ((u.areaSqft ?? fallback) / Math.max(1e-6, r.total)) * width
      cells.push({ unit: u, x0: x, x1: x + w, z0, z1: z0 + rowDepth })
      x += w
    }
  })
  return cells
}

/** Local metres → lng/lat, rotating clockwise by `rotationDeg` around the asset centre. */
export function localToLngLat(a: Asset, x: number, z: number): LngLat {
  const rot = ((a.rotationDeg ?? 0) * Math.PI) / 180
  const rx = x * Math.cos(rot) - z * Math.sin(rot)
  const rz = x * Math.sin(rot) + z * Math.cos(rot)
  const mx = 111320 * Math.cos((a.center[1] * Math.PI) / 180)
  return [a.center[0] + rx / mx, a.center[1] - rz / 110540]
}

const ring = (a: Asset, b: Box, inset = 0): LngLat[] => {
  const pts = [
    localToLngLat(a, b.x0 + inset, b.z0 + inset),
    localToLngLat(a, b.x1 - inset, b.z0 + inset),
    localToLngLat(a, b.x1 - inset, b.z1 - inset),
    localToLngLat(a, b.x0 + inset, b.z1 - inset),
  ]
  return [...pts, pts[0]!]
}

export const HEAT = ['#e2e8f0', '#bae6fd', '#7dd3fc', '#38bdf8', '#0284c7', '#075985']
export const heat = (n: number, max: number) => (n === 0 ? HEAT[0]! : HEAT[Math.min(HEAT.length - 1, 1 + Math.floor(((n - 1) / Math.max(1, max - 1)) * (HEAT.length - 2)))]!)

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/**
 * The asset as map features for a fill-extrusion layer: one slab per floor, the building's details, and — for the
 * selected floor — one block per office. With a floor selected the building is shown as a cutaway: everything above
 * that floor gets `ghost: true` and is drawn as faint glass (a separate, translucent map layer), so the building keeps
 * its shape while the selected floor's offices are visible.
 */
export function assetMapFeatures(
  a: Asset,
  opts: { selected: number | null; hovered: number | null; mode: 'real' | 'data' },
): GeoJSON.FeatureCollection {
  const floors = floorsFor(a)
  const isShilp = a.model === 'shivalik-shilp'
  const counts = new Map<number, number>()
  for (const u of a.units) counts.set(u.floor, (counts.get(u.floor) ?? 0) + 1)
  const max = Math.max(1, ...counts.values())
  const ghost = (level: number) => opts.selected != null && level > opts.selected
  const features: GeoJSON.Feature[] = []
  const add = (coords: LngLat[], base: number, top: number, color: string, props: Record<string, unknown>) =>
    features.push({ type: 'Feature', properties: { base, top, color, ...props }, geometry: { type: 'Polygon', coordinates: [coords] } })

  for (const f of floors) {
    const n = counts.get(f.floor) ?? 0
    const isSel = opts.selected === f.floor
    let color = a.model === 'shivalik-shilp' && f.kind === 'podium' ? '#7cc8c4' : '#8aa9c0'
    if (opts.mode === 'data') color = heat(n, max)
    if (opts.selected != null && !isSel) color = opts.mode === 'data' ? color : '#c5d0d9'
    if (opts.hovered === f.floor && !isSel) color = '#60a5fa'
    if (isSel) color = '#f59e0b'
    const g = ghost(f.floor)
    const name = f.floor === 0 ? 'Ground floor' : `Floor ${f.floor}`
    const tip = `<b>${esc(a.name)} · ${name}</b><br/><span>${n ? `${n} office${n > 1 ? 's' : ''} on record · click to open` : 'No offices on record'}</span>`
    // Slab (white band) + glass body, so floors read separately like the photos.
    add(ring(a, f.box, -0.25), f.y, f.y + 0.5, g ? '#ffffff' : '#e6e9ec', { kind: 'floor', floor: f.floor, tip, ghost: g })
    add(ring(a, f.box), f.y + 0.5, f.y + f.h, g ? (opts.hovered === f.floor ? '#93c5fd' : '#a9c4d8') : color, { kind: 'floor', floor: f.floor, tip, ghost: g })
  }

  if (isShilp) {
    const f9 = floors.find((f) => f.floor === 9)!
    const top9 = f9.y + f9.h
    const g10 = ghost(10)
    const last = f9.box
    // Gold line along the top of the main body.
    add(ring(a, { x0: last.x0, x1: last.x1, z0: last.z1 - 0.1, z1: last.z1 + 0.5 }), top9 - 0.2, top9 + 0.25, '#e8a33a', { kind: 'detail', ghost: g10 })
    // West "bow": dark roof sloping from the cantilevered corner down to the upper block (stepped).
    const steps = 8
    const dx = (-4 - last.x0) / steps
    for (let i = 0; i < steps; i++) add(ring(a, { x0: last.x0 + i * dx, x1: last.x0 + (i + 1) * dx, z0: last.z0, z1: last.z1 }), top9, top9 + 12 * (1 - (i + 0.5) / steps), g10 ? '#a9c4d8' : '#3b4047', { kind: 'detail', ghost: g10 })
    // Rooftop crown.
    const roof = floors.at(-1)!
    const roofY = roof.y + roof.h
    add(ring(a, { x0: -4.2, x1: 35.4, z0: -13.2, z1: 11.2 }), roofY, roofY + 1.2, ghost(14) ? '#a9c4d8' : '#2b3036', { kind: 'detail', ghost: ghost(14) })
  } else {
    const roof = floors.at(-1)!
    const roofY = roof.y + roof.h
    const gr = ghost(a.floors + 1)
    add(ring(a, roof.box, -0.3), roofY, roofY + 1, gr ? '#a9c4d8' : '#2b3036', { kind: 'detail', ghost: gr })
  }

  // Offices on the selected floor, sized by area.
  if (opts.selected != null) {
    const f = floors.find((x) => x.floor === opts.selected)
    if (f) {
      const y = f.y + f.h
      for (const c of layoutUnits(
        f.box,
        a.units.filter((u) => u.floor === opts.selected),
      )) {
        const u = c.unit
        const occ = (u.occupant ?? '').split(';').map((s) => s.trim()).filter(Boolean)
        const tip = `<b>Office ${esc(u.unit)}</b>${u.areaSqft ? ` · ${u.areaSqft.toLocaleString('en-IN')} sq.ft` : ''}<br/>${occ.length ? occ.map(esc).join('<br/>') : '<span>No occupant listed</span>'}<br/><span>${STATUS_META[u.status].label}</span>`
        add(ring(a, c, 0.25), y, y + 1.2, STATUS_META[u.status].color, { kind: 'office', unitId: u.id, tip })
      }
    }
  }
  return { type: 'FeatureCollection', features }
}
