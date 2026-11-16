import * as THREE from 'three'
import { STATUS_META, type Asset, type Unit } from './store'
import { HEAT, floorsFor, layoutUnits, type FloorSpec } from './geometry'

/**
 * The realistic three.js building, shared by the full-screen viewer and the live map layer: reflective glass with
 * mullions, white floor slabs, and (for Shivalik Shilp) the podium terrace, gold line, sloping west roof, crown and sign.
 * Coordinates: metres; x = east, z = south, y = up; origin at the asset's centre. The returned group is already
 * rotated by the asset's rotationDeg.
 */

export type Track = <T extends { dispose: () => void }>(x: T) => T
export type ViewMode = 'real' | 'data'

interface Part {
  obj: THREE.Object3D
  /** Floor level the part belongs to; parts above the selected floor turn to glass in the cutaway. */
  level: number
}

export function mullionTexture(base: string, line: string) {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 64
  const g = c.getContext('2d')!
  g.fillStyle = base
  g.fillRect(0, 0, 128, 64)
  const grad = g.createLinearGradient(0, 0, 0, 64)
  grad.addColorStop(0, 'rgba(255,255,255,0.18)')
  grad.addColorStop(1, 'rgba(0,0,0,0.10)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 64)
  g.fillStyle = line
  for (let x = 0; x < 128; x += 32) g.fillRect(x, 0, 3, 64)
  g.fillRect(0, 0, 128, 5)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 4
  return t
}

function shilpParts(floors: FloorSpec[], track: Track): Part[] {
  const out: Part[] = []
  const slabMat = track(new THREE.MeshStandardMaterial({ color: 0xdfe3e6, roughness: 0.6 }))
  const podiumTop = floors[2]!.y + floors[2]!.h
  const terrace = new THREE.Mesh(track(new THREE.BoxGeometry(75, 0.5, 37)), slabMat)
  terrace.position.set(0, podiumTop + 0.25, 0)
  terrace.receiveShadow = true
  out.push({ obj: terrace, level: 3 })
  const f9 = floors.find((f) => f.floor === 9)!
  const last = f9.box
  const bodyTop = f9.y + f9.h
  const gold = new THREE.Mesh(
    track(new THREE.BoxGeometry(last.x1 - last.x0 + 0.6, 0.35, 0.35)),
    track(new THREE.MeshStandardMaterial({ color: 0xe8a33a, emissive: 0xb86b12, emissiveIntensity: 0.6, metalness: 0.4, roughness: 0.4 })),
  )
  gold.position.set((last.x0 + last.x1) / 2, bodyTop, last.z1 + 0.3)
  out.push({ obj: gold, level: 10 })
  const shape = new THREE.Shape()
  shape.moveTo(last.x0, 0)
  shape.lineTo(-4, 0)
  shape.lineTo(last.x0, 12)
  shape.closePath()
  const bow = new THREE.Mesh(track(new THREE.ExtrudeGeometry(shape, { depth: last.z1 - last.z0, bevelEnabled: false })), track(new THREE.MeshStandardMaterial({ color: 0x3b4047, roughness: 0.55, metalness: 0.3 })))
  bow.position.set(0, bodyTop, last.z0)
  bow.castShadow = true
  out.push({ obj: bow, level: 10 })
  const dormerMat = track(new THREE.MeshStandardMaterial({ color: 0x1d2228, metalness: 0.6, roughness: 0.2 }))
  const dormerGeo = track(new THREE.BoxGeometry(1.6, 1.2, 1.2))
  for (let i = 0; i < 6; i++) {
    const x = last.x0 + ((i % 3) / 3 + 0.12) * (-4 - last.x0) * 0.85
    const yTop = 12 * (1 - (x - last.x0) / (-4 - last.x0))
    const dm = new THREE.Mesh(dormerGeo, dormerMat)
    dm.position.set(x, bodyTop + yTop * 0.5, i < 3 ? last.z1 + 0.2 : last.z0 - 0.2)
    out.push({ obj: dm, level: 10 })
  }
  const roof = floors.at(-1)!
  const roofY = roof.y + roof.h
  const crown = new THREE.Mesh(track(new THREE.BoxGeometry(39.6, 1.2, 24.4)), track(new THREE.MeshStandardMaterial({ color: 0x2b3036, roughness: 0.5 })))
  crown.position.set(15.6, roofY + 0.6, -1)
  crown.castShadow = true
  out.push({ obj: crown, level: 14 })
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 160
  const g = c.getContext('2d')!
  g.fillStyle = '#f4b73f'
  g.font = '600 110px Inter, Arial, sans-serif'
  g.textBaseline = 'middle'
  g.fillText('shivalik', 30, 84)
  g.font = '800 120px Inter, Arial, sans-serif'
  g.fillText('SHILP', 520, 84)
  const tex = track(new THREE.CanvasTexture(c))
  tex.colorSpace = THREE.SRGBColorSpace
  const sign = new THREE.Mesh(track(new THREE.PlaneGeometry(30, 4.7)), track(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide })))
  sign.position.set(15.6, roofY + 3.6, 11.3)
  out.push({ obj: sign, level: 14 })
  return out
}

