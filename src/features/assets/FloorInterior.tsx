import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { Box as BoxIcon, Camera, DoorOpen, Footprints, Glasses, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { floorsFor, layoutUnits, type Box } from './geometry'
import { STATUS_META, type Asset, type Unit } from './store'
import { OpenMedia } from './MediaControls'

/**
 * Walk through one floor of an asset in first person: corridor, office rooms (glass fronts with door signs showing
 * the office number and occupant), furniture, ceiling lights and windows looking out over the city at the floor's
 * real height. Desktop: drag to look, WASD / arrows to move, click the floor to walk there. Touch: drag to look,
 * tap to walk. VR headsets (WebXR): stand inside the floor; point a controller at the floor and pull the trigger to
 * teleport. Office positions are schematic (sized by area), not a surveyed plan.
 */

const H = 3.3 // clear height
const EYE = 1.62
const R = 0.3 // player radius
const WALL_T = 0.12

interface Seg {
  x0: number
  x1: number
  z0: number
  z1: number
}

function signTexture(unit: string, occupant: string, color: string) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 160
  const g = c.getContext('2d')!
  g.fillStyle = '#1f2933'
  g.fillRect(0, 0, 512, 160)
  g.fillStyle = color
  g.fillRect(0, 0, 14, 160)
  g.fillStyle = '#ffffff'
  g.font = '700 60px Inter, Arial, sans-serif'
  g.textBaseline = 'top'
  g.fillText(unit, 36, 14)
  g.font = '400 30px Inter, Arial, sans-serif'
  g.fillStyle = 'rgba(255,255,255,0.85)'
  const words = occupant.length > 30 ? `${occupant.slice(0, 29)}…` : occupant
  g.fillText(words, 36, 92)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

function skyTexture() {
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 512
  const g = c.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, 0, 512)
  grad.addColorStop(0, '#2f78cf')
  grad.addColorStop(0.55, '#a7cdee')
  grad.addColorStop(1, '#eef1ee')
  g.fillStyle = grad
  g.fillRect(0, 0, 4, 512)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function carpetTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = '#5b6470'
  g.fillRect(0, 0, 128, 128)
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},255,0.04)`
    g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2)
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

interface Props {
  asset: Asset
  floor: number
  onClose: () => void
}

export default function FloorInterior({ asset, floor, onClose }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [here, setHere] = useState<Unit | null>(null)
  const [vr, setVr] = useState<'checking' | 'yes' | 'no'>('checking')
  const [inVr, setInVr] = useState(false)
  const goTo = useRef<(u: Unit) => void>(() => {})
  const enterVr = useRef<() => void>(() => {})

  const spec = useMemo(() => floorsFor(asset).find((f) => f.floor === floor) ?? floorsFor(asset).at(-1)!, [asset, floor])
  const units = useMemo(() => asset.units.filter((u) => u.floor === floor).sort((a, b) => a.unit.localeCompare(b.unit, 'en', { numeric: true })), [asset.units, floor])

  useEffect(() => {
    const xr = (navigator as Navigator & { xr?: XRSystem }).xr
    if (!xr) return setVr('no')
    xr.isSessionSupported('immersive-vr').then((ok) => setVr(ok ? 'yes' : 'no')).catch(() => setVr('no'))
  }, [])

  useEffect(() => {
    const el = host.current
    if (!el) return
    const disposables: { dispose: () => void }[] = []
    const track = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(el.clientWidth, el.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.9
    renderer.xr.enabled = true
    renderer.xr.setReferenceSpaceType('local-floor')
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = track(skyTexture())
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = track(pmrem.fromScene(new RoomEnvironment(), 0.04).texture)
    scene.environmentIntensity = 0.45
    scene.add(new THREE.HemisphereLight(0xf2f6ff, 0x8a7f70, 0.85))
    const sun = new THREE.DirectionalLight(0xfff1dc, 1.3)
    sun.position.set(60, 80, 40)
    scene.add(sun)

    // Plan: shrink the outer box a little so windows sit inside the slab edge.
    const box: Box = { x0: spec.box.x0 + 0.3, x1: spec.box.x1 - 0.3, z0: spec.box.z0 + 0.3, z1: spec.box.z1 - 0.3 }
    const W = box.x1 - box.x0
    const D = box.z1 - box.z0
    const cx = (box.x0 + box.x1) / 2
    const cz = (box.z0 + box.z1) / 2
    const cells = units.length ? layoutUnits(box, units) : []
    const corridor = 2.4
    const rowDepth = (D - corridor) / 2
    const corrZ0 = box.z0 + rowDepth
    const corrZ1 = corrZ0 + corridor

    // ── Shell: floor, carpet runner, ceiling, light strips, curtain wall ──
    const floorMesh = new THREE.Mesh(track(new THREE.PlaneGeometry(W, D)), track(new THREE.MeshStandardMaterial({ color: 0xb9b2a6, roughness: 0.3, metalness: 0.05 })))
    floorMesh.rotation.x = -Math.PI / 2
    floorMesh.position.set(cx, 0, cz)
    scene.add(floorMesh)
    const carpet = track(carpetTexture())
    carpet.repeat.set(W / 2, 1)
    const runner = new THREE.Mesh(track(new THREE.PlaneGeometry(W, corridor - 0.2)), track(new THREE.MeshStandardMaterial({ map: carpet, roughness: 0.95 })))
    runner.rotation.x = -Math.PI / 2
    runner.position.set(cx, 0.005, (corrZ0 + corrZ1) / 2)
    if (cells.length) scene.add(runner)
    const ceiling = new THREE.Mesh(track(new THREE.PlaneGeometry(W, D)), track(new THREE.MeshStandardMaterial({ color: 0xf4f4f2, roughness: 0.9 })))
    ceiling.rotation.x = Math.PI / 2
    ceiling.position.set(cx, H, cz)
    scene.add(ceiling)
    const panelMat = track(new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff6e8, emissiveIntensity: 1.4 }))
    const panelGeo = track(new THREE.BoxGeometry(1.2, 0.04, 0.3))
    for (let x = box.x0 + 2; x < box.x1 - 1; x += 3) {
      for (const z of cells.length ? [(corrZ0 + corrZ1) / 2, box.z0 + rowDepth / 2, corrZ1 + rowDepth / 2] : [cz - D / 4, cz, cz + D / 4]) {
        const p = new THREE.Mesh(panelGeo, panelMat)
        p.position.set(x, H - 0.03, z)
        scene.add(p)
      }
    }
    // Curtain wall: clear glass with mullions every 1.5 m, so the city is visible outside.
    const glassMat = track(new THREE.MeshPhysicalMaterial({ color: 0xbfd8e6, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0, side: THREE.DoubleSide, depthWrite: false }))
    const mullMat = track(new THREE.MeshStandardMaterial({ color: 0x2b3238, metalness: 0.6, roughness: 0.4 }))
    const addCurtain = (x0: number, z0: number, x1: number, z1: number) => {
      const len = Math.hypot(x1 - x0, z1 - z0)
      const ang = Math.atan2(z1 - z0, x1 - x0)
      const pane = new THREE.Mesh(track(new THREE.PlaneGeometry(len, H)), glassMat)
      pane.position.set((x0 + x1) / 2, H / 2, (z0 + z1) / 2)
      pane.rotation.y = -ang
      scene.add(pane)
      const n = Math.max(1, Math.round(len / 1.5))
      for (let i = 0; i <= n; i++) {
        const t = i / n
        const m = new THREE.Mesh(track(new THREE.BoxGeometry(0.08, H, 0.08)), mullMat)
        m.position.set(x0 + (x1 - x0) * t, H / 2, z0 + (z1 - z0) * t)
        scene.add(m)
      }
      const sill = new THREE.Mesh(track(new THREE.BoxGeometry(len, 0.5, 0.2)), mullMat)
      sill.position.set((x0 + x1) / 2, 0.25, (z0 + z1) / 2)
      sill.rotation.y = -ang
      scene.add(sill)
    }
    addCurtain(box.x0, box.z0, box.x1, box.z0)
    addCurtain(box.x1, box.z0, box.x1, box.z1)
    addCurtain(box.x1, box.z1, box.x0, box.z1)
    addCurtain(box.x0, box.z1, box.x0, box.z0)

    // ── Outside: the city at the real floor height ──
    const groundY = -spec.y
    const ground = new THREE.Mesh(track(new THREE.PlaneGeometry(3000, 3000)), track(new THREE.MeshStandardMaterial({ color: 0xbfb8a6, roughness: 1 })))
    ground.rotation.x = -Math.PI / 2
    ground.position.y = groundY
    scene.add(ground)
    const cityMat = track(new THREE.MeshStandardMaterial({ color: 0xd4d8dc, roughness: 0.7 }))
    const cityGlass = track(new THREE.MeshStandardMaterial({ color: 0x8fa9bd, roughness: 0.2, metalness: 0.5 }))
    let seed = 7
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < 140; i++) {
      const a = rnd() * Math.PI * 2
      const r = 90 + rnd() * 520
      const h = 8 + rnd() * rnd() * 85
      const w = 14 + rnd() * 30
      const m = new THREE.Mesh(track(new THREE.BoxGeometry(w, h, 12 + rnd() * 26)), rnd() > 0.6 ? cityGlass : cityMat)
      m.position.set(cx + Math.cos(a) * r, groundY + h / 2, cz + Math.sin(a) * r)
      m.rotation.y = rnd() * Math.PI
      scene.add(m)
    }

    // ── Offices: side walls, glass fronts with doors, signs, furniture ──
    const walls: Seg[] = []
    const wallMat = track(new THREE.MeshStandardMaterial({ color: 0xe2ddd3, roughness: 0.8 }))
    const frontMat = track(new THREE.MeshPhysicalMaterial({ color: 0xd8e6ee, transparent: true, opacity: 0.32, roughness: 0.15, side: THREE.DoubleSide, depthWrite: false }))
    const frameMat = track(new THREE.MeshStandardMaterial({ color: 0x3a4148, metalness: 0.5, roughness: 0.4 }))
    const deskMat = track(new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 0.55 }))
    const chairMat = track(new THREE.MeshStandardMaterial({ color: 0x1f2830, roughness: 0.7 }))
    const plantPot = track(new THREE.MeshStandardMaterial({ color: 0xe9e4da }))
    const plantLeaf = track(new THREE.MeshStandardMaterial({ color: 0x3f7d3a, roughness: 0.8 }))
    const addWall = (x0: number, z0: number, x1: number, z1: number, mat: THREE.Material, solid = true) => {
      const w = Math.max(WALL_T, Math.abs(x1 - x0))
      const d = Math.max(WALL_T, Math.abs(z1 - z0))
      const m = new THREE.Mesh(track(new THREE.BoxGeometry(w, H, d)), mat)
      m.position.set((x0 + x1) / 2, H / 2, (z0 + z1) / 2)
      scene.add(m)
      if (solid) walls.push({ x0: Math.min(x0, x1) - WALL_T / 2, x1: Math.max(x0, x1) + WALL_T / 2, z0: Math.min(z0, z1) - WALL_T / 2, z1: Math.max(z0, z1) + WALL_T / 2 })
    }
    const doors: { unit: Unit; x: number; z: number; face: number; inside: Seg }[] = []
    for (const c of cells) {
      const front = c.z1 <= corrZ0 + 0.01 ? c.z1 : c.z0 // wall on the corridor side
      const intoCorridor = front === c.z1 ? 1 : -1
      addWall(c.x0, c.z0, c.x0, c.z1, wallMat)
      addWall(c.x1, c.z0, c.x1, c.z1, wallMat)
      const doorW = Math.min(1.2, (c.x1 - c.x0) * 0.5)
      const dx = (c.x0 + c.x1) / 2
      addWall(c.x0, front, dx - doorW / 2, front, frontMat)
      addWall(dx + doorW / 2, front, c.x1, front, frontMat)
      // Door frame and transom.
      const transom = new THREE.Mesh(track(new THREE.BoxGeometry(doorW, H - 2.3, WALL_T)), frontMat)
      transom.position.set(dx, 2.3 + (H - 2.3) / 2, front)
      scene.add(transom)
      for (const s of [-1, 1]) {
        const jamb = new THREE.Mesh(track(new THREE.BoxGeometry(0.06, 2.3, 0.14)), frameMat)
        jamb.position.set(dx + (s * doorW) / 2, 1.15, front)
        scene.add(jamb)
      }
      // Door sign facing the corridor.
      const occ = (c.unit.occupant ?? STATUS_META[c.unit.status].label).split(';')[0]!.trim()
      const sign = new THREE.Mesh(track(new THREE.PlaneGeometry(1.5, 0.47)), track(new THREE.MeshBasicMaterial({ map: track(signTexture(c.unit.unit, occ, STATUS_META[c.unit.status].color)) })))
      sign.position.set(dx + Math.min(1.6, (c.x1 - c.x0) / 2 - 0.9) * (dx > cx ? -1 : 1), 2.45, front + intoCorridor * 0.08)
      sign.rotation.y = intoCorridor > 0 ? 0 : Math.PI
      scene.add(sign)
      // Furniture: a row of desks with chairs, and a plant.
      const inner = { x0: c.x0 + 0.6, x1: c.x1 - 0.6, z0: Math.min(c.z0, c.z1) + 0.6, z1: Math.max(c.z0, c.z1) - 0.6 }
      const deskZ = front === c.z1 ? inner.z0 + 1.2 : inner.z1 - 1.2
      for (let x = inner.x0 + 0.9; x < inner.x1 - 0.6; x += 2.2) {
        const desk = new THREE.Mesh(track(new THREE.BoxGeometry(1.6, 0.05, 0.8)), deskMat)
        desk.position.set(x, 0.75, deskZ)
        const leg = new THREE.Mesh(track(new THREE.BoxGeometry(1.5, 0.72, 0.05)), frameMat)
        leg.position.set(x, 0.36, deskZ)
        const chair = new THREE.Mesh(track(new THREE.BoxGeometry(0.5, 0.9, 0.5)), chairMat)
        chair.position.set(x, 0.45, deskZ + (front === c.z1 ? 0.75 : -0.75))
        scene.add(desk, leg, chair)
      }
      const pot = new THREE.Mesh(track(new THREE.CylinderGeometry(0.22, 0.18, 0.45)), plantPot)
      pot.position.set(inner.x1 - 0.2, 0.22, front === c.z1 ? inner.z1 - 0.2 : inner.z0 + 0.2)
      const leaf = new THREE.Mesh(track(new THREE.IcosahedronGeometry(0.45, 1)), plantLeaf)
      leaf.position.set(pot.position.x, 0.85, pot.position.z)
      scene.add(pot, leaf)
      doors.push({ unit: c.unit, x: dx, z: front + intoCorridor * 1.4, face: intoCorridor > 0 ? 0 : Math.PI, inside: { x0: c.x0, x1: c.x1, z0: Math.min(c.z0, c.z1), z1: Math.max(c.z0, c.z1) } })
    }
    // Lift lobby label at the west end of the corridor.
    const lobby = new THREE.Mesh(
      track(new THREE.PlaneGeometry(2.2, 0.5)),
      track(new THREE.MeshBasicMaterial({ map: track(signTexture(floor === 0 ? 'Ground' : `Floor ${floor}`, `${asset.name} · Lifts`, '#f59e0b')) })),
    )
    lobby.position.set(box.x0 + 0.05, 2.4, (corrZ0 + corrZ1) / 2)
    lobby.rotation.y = Math.PI / 2
    scene.add(lobby)

    // ── Player: a dolly carrying the camera (the VR headset moves the camera inside it) ──
    const camera = new THREE.PerspectiveCamera(70, el.clientWidth / el.clientHeight, 0.05, 4000)
    const dolly = new THREE.Group()
    dolly.add(camera)
    scene.add(dolly)
    camera.position.set(0, EYE, 0)
    const start = cells.length ? new THREE.Vector3(box.x0 + 1.4, 0, (corrZ0 + corrZ1) / 2) : new THREE.Vector3(cx, 0, cz)
    dolly.position.copy(start)
    let yaw = cells.length ? -Math.PI / 2 : 0 // look along the corridor (towards +x)
    let pitch = 0
    const blocked = (x: number, z: number) =>
      x < box.x0 + R || x > box.x1 - R || z < box.z0 + R || z > box.z1 - R || walls.some((w) => x > w.x0 - R && x < w.x1 + R && z > w.z0 - R && z < w.z1 + R)
    const tryMove = (dx: number, dz: number) => {
      if (!blocked(dolly.position.x + dx, dolly.position.z)) dolly.position.x += dx
      if (!blocked(dolly.position.x, dolly.position.z + dz)) dolly.position.z += dz
    }
    let walkTarget: { p: THREE.Vector3; face?: number } | null = null
    goTo.current = (u: Unit) => {
      const d = doors.find((x) => x.unit.id === u.id)
      if (d) walkTarget = { p: new THREE.Vector3(d.x, 0, d.z), face: d.face }
    }

    // ── Input ──
    const keys = new Set<string>()
    const onKey = (e: KeyboardEvent) => {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
        if (e.type === 'keydown') keys.add(e.code)
        else keys.delete(e.code)
        walkTarget = null
        e.preventDefault()
      }
      if (e.type === 'keydown' && e.code === 'Escape' && !document.querySelector('[data-media-viewer]')) onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    let drag: { x: number; y: number; moved: boolean } | null = null
    const ray = new THREE.Raycaster()
    const onDown = (e: PointerEvent) => (drag = { x: e.clientX, y: e.clientY, moved: false })
    const onMove = (e: PointerEvent) => {
      if (!drag) return
      const dx = e.clientX - drag.x
      const dy = e.clientY - drag.y
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true
      yaw -= dx * 0.004
      pitch = Math.max(-1.2, Math.min(1.2, pitch - dy * 0.004))
      drag.x = e.clientX
      drag.y = e.clientY
    }
    const onUp = (e: PointerEvent) => {
      const d = drag
      drag = null
      if (!d || d.moved) return
      // Click / tap: walk to that point on the floor.
      const r = renderer.domElement.getBoundingClientRect()
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera)
      const hit = ray.intersectObject(floorMesh, false)[0]
      if (hit) walkTarget = { p: new THREE.Vector3(hit.point.x, 0, hit.point.z) }
    }
    const canvas = renderer.domElement
    canvas.style.touchAction = 'none'
    canvas.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)

    // ── VR: controllers point at the floor; trigger teleports ──
    const teleMarker = new THREE.Mesh(track(new THREE.RingGeometry(0.25, 0.32, 32)), track(new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide })))
    teleMarker.rotation.x = -Math.PI / 2
    teleMarker.visible = false
    scene.add(teleMarker)
    const lineGeo = track(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -6)]))
    const controllers = [0, 1].map((i) => {
      const c = renderer.xr.getController(i)
      c.add(new THREE.Line(lineGeo, track(new THREE.LineBasicMaterial({ color: 0xffffff }))))
      c.addEventListener('selectend', () => {
        if (teleMarker.visible && !blocked(teleMarker.position.x, teleMarker.position.z)) dolly.position.set(teleMarker.position.x, 0, teleMarker.position.z)
      })
      dolly.add(c)
      return c
    })
    const tmp = new THREE.Matrix4()
    enterVr.current = async () => {
      const xr = (navigator as Navigator & { xr?: XRSystem }).xr
      if (!xr) return
      const session = await xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] })
      camera.position.set(0, 0, 0) // the headset provides height
      await renderer.xr.setSession(session)
      setInVr(true)
      session.addEventListener('end', () => {
        setInVr(false)
        camera.position.set(0, EYE, 0)
      })
    }

    // ── Loop ──
    const clock = new THREE.Clock()
    let lastUnit: string | null = null
    renderer.setAnimationLoop(() => {
      const dt = Math.min(0.05, clock.getDelta())
      const presenting = renderer.xr.isPresenting
      if (!presenting) {
        dolly.rotation.y = yaw
        camera.rotation.set(pitch, 0, 0)
        const speed = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 4 : 2.2) * dt
        let f = 0
        let s = 0
        if (keys.has('KeyW') || keys.has('ArrowUp')) f += 1
        if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1
        if (keys.has('KeyA') || keys.has('ArrowLeft')) s -= 1
        if (keys.has('KeyD') || keys.has('ArrowRight')) s += 1
        if (f || s) {
          const sin = Math.sin(yaw)
          const cos = Math.cos(yaw)
          tryMove((-sin * f + cos * s) * speed, (-cos * f - sin * s) * speed)
        }
        if (walkTarget) {
          const to = walkTarget.p.clone().sub(dolly.position)
          to.y = 0
          const dist = to.length()
          if (dist < 0.08) {
            if (walkTarget.face != null) yaw = walkTarget.face
            walkTarget = null
          } else {
            const step = Math.min(dist, 2.6 * dt)
            const before = dolly.position.clone()
            tryMove((to.x / dist) * step, (to.z / dist) * step)
            if (walkTarget.face != null) yaw += (walkTarget.face - yaw) * 0.08
            if (dolly.position.distanceTo(before) < 1e-4) walkTarget = null // blocked by a wall
          }
        }
      } else {
        // Point any controller at the floor to aim the teleport.
        teleMarker.visible = false
        for (const c of controllers) {
          tmp.identity().extractRotation(c.matrixWorld)
          ray.ray.origin.setFromMatrixPosition(c.matrixWorld)
          ray.ray.direction.set(0, 0, -1).applyMatrix4(tmp)
          const hit = ray.intersectObject(floorMesh, false)[0]
          if (hit) {
            teleMarker.position.set(hit.point.x, 0.01, hit.point.z)
            teleMarker.visible = true
          }
        }
      }
      // Which office am I in?
      const p = dolly.position
      const inside = doors.find((d) => p.x > d.inside.x0 && p.x < d.inside.x1 && p.z > d.inside.z0 && p.z < d.inside.z1)
      const id = inside?.unit.id ?? null
      if (id !== lastUnit) {
        lastUnit = id
        setHere(inside?.unit ?? null)
      }
      renderer.render(scene, camera)
    })
    setReady(true)

    const ro = new ResizeObserver(() => {
      if (renderer.xr.isPresenting) return
      camera.aspect = el.clientWidth / Math.max(1, el.clientHeight)
      camera.updateProjectionMatrix()
      renderer.setSize(el.clientWidth, el.clientHeight)
    })
    ro.observe(el)

    return () => {
      renderer.setAnimationLoop(null)
      void renderer.xr.getSession()?.end()
      ro.disconnect()
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
      canvas.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      disposables.forEach((d) => d.dispose())
      pmrem.dispose()
      renderer.dispose()
      canvas.remove()
    }
    // One scene per open floor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset.id, floor])

  return (
    <div className="fixed inset-0 z-[70] flex bg-black text-sm">
      <div ref={host} className="relative min-w-0 flex-1" data-lenis-prevent>
        {!ready && (
          <div className="absolute inset-0 grid place-items-center text-white/80">
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Building the floor…
            </span>
          </div>
        )}
        <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-[min(92vw,520px)] space-y-2">
          <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-lg bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
            <Footprints className="size-4 text-brand" />
            <span className="font-medium">
              {asset.name} · {floor === 0 ? 'Ground floor' : `Floor ${floor}`}
            </span>
            <button
              onClick={() => enterVr.current()}
              disabled={vr !== 'yes' || inVr}
              title={vr === 'yes' ? 'Enter VR' : 'VR needs a headset browser (Meta Quest, Pico) or a WebXR-capable phone viewer'}
              className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs text-primary-foreground disabled:opacity-40"
            >
              <Glasses className="size-3.5" /> {vr === 'checking' ? 'VR…' : inVr ? 'In VR' : 'Enter VR'}
            </button>
            {asset.lobbyPanos?.[String(floor)] && (
              <OpenMedia kind="pano" mediaId={asset.lobbyPanos[String(floor)]!} title={`${floor === 0 ? 'Ground floor' : `Floor ${floor}`} lobby`} subtitle={asset.name} className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs hover:bg-accent">
                <Camera className="size-3.5" /> Lobby 360°
              </OpenMedia>
            )}
            <button onClick={onClose} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs hover:bg-accent" aria-label="Leave floor">
              <X className="size-3.5" /> Exit
            </button>
          </div>
          <p className="rounded-md bg-black/55 px-3 py-1.5 text-[11px] text-white/90">
            Drag to look · W A S D or arrows to walk (Shift = faster) · click / tap the floor to walk there · Esc to exit
            {vr === 'no' && ' · VR: open this page in a headset browser'}
          </p>
          {here && (
            <div className="pointer-events-auto rounded-lg bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <DoorOpen className="size-3.5" /> You are in office {here.unit}
              </p>
              {(here.occupant ?? '').split(';').filter(Boolean).map((c) => (
                <p key={c} className="font-medium">
                  {c.trim()}
                </p>
              ))}
              <p className="text-xs text-muted-foreground">
                {STATUS_META[here.status].label}
                {here.areaSqft ? ` · ${here.areaSqft.toLocaleString('en-IN')} sq.ft` : ''}
              </p>
              {(here.panoId || here.scanId) && (
                <div className="mt-2 flex gap-1.5">
                  {here.panoId && (
                    <OpenMedia kind="pano" mediaId={here.panoId} title={`Office ${here.unit}`} subtitle={asset.name} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs text-primary-foreground">
                      <Camera className="size-3.5" /> See the real office (360°)
                    </OpenMedia>
                  )}
                  {here.scanId && (
                    <OpenMedia kind="scan" mediaId={here.scanId} title={`Office ${here.unit}`} subtitle={asset.name} className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs hover:bg-accent">
                      <BoxIcon className="size-3.5" /> 3D scan
                    </OpenMedia>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <aside className="hidden w-[300px] shrink-0 flex-col border-l border-white/10 bg-background lg:flex">
        <div className="border-b px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Offices on this floor</p>
          <p className="text-xs text-muted-foreground">Click to walk to the door. Layout is schematic.</p>
        </div>
        <ul className="min-h-0 flex-1 divide-y overflow-y-auto" data-lenis-prevent>
          {units.length === 0 && <li className="px-4 py-3 text-xs text-muted-foreground">No offices recorded on this floor. Showing an open floor plate.</li>}
          {units.map((u) => (
            <li key={u.id}>
              <button onClick={() => goTo.current(u)} className={cn('flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-accent', here?.id === u.id && 'bg-accent')}>
                <span className="mt-0.5 size-2.5 shrink-0 rounded-sm" style={{ background: STATUS_META[u.status].color }} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 font-mono text-xs">
                    {u.unit}
                    {u.panoId && <Camera className="size-3 text-emerald-600" aria-label="Has 360° photo" />}
                    {u.scanId && <BoxIcon className="size-3 text-emerald-600" aria-label="Has 3D scan" />}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{(u.occupant ?? STATUS_META[u.status].label).split(';')[0]}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}
