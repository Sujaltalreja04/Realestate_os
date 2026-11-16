import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { getMedia } from './media'

/**
 * Load a stored .glb scan (drone photogrammetry, Polycam / Luma / RealityCapture export) as a three.js object,
 * re-centred so its footprint centre is at the origin and its lowest point sits on y = 0.
 * Draco-compressed meshes are supported (decoder from Google's CDN).
 */

let draco: DRACOLoader | null = null

export async function loadScan(mediaId: string, metresPerUnit = 1): Promise<THREE.Object3D> {
  const m = await getMedia(mediaId)
  if (!m) throw new Error('The 3D scan file is not in this browser.')
  const loader = new GLTFLoader()
  draco ??= new DRACOLoader().setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
  loader.setDRACOLoader(draco)
  const gltf = await loader.parseAsync(await m.blob.arrayBuffer(), '')
  const root = new THREE.Group()
  const scene = gltf.scene
  scene.scale.setScalar(metresPerUnit)
  scene.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(scene)
  const c = box.getCenter(new THREE.Vector3())
  scene.position.set(-c.x, -box.min.y, -c.z)
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = o.receiveShadow = true
      const mats = Array.isArray(o.material) ? o.material : [o.material]
      for (const mat of mats) if ('map' in mat && mat.map instanceof THREE.Texture) mat.map.colorSpace = THREE.SRGBColorSpace
    }
  })
  root.add(scene)
  root.userData.size = box.getSize(new THREE.Vector3())
  return root
}

export function disposeObject(o: THREE.Object3D) {
  o.traverse((x) => {
    if (x instanceof THREE.Mesh) {
      x.geometry.dispose()
      const mats = Array.isArray(x.material) ? x.material : [x.material]
      for (const mat of mats) {
        for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose()
        mat.dispose()
      }
    }
  })
}
