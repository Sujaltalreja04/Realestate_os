import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { ArrowRight, RotateCcw, X } from 'lucide-react'
import { ClientContainer, ClientPageHeader } from '@/components/marketing'
import { Skeleton } from '@/components/ui/skeleton'
import { formatINR } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useUnits, type UnitView } from './units'

const STATUS_COLOR: Record<string, string> = {
  Available: '#c49a63',
  Hold: '#d9c6a5',
  Booked: '#6f8597',
  Sold: '#4a4540',
}
const FLOOR_H = 1
const UNIT_W = 2.2
const TOWER_GAP = 14

export default function TownshipPage() {
  const { units } = useUnits()
  const [selected, setSelected] = useState<UnitView | null>(null)
  const [filter, setFilter] = useState<'all' | 'Available'>('all')
  const resetRef = useRef<() => void>(() => {})

  return (
    <>
      <ClientPageHeader
        eyebrow="3D township"
        title={
          <>
            Every home, <em>in place.</em>
          </>
        }
        description="Orbit the towers, then click any home to see its price, size and view. Bronze homes are available now."
      />
      <ClientContainer>
        <div className="relative aspect-[4/3] overflow-hidden border bg-[#efe9df] md:aspect-[16/9] dark:bg-zinc-900" data-lenis-prevent>
          {units === undefined ? (
            <Skeleton className="absolute inset-0 rounded-none" />
          ) : (
            <Scene units={units} filter={filter} selectedId={selected?.unit._id} onSelect={setSelected} resetRef={resetRef} />
          )}

          <div className="absolute left-4 top-4 flex flex-wrap gap-1 bg-background/90 p-1 text-xs shadow-sm backdrop-blur">
            {(['all', 'Available'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={cn('px-3 py-1.5', filter === f ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}>
                {f === 'all' ? 'All homes' : 'Available only'}
              </button>
            ))}
            <button onClick={() => resetRef.current()} className="px-2 hover:bg-accent" aria-label="Reset camera">
              <RotateCcw className="size-3.5" />
            </button>
          </div>

          <ul className="absolute bottom-4 left-4 flex flex-wrap gap-x-4 gap-y-1 bg-background/90 px-3 py-2 text-xs shadow-sm backdrop-blur">
            {Object.entries(STATUS_COLOR).map(([s, c]) => (
              <li key={s} className="flex items-center gap-1.5">
                <span className="size-2.5" style={{ background: c }} />
                {s}
              </li>
            ))}
          </ul>

          {selected && (
            <aside className="animate-reveal absolute bottom-4 right-4 top-4 hidden w-80 overflow-y-auto bg-background p-6 shadow-2xl md:block">
              <UnitDetail u={selected} onClose={() => setSelected(null)} />
            </aside>
          )}
        </div>
        {selected && (
          <div className="mt-4 border bg-card p-6 md:hidden">
            <UnitDetail u={selected} onClose={() => setSelected(null)} />
          </div>
        )}
        <p className="mt-4 text-xs text-muted-foreground">Drag to orbit · scroll or pinch to zoom · right-drag to pan. Massing is illustrative.</p>
      </ClientContainer>
    </>
  )
}

function UnitDetail({ u, onClose }: { u: UnitView; onClose: () => void }) {
  return (
    <div className="relative">
      <button onClick={onClose} className="absolute -right-2 -top-2 grid size-8 place-items-center hover:bg-accent" aria-label="Close">
        <X className="size-4" />
      </button>
      <p className="text-[11px] uppercase tracking-[0.22em] text-brand">
        {u.projectName} · {u.unit.tower}
      </p>
      <h3 className="mt-2 font-display text-4xl">Unit {u.unit.unit}</h3>
      <p className="text-sm text-muted-foreground">
        {u.unit.type} · Floor {u.unit.floor} · {u.unit.status}
      </p>
      <p className="mt-6 font-display text-3xl">{formatINR(u.unit.price)}</p>
      <dl className="mt-6 grid grid-cols-2 gap-4 border-t pt-6 text-sm">
        <div>
          <dt className="text-muted-foreground">Area</dt>
          <dd>{u.unit.area ? `${u.unit.area.toLocaleString('en-IN')} sq.ft` : '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Facing</dt>
          <dd>{u.unit.facing ?? '—'}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted-foreground">Views</dt>
          <dd>{u.unit.views.join(', ') || '—'}</dd>
        </div>
      </dl>
      {u.project && (
        <Link
          to={`/projects/${u.project._id}`}
          className="group mt-8 inline-flex items-center gap-2 border-b border-foreground pb-0.5 text-xs font-medium uppercase tracking-[0.2em]"
        >
          View project <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  )
}

function Scene({
  units,
  filter,
  selectedId,
  onSelect,
  resetRef,
}: {
  units: UnitView[]
  filter: 'all' | 'Available'
  selectedId?: string
  onSelect: (u: UnitView | null) => void
  resetRef: React.MutableRefObject<() => void>
}) {
  const host = useRef<HTMLDivElement>(null)
  const meshes = useRef(new Map<string, THREE.Mesh>())

  // Group units by tower; each tower gets a footprint of up to 4 homes per floor.
  const layout = useMemo(() => {
    const towers = Array.from(new Set(units.map((u) => u.unit.tower))).sort()
    const maxFloor = Math.max(...units.map((u) => u.unit.floor))
    return { towers, maxFloor }
  }, [units])

  useEffect(() => {
    const el = host.current
    if (!el) return
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(35, el.clientWidth / el.clientHeight, 0.1, 500)
    const home = new THREE.Vector3(38, 30, 42)
    camera.position.copy(home)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(el.clientWidth, el.clientHeight)
    renderer.shadowMap.enabled = true
    el.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.maxPolarAngle = Math.PI / 2.1
    controls.minDistance = 15
    controls.maxDistance = 120
    controls.target.set(0, layout.maxFloor / 2, 0)
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.4
    resetRef.current = () => {
      camera.position.copy(home)
      controls.target.set(0, layout.maxFloor / 2, 0)
    }

    scene.add(new THREE.HemisphereLight(0xfff8ee, 0x8a7a66, 1.6))
    const sun = new THREE.DirectionalLight(0xffffff, 2.2)
    sun.position.set(30, 50, 20)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    Object.assign(sun.shadow.camera, { left: -50, right: 50, top: 50, bottom: -50 })
    scene.add(sun)

    const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshStandardMaterial({ color: 0xe6dccb, roughness: 1 }))
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    scene.add(ground)
    // Landscaped podium and paths.
    const podium = new THREE.Mesh(
      new THREE.BoxGeometry(layout.towers.length * TOWER_GAP + 8, 0.4, 22),
      new THREE.MeshStandardMaterial({ color: 0xcfc3ae, roughness: 0.9 }),
    )
    podium.position.y = 0.2
    podium.receiveShadow = true
    scene.add(podium)
    for (let i = 0; i < 14; i++) {
      const tree = new THREE.Mesh(new THREE.SphereGeometry(0.9 + Math.random() * 0.5, 12, 10), new THREE.MeshStandardMaterial({ color: 0x7f9a78, roughness: 1 }))
      tree.position.set((i - 7) * 3.2, 1.3, i % 2 ? 9 : -9)
      tree.castShadow = true
      scene.add(tree)
    }

    const unitGeo = new THREE.BoxGeometry(UNIT_W - 0.12, FLOOR_H - 0.08, UNIT_W * 1.4 - 0.12)
    meshes.current.clear()
    layout.towers.forEach((tower, ti) => {
      const tx = (ti - (layout.towers.length - 1) / 2) * TOWER_GAP
      const ofTower = units.filter((u) => u.unit.tower === tower)
      // Core: a slim glass shaft through all floors gives each tower a silhouette.
      const core = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, layout.maxFloor * FLOOR_H + 2, 1.2),
        new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.4 }),
      )
      core.position.set(tx, (layout.maxFloor * FLOOR_H + 2) / 2 + 0.4, 0)
      core.castShadow = true
      scene.add(core)
      ofTower.forEach((u) => {
        const sameFloor = ofTower.filter((x) => x.unit.floor === u.unit.floor).sort((a, b) => a.unit.unit.localeCompare(b.unit.unit))
        const slot = sameFloor.indexOf(u)
        const m = new THREE.Mesh(unitGeo, new THREE.MeshStandardMaterial({ color: STATUS_COLOR[u.unit.status] ?? '#999', roughness: 0.55 }))
        const sx = slot % 2 ? 1 : -1
        const sz = slot >= 2 ? 1 : -1
        m.position.set(tx + sx * (UNIT_W / 2 + 0.7), 0.4 + (u.unit.floor - 0.5) * FLOOR_H, sz * (UNIT_W * 0.7 + 0.2))
        m.castShadow = true
        m.userData.id = u.unit._id
        scene.add(m)
        meshes.current.set(u.unit._id, m)
      })
      // Ghost floors for floors with no listed unit, so towers read as solid buildings.
      for (let f = 1; f <= layout.maxFloor; f++) {
        if (ofTower.some((u) => u.unit.floor === f)) continue
        const slab = new THREE.Mesh(
          new THREE.BoxGeometry(UNIT_W * 2 + 1.2, FLOOR_H - 0.08, UNIT_W * 2.8),
          new THREE.MeshStandardMaterial({ color: 0xefe8dc, transparent: true, opacity: 0.55, roughness: 0.8 }),
        )
        slab.position.set(tx, 0.4 + (f - 0.5) * FLOOR_H, 0)
        scene.add(slab)
      }
    })

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let downAt = { x: 0, y: 0 }
    const onDown = (e: PointerEvent) => {
      downAt = { x: e.clientX, y: e.clientY }
      controls.autoRotate = false
    }
    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 5) return // was a drag
      const r = renderer.domElement.getBoundingClientRect()
      pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects([...meshes.current.values()].filter((m) => m.visible))[0]
      const id = hit?.object.userData.id as string | undefined
      onSelect(id ? (units.find((u) => u.unit._id === id) ?? null) : null)
    }
    const onMove = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect()
      pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      raycaster.setFromCamera(pointer, camera)
      renderer.domElement.style.cursor = raycaster.intersectObjects([...meshes.current.values()].filter((m) => m.visible)).length ? 'pointer' : 'grab'
    }
    renderer.domElement.addEventListener('pointerdown', onDown)
    renderer.domElement.addEventListener('pointerup', onUp)
    renderer.domElement.addEventListener('pointermove', onMove)

    // Render only while on screen.
    let visible = true
    const io = new IntersectionObserver(([e]) => (visible = !!e?.isIntersecting))
    io.observe(el)
    let raf = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      if (!visible) return
      controls.update()
      renderer.render(scene, camera)
    }
    loop()

    const ro = new ResizeObserver(() => {
      camera.aspect = el.clientWidth / el.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(el.clientWidth, el.clientHeight)
    })
    ro.observe(el)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      controls.dispose()
      renderer.dispose()
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose()
          ;(o.material as THREE.Material).dispose()
        }
      })
      renderer.domElement.remove()
    }
  }, [units, layout, onSelect, resetRef])

  // Filter + selection styling without rebuilding the scene.
  useEffect(() => {
    for (const [id, m] of meshes.current) {
      const u = units.find((x) => x.unit._id === id)!
      const mat = m.material as THREE.MeshStandardMaterial
      const dim = filter === 'Available' && u.unit.status !== 'Available'
      mat.transparent = dim
      mat.opacity = dim ? 0.12 : 1
      mat.emissive.set(id === selectedId ? 0x6b4a1e : 0x000000)
      m.scale.setScalar(id === selectedId ? 1.08 : 1)
    }
  }, [filter, selectedId, units])

  return <div ref={host} className="absolute inset-0" />
}
