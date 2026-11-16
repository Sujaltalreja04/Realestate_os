import * as THREE from 'three'
import type { PresetId } from './presets'

export type { PresetId }

/**
 * Procedural 3D models, one per project, built to match each project's photograph:
 * massing, facade materials, colours and time of day. Units are metres.
 */

export type Lighting = 'day' | 'dusk'

export interface ExteriorStop {
  kind: 'view'
  title: string
  caption: string
  camera: [number, number, number]
  target: [number, number, number]
}
export interface InteriorStop {
  kind: 'interior'
  title: string
  caption: string
  photo: string
}
export type TourStop = ExteriorStop | InteriorStop

export interface ModelSpec {
  build: () => THREE.Group
  lighting: Lighting
  home: { camera: [number, number, number]; target: [number, number, number] }
  stops: TourStop[]
}

/* ── Seeded randomness so a project always looks the same ─────────── */
function rng(seed: number) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

/* ── Canvas textures ──────────────────────────────────────────────── */

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat: [number, number] = [1, 1]) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d')!)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(...repeat)
  t.anisotropy = 8
  return t
}

function brick(base: [number, number, number], mortar: string, seed: number, repeat: [number, number]) {
  const r = rng(seed)
  return canvasTex(
    256,
    256,
    (g) => {
      g.fillStyle = mortar
      g.fillRect(0, 0, 256, 256)
      const bh = 16
      const bw = 48
      for (let y = 0; y < 256; y += bh) {
        const off = (y / bh) % 2 ? bw / 2 : 0
        for (let x = -bw; x < 256 + bw; x += bw) {
          const k = 0.85 + r() * 0.3
          g.fillStyle = `rgb(${base.map((v) => Math.min(255, Math.round(v * k))).join(',')})`
          g.fillRect(x + off + 1, y + 1, bw - 2, bh - 2)
        }
      }
    },
    repeat,
  )
}

function timber(seed: number, repeat: [number, number]) {
  const r = rng(seed)
  return canvasTex(
    256,
    256,
    (g) => {
      for (let x = 0; x < 256; x += 8) {
        const k = 0.75 + r() * 0.4
        g.fillStyle = `rgb(${Math.round(92 * k)},${Math.round(60 * k)},${Math.round(38 * k)})`
        g.fillRect(x, 0, 7, 256)
        g.fillStyle = 'rgba(0,0,0,0.55)'
        g.fillRect(x + 7, 0, 1, 256)
      }
    },
    repeat,
  )
}

/** Curtain wall: mullion grid with some panels lit warm. Returns colour + emissive maps. */
function curtainWall(cols: number, rows: number, litRatio: number, seed: number) {
  const r = rng(seed)
  const lit: boolean[] = Array.from({ length: cols * rows }, () => r() < litRatio)
  const draw = (emissive: boolean) => (g: CanvasRenderingContext2D) => {
    const W = 512
    const H = 1024
    g.fillStyle = emissive ? '#000' : '#10161d'
    g.fillRect(0, 0, W, H)
    const cw = W / cols
    const rh = H / rows
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) {
        const on = lit[j * cols + i]!
        if (emissive) {
          if (on) {
            g.fillStyle = `rgba(255,${190 + Math.round(r() * 40)},120,${0.6 + r() * 0.4})`
            g.fillRect(i * cw + 2, j * rh + 2, cw - 4, rh - 4)
          }
        } else {
          const v = 26 + Math.round(r() * 22)
          g.fillStyle = on ? '#d9a35b' : `rgb(${v},${v + 8},${v + 16})`
          g.fillRect(i * cw + 2, j * rh + 2, cw - 4, rh - 4)
        }
      }
    if (!emissive) {
      g.fillStyle = '#05080b'
      for (let i = 0; i <= cols; i++) g.fillRect(i * cw - 1, 0, 2, H)
      for (let j = 0; j <= rows; j++) g.fillRect(0, j * rh - 1, W, 2)
    }
  }
  return { map: canvasTex(512, 1024, draw(false)), emissive: canvasTex(512, 1024, draw(true)) }
}

function noiseTex(base: [number, number, number], spread: number, seed: number, repeat: [number, number], size = 128) {
  const r = rng(seed)
  return canvasTex(
    size,
    size,
    (g) => {
      const img = g.createImageData(size, size)
      for (let i = 0; i < size * size; i++) {
        const k = 1 + (r() - 0.5) * spread
        img.data[i * 4] = Math.min(255, base[0] * k)
        img.data[i * 4 + 1] = Math.min(255, base[1] * k)
        img.data[i * 4 + 2] = Math.min(255, base[2] * k)
        img.data[i * 4 + 3] = 255
      }
      g.putImageData(img, 0, 0)
    },
    repeat,
  )
}

