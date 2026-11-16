import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { cn } from '@/lib/utils'
import { buildingHeight, type LngLat, type OsmArea } from '@/features/map/osm'
import { FLOOR_HEIGHT_M, STATUS_META, footprint, type Asset, type Unit } from './store'
import { buildAssetModel, type ViewMode } from './buildingModel'

/**
 * 3D view of one asset in its real surroundings.
 *  - The asset: Shivalik Shilp's hand-built model (from photographs) or a generated tower for other assets.
 *    Every floor is pickable; selecting one shows a cutaway: floors above turn to faint glass.
 *  - The selected floor shows a schematic office layout: one block per office, sized by its area.
 *  - Surroundings: real OpenStreetMap buildings (footprint + height) and roads, other register assets in amber,
 *    with name labels.
 * Coordinates: metres; x = east, z = south, y = up; origin at the asset's centre.
 */

export type { ViewMode }

/* ── Textures ─────────────────────────────────────────────────── */

function textSprite(text: string, opts: { sub?: string; bg?: string; fg?: string; height?: number } = {}) {
  const c = document.createElement('canvas')
  const g = c.getContext('2d')!
  const font = '600 34px Inter, Arial, sans-serif'
  const subFont = '400 24px Inter, Arial, sans-serif'
  g.font = font
  let w = g.measureText(text).width
  if (opts.sub) {
    g.font = subFont
    w = Math.max(w, g.measureText(opts.sub).width)
  }
  c.width = Math.ceil(w + 32)
  c.height = opts.sub ? 84 : 52
  g.fillStyle = opts.bg ?? 'rgba(15,23,42,0.82)'
  g.beginPath()
  g.roundRect(0, 0, c.width, c.height, 12)
  g.fill()
  g.fillStyle = opts.fg ?? '#ffffff'
  g.font = font
  g.textBaseline = 'top'
  g.fillText(text, 16, 9)
  if (opts.sub) {
    g.font = subFont
    g.fillStyle = 'rgba(255,255,255,0.75)'
    g.fillText(opts.sub, 16, 48)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }))
  const h = opts.height ?? 0.032
  sprite.scale.set((h * c.width) / c.height, h, 1)
  sprite.material.sizeAttenuation = false
  sprite.renderOrder = 10
  return sprite
}

function skyTexture() {
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 512
  const g = c.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, 0, 512)
  grad.addColorStop(0, '#3f86d6')
  grad.addColorStop(0.55, '#9cc6ec')
  grad.addColorStop(1, '#e9eef0')
  g.fillStyle = grad
  g.fillRect(0, 0, 4, 512)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/* ── Geometry helpers ─────────────────────────────────────────── */

/** lng/lat → local metres around an origin (x east, z south). */
export function toLocal(origin: LngLat, p: LngLat): [number, number] {
  const mx = 111320 * Math.cos((origin[1] * Math.PI) / 180)
  return [(p[0] - origin[0]) * mx, -(p[1] - origin[1]) * 110540]
}

function pointInRing(x: number, z: number, ring: [number, number][]) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i]!
    const [xj, zj] = ring[j]!
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside
  }
  return inside
}

/** Clockwise rotation (deg) of the longest edge of a footprint, matching Asset.rotationDeg. */
function longEdgeRotation(ring: [number, number][]) {
  let best = 0
  let ang = 0
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, z0] = ring[i]!
    const [x1, z1] = ring[i + 1]!
    const len = Math.hypot(x1 - x0, z1 - z0)
    if (len > best) {
      best = len
      ang = (Math.atan2(z1 - z0, x1 - x0) * 180) / Math.PI // z is south, so this is clockwise from east
    }
  }
  return ((ang % 180) + 180) % 180
}

function extrudeRing(ring: [number, number][], height: number) {
  const shape = new THREE.Shape(ring.map(([x, z]) => new THREE.Vector2(x, -z)))
  const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false })
  geo.rotateX(-Math.PI / 2)
  return geo
}

/** Flat road ribbons from polylines, merged into one geometry. */
function roadGeometry(lines: { pts: [number, number][]; width: number }[]) {
  const pos: number[] = []
  for (const { pts, width } of lines)
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i]!
      const [x1, z1] = pts[i + 1]!
      const len = Math.hypot(x1 - x0, z1 - z0) || 1
      const nx = (-(z1 - z0) / len) * (width / 2)
      const nz = ((x1 - x0) / len) * (width / 2)
      const a = [x0 + nx, 0.06, z0 + nz]
      const b = [x0 - nx, 0.06, z0 - nz]
      const c = [x1 - nx, 0.06, z1 - nz]
      const d = [x1 + nx, 0.06, z1 + nz]
      pos.push(...a, ...b, ...c, ...a, ...c, ...d)
    }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.computeVertexNormals()
  return geo
}

