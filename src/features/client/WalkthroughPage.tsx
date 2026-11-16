import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Expand, Glasses, Pause, Play, Smartphone } from 'lucide-react'
import { ClientContainer, ClientPageHeader } from '@/components/marketing'
import { cn } from '@/lib/utils'
import { imageAt } from '@/features/projects/model'
import { WALKTHROUGH } from '@/data/demo'

/** Guided room-by-room walkthrough with a slow camera drift, autoplay and fullscreen. */
export default function WalkthroughPage() {
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const stage = useRef<HTMLDivElement>(null)
  const room = WALKTHROUGH[i]!
  const go = (d: number) => setI((x) => (x + d + WALKTHROUGH.length) % WALKTHROUGH.length)

  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => go(1), 5000)
    return () => clearInterval(t)
  }, [playing])

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])

  return (
    <>
      <ClientPageHeader
        eyebrow="AR / VR"
        title={
          <>
            Walk the home, <em>room by room.</em>
          </>
        }
        description="A guided tour of the Signature Villa show home. Go fullscreen, or open it on your phone for the AR view."
      />
      <ClientContainer>
        <div ref={stage} className="relative aspect-[16/9] overflow-hidden bg-zinc-950 text-white">
          {WALKTHROUGH.map((r, k) => (
            <img
              key={r.id}
              src={imageAt(r.image, 2000)}
              alt={k === i ? r.name : ''}
              className={cn(
                'absolute inset-0 size-full object-cover transition-[opacity,transform] duration-[1.4s] ease-out',
                k === i ? 'scale-110 opacity-100 [transition-duration:1.4s,7s]' : 'scale-100 opacity-0',
              )}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30" />
          <div className="absolute left-0 top-0 flex w-full items-center justify-between p-4 md:p-6">
            <span className="bg-black/40 px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] backdrop-blur">
              {String(i + 1).padStart(2, '0')} / {String(WALKTHROUGH.length).padStart(2, '0')}
            </span>
            <div className="flex gap-1">
              <button onClick={() => setPlaying((p) => !p)} className="grid size-10 place-items-center bg-black/40 backdrop-blur hover:bg-black/60" aria-label={playing ? 'Pause tour' : 'Play tour'}>
                {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
              </button>
              <button onClick={() => void stage.current?.requestFullscreen?.()} className="grid size-10 place-items-center bg-black/40 backdrop-blur hover:bg-black/60" aria-label="Fullscreen">
                <Expand className="size-4" />
              </button>
            </div>
          </div>
          <div key={room.id} className="animate-reveal absolute bottom-0 left-0 max-w-xl p-6 md:p-10">
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/70">{room.size}</p>
            <h2 className="mt-2 font-display text-5xl md:text-6xl">{room.name}</h2>
            <p className="mt-3 text-white/80">{room.note}</p>
          </div>
          <div className="absolute bottom-6 right-6 hidden gap-1 md:flex">
            <button onClick={() => go(-1)} className="grid size-12 place-items-center bg-white text-zinc-900 hover:bg-white/90" aria-label="Previous room">
              <ArrowLeft className="size-5" />
            </button>
            <button onClick={() => go(1)} className="grid size-12 place-items-center bg-white text-zinc-900 hover:bg-white/90" aria-label="Next room">
              <ArrowRight className="size-5" />
            </button>
          </div>
          {playing && (
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/20">
              <div key={i} className="h-full origin-left animate-[intro-bar_5s_linear_both] bg-white" />
            </div>
          )}
        </div>

        <ol className="mt-4 grid grid-cols-5 gap-2">
          {WALKTHROUGH.map((r, k) => (
            <li key={r.id}>
              <button onClick={() => setI(k)} className={cn('w-full text-left transition-opacity', k === i ? 'opacity-100' : 'opacity-50 hover:opacity-100')}>
                <img src={imageAt(r.image, 400)} alt="" className="aspect-[4/3] w-full object-cover" />
                <span className={cn('mt-2 block border-t-2 pt-2 text-xs', k === i ? 'border-brand' : 'border-transparent')}>{r.name}</span>
              </button>
            </li>
          ))}
        </ol>

        <div className="mt-16 grid gap-px border bg-border md:grid-cols-2">
          <div className="bg-card p-8">
            <Smartphone className="size-6 text-brand" />
            <h3 className="mt-6 font-display text-3xl">View in your space</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              On a phone, open this page and point your camera at the floor to place a 1:50 scale model of the villa.
            </p>
          </div>
          <div className="bg-card p-8">
            <Glasses className="size-6 text-brand" />
            <h3 className="mt-6 font-display text-3xl">VR at the sales gallery</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Walk every floor at full scale with a headset at our experience centre. Book a slot with your site visit.
            </p>
            <Link to="/projects" className="mt-6 inline-flex items-center gap-2 border-b border-foreground pb-0.5 text-xs font-medium uppercase tracking-[0.2em]">
              Book a visit <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </ClientContainer>
    </>
  )
}