function paving(repeat: [number, number]) {
  return canvasTex(
    256,
    256,
    (g) => {
      g.fillStyle = '#cfcac2'
      g.fillRect(0, 0, 256, 256)
      g.strokeStyle = '#b4aea4'
      g.lineWidth = 2
      for (let i = 0; i <= 256; i += 64) {
        g.beginPath()
        g.moveTo(i, 0)
        g.lineTo(i, 256)
        g.moveTo(0, i)
        g.lineTo(256, i)
        g.stroke()
      }
    },
    repeat,
  )
}

/* ── Shared materials & helpers ───────────────────────────────────── */

const mat = {
  white: () => new THREE.MeshStandardMaterial({ color: 0xf3f1ec, roughness: 0.55 }),
  frame: () => new THREE.MeshStandardMaterial({ color: 0x2a2c2f, roughness: 0.45, metalness: 0.4 }),
  glass: (tint = 0x9fb4c4, opacity = 0.35) =>
    new THREE.MeshPhysicalMaterial({ color: tint, roughness: 0.04, metalness: 0.1, transparent: true, opacity, envMapIntensity: 1.4 }),
  darkGlass: () => new THREE.MeshStandardMaterial({ color: 0x1b232b, roughness: 0.08, metalness: 0.6, envMapIntensity: 1.6 }),
  warmLight: (i = 1.4) => new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffb866, emissiveIntensity: i }),
  foliage: (c = 0x5f7d4e) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true }),
  trunk: () => new THREE.MeshStandardMaterial({ color: 0x6b5644, roughness: 1 }),
}

function box(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0, shadow = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
  mesh.position.set(x, y + h / 2, z)
  mesh.castShadow = shadow
  mesh.receiveShadow = true
  return mesh
}

function tree(x: number, z: number, scale = 1, seed = 1) {
  const r = rng(seed)
  const g = new THREE.Group()
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * scale, 0.3 * scale, 4 * scale, 8), mat.trunk())
  trunk.position.y = 2 * scale
  trunk.castShadow = true
  g.add(trunk)
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry((1.3 + r() * 0.9) * scale, 1), mat.foliage(i % 2 ? 0x56744a : 0x67875a))
    s.position.set((r() - 0.5) * 2.6 * scale, (4 + r() * 2.2) * scale, (r() - 0.5) * 2.6 * scale)
    s.castShadow = true
    g.add(s)
  }
  g.position.set(x, 0, z)
  return g
}

function palm(x: number, z: number, h = 7, seed = 1) {
  const r = rng(seed)
  const g = new THREE.Group()
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, h, 7), mat.trunk())
  trunk.position.y = h / 2
  trunk.rotation.z = (r() - 0.5) * 0.12
  trunk.castShadow = true
  g.add(trunk)
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x4f7a3c, roughness: 0.9, side: THREE.DoubleSide, flatShading: true })
  for (let i = 0; i < 9; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.35, 3.2, 3), leafMat)
    leaf.position.y = h
    leaf.rotation.set(Math.PI / 2 - 0.45, (i / 9) * Math.PI * 2, 0)
    leaf.translateY(1.4)
    leaf.castShadow = true
    g.add(leaf)
  }
  g.position.set(x, 0, z)
  return g
}

function shrub(x: number, z: number, s = 1) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 * s, 1), mat.foliage(0x4c6e3f))
  m.position.set(x, 0.6 * s, z)
  m.scale.y = 0.8
  m.castShadow = true
  return m
}

function ground(color: [number, number, number], size = 220) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(size, 64),
    new THREE.MeshStandardMaterial({ map: noiseTex(color, 0.18, 7, [40, 40]), roughness: 1 }),
  )
  m.rotation.x = -Math.PI / 2
  m.receiveShadow = true
  return m
}

/* ── Skyview: two-tone brick mid-rise with stacked glass balconies ── */

