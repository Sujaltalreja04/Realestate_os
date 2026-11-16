import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SplitHeading } from '@/components/motion'

/** Fades children up the first time they scroll into view. Respects reduced motion via CSS. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'pending' | 'shown' | undefined>(undefined)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    // Already on screen at mount: show without animating, so nothing flashes.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return
    setState('pending')
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setState('shown')
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} data-reveal={state} style={state === 'shown' ? { transitionDelay: `${delay}ms` } : undefined} className={className}>
      {children}
    </div>
  )
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.28em] text-brand', className)}>
      <span className="h-px w-8 bg-current" aria-hidden />
      {children}
    </p>
  )
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  align = 'left',
}: {
  eyebrow?: string
  title: ReactNode
  description?: string
  action?: ReactNode
  align?: 'left' | 'center'
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-6', align === 'center' && 'flex-col items-center text-center')}>
      <div className={cn('max-w-3xl', align === 'center' && 'mx-auto [&>p:first-child]:justify-center')}>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <SplitHeading className="mt-5 font-display text-5xl leading-[0.98] tracking-tight md:text-6xl lg:text-7xl [&_em]:text-brand">{title}</SplitHeading>
        {description && <p className="mt-4 text-base text-muted-foreground md:text-lg">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function Section({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn('py-24 md:py-36', className)}>
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">{children}</div>
    </section>
  )
}

/** Location / BHK / budget search that hands off to the projects list as URL filters. */
export function HeroSearch({ locations, className }: { locations: string[]; className?: string }) {
  const navigate = useNavigate()
  const [location, setLocation] = useState('all')
  const [bhk, setBhk] = useState('all')
  const [budget, setBudget] = useState('all')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const p = new URLSearchParams()
    if (location !== 'all') p.set('location', location)
    if (bhk !== 'all') p.set('bhk', bhk)
    if (budget !== 'all') p.set('budget', budget)
    void navigate(`/projects${p.size ? `?${p}` : ''}`)
  }

  const field = 'flex min-w-0 flex-1 flex-col gap-1 px-4 py-2.5 text-left'
  const label = 'text-[11px] font-medium uppercase tracking-wider text-muted-foreground'
  const trigger = 'h-7 border-0 bg-transparent px-0 text-sm font-medium shadow-none focus-visible:ring-0'

  return (
    <form
      onSubmit={submit}
      className={cn(
        'flex w-full max-w-3xl flex-col gap-1 border bg-card p-1.5 text-foreground md:flex-row md:items-center',
        className,
      )}
    >
      <div className={field}>
        <span className={label}>Location</span>
        <Select
          className={trigger}
          aria-label="Location"
          value={location}
          onValueChange={setLocation}
          options={[{ value: 'all', label: 'Anywhere in Ahmedabad' }, ...locations.map((l) => ({ value: l, label: l }))]}
        />
      </div>
      <div className="hidden h-8 w-px bg-border md:block" />
      <div className={field}>
        <span className={label}>Home size</span>
        <Select
          className={trigger}
          aria-label="Home size"
          value={bhk}
          onValueChange={setBhk}
          options={[{ value: 'all', label: 'Any BHK' }, ...[2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} BHK` }))]}
        />
      </div>
      <div className="hidden h-8 w-px bg-border md:block" />
      <div className={field}>
        <span className={label}>Budget</span>
        <Select
          className={trigger}
          aria-label="Budget"
          value={budget}
          onValueChange={setBudget}
          options={[
            { value: 'all', label: 'Any budget' },
            { value: 'u15', label: 'Under ₹1.5 Cr' },
            { value: '15-25', label: '₹1.5 – 2.5 Cr' },
            { value: 'o25', label: 'Above ₹2.5 Cr' },
          ]}
        />
      </div>
      <Button type="submit" size="lg" className="h-12 rounded-none px-6 text-xs uppercase tracking-[0.2em]">
        <Search /> Search homes
      </Button>
    </form>
  )
}

/** Counts up from 0 the first time it scrolls into view. Shows the final value immediately with reduced motion. */
export function CountUp({ value, suffix = '', duration = 1600 }: { value: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [shown, setShown] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || typeof IntersectionObserver === 'undefined') {
      setShown(value)
      return
    }
    let raf = 0
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return
      io.disconnect()
      const start = performance.now()
      const tick = (t: number) => {
        const k = Math.min(1, (t - start) / duration)
        setShown(Math.round(value * (1 - Math.pow(1 - k, 3))))
        if (k < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    })
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [value, duration])

  return (
    <span ref={ref} className="tabular-nums">
      {shown.toLocaleString('en-IN')}
      {suffix}
    </span>
  )
}

/** Infinite horizontal scroller; pauses on hover. Children are rendered twice for a seamless loop. */
export function Marquee({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]', className)}>
      <div className="animate-marquee flex w-max group-hover:[animation-play-state:paused]">
        <div className="flex shrink-0">{children}</div>
        <div className="flex shrink-0" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  )
}

/** Standard opening block for client-site pages: eyebrow, rising headline, lead, optional actions. */
export function ClientPageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow: string
  title: ReactNode
  description?: string
  actions?: ReactNode
  className?: string
}) {
  return (
    <header className={cn('mx-auto max-w-[1400px] px-4 pb-10 pt-16 md:px-6 md:pb-14 md:pt-24', className)}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-8">
        <div className="max-w-3xl">
          <SplitHeading as="h1" className="font-display text-5xl leading-[0.98] tracking-tight md:text-7xl [&_em]:text-brand">
            {title}
          </SplitHeading>
          {description && <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>
    </header>
  )
}

/** Wraps client page body content in the site's max width and gutters. */
export function ClientContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto max-w-[1400px] px-4 pb-24 md:px-6 md:pb-32', className)}>{children}</div>
}
