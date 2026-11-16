import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import { ClientContainer, ClientPageHeader } from '@/components/marketing'
import { formatINR } from '@/lib/format'
import { cn } from '@/lib/utils'
import { imageAt } from '@/features/projects/model'
import { ROOMS, STYLES } from '@/data/demo'

const AREA: Record<string, number> = { living: 320, bedroom: 210, kitchen: 120, lounge: 260 }

export default function InteriorPage() {
  const [room, setRoom] = useState<(typeof ROOMS)[number]['id']>('living')
  const [style, setStyle] = useState<(typeof STYLES)[number]['id']>('warm-minimal')
  const [split, setSplit] = useState(50)
  const [rendering, setRendering] = useState(false)

  const r = ROOMS.find((x) => x.id === room)!
  const s = STYLES.find((x) => x.id === style)!
  const estimate = AREA[room]! * s.costPerSqft

  // A short "render" beat makes the style switch feel considered rather than instant.
  const choose = (fn: () => void) => {
    setRendering(true)
    fn()
    setTimeout(() => setRendering(false), 650)
  }

  return (
    <>
      <ClientPageHeader
        eyebrow="Interior studio"
        title={
          <>
            Try a style <em>before</em> you buy.
          </>
        }
        description="Pick a room and a style. Drag the divider to compare against the bare show home, and get a ballpark fit-out cost."
      />
      <ClientContainer>
        <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="relative aspect-[16/10] select-none overflow-hidden bg-muted" data-lenis-prevent>
              <img src={imageAt(r.image, 1600)} alt={`${r.label}, as built`} className="absolute inset-0 size-full object-cover" />
              <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 0 0 ${split}%)` }}>
                <img
                  src={imageAt(r.image, 1600)}
                  alt={`${r.label} in ${s.label} style`}
                  className={cn('absolute inset-0 size-full object-cover transition-[filter,opacity] duration-700', rendering && 'opacity-60 blur-sm')}
                  style={{ filter: s.filter }}
                />
              </div>
              <div className="pointer-events-none absolute inset-y-0 w-px bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)]" style={{ left: `${split}%` }}>
                <span className="absolute left-1/2 top-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-xs text-zinc-900 shadow-lg">
                  ⇆
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={split}
                onChange={(e) => setSplit(+e.target.value)}
                className="absolute inset-0 size-full cursor-ew-resize opacity-0"
                aria-label="Compare before and after"
              />
              <span className="absolute left-4 top-4 bg-black/60 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white">As built</span>
              <span className="absolute right-4 top-4 bg-brand px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white">{s.label}</span>
              {rendering && (
                <span className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 bg-background/90 px-3 py-1.5 text-xs">
                  <Sparkles className="size-3.5 animate-pulse text-brand" /> Styling…
                </span>
              )}
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {ROOMS.map((x) => (
                <button
                  key={x.id}
                  onClick={() => choose(() => setRoom(x.id))}
                  className={cn('group text-left', room === x.id ? 'opacity-100' : 'opacity-60 hover:opacity-100')}
                >
                  <img src={imageAt(x.image, 400)} alt="" className={cn('aspect-[4/3] w-full object-cover', room === x.id && 'ring-2 ring-brand ring-offset-2 ring-offset-background')} />
                  <span className="mt-2 block text-xs">{x.label}</span>
                </button>
              ))}
            </div>
          </div>

          <aside className="space-y-6">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Style</p>
            <ul className="space-y-2">
              {STYLES.map((x) => (
                <li key={x.id}>
                  <button
                    onClick={() => choose(() => setStyle(x.id))}
                    className={cn('w-full border p-4 text-left transition-colors', style === x.id ? 'border-brand bg-brand/5' : 'hover:border-foreground/30')}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-display text-2xl">{x.label}</span>
                      <span className="flex">
                        {x.palette.map((c) => (
                          <span key={c} className="size-4 border border-background" style={{ background: c }} />
                        ))}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{x.description}</p>
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-t pt-6">
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Estimated fit-out</p>
              <p className="mt-2 font-display text-4xl">{formatINR(estimate)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {AREA[room]} sq.ft × ₹{s.costPerSqft.toLocaleString('en-IN')}/sq.ft. Indicative only.
              </p>
              <Link
                to="/advisor"
                className="group mt-6 inline-flex items-center gap-2 border-b border-foreground pb-0.5 text-xs font-medium uppercase tracking-[0.2em]"
              >
                Get a detailed quote <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </aside>
        </div>
      </ClientContainer>
    </>
  )
}