function buildSkyview() {
  const g = new THREE.Group()
  const r = rng(11)
  const FLOOR = 3.1
  const FLOORS = 9
  const H = FLOOR * FLOORS
  g.add(ground([132, 140, 118]))
  g.add(box(70, 0.2, 50, new THREE.MeshStandardMaterial({ map: paving([10, 8]), roughness: 0.9 }), 0, 0, 4, false))

  // Two wings: charcoal brick (left) and beige brick (right), as in the photo.
  const charcoal = new THREE.MeshStandardMaterial({ map: brick([64, 66, 70], '#2b2c2e', 3, [6, 10]), roughness: 0.9 })
  const beige = new THREE.MeshStandardMaterial({ map: brick([196, 184, 164], '#a99d8a', 5, [7, 9]), roughness: 0.9 })
  const left = box(16, H + 1, 14, charcoal, -10, 0.2, 0)
  const right = box(20, H - 1.5, 14, beige, 8, 0.2, 1.5)
  g.add(left, right)
  g.add(box(16.4, 0.5, 14.4, mat.frame(), -10, H + 1.2, 0)) // parapets
  g.add(box(20.4, 0.5, 14.4, mat.frame(), 8, H - 1.3, 1.5))

  // Punched windows (instanced): dark frames with glass, some warmly lit.
  const winGeo = new THREE.BoxGeometry(1.6, 1.9, 0.25)
  const frames = new THREE.InstancedMesh(winGeo, mat.frame(), 200)
  const glassGeo = new THREE.PlaneGeometry(1.4, 1.7)
  const dark = new THREE.InstancedMesh(glassGeo, mat.darkGlass(), 200)
  const lit = new THREE.InstancedMesh(glassGeo, mat.warmLight(0.9), 60)
  let nf = 0
  let nd = 0
  let nl = 0
  const m4 = new THREE.Matrix4()
  const addWin = (x: number, y: number, z: number) => {
    m4.makeTranslation(x, y, z)
    frames.setMatrixAt(nf++, m4)
    m4.makeTranslation(x, y, z + 0.13)
    if (r() < 0.16 && nl < 60) lit.setMatrixAt(nl++, m4)
    else dark.setMatrixAt(nd++, m4)
  }
  for (let f = 0; f < FLOORS; f++) {
    const y = 0.2 + f * FLOOR + 1.6
    for (const x of [-15, -11.5, -8, -4.5]) addWin(x, y, 7.05)
    for (const x of [1, 4.2]) addWin(x, y, 8.55)
  }
  frames.count = nf
  dark.count = nd
  lit.count = nl
  frames.castShadow = true
  g.add(frames, dark, lit)

  // Cantilevered balconies with glass railings, stacked up the beige wing.
  for (let f = 1; f < FLOORS - 1; f++) {
    const y = 0.2 + f * FLOOR
    for (const x of [10.5, 15]) {
      g.add(box(3.6, 0.22, 2.2, mat.frame(), x, y, 9.6))
      g.add(box(3.6, 1.05, 0.05, mat.glass(0xcfe0ea, 0.45), x, y + 0.22, 10.7, false))
      g.add(box(0.06, 1.1, 2.2, mat.frame(), x - 1.8, y + 0.22, 9.6))
      g.add(box(0.06, 1.1, 2.2, mat.frame(), x + 1.8, y + 0.22, 9.6))
      // glazed door behind
      const door = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.4), r() < 0.25 ? mat.warmLight(0.8) : mat.darkGlass())
      door.position.set(x, y + 1.4, 8.56)
      g.add(door)
    }
  }
  // Ground-floor lobby glazing and canopy.
  g.add(box(6, 3, 0.1, mat.warmLight(0.6), -10, 0.2, 7.05, false))
  g.add(box(8, 0.3, 3, mat.frame(), -10, 3.4, 8.4))
  for (let i = 0; i < 6; i++) g.add(tree(-30 + i * 12, 22 + (i % 2) * 3, 0.9, 30 + i))
  return g
}

/* ── Highlife: white modern villa, cantilevered roof, pool, palms ──── */

