import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import type { LngLat } from './osm'
import { loadMapsJs, onGoogleAuthFailure, rangeForZoom } from './google'

interface Props {
  center: LngLat
  zoom: number
  title?: string
  onClose: () => void
}

/**
 * Google Photorealistic 3D view of a place. Mounted only when the user asks for it, so the Maps JavaScript API
 * (and its billing) is never touched otherwise. Where Google has no 3D city mesh it shows satellite on terrain.
 */
export function Google3DView({ center, zoom, title, onClose }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    const fail = (msg: string) => {
      if (!live) return
      setError(msg)
      setState('error')
    }
    const off = onGoogleAuthFailure(() => fail('Google rejected the API key. Check that the Maps JavaScript API is enabled, billing is on, and this site is allowed in the key’s referrer restrictions.'))
    loadMapsJs()
      .then((g) => g.maps.importLibrary('maps3d'))
      .then((lib) => {
        if (!live || !host.current) return
        const Map3DElement = lib.Map3DElement as new (opts: Record<string, unknown>) => HTMLElement
        const el = new Map3DElement({
          center: { lat: center[1], lng: center[0], altitude: 0 },
          range: rangeForZoom(Math.max(zoom, 14), center[1]),
          tilt: 65,
          heading: 0,
          mode: 'HYBRID',
        })
        el.style.width = '100%'
        el.style.height = '100%'
        host.current.replaceChildren(el)
        setState('ready')
      })
      .catch((e: unknown) => fail(e instanceof Error ? e.message : 'Could not open the 3D view.'))
    return () => {
      live = false
      off()
      host.current?.replaceChildren()
    }
    // The view is created once per open; moving the 2D map does not re-bill a new 3D view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="absolute inset-0 z-30 bg-zinc-900">
      <div ref={host} className="absolute inset-0" />
      <div className="absolute left-4 top-4 z-10 flex max-w-[calc(100%-2rem)] items-center gap-3 rounded-lg border bg-background/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
        <span className="font-medium">Real 3D</span>
        {title && <span className="truncate text-muted-foreground">{title}</span>}
        <span className="hidden text-muted-foreground sm:inline">Drag to rotate · scroll to zoom · Google Photorealistic 3D</span>
        <button onClick={onClose} className="ml-1 inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-primary-foreground" aria-label="Close 3D view">
          <X className="size-3.5" /> Close
        </button>
      </div>
      {state === 'loading' && (
        <div className="absolute inset-0 grid place-items-center text-sm text-white/80">
          <span className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Loading Google 3D…
          </span>
        </div>
      )}
      {state === 'error' && (
        <div className="absolute inset-0 grid place-items-center p-6">
          <div className="max-w-md rounded-xl border bg-background p-5 text-sm shadow-2xl">
            <p className="flex items-center gap-2 font-medium">
              <AlertTriangle className="size-4 text-amber-600" /> 3D view unavailable
            </p>
            <p className="mt-2 text-muted-foreground">{error}</p>
            <button onClick={onClose} className="mt-4 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground">
              Back to map
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
