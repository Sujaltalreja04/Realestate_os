import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import * as D from '@radix-ui/react-dialog'
import { ChevronLeft, ChevronRight, Pause, Play, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { imageAt } from '@/features/projects/model'
import { MODELS, type PresetId } from './models'

const PropertyViewer = lazy(() => import('./PropertyViewer'))
const STOP_MS = 6500

/** Full-screen guided tour: cinematic camera stops around the 3D model, then interior photos. */
export function VirtualTour({
  preset,
  title,
  open,
  onOpenChange,
}: {
  preset: PresetId
  title: string
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Content className="fixed inset-0 z-50 bg-zinc-950 text-white" aria-describedby={undefined}>
          <D.Title className="sr-only">Virtual tour of {title}</D.Title>
          {open && <TourPlayer preset={preset} title={title} onClose={() => onOpenChange(false)} />}
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}

function TourPlayer({ preset, title, onClose }: { preset: PresetId; title: string; onClose: () => void }) {
  const stops = MODELS[preset].stops
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(true)
  const stop = stops[i]!
  const go = (d: number) => setI((x) => Math.min(stops.length - 1, Math.max(0, x + d)))

  // The 3D camera keeps the last exterior view while an interior photo is shown.
  const view = useMemo(() => {
    for (let k = i; k >= 0; k--) {
      const s = stops[k]!
      if (s.kind === 'view') return { camera: s.camera, target: s.target }
    }
    return undefined
  }, [i, stops])

  useEffect(() => {
    if (!playing) return
    if (i >= stops.length - 1) {
      setPlaying(false)
      return
    }
    const t = setTimeout(() => go(1), STOP_MS)
    return () => clearTimeout(t)
  }, [playing, i, stops.length])

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === ' ') {
        e.preventDefault()
        setPlaying((p) => !p)
      }
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])

  return (
    <div className="relative h-full w-full">
      <Suspense fallback={<div className="grid h-full place-items-center text-xs uppercase tracking-[0.22em] text-white/50">Loading 3D…</div>}>
        <PropertyViewer preset={preset} view={view} autoRotate={false} className="absolute inset-0" />
      </Suspense>

      {/* Interior stops crossfade a slowly zooming photograph over the 3D view. */}
      {stops.map(
        (s, k) =>
          s.kind === 'interior' && (
            <div
              key={k}
              className={cn('pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-1000', k === i ? 'opacity-100' : 'opacity-0')}
              aria-hidden={k !== i}
            >
              <img
                src={imageAt(s.photo, 2000)}
                alt={k === i ? s.title : ''}
                className={cn('size-full object-cover transition-transform ease-out [transition-duration:8s]', k === i ? 'scale-110' : 'scale-100')}
              />
            </div>
          ),
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/50" />

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 md:p-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/60">Virtual tour</p>
          <p className="font-display text-2xl">{title}</p>
        </div>
        <D.Close className="grid size-11 place-items-center bg-white/10 backdrop-blur hover:bg-white/20" aria-label="Close tour" onClick={onClose}>
          <X className="size-5" />
        </D.Close>
      </div>

      {/* Caption */}
      <div key={i} className="animate-reveal pointer-events-none absolute bottom-36 left-0 max-w-xl p-6 md:bottom-32 md:p-10">
        <p className="text-[11px] uppercase tracking-[0.28em] text-white/60">
          {String(i + 1).padStart(2, '0')} / {String(stops.length).padStart(2, '0')} · {stop.kind === 'interior' ? 'Inside' : 'Outside'}
        </p>
        <h2 className="mt-2 font-display text-5xl md:text-6xl">{stop.title}</h2>
        <p className="mt-3 text-white/80">{stop.caption}</p>
      </div>

      {/* Timeline + controls */}
      <div className="absolute inset-x-0 bottom-0 p-4 md:p-6">
        <div className="flex items-center gap-2">
          <button onClick={() => go(-1)} disabled={i === 0} className="grid size-11 shrink-0 place-items-center bg-white/10 backdrop-blur hover:bg-white/20 disabled:opacity-30" aria-label="Previous stop">
            <ChevronLeft className="size-5" />
          </button>
          <button onClick={() => setPlaying((p) => !p)} className="grid size-11 shrink-0 place-items-center bg-white text-zinc-900 hover:bg-white/90" aria-label={playing ? 'Pause tour' : 'Play tour'}>
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
          <button onClick={() => go(1)} disabled={i === stops.length - 1} className="grid size-11 shrink-0 place-items-center bg-white/10 backdrop-blur hover:bg-white/20 disabled:opacity-30" aria-label="Next stop">
            <ChevronRight className="size-5" />
          </button>
          <ol className="ml-2 flex min-w-0 flex-1 gap-1.5">
            {stops.map((s, k) => (
              <li key={k} className="min-w-0 flex-1">
                <button onClick={() => setI(k)} className="group block w-full text-left" aria-label={`Go to ${s.title}`} aria-current={k === i}>
                  <span className="block h-1 overflow-hidden bg-white/20">
                    <span
                      key={`${k}-${i}-${playing}`}
                      className={cn('block h-full origin-left bg-white', k < i ? 'scale-x-100' : k > i ? 'scale-x-0' : playing ? 'animate-[intro-bar_6.5s_linear_both]' : 'scale-x-100 opacity-60')}
                    />
                  </span>
                  <span className={cn('mt-2 hidden truncate text-[11px] md:block', k === i ? 'text-white' : 'text-white/50 group-hover:text-white/80')}>{s.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