function buildHighlife() {
  const g = new THREE.Group()
  g.add(ground([118, 140, 96]))
  const deck = new THREE.MeshStandardMaterial({ map: paving([8, 6]), roughness: 0.85 })
  g.add(box(36, 0.3, 26, deck, 0, 0, 2, false))

  // Ground floor: glass box with slim white mullions.
  g.add(box(18, 3.4, 10, mat.glass(0x7f98a8, 0.55), 0, 0.3, 0))
  for (let i = 0; i <= 6; i++) g.add(box(0.12, 3.4, 0.12, mat.white(), -9 + i * 3, 0.3, 5))
  const interior = new THREE.Mesh(new THREE.PlaneGeometry(17, 3), mat.warmLight(0.35))
  interior.position.set(0, 2, -2)
  g.add(interior)
  // Interior hint: dining table and pendant lights visible through the glass.
  g.add(box(3, 0.1, 1.2, mat.frame(), -2, 1.05, 1))
  for (let i = 0; i < 3; i++) g.add(box(0.25, 0.25, 0.25, mat.warmLight(2), -3 + i, 2.9, 1, false))

  // The defining feature: a thick white roof slab overhanging the glass on two sides.
  g.add(box(25, 0.7, 14, mat.white(), 2.5, 3.7, 1.5))
  // Upper level: smaller white volume set back, with a roof terrace and glass rail.
  g.add(box(8, 3, 7, mat.white(), -6, 4.4, -1.5))
  g.add(box(4, 2.4, 0.08, mat.darkGlass(), -6, 4.8, 2.05, false))
  g.add(box(12, 1, 0.06, mat.glass(0xcfe0ea, 0.4), 6, 4.4, 8.4, false))
  // Side wall in natural stone.
  g.add(box(0.8, 3.4, 10, new THREE.MeshStandardMaterial({ map: noiseTex([214, 206, 190], 0.25, 9, [2, 2]), roughness: 0.9 }), 9.5, 0.3, 0))

  // Pool running along the front, as in the photo.
  const water = new THREE.MeshPhysicalMaterial({ color: 0x2bb3c8, roughness: 0.05, metalness: 0.1, transmission: 0.2, emissive: 0x0e6a7a, emissiveIntensity: 0.25 })
  const pool = new THREE.Mesh(new THREE.BoxGeometry(18, 0.25, 4.5), water)
  pool.position.set(1, 0.2, 9)
  g.add(pool)
  g.add(box(18.6, 0.32, 0.3, mat.white(), 1, 0, 11.35, false))

  for (const [x, z, h, s] of [
    [-14, 10, 8, 1],
    [-17, 4, 6.5, 2],
    [14, 12, 7.5, 3],
  ] as const)
    g.add(palm(x, z, h, s))
  for (let i = 0; i < 9; i++) g.add(shrub(11 + (i % 3) * 1.6, 6 + Math.floor(i / 3) * 1.5, 1.1))
  g.add(tree(-24, -8, 1.1, 4), tree(22, -10, 1, 5))
  return g
}

/* ── Edge: black glass towers over a warm-lit glass pavilion ───────── */

function buildEdge() {
  const g = new THREE.Group()
  g.add(ground([70, 74, 78]))
  g.add(box(140, 0.2, 110, new THREE.MeshStandardMaterial({ map: paving([24, 20]), color: 0x8a8f94, roughness: 0.9 }), 0, 0, 0, false))
  const towers: [number, number, number, number, number][] = [
    // x, z, w, d, h
    [-22, -10, 20, 20, 92],
    [6, -22, 18, 18, 74],
    [30, -4, 16, 16, 112],
  ]
  towers.forEach(([x, z, w, d, h], i) => {
    const cw = curtainWall(10, Math.round(h / 3.6), 0.22, 40 + i)
    const m = new THREE.MeshStandardMaterial({ map: cw.map, emissiveMap: cw.emissive, emissive: 0xffffff, emissiveIntensity: 1.1, roughness: 0.12, metalness: 0.7, envMapIntensity: 1.5 })
    const t = box(w, h, d, m, x, 0.2, z)
    g.add(t)
    g.add(box(w + 0.4, 1.2, d + 0.4, mat.frame(), x, h + 0.2, z)) // crown
  })
  // Low glass pavilion with the warm coffered ceiling seen in the photo.
  g.add(box(34, 7, 18, mat.glass(0x3a4652, 0.35), -2, 0.2, 18))
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(33, 17),
    new THREE.MeshStandardMaterial({
      map: canvasTex(512, 256, (c) => {
        c.fillStyle = '#c98a3e'
        c.fillRect(0, 0, 512, 256)
        c.fillStyle = '#7a4c1c'
        for (let x = 0; x < 512; x += 32) c.fillRect(x, 0, 3, 256)
        for (let y = 0; y < 256; y += 32) c.fillRect(0, y, 512, 3)
      }),
      emissive: 0xffa652,
      emissiveIntensity: 0.9,
    }),
  )
  ceiling.rotation.x = Math.PI / 2
  ceiling.position.set(-2, 7, 18)
  g.add(ceiling)
  g.add(box(34.4, 0.8, 18.4, mat.frame(), -2, 7.2, 18))
  for (let i = 0; i <= 8; i++) g.add(box(0.25, 7, 0.25, mat.frame(), -19 + i * 4.25, 0.2, 27.1))
  return g
}

