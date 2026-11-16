import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { MODELS, type Lighting, type PresetId } from './models'
import { cn } from '@/lib/utils'

export interface CameraView {
  camera: [number, number, number]
  target: [number, number, number]
}

const SKY: Record<Lighting, { top: string; mid: string; bottom: string; fog: number }> = {
  day: { top: '#7fa9d6', mid: '#c4d9ec', bottom: '#eef1ee', fog: 0xdfe6ea },
  dusk: { top: '#1b2742', mid: '#4f5d7e', bottom: '#d9966a', fog: 0x4a4f63 },
}

function skyTexture(l: Lighting) {
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 512
  const g = c.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, 0, 512)
  grad.addColorStop(0, SKY[l].top)
  grad.addColorStop(0.6, SKY[l].mid)
  grad.addColorStop(1, SKY[l].bottom)
  g.fillStyle = grad
  g.fillRect(0, 0, 4, 512)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

interface Props {
  preset: PresetId
  /** When set, the camera flies smoothly to this view. */
  view?: CameraView
  /** Slow automatic orbit while idle. */
  autoRotate?: boolean
  className?: string
}

/** Smooth, interactive 3D model of one project. Pauses rendering when off screen. */
export default function PropertyViewer({ preset, view, autoRotate = true, className }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const flyRef = useRef<(v: CameraView) => void>(() => {})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const el = host.current
    if (!el) return
    const spec = MODELS[preset]

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(el.clientWidth, el.clientHeight)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = spec.lighting === 'dusk' ? 1.05 : 1
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = skyTexture(spec.lighting)
    scene.fog = new THREE.Fog(SKY[spec.lighting].fog, 120, 420)
    const pmrem = new THREE.PMREMGenerator(renderer)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    scene.environmentIntensity = spec.lighting === 'dusk' ? 0.35 : 0.8

    // Lighting: bright sun by day; low warm sun and cool sky at dusk.
    const hemi = new THREE.HemisphereLight(spec.lighting === 'day' ? 0xdcecff : 0x6f7fa8, spec.lighting === 'day' ? 0x8a7f6a : 0x3a2e28, spec.lighting === 'day' ? 1.1 : 0.55)
    scene.add(hemi)
    const sun = new THREE.DirectionalLight(spec.lighting === 'day' ? 0xfff4e2 : 0xffb07a, spec.lighting === 'day' ? 2.6 : 1.1)
    sun.position.set(spec.lighting === 'day' ? 60 : -80, spec.lighting === 'day' ? 90 : 25, 50)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.bias = -0.0004
    sun.shadow.normalBias = 0.03
    Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 300 })
    scene.add(sun)

    const model = spec.build()
    scene.add(model)

    const camera = new THREE.PerspectiveCamera(42, el.clientWidth / el.clientHeight, 0.3, 900)
    camera.position.set(...spec.home.camera)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(...spec.home.target)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.maxPolarAngle = Math.PI / 2.05
    controls.minDistance = 6
    controls.maxDistance = 260
    controls.autoRotate = autoRotate
    controls.autoRotateSpeed = 0.35
    controls.addEventListener('start', () => (controls.autoRotate = false))

    // Camera flights: eased position + target over ~2.4s, with a gentle lift mid-flight.
    let flight: { from: THREE.Vector3; to: THREE.Vector3; tFrom: THREE.Vector3; tTo: THREE.Vector3; start: number; dur: number } | null = null
    flyRef.current = (v) => {
      controls.autoRotate = false
      const to = new THREE.Vector3(...v.camera)
      const dist = camera.position.distanceTo(to)
      flight = {
        from: camera.position.clone(),
        to,
        tFrom: controls.target.clone(),
        tTo: new THREE.Vector3(...v.target),
        start: performance.now(),
        dur: Math.min(3200, 1400 + dist * 18),
      }
    }

    let visible = true
    const io = new IntersectionObserver(([e]) => (visible = !!e?.isIntersecting))
    io.observe(el)
    let raf = 0
    let first = true
    const loop = () => {
      raf = requestAnimationFrame(loop)
      if (!visible) return
      if (flight) {
        const k = Math.min(1, (performance.now() - flight.start) / flight.dur)
        const e = ease(k)
        camera.position.lerpVectors(flight.from, flight.to, e)
        camera.position.y += Math.sin(Math.PI * e) * Math.min(8, flight.from.distanceTo(flight.to) * 0.08)
        controls.target.lerpVectors(flight.tFrom, flight.tTo, e)
        if (k >= 1) {
          flight = null
          // A slow drift after arriving keeps the scene alive without fighting the user.
          controls.autoRotate = true
          controls.autoRotateSpeed = 0.15
        }
      }
      controls.update()
      renderer.render(scene, camera)
      if (first) {
        first = false
        setReady(true)
      }
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
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose()
          const mats = Array.isArray(o.material) ? o.material : [o.material]
          mats.forEach((m) => {
            Object.values(m).forEach((v) => v instanceof THREE.Texture && v.dispose())
            m.dispose()
          })
        }
      })
      ;(scene.background as THREE.Texture).dispose()
      env.dispose()
      pmrem.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [preset, autoRotate])

  useEffect(() => {
    if (view && ready) flyRef.current(view)
  }, [view, ready])

  return (
    // No inline position here: an inline `relative` overrode callers' `absolute inset-0` and collapsed the canvas to 0px.
    <div className={cn('relative', className)}>
      <div ref={host} className="absolute inset-0 [&>canvas]:block [&>canvas]:cursor-grab [&>canvas:active]:cursor-grabbing" data-lenis-prevent />
      {!ready && (
        <div className="absolute inset-0 grid place-items-center bg-muted">
          <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Building model…</span>
        </div>
      )}
    </div>
  )
}
