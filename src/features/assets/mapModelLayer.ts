import * as THREE from 'three'
import maplibregl, { type CustomLayerInterface, type Map as MLMap } from 'maplibre-gl'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { LngLat } from '@/features/map/osm'
import { buildAssetModel, floorTip, type ViewMode } from './buildingModel'
import type { Asset, Unit } from './store'

/**
 * The realistic three.js building rendered inside the live MapLibre map (a custom 3D layer sharing the map's WebGL
 * context and depth buffer, so it sits on the real streets and is hidden correctly behind other 3D buildings).
 * Loaded on demand, so three.js is only downloaded when an asset is opened on the map.
 */

export interface AssetLayerState {
  selected: number | null
  hovered: number | null
  mode: ViewMode
  counts: Map<number, number>
  floorUnits: Unit[]
}

export interface AssetLayerHandle {
  id: string
  /** Recolour / cutaway / office blocks. */
  update: (s: AssetLayerState) => void
  /** Move or rotate the building live (no rebuild). */
  setPlacement: (center: LngLat, rotationDeg: number) => void
  /** What is under a screen point: a floor or an office, with tooltip HTML. */
  pick: (point: { x: number; y: number }) => { floor: number; tip: string; office: boolean; unitId?: string } | null
  /** Highlight one office's label. */
  focusOffice: (unitId: string | null) => void
  /** Swap in a real exterior scan (or null for the generated model). */
  setExterior: (scan: THREE.Object3D | null) => void
  remove: () => void
}

function contactShadow(track: <T extends { dispose: () => void }>(x: T) => T) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 10, 64, 64, 64)
  grad.addColorStop(0, 'rgba(0,0,0,0.55)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  const tex = track(new THREE.CanvasTexture(c))
  return new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
}

const LABEL_CSS = `
.reos-office-labels{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:2}
.reos-office-label{position:absolute;left:0;top:0;pointer-events:auto;cursor:pointer;border:0;padding:5px 8px 5px 7px;border-radius:7px;
  background:rgba(15,23,42,.9);color:#fff;font:600 11px/1.2 Inter,system-ui,sans-serif;text-align:left;white-space:nowrap;
  box-shadow:0 4px 14px rgba(0,0,0,.35);border-left:4px solid var(--c);transition:transform .05s linear, background .15s}
.reos-office-label small{display:block;font-weight:400;opacity:.82;max-width:170px;overflow:hidden;text-overflow:ellipsis}
.reos-office-label:hover,.reos-office-label.is-focus{background:#b45309}
.reos-office-label::after{content:'';position:absolute;left:12px;bottom:-5px;border:5px solid transparent;border-bottom:0;border-top-color:rgba(15,23,42,.9)}
`