/* ── Signature Villas: dark timber + white frame, lit at dusk ──────── */

function buildSignature() {
  const g = new THREE.Group()
  g.add(ground([86, 112, 70]))
  const lawn = new THREE.MeshStandardMaterial({ map: noiseTex([92, 132, 70], 0.3, 21, [12, 12]), roughness: 1 })
  g.add(box(40, 0.15, 30, lawn, 0, 0, 6, false))
  const wood = new THREE.MeshStandardMaterial({ map: timber(8, [5, 2]), roughness: 0.8 })
  const woodHi = new THREE.MeshStandardMaterial({ map: timber(9, [4, 2]), roughness: 0.8 })

  // Ground floor: timber walls with big warm-lit glazed openings.
  g.add(box(16, 3.5, 10, wood, 0, 0.15, 0))
  g.add(box(9, 2.8, 0.1, mat.warmLight(1.1), 2.5, 0.35, 5.06, false))
  for (let i = 0; i <= 4; i++) g.add(box(0.1, 2.8, 0.15, mat.frame(), -2 + i * 2.25, 0.35, 5.1))
  g.add(box(2.2, 2.6, 0.1, mat.warmLight(0.8), -5.6, 0.35, 5.06, false))

  // Upper floor: white-framed box cantilevering forward, timber infill, full-height glass.
  const up = new THREE.Group()
  up.add(box(14, 0.35, 10, mat.white(), 0, 0, 0))
  up.add(box(14, 0.35, 10, mat.white(), 0, 3.4, 0))
  up.add(box(0.35, 3.4, 10, mat.white(), -7, 0, 0))
  up.add(box(0.35, 3.4, 10, mat.white(), 7, 0, 0))
  up.add(box(13.3, 3.05, 9, woodHi, 0, 0.35, -0.6))
  up.add(box(8, 2.6, 0.1, mat.warmLight(0.9), 1.8, 0.5, 4, false))
  for (let i = 0; i <= 4; i++) up.add(box(0.08, 2.6, 0.12, mat.frame(), -2.2 + i * 2, 0.5, 4.05))
  up.position.set(-1, 3.65, 1.5)
  up.traverse((o) => (o.castShadow = true))
  g.add(up)

  // Deck, stepping stones, low wall lights.
  g.add(box(12, 0.3, 4, new THREE.MeshStandardMaterial({ map: timber(12, [6, 1]), roughness: 0.9 }), 3, 0.15, 7))
  for (let i = 0; i < 6; i++) g.add(box(1.4, 0.12, 0.8, mat.white(), -8 + (i % 2) * 0.4, 0.15, 7 + i * 1.6, false))
  for (let i = 0; i < 5; i++) g.add(box(0.15, 0.4, 0.15, mat.warmLight(2.2), -14 + i * 7, 0.15, 19, false))

  // The big tree in front, as in the photo.
  g.add(tree(-5.5, 9.5, 1.9, 77), tree(15, -6, 1.2, 78), tree(-17, -4, 1.3, 79))
  for (let i = 0; i < 7; i++) g.add(shrub(9 + i * 1.3, 5.6, 0.8))
  return g
}

/* ── Specs ────────────────────────────────────────────────────────── */

const LIVING = 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c'
const KITCHEN = 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136'
const BEDROOM = 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304'
const LOUNGE = 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343'