const heat = (n: number, max: number) => (n === 0 ? HEAT[0]! : HEAT[Math.min(HEAT.length - 1, 1 + Math.floor(((n - 1) / Math.max(1, max - 1)) * (HEAT.length - 2)))]!)
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

export interface BuildingModel {
  group: THREE.Group
  floors: FloorSpec[]
  /** Glass meshes per floor plus office blocks; userData.floor / userData.tip for picking and tooltips. */
  pickables: THREE.Mesh[]
  topY: number
  /** Recolour for the current selection / hover / view mode. */
  restyle: (s: { selected: number | null; hovered: number | null; mode: ViewMode; counts: Map<number, number> }) => void
  /**
   * Show a real exterior scan instead of the generated building. The generated floors stay as invisible pick
   * targets that glow when hovered or selected, so floors remain clickable on the scan. Pass null to go back.
   */
  setExterior: (scan: THREE.Object3D | null) => void
  /** Office blocks on the selected floor; `label` adds a 3D label per office (full-screen viewer only). */
  setPlate: (selected: number | null, units: Unit[], label?: (u: Unit, pos: THREE.Vector3, front: boolean) => THREE.Object3D) => void
  /**
   * Open a floor like a drawer: it slides out of the building towards the viewer (viewerLocalZ = the viewer's z in
   * the building's own coordinates) so its offices can be seen; the rest of the building stays in place.
   */
  openFloor: (floor: number | null, viewerLocalZ?: number) => void
  /** Advance the drawer animation; returns true while still moving. */
  tick: () => boolean
  /** Office blocks currently shown (userData.unitId), for labels. */
  officeBlocks: () => THREE.Mesh[]
}

