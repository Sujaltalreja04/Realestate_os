import { useEffect, useState } from 'react'

/**
 * Large media for assets (360° photos, 3D scans) kept in this browser's IndexedDB. Asset records only store the
 * media id. Like the asset register, this is per-browser until a shared backend exists.
 */

export interface MediaMeta {
  id: string
  name: string
  type: string
  size: number
  kind: 'pano' | 'scan'
  addedAt: number
}

const DB = 'reos-media'
const STORE = 'files'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('Browser storage is unavailable'))
  })
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const req = fn(t.objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('Storage error'))
    t.oncomplete = () => db.close()
  })
}

const MAX_BYTES = 300 * 1024 * 1024

export async function putMedia(file: File, kind: MediaMeta['kind']): Promise<MediaMeta> {
  if (file.size > MAX_BYTES) throw new Error('File is larger than 300 MB. Compress it first (see the capture guide).')
  if (kind === 'pano' && !file.type.startsWith('image/')) throw new Error('A 360° photo must be an image (JPG or PNG).')
  if (kind === 'scan' && !/\.(glb|gltf)$/i.test(file.name)) throw new Error('A 3D scan must be a .glb file (export as glTF-Binary).')
  const meta: MediaMeta = { id: `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, name: file.name, type: file.type || 'model/gltf-binary', size: file.size, kind, addedAt: Date.now() }
  await tx('readwrite', (s) => s.put({ meta, blob: file }, meta.id))
  return meta
}

export async function getMedia(id: string): Promise<{ meta: MediaMeta; blob: Blob } | null> {
  return (await tx<{ meta: MediaMeta; blob: Blob } | undefined>('readonly', (s) => s.get(id))) ?? null
}

export async function deleteMedia(id: string) {
  await tx('readwrite', (s) => s.delete(id))
}

/** Object URL for a stored file (revoked automatically). */
export function useMediaUrl(id: string | undefined) {
  const [state, setState] = useState<{ url: string | null; meta: MediaMeta | null; error: string | null }>({ url: null, meta: null, error: null })
  useEffect(() => {
    if (!id) return setState({ url: null, meta: null, error: null })
    let url: string | null = null
    let live = true
    getMedia(id)
      .then((m) => {
        if (!live) return
        if (!m) return setState({ url: null, meta: null, error: 'File not found in this browser (it may have been added on another device).' })
        url = URL.createObjectURL(m.blob)
        setState({ url, meta: m.meta, error: null })
      })
      .catch((e: unknown) => live && setState({ url: null, meta: null, error: e instanceof Error ? e.message : 'Could not read the file.' }))
    return () => {
      live = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [id])
  return state
}

export const fmtBytes = (n: number) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} KB`)