export const MODELS: Record<PresetId, ModelSpec> = {
  skyview: {
    build: buildSkyview,
    lighting: 'day',
    home: { camera: [34, 18, 46], target: [0, 12, 0] },
    stops: [
      { kind: 'view', title: 'Arrival', caption: 'Two brick wings: charcoal for the residences, warm beige for the balcony stack.', camera: [30, 6, 52], target: [0, 10, 0] },
      { kind: 'view', title: 'Looking up', caption: 'Cantilevered balconies with frameless glass rails on every floor.', camera: [16, 2, 22], target: [10, 22, 6] },
      { kind: 'view', title: 'Balcony stack', caption: '2.2 m deep balconies, wide enough for a table for four.', camera: [22, 14, 18], target: [12, 13, 9] },
      { kind: 'view', title: 'Landscaped forecourt', caption: 'Drop-off canopy, paved forecourt and a tree-lined edge.', camera: [-24, 4, 34], target: [-10, 3, 6] },
      { kind: 'interior', title: 'Living room', caption: 'Double-height living space opening onto the balcony.', photo: LIVING },
      { kind: 'interior', title: 'Master bedroom', caption: 'Corner bedroom with two aspects of daylight.', photo: BEDROOM },
      { kind: 'view', title: 'Full view', caption: 'Skyview, Ambawadi.', camera: [44, 30, 50], target: [0, 12, 0] },
    ],
  },
  highlife: {
    build: buildHighlife,
    lighting: 'day',
    home: { camera: [22, 9, 28], target: [0, 2.5, 2] },
    stops: [
      { kind: 'view', title: 'Poolside', caption: 'The pool runs the length of the living room, just as in the photographs.', camera: [12, 1.6, 20], target: [0, 2, 4] },
      { kind: 'view', title: 'The roof slab', caption: 'A 25 m white slab floats over full-height glass, shading the interiors.', camera: [-14, 3, 16], target: [2, 4, 2] },
      { kind: 'view', title: 'Roof terrace', caption: 'Upper terrace with a frameless glass balustrade.', camera: [16, 12, 16], target: [2, 4.5, 2] },
      { kind: 'view', title: 'Gardens', caption: 'Palms, clipped shrubs and a stone feature wall.', camera: [-20, 5, 4], target: [0, 2, 4] },
      { kind: 'interior', title: 'Living & dining', caption: 'Open-plan living with the pool on one side.', photo: LIVING },
      { kind: 'interior', title: 'Kitchen', caption: 'Modular kitchen with an island and pendant lights.', photo: KITCHEN },
      { kind: 'view', title: 'Full view', caption: 'Highlife, SG Highway.', camera: [26, 12, 30], target: [0, 2.5, 2] },
    ],
  },
  edge: {
    build: buildEdge,
    lighting: 'dusk',
    home: { camera: [-70, 30, 130], target: [4, 44, -8] },
    stops: [
      { kind: 'view', title: 'From the plaza', caption: 'Three dark glass towers rising over a lit pavilion.', camera: [-6, 2, 56], target: [6, 40, -8] },
      { kind: 'view', title: 'The pavilion', caption: 'A coffered timber ceiling glows through the lobby glazing at night.', camera: [-12, 3, 38], target: [-2, 6, 18] },
      { kind: 'view', title: 'Skyline', caption: 'The tallest tower reaches 112 m, with views across the city.', camera: [70, 60, 50], target: [10, 50, -10] },
      { kind: 'interior', title: 'Residents’ lounge', caption: 'Double-height lounge on the podium level.', photo: LOUNGE },
      { kind: 'interior', title: 'Living room', caption: 'Floor-to-ceiling glass on two sides.', photo: LIVING },
      { kind: 'view', title: 'Full view', caption: 'Edge, Bopal.', camera: [-50, 30, 95], target: [4, 40, -8] },
    ],
  },
  signature: {
    build: buildSignature,
    lighting: 'dusk',
    home: { camera: [20, 8, 26], target: [0, 3, 2] },
    stops: [
      { kind: 'view', title: 'Evening arrival', caption: 'Dark timber and a white-framed upper floor, lit warm at dusk.', camera: [10, 2.2, 24], target: [0, 3, 3] },
      { kind: 'view', title: 'Under the tree', caption: 'A mature tree shades the lawn and the stepping-stone path.', camera: [-14, 3, 20], target: [-4, 4, 6] },
      { kind: 'view', title: 'The upper box', caption: 'The bedroom level cantilevers 1.5 m over the deck.', camera: [14, 6, 12], target: [-1, 5.5, 4] },
      { kind: 'view', title: 'The deck', caption: 'Timber deck stepping straight out of the living room.', camera: [6, 1.5, 13], target: [3, 1.5, 4] },
      { kind: 'interior', title: 'Living room', caption: 'Warm interiors behind full-height glazing.', photo: LIVING },
      { kind: 'interior', title: 'Master bedroom', caption: 'Bedroom suite on the upper level.', photo: BEDROOM },
      { kind: 'view', title: 'Full view', caption: 'Signature Villas, Sindhu Bhavan.', camera: [24, 10, 30], target: [0, 3, 2] },
    ],
  },
}