export function buildAssetModel(asset: Asset, track: Track): BuildingModel {
  const group = new THREE.Group()
  group.rotation.y = -((asset.rotationDeg ?? 0) * Math.PI) / 180
  const isShilp = asset.model === 'shivalik-shilp'
  const floors = floorsFor(asset)
  const podiumTex = track(mullionTexture('#79c9c6', '#2f5e63'))
  const officeTex = track(mullionTexture('#7d9fb8', '#263746'))
  const slabMat = track(new THREE.MeshStandardMaterial({ color: 0xdfe3e6, roughness: 0.6 }))
  const glassMats = new Map<number, THREE.MeshStandardMaterial>()
  const glassMeshes = new Map<number, THREE.Mesh>()
  const slabs: THREE.Mesh[] = []
  const pickables: THREE.Mesh[] = []
  const parts: Part[] = []
  const floorGroups = new Map<number, THREE.Group>()
  for (const f of floors) {
    const g = new THREE.Group()
    floorGroups.set(f.floor, g)
    const w = f.box.x1 - f.box.x0
    const d = f.box.z1 - f.box.z0
    const tex = track((f.kind === 'podium' && isShilp ? podiumTex : officeTex).clone())
    tex.needsUpdate = true
    tex.repeat.set(w / 1.6, 1)
    const mat = track(new THREE.MeshStandardMaterial({ map: tex, color: 0xffffff, metalness: 0.55, roughness: 0.12, envMapIntensity: 1.4 }))
    glassMats.set(f.floor, mat)
    const glass = new THREE.Mesh(track(new THREE.BoxGeometry(w, f.h - 0.5, d)), mat)
    glass.position.set((f.box.x0 + f.box.x1) / 2, f.y + 0.5 + (f.h - 0.5) / 2, (f.box.z0 + f.box.z1) / 2)
    glass.castShadow = glass.receiveShadow = true
    glass.userData.floor = f.floor
    pickables.push(glass)
    glassMeshes.set(f.floor, glass)
    const slab = new THREE.Mesh(track(new THREE.BoxGeometry(w + 0.5, 0.5, d + 0.5)), slabMat)
    slab.position.set(glass.position.x, f.y + 0.25, glass.position.z)
    slab.castShadow = true
    slabs.push(slab)
    g.add(glass, slab)
    group.add(g)
    parts.push({ obj: g, level: f.floor })
  }
  const extras = isShilp ? shilpParts(floors, track) : []
  if (!isShilp) {
    const roof = floors.at(-1)!
    const crown = new THREE.Mesh(track(new THREE.BoxGeometry(roof.box.x1 - roof.box.x0 + 0.6, 1, roof.box.z1 - roof.box.z0 + 0.6)), track(new THREE.MeshStandardMaterial({ color: 0x2b3036 })))
    crown.position.set(0, roof.y + roof.h + 0.5, 0)
    extras.push({ obj: crown, level: asset.floors + 1 })
  }
  for (const e of extras) {
    group.add(e.obj)
    parts.push(e)
  }
  const topY = floors.at(-1)!.y + floors.at(-1)!.h

  const amber = new THREE.Color('#f59e0b')
  const blue = new THREE.Color('#2563eb')
  const black = new THREE.Color(0)

  // Exterior scan mode: generated visuals hidden; floor bands invisible unless hovered / selected.
  let exterior: THREE.Object3D | null = null
  const hiddenMat = track(new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }))
  const selBand = track(new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.38, depthWrite: false }))
  const hovBand = track(new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.3, depthWrite: false }))
  const setExterior = (scan: THREE.Object3D | null) => {
    if (exterior) group.remove(exterior)
    exterior = scan
    if (scan) group.add(scan)
    for (const sl of slabs) sl.visible = !scan
    for (const e of extras) e.obj.visible = !scan
    for (const [floor, m] of glassMeshes) {
      m.material = scan ? hiddenMat : glassMats.get(floor)!
      m.castShadow = !scan
      // Floor bands sit just outside the scan so they read as a highlight, not a box inside the walls.
      m.scale.setScalar(scan ? 1.03 : 1)
    }
  }
  let lastStyle: Parameters<BuildingModel['restyle']>[0] | null = null

  const restyle: BuildingModel['restyle'] = (st) => {
    lastStyle = st
    const { selected: sel, hovered: hov, mode, counts } = st
    if (exterior) {
      for (const [floor, m] of glassMeshes) m.material = sel === floor ? (openF === floor ? glassMats.get(floor)! : selBand) : hov === floor ? hovBand : hiddenMat
      return
    }
    const max = Math.max(1, ...counts.values())
    // The building always stays whole: the selected floor glows amber, hover glows blue. Exploring a floor happens in
    // the walk-through view, not by hiding parts of the building.
    for (const [floor, mat] of glassMats) {
      const isSel = sel === floor
      mat.color.set(mode === 'data' ? heat(counts.get(floor) ?? 0, max) : 0xffffff)
      mat.emissive.copy(isSel ? amber : floor === hov ? blue : black)
      mat.emissiveIntensity = isSel ? 0.6 : floor === hov ? 0.35 : 0
    }
  }

  // ── Drawer: the open floor slides out of the building ──
  let openF: number | null = null
  let slideSign = 1
  const slideDist = (f: FloorSpec) => f.box.z1 - f.box.z0 + 8
  const openFloor: BuildingModel['openFloor'] = (floor, viewerLocalZ) => {
    if (floor !== openF && viewerLocalZ != null) slideSign = viewerLocalZ >= 0 ? 1 : -1
    openF = floor
    if (lastStyle) restyle(lastStyle)
  }
  const tick = () => {
    let moving = false
    for (const f of floors) {
      const g = floorGroups.get(f.floor)!
      const target = openF === f.floor ? slideSign * slideDist(f) : 0
      const d = target - g.position.z
      if (Math.abs(d) > 0.02) {
        g.position.z += d * 0.16
        moving = true
      } else g.position.z = target
    }
    plate.position.z = openF != null ? (floorGroups.get(openF)?.position.z ?? 0) : 0
    return moving
  }

  // Office blocks on the selected floor (they ride on the open drawer).
  const plate = new THREE.Group()
  group.add(plate)
  const clearPlate = () => {
    for (const o of [...plate.children]) {
      o.traverse((x) => {
        if (x instanceof THREE.Mesh) {
          x.geometry.dispose()
          ;(x.material as THREE.Material).dispose()
          const i = pickables.indexOf(x)
          if (i >= 0) pickables.splice(i, 1)
        }
        if (x instanceof THREE.Sprite) {
          x.material.map?.dispose()
          x.material.dispose()
        }
      })
      plate.remove(o)
    }
  }
  const setPlate: BuildingModel['setPlate'] = (selected, units, label) => {
    clearPlate()
    const f = selected != null ? floors.find((x) => x.floor === selected) : undefined
    if (!f || !units.length) return
    const y = f.y + f.h + 0.05
    const mid = (f.box.z0 + f.box.z1) / 2
    for (const c of layoutUnits(f.box, units)) {
      const u = c.unit
      const w = Math.max(0.6, c.x1 - c.x0 - 0.4)
      const d = Math.max(0.6, c.z1 - c.z0 - 0.4)
      const block = new THREE.Mesh(new THREE.BoxGeometry(w, 1.1, d), new THREE.MeshStandardMaterial({ color: STATUS_META[u.status].color, roughness: 0.45, metalness: 0.1 }))
      block.position.set((c.x0 + c.x1) / 2, y + 0.55, (c.z0 + c.z1) / 2)
      block.castShadow = true
      const occ = (u.occupant ?? '').split(';').map((s) => s.trim()).filter(Boolean)
      block.userData.floor = f.floor
      block.userData.unitId = u.id
      block.userData.label = { unit: u.unit, occupant: occ[0] ?? STATUS_META[u.status].label, more: Math.max(0, occ.length - 1), color: STATUS_META[u.status].color, area: u.areaSqft }
      block.userData.tip = `<b>Office ${esc(u.unit)}</b>${u.areaSqft ? ` · ${u.areaSqft.toLocaleString('en-IN')} sq.ft` : ''}<br/>${occ.length ? occ.map(esc).join('<br/>') : '<span>No occupant listed</span>'}<br/><span>${STATUS_META[u.status].label}</span>`
      plate.add(block)
      pickables.push(block)
      if (label) plate.add(label(u, new THREE.Vector3(block.position.x, y + (block.position.z < mid ? 6.5 : 1.8), block.position.z), block.position.z < mid))
    }
  }

  return {
    group,
    floors,
    pickables,
    topY,
    restyle,
    setPlate,
    openFloor,
    tick,
    officeBlocks: () => plate.children.filter((o): o is THREE.Mesh => o instanceof THREE.Mesh && !!o.userData.unitId),
    setExterior: (scan) => {
      setExterior(scan)
      if (lastStyle) restyle(lastStyle)
    },
  }
}

/** Tooltip HTML for a floor mesh. */
export function floorTip(asset: Asset, floor: number) {
  const n = asset.units.filter((u) => u.floor === floor).length
  return `<b>${esc(asset.name)} · ${floor === 0 ? 'Ground floor' : `Floor ${floor}`}</b><br/><span>${n ? `${n} office${n > 1 ? 's' : ''} on record · click to open` : 'No offices on record'}</span>`
}