export function createAssetLayer(map: MLMap, asset: Asset, beforeId?: string, onOffice?: (unitId: string) => void): AssetLayerHandle {
  const id = `asset-model-${asset.id}`
  const disposables: { dispose: () => void }[] = []
  const track = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x)

  const scene = new THREE.Scene()
  const camera = new THREE.Camera()
  camera.matrixAutoUpdate = false
  camera.matrixWorldAutoUpdate = false
  const eyeMatrix = new THREE.Matrix4()
  const eyeLocal = new THREE.Vector3(0, 0, 100)
  const model = buildAssetModel(asset, track)
  scene.add(model.group)

  // Soft ground shadow under the footprint (cheap stand-in for real shadows on the map).
  const span = Math.max(...model.floors.map((f) => Math.max(f.box.x1 - f.box.x0, f.box.z1 - f.box.z0)))
  const shadow = new THREE.Mesh(track(new THREE.PlaneGeometry(span * 1.5, span * 1.1)), track(contactShadow(track)))
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.05
  model.group.add(shadow)

  scene.add(new THREE.HemisphereLight(0xe6f0ff, 0x8a7f6a, 0.9))
  const sun = new THREE.DirectionalLight(0xfff1dc, 1.9)
  sun.position.set(80, 140, 60)
  scene.add(sun)
  const fill = new THREE.DirectionalLight(0xcfe0ff, 0.6)
  fill.position.set(-90, 60, -70)
  scene.add(fill)

  // Floating office labels (HTML, positioned every frame from the 3D office blocks).
  if (!document.getElementById('reos-office-label-css')) {
    const st = document.createElement('style')
    st.id = 'reos-office-label-css'
    st.textContent = LABEL_CSS
    document.head.appendChild(st)
  }
  const labelHost = document.createElement('div')
  labelHost.className = 'reos-office-labels'
  map.getCanvasContainer().appendChild(labelHost)
  let labels: { el: HTMLButtonElement; block: THREE.Mesh }[] = []
  let focusUnit: string | null = null
  const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
  const syncLabels = () => {
    labelHost.replaceChildren()
    labels = model.officeBlocks().map((block) => {
      const l = block.userData.label as { unit: string; occupant: string; more: number; color: string; area?: number }
      const el = document.createElement('button')
      el.type = 'button'
      el.className = 'reos-office-label'
      el.style.setProperty('--c', l.color)
      el.innerHTML = `${esc(l.unit)}${l.area ? ` · ${l.area.toLocaleString('en-IN')} sq.ft` : ''}<small>${esc(l.occupant)}${l.more ? ` +${l.more}` : ''}</small>`
      el.addEventListener('click', (ev) => {
        ev.stopPropagation()
        onOffice?.(block.userData.unitId as string)
      })
      labelHost.appendChild(el)
      return { el, block }
    })
  }
  const clip = new THREE.Vector4()
  const wp = new THREE.Vector3()
  let lastMvp = new THREE.Matrix4()
  const placeLabels = () => {
    const canvas = map.getCanvas()
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    for (const { el, block } of labels) {
      block.getWorldPosition(wp)
      wp.y += 1.4
      clip.set(wp.x, wp.y, wp.z, 1).applyMatrix4(lastMvp)
      if (clip.w <= 0) {
        el.style.display = 'none'
        continue
      }
      const px = ((clip.x / clip.w + 1) / 2) * w
      const py = ((1 - clip.y / clip.w) / 2) * h
      el.style.display = px < -100 || px > w + 100 || py < -60 || py > h + 60 ? 'none' : ''
      el.style.transform = `translate(${px - 14}px, ${py - 40}px)`
      el.classList.toggle('is-focus', block.userData.unitId === focusUnit)
    }
  }

  let renderer: THREE.WebGLRenderer | null = null
  let pmrem: THREE.PMREMGenerator | null = null
  let center: LngLat = asset.center
  let transform = new THREE.Matrix4()
  const inverse = new THREE.Matrix4()

  const computeTransform = () => {
    const merc = maplibregl.MercatorCoordinate.fromLngLat(center, 0)
    const s = merc.meterInMercatorCoordinateUnits()
    // Model axes (x east, y up, z south) → mercator (x east, y south, z up).
    transform = new THREE.Matrix4()
      .makeTranslation(merc.x, merc.y, merc.z ?? 0)
      .scale(new THREE.Vector3(s, -s, s))
      .multiply(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2))
  }
  computeTransform()

  const layer: CustomLayerInterface = {
    id,
    type: 'custom',
    renderingMode: '3d',
    onAdd(_m, gl) {
      renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true })
      renderer.autoClear = false
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 0.95
      pmrem = new THREE.PMREMGenerator(renderer)
      const env = track(pmrem.fromScene(new RoomEnvironment(), 0.04).texture)
      scene.environment = env
      scene.environmentIntensity = 0.6
    },
    render(_gl, args) {
      if (!renderer) return
      const m = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix as unknown as number[])
      const mvp = m.multiply(transform) // model space → clip space
      inverse.copy(mvp).invert()
      // Real eye position in model space (the point that projects to w = 0), so glass reflections and highlights
      // are computed from where the viewer actually is. Folded back out of the projection so the result is unchanged.
      const eye = new THREE.Vector4(0, 0, 1, 0).applyMatrix4(inverse)
      if (Math.abs(eye.w) > 1e-12) eyeMatrix.makeTranslation(eye.x / eye.w, eye.y / eye.w, eye.z / eye.w)
      else eyeMatrix.identity()
      // three.js uses matrixWorld (for the eye position) and matrixWorldInverse (for the view); set both directly.
      camera.matrix.copy(eyeMatrix)
      camera.matrixWorld.copy(eyeMatrix)
      camera.matrixWorldInverse.copy(eyeMatrix).invert()
      camera.projectionMatrix.copy(mvp).multiply(eyeMatrix)
      lastMvp = mvp.clone()
      if (Math.abs(eye.w) > 1e-12) {
        eyeLocal.set(eye.x / eye.w, eye.y / eye.w, eye.z / eye.w)
        model.group.worldToLocal(eyeLocal)
      }
      const moving = model.tick()
      scene.updateMatrixWorld()
      renderer.resetState()
      renderer.render(scene, camera)
      placeLabels()
      if (moving) map.triggerRepaint()
    },
    onRemove() {
      labelHost.remove()
      disposables.forEach((d) => d.dispose())
      model.setPlate(null, [])
      pmrem?.dispose()
      renderer?.dispose()
      renderer = null
    },
  }
  map.addLayer(layer, beforeId && map.getLayer(beforeId) ? beforeId : undefined)

  let lastPlate = ''
  let selected: number | null = null
  const ray = new THREE.Raycaster()
  return {
    id,
    update(s) {
      selected = s.selected
      const key = `${s.selected}|${s.floorUnits.map((u) => `${u.id}:${u.areaSqft}:${u.status}`).join(',')}`
      model.openFloor(s.selected, eyeLocal.z)
      if (key !== lastPlate) {
        model.setPlate(s.selected, s.floorUnits)
        lastPlate = key
        syncLabels()
      }
      model.restyle(s)
      map.triggerRepaint()
    },
    setPlacement(c, rotationDeg) {
      center = c
      computeTransform()
      model.group.rotation.y = -(rotationDeg * Math.PI) / 180
      map.triggerRepaint()
    },
    pick(point) {
      const canvas = map.getCanvas()
      const x = (point.x / canvas.clientWidth) * 2 - 1
      const y = 1 - (point.y / canvas.clientHeight) * 2
      const near = new THREE.Vector3(x, y, -1).applyMatrix4(inverse)
      const far = new THREE.Vector3(x, y, 1).applyMatrix4(inverse)
      ray.set(near, far.sub(near).normalize())
      scene.updateMatrixWorld()
      const hits = ray.intersectObjects(model.pickables, false)
      // Offices first, then solid floors; see-through floors above the selection only if nothing else is hit.
      const hit =
        hits.find((h) => h.object.userData.tip) ??
        hits.find((h) => selected == null || (h.object.userData.floor as number) <= selected) ??
        hits[0]
      if (!hit) return null
      const floor = hit.object.userData.floor as number
      const tip = (hit.object.userData.tip as string | undefined) ?? floorTip(asset, floor)
      return { floor, tip, office: !!hit.object.userData.tip, unitId: hit.object.userData.unitId as string | undefined }
    },
    focusOffice(unitId) {
      focusUnit = unitId
      map.triggerRepaint()
    },
    setExterior(scan) {
      model.setExterior(scan)
      map.triggerRepaint()
    },
    remove() {
      // The map may already be destroyed (page navigation): nothing left to remove then.
      labelHost.remove()
      try {
        if (map.getLayer(id)) map.removeLayer(id)
      } catch {
        /* map gone */
      }
    },
  }
}
