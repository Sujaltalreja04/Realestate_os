import * as THREE from 'three'
import { buildAssetModel } from './buildingModel'
import type { Asset } from './store'

/**
 * AR: place a scale model of the building on a real surface through the phone camera (WebXR "immersive-ar" with
 * hit-testing). Works in Chrome on ARCore Android phones; iPhone Safari does not support WebXR AR.
 */

export async function arSupported() {
  const xr = (navigator as Navigator & { xr?: XRSystem }).xr
  if (!xr) return false
  try {
    return await xr.isSessionSupported('immersive-ar')
  } catch {
    return false
  }
}

export async function startBuildingAR(asset: Asset, onEnd: () => void) {
  const xr = (navigator as Navigator & { xr?: XRSystem }).xr
  if (!xr) throw new Error('AR is not available in this browser.')

  const disposables: { dispose: () => void }[] = []
  const track = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x)

  // DOM overlay: hint and exit button while the camera view is open.
  const overlay = document.createElement('div')
  overlay.style.cssText = 'position:fixed;inset:0;pointer-events:none;font:500 14px Inter,system-ui,sans-serif;color:#fff'
  overlay.innerHTML =
    '<div style="position:absolute;left:50%;bottom:28px;transform:translateX(-50%);background:rgba(15,23,42,.8);padding:10px 14px;border-radius:10px;text-align:center">Point at a table or the floor, then tap to place <b></b></div>' +
    '<button style="position:absolute;right:16px;top:16px;pointer-events:auto;background:#fff;color:#111;border:0;border-radius:8px;padding:8px 12px;font-weight:600">Exit AR</button>'
  overlay.querySelector('b')!.textContent = asset.name
  document.body.appendChild(overlay)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.xr.enabled = true
  renderer.domElement.style.cssText = 'position:fixed;inset:0'
  document.body.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7f6a, 2))
  const sun = new THREE.DirectionalLight(0xffffff, 1.5)
  sun.position.set(1, 2, 1)
  scene.add(sun)

  // ~1:250 scale: Shivalik Shilp (~60 m tall) becomes ~24 cm.
  const model = buildAssetModel(asset, track)
  const holder = new THREE.Group()
  holder.add(model.group)
  holder.scale.setScalar(1 / 250)
  holder.visible = false
  scene.add(holder)

  const reticle = new THREE.Mesh(track(new THREE.RingGeometry(0.06, 0.08, 32).rotateX(-Math.PI / 2)), track(new THREE.MeshBasicMaterial({ color: 0xf59e0b })))
  reticle.matrixAutoUpdate = false
  reticle.visible = false
  scene.add(reticle)

  const session = await xr.requestSession('immersive-ar', { requiredFeatures: ['hit-test'], optionalFeatures: ['dom-overlay'], domOverlay: { root: overlay } })
  renderer.xr.setReferenceSpaceType('local')
  await renderer.xr.setSession(session)
  const viewerSpace = await session.requestReferenceSpace('viewer')
  const hitSource = await session.requestHitTestSource?.({ space: viewerSpace })

  const controller = renderer.xr.getController(0)
  controller.addEventListener('select', () => {
    if (!reticle.visible) return
    holder.position.setFromMatrixPosition(reticle.matrix)
    holder.visible = true
  })
  scene.add(controller)
  overlay.querySelector('button')!.addEventListener('click', () => void session.end())

  renderer.setAnimationLoop((_t, frame) => {
    if (frame && hitSource) {
      const ref = renderer.xr.getReferenceSpace()
      const hit = ref ? frame.getHitTestResults(hitSource)[0] : undefined
      const pose = hit && ref ? hit.getPose(ref) : undefined
      reticle.visible = !!pose
      if (pose) reticle.matrix.fromArray(pose.transform.matrix)
    }
    renderer.render(scene, renderer.xr.getCamera())
  })

  session.addEventListener('end', () => {
    renderer.setAnimationLoop(null)
    hitSource?.cancel()
    disposables.forEach((d) => d.dispose())
    renderer.dispose()
    renderer.domElement.remove()
    overlay.remove()
    onEnd()
  })
}