const ROAD_WIDTH: Record<string, number> = { motorway: 20, trunk: 20, primary: 15, secondary: 12, tertiary: 10, trunk_link: 9, primary_link: 9, motorway_link: 9 }

/* ── Component ────────────────────────────────────────────────── */

export interface NearbyBuilding {
  area: OsmArea
  name?: string
  heightM: number
  distanceM: number
}

interface Props {
  asset: Asset
  selected: number | null
  hovered?: number | null
  mode: ViewMode
  /** Units per floor (for the data colouring and the floor layout). */
  counts: Map<number, number>
  floorUnits: Unit[]
  /** Real buildings and roads around the asset (null while loading or unavailable). */
  surroundings: OsmArea[] | null
  others: Asset[]
  onSelect: (floor: number | null) => void
  onHover?: (floor: number | null) => void
  className?: string
}

export default function AssetViewer({ asset, selected, hovered = null, mode, counts, floorUnits, surroundings, others, onSelect, onHover, className }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [tip, setTip] = useState<{ x: number; y: number; floor: number } | null>(null)
  const live = useRef({ selected, hovered, mode, counts, onSelect, onHover })
  live.current = { selected, hovered, mode, counts, onSelect, onHover }
  const api = useRef<{ restyle: () => void; setPlate: (u: Unit[]) => void; setSurroundings: (s: OsmArea[] | null, o: Asset[]) => void; setExterior: (o: THREE.Object3D | null) => void } | null>(null)

  useEffect(() => {
    const el = host.current
    if (!el) return
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(el.clientWidth, el.clientHeight)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = skyTexture()
    scene.fog = new THREE.Fog(0xdfe7ee, 300, 900)
    const pmrem = new THREE.PMREMGenerator(renderer)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    scene.environmentIntensity = 0.9
    scene.add(new THREE.HemisphereLight(0xdcecff, 0x8a7f6a, 1.1))
    const sun = new THREE.DirectionalLight(0xfff4e2, 2.4)
    sun.position.set(80, 140, 90)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.bias = -0.0004
    sun.shadow.normalBias = 0.04
    Object.assign(sun.shadow.camera, { left: -160, right: 160, top: 160, bottom: -160, near: 1, far: 500 })
    scene.add(sun)

    const disposables: { dispose: () => void }[] = []
    const track = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x)

    const ground = new THREE.Mesh(track(new THREE.PlaneGeometry(2000, 2000)), track(new THREE.MeshStandardMaterial({ color: 0xd3cec2, roughness: 1 })))
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    scene.add(ground)

    // ── The asset (shared realistic model) ──
    const built = buildAssetModel(asset, track)
    const model = built.group
    const floors = built.floors
    const pickables = built.pickables
    scene.add(model)
    const topY = built.topY
    const nameTag = textSprite(asset.name, { bg: 'rgba(180,83,9,0.92)', height: 0.04 })
    nameTag.position.set(0, topY + 12, 0)
    scene.add(nameTag)

    const clearGroup = (g: THREE.Group) => {
      for (const o of [...g.children]) {
        o.traverse((x) => {
          if (x instanceof THREE.Mesh) {
            x.geometry.dispose()
            ;(x.material as THREE.Material).dispose()
          }
          if (x instanceof THREE.Sprite) {
            x.material.map?.dispose()
            x.material.dispose()
          }
        })
        g.remove(o)
      }
    }
    // Office blocks with 3D labels (unit number + occupant).
    const setPlate = (units: Unit[]) =>
      built.setPlate(live.current.selected, units, (u, pos) => {
        const occ = (u.occupant ?? STATUS_META[u.status].label).split(';')[0]!.replace(/\s+(Pvt\.?|Private)?\s*(Ltd\.?|Limited|LLP)\.?$/i, '')
        const label = textSprite(u.unit || '—', { sub: occ.length > 16 ? `${occ.slice(0, 15)}…` : occ, height: 0.026 })
        label.position.copy(pos)
        return label
      })

    // ── Surroundings: OSM buildings + roads, and other register assets ──
    const context = new THREE.Group()
    scene.add(context)
    const ctxMat = track(new THREE.MeshStandardMaterial({ color: 0xd5d9de, roughness: 0.85 }))
    const namedMat = track(new THREE.MeshStandardMaterial({ color: 0xe8e2d6, roughness: 0.8 }))
    const roadMat = track(new THREE.MeshStandardMaterial({ color: 0x4a4e55, roughness: 0.95, side: THREE.DoubleSide }))
    const assetMat = track(new THREE.MeshStandardMaterial({ color: 0xf2b24c, roughness: 0.5, metalness: 0.1 }))
    const setSurroundings = (areas: OsmArea[] | null, otherAssets: Asset[]) => {
      clearGroup(context)
      const origin = asset.center
      if (!areas || !areas.some((a) => a.kind === 'road')) {
        // No map data (loading or OpenStreetMap unavailable): plain streets and trees so the scene still reads.
        const half = Math.max(...floors.map((f) => Math.max(-f.box.x0, f.box.x1, -f.box.z0, f.box.z1)))
        const r = new THREE.Mesh(
          roadGeometry([
            { pts: [[-400, half + 18], [400, half + 18]], width: 20 },
            { pts: [[half + 26, -400], [half + 26, 400]], width: 22 },
          ]),
          roadMat,
        )
        r.receiveShadow = true
        context.add(r)
        const trunkGeo = new THREE.CylinderGeometry(0.35, 0.45, 4)
        const leafGeo = new THREE.IcosahedronGeometry(3.2, 1)
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4f35 })
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f7d3a, roughness: 0.9 })
        for (let x = -half; x <= half; x += 9) {
          const t = new THREE.Mesh(trunkGeo, trunkMat)
          t.position.set(x, 2, half + 6)
          const l = new THREE.Mesh(leafGeo, leafMat)
          l.position.set(x, 5.4, half + 6)
          l.castShadow = true
          context.add(t, l)
        }
      }
      if (areas) {
        const roads: { pts: [number, number][]; width: number }[] = []
        let autoRot: number | null = null
        for (const a of areas) {
          if (a.kind === 'road' && a.geometry.type === 'LineString') {
            roads.push({ pts: a.geometry.coordinates.map((p) => toLocal(origin, p as LngLat)), width: ROAD_WIDTH[a.tags.highway ?? ''] ?? 7 })
            continue
          }
          if (a.kind !== 'building' || a.geometry.type !== 'Polygon') continue
          const ring = (a.geometry.coordinates[0] as LngLat[]).map((p) => toLocal(origin, p))
          // The asset's own OSM footprint: use it to orient the model, don't draw it.
          if (pointInRing(0, 0, ring)) {
            if (asset.rotationDeg == null) autoRot = longEdgeRotation(ring)
            continue
          }
          const [cx, cz] = toLocal(origin, a.center)
          if (Math.hypot(cx, cz) > 450) continue
          const h = buildingHeight(a.tags).m
          const m = new THREE.Mesh(extrudeRing(ring, h), a.name ? namedMat : ctxMat)
          m.castShadow = m.receiveShadow = true
          context.add(m)
          if (a.name) {
            const s = textSprite(a.name, { height: 0.026, bg: 'rgba(30,41,59,0.78)' })
            s.position.set(cx, h + 6, cz)
            context.add(s)
          }
        }
        if (roads.length) {
          const r = new THREE.Mesh(roadGeometry(roads), roadMat)
          r.receiveShadow = true
          context.add(r)
        }
        if (autoRot != null) model.rotation.y = -(autoRot * Math.PI) / 180
      }
      for (const o of otherAssets) {
        const [cx, cz] = toLocal(origin, o.center)
        if (Math.hypot(cx, cz) > 800) continue
        const ring = footprint(o).map((p) => toLocal(origin, p))
        const h = 4.8 + o.floors * FLOOR_HEIGHT_M
        const m = new THREE.Mesh(extrudeRing(ring, h), assetMat)
        m.castShadow = m.receiveShadow = true
        context.add(m)
        const s = textSprite(o.name, { sub: `G + ${o.floors} · ${o.units.length} units`, bg: 'rgba(180,83,9,0.9)', height: 0.03 })
        s.position.set(cx, h + 8, cz)
        context.add(s)
      }
    }

    // ── Camera ──
    const camera = new THREE.PerspectiveCamera(38, el.clientWidth / el.clientHeight, 0.5, 3000)
    camera.position.set(115, 60, 135)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, topY / 2, 0)
    controls.enableDamping = true
    controls.dampingFactor = 0.07
    controls.maxPolarAngle = Math.PI / 2.05
    controls.minDistance = 25
    controls.maxDistance = 700
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.3
    controls.addEventListener('start', () => (controls.autoRotate = false))

    // ── Styling ──
    const restyle = () => built.restyle(live.current)
    api.current = { restyle, setPlate, setSurroundings, setExterior: built.setExterior }
    restyle()

    // ── Picking ──
    const ray = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    const pick = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect()
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      const hit = ray.intersectObjects(pickables, false)[0]
      return hit ? (hit.object.userData.floor as number) : null
    }
    let down: { x: number; y: number } | null = null
    const onMove = (e: PointerEvent) => {
      const f = pick(e)
      renderer.domElement.style.cursor = f != null ? 'pointer' : ''
      const r = renderer.domElement.getBoundingClientRect()
      setTip(f != null ? { x: e.clientX - r.left, y: e.clientY - r.top, floor: f } : null)
      live.current.onHover?.(f)
    }
    const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY })
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return
      const f = pick(e)
      live.current.onSelect(f === live.current.selected ? null : f)
    }
    const onLeave = () => {
      setTip(null)
      live.current.onHover?.(null)
    }
    renderer.domElement.addEventListener('pointermove', onMove)
    renderer.domElement.addEventListener('pointerdown', onDown)
    renderer.domElement.addEventListener('pointerup', onUp)
    renderer.domElement.addEventListener('pointerleave', onLeave)

    // ── Loop ──
    const targetGoal = new THREE.Vector3()
    const camLocal = new THREE.Vector3()
    let raf = 0
    let first = true
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const sel = live.current.selected
      // Drawer: slide the selected floor out towards the camera.
      camLocal.copy(camera.position)
      model.worldToLocal(camLocal)
      built.openFloor(sel, camLocal.z)
      built.tick()
      const f = sel != null ? floors.find((x) => x.floor === sel) : null
      targetGoal.set(0, f ? f.y + f.h : topY / 2, 0)
      controls.target.lerp(targetGoal, 0.06)
      controls.update()
      renderer.render(scene, camera)
      if (first) {
        first = false
        setReady(true)
      }
    }
    loop()

    const ro = new ResizeObserver(() => {
      camera.aspect = el.clientWidth / Math.max(1, el.clientHeight)
      camera.updateProjectionMatrix()
      renderer.setSize(el.clientWidth, el.clientHeight)
    })
    ro.observe(el)

    return () => {
      api.current = null
      cancelAnimationFrame(raf)
      ro.disconnect()
      renderer.domElement.removeEventListener('pointermove', onMove)
      renderer.domElement.removeEventListener('pointerdown', onDown)
      renderer.domElement.removeEventListener('pointerup', onUp)
      renderer.domElement.removeEventListener('pointerleave', onLeave)
      controls.dispose()
      built.setPlate(null, [])
      clearGroup(context)
      nameTag.material.map?.dispose()
      nameTag.material.dispose()
      disposables.forEach((d) => d.dispose())
      ;(scene.background as THREE.Texture).dispose()
      env.dispose()
      pmrem.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
    // The scene is rebuilt only when the building itself changes shape.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset.id, asset.model, asset.floors, asset.perFloorSqft, asset.rotationDeg, asset.name])

  useEffect(() => api.current?.restyle(), [selected, hovered, mode, counts])
  // The selected floor slides out like a drawer with its offices on it.
  useEffect(() => api.current?.setPlate(floorUnits), [floorUnits, selected, ready])
  useEffect(() => api.current?.setSurroundings(surroundings, others), [surroundings, others, ready])
  // Real exterior scan (drone photogrammetry) replaces the generated model when uploaded.
  useEffect(() => {
    if (!ready || !api.current) return
    const target = api.current
    if (!asset.exteriorScanId) return target.setExterior(null)
    let live = true
    let obj: THREE.Object3D | null = null
    void import('./scanLoader')
      .then((m) => m.loadScan(asset.exteriorScanId!, asset.scanScale ?? 1))
      .then((o) => {
        if (!live) return
        obj = o
        target.setExterior(o)
      })
      .catch(() => undefined)
    return () => {
      live = false
      if (obj) target.setExterior(null)
    }
  }, [asset.exteriorScanId, asset.scanScale, ready])

  const tipCount = tip ? (counts.get(tip.floor) ?? 0) : 0
  return (
    <div className={cn('relative', className)}>
      <div ref={host} className="absolute inset-0 [&>canvas]:block" data-lenis-prevent />
      {tip && (
        <div className="pointer-events-none absolute z-10 rounded-md bg-background/95 px-2.5 py-1.5 text-xs shadow-lg" style={{ left: tip.x + 14, top: tip.y + 14 }}>
          <b>{tip.floor === 0 ? 'Ground floor' : `Floor ${tip.floor}`}</b>
          <span className="block text-muted-foreground">{tipCount ? `${tipCount} office${tipCount > 1 ? 's' : ''} on record` : 'No offices on record'}</span>
        </div>
      )}
      {!ready && (
        <div className="absolute inset-0 grid place-items-center bg-muted">
          <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Building model…</span>
        </div>
      )}
    </div>
  )
}
