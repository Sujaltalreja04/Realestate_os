import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { AlertTriangle, Glasses, Loader2, X } from 'lucide-react'
import { getMedia } from './media'
import { disposeObject, loadScan } from './scanLoader'

/**
 * Full-screen viewer for a real capture:
 *  - 'pano': a 360° equirectangular photo you look around in (drag / scroll to zoom; VR headsets look around naturally).
 *  - 'scan': a 3D scan (.glb) of an office or space, orbit to inspect; in VR you stand inside it at real scale.
 */

interface Props {
  kind: 'pano' | 'scan'
  mediaId: string
  title: string
  subtitle?: string
  onClose: () => void
}

export default function MediaViewer({ kind, mediaId, title, subtitle, onClose }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [vr, setVr] = useState(false)
  const [inVr, setInVr] = useState(false)
  const enterVr = useRef<() => void>(() => {})
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const xr = (navigator as Navigator & { xr?: XRSystem }).xr
    xr?.isSessionSupported('immersive-vr').then(setVr).catch(() => setVr(false))
  }, [])

  useEffect(() => {
    const el = host.current
    if (!el) return
    let live = true
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(el.clientWidth, el.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = kind === 'scan' ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping
    renderer.xr.enabled = true
    renderer.xr.setReferenceSpaceType(kind === 'scan' ? 'local-floor' : 'local')
    el.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(kind === 'pano' ? 75 : 50, el.clientWidth / el.clientHeight, 0.05, 2000)
    const cleanups: (() => void)[] = []
    let controls: OrbitControls | null = null
    let lon = 0
    let lat = 0

    if (kind === 'pano') {
      // Look-around: drag to turn, wheel to zoom.
      let drag: { x: number; y: number } | null = null
      const down = (e: PointerEvent) => (drag = { x: e.clientX, y: e.clientY })
      const move = (e: PointerEvent) => {
        if (!drag) return
        lon -= (e.clientX - drag.x) * 0.12
        lat = Math.max(-85, Math.min(85, lat + (e.clientY - drag.y) * 0.12))
        drag = { x: e.clientX, y: e.clientY }
      }
      const up = () => (drag = null)
      const wheel = (e: WheelEvent) => {
        camera.fov = Math.max(30, Math.min(95, camera.fov + e.deltaY * 0.03))
        camera.updateProjectionMatrix()
      }
      renderer.domElement.style.touchAction = 'none'
      renderer.domElement.addEventListener('pointerdown', down)
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
      renderer.domElement.addEventListener('wheel', wheel, { passive: true })
      cleanups.push(() => {
        renderer.domElement.removeEventListener('pointerdown', down)
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        renderer.domElement.removeEventListener('wheel', wheel)
      })
      getMedia(mediaId)
        .then(async (m) => {
          if (!m) throw new Error('This 360° photo is not in this browser.')
          // Decoded upright (WebGL textures are bottom-up; ImageBitmaps ignore texture.flipY).
          const bitmap = await createImageBitmap(m.blob, { imageOrientation: 'flipY' })
          if (!live) return
          const tex = new THREE.Texture(bitmap as unknown as HTMLImageElement)
          tex.colorSpace = THREE.SRGBColorSpace
          tex.needsUpdate = true
          const geo = new THREE.SphereGeometry(500, 96, 48)
          geo.scale(-1, 1, 1) // view from inside
          scene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex })))
          cleanups.push(() => (geo.dispose(), tex.dispose(), bitmap.close()))
          setState('ready')
        })
        .catch((e: unknown) => live && (setError(e instanceof Error ? e.message : 'Could not open the photo.'), setState('error')))
    } else {
      scene.background = new THREE.Color(0x1b1f24)
      const pmrem = new THREE.PMREMGenerator(renderer)
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
      scene.add(new THREE.HemisphereLight(0xffffff, 0x666055, 1))
      const sun = new THREE.DirectionalLight(0xffffff, 1.4)
      sun.position.set(5, 10, 6)
      scene.add(sun)
      controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      cleanups.push(() => (controls?.dispose(), scene.environment?.dispose(), pmrem.dispose()))
      loadScan(mediaId)
        .then((obj) => {
          if (!live) return disposeObject(obj)
          scene.add(obj)
          const size = obj.userData.size as THREE.Vector3
          const r = Math.max(size.x, size.y, size.z)
          camera.position.set(r * 0.9, r * 0.7, r * 0.9)
          controls!.target.set(0, size.y * 0.4, 0)
          controls!.maxDistance = r * 6
          cleanups.push(() => disposeObject(obj))
          setState('ready')
        })
        .catch((e: unknown) => live && (setError(e instanceof Error ? e.message : 'Could not open the scan.'), setState('error')))
    }

    enterVr.current = async () => {
      const xr = (navigator as Navigator & { xr?: XRSystem }).xr
      if (!xr) return
      const session = await xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] })
      await renderer.xr.setSession(session)
      setInVr(true)
      session.addEventListener('end', () => setInVr(false))
    }

    renderer.setAnimationLoop(() => {
      if (kind === 'pano' && !renderer.xr.isPresenting) {
        const phi = THREE.MathUtils.degToRad(90 - lat)
        const theta = THREE.MathUtils.degToRad(lon)
        camera.lookAt(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta))
      }
      controls?.update()
      renderer.render(scene, camera)
    })
    const ro = new ResizeObserver(() => {
      if (renderer.xr.isPresenting) return
      camera.aspect = el.clientWidth / Math.max(1, el.clientHeight)
      camera.updateProjectionMatrix()
      renderer.setSize(el.clientWidth, el.clientHeight)
    })
    ro.observe(el)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current()
    window.addEventListener('keydown', onKey)

    return () => {
      live = false
      renderer.setAnimationLoop(null)
      void renderer.xr.getSession()?.end()
      ro.disconnect()
      window.removeEventListener('keydown', onKey)
      cleanups.forEach((f) => f())
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [kind, mediaId])

  return createPortal(
    <div className="fixed inset-0 z-[80] bg-black text-sm" data-media-viewer>
      <div ref={host} className="absolute inset-0" data-lenis-prevent />
      <div className="absolute left-4 top-4 z-10 flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-2 rounded-lg bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
        <span className="font-medium">{title}</span>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        <span className="text-xs text-muted-foreground">· {kind === 'pano' ? 'Real 360° photo · drag to look, scroll to zoom' : 'Real 3D scan · drag to rotate, scroll to zoom'}</span>
        <button
          onClick={() => enterVr.current()}
          disabled={!vr || inVr || state !== 'ready'}
          title={vr ? 'Enter VR' : 'VR needs a headset browser (Meta Quest, Pico)'}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs text-primary-foreground disabled:opacity-40"
        >
          <Glasses className="size-3.5" /> {inVr ? 'In VR' : 'Enter VR'}
        </button>
        <button onClick={onClose} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs hover:bg-accent">
          <X className="size-3.5" /> Close
        </button>
      </div>
      {state === 'loading' && (
        <div className="absolute inset-0 grid place-items-center text-white/80">
          <span className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Opening {kind === 'pano' ? '360° photo' : '3D scan'}…
          </span>
        </div>
      )}
      {state === 'error' && (
        <div className="absolute inset-0 grid place-items-center p-6">
          <p className="flex max-w-md items-start gap-2 rounded-lg bg-background p-4 shadow-xl">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" /> {error}
          </p>
        </div>
      )}
    </div>,
    document.body,
  )
}
