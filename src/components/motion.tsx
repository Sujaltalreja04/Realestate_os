import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
  type RefObject,
} from 'react'
import { useLocation } from 'react-router-dom'
import Lenis from 'lenis'
import { cn } from '@/lib/utils'

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** True once the element has entered the viewport (or immediately with reduced motion). */
export function useInView<T extends Element>(ref: RefObject<T | null>, rootMargin = '0px 0px -12% 0px') {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setInView(true)
          io.disconnect()
        }
      },
      { rootMargin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref, rootMargin])
  return inView
}

/* ── Smooth scrolling ─────────────────────────────────────────── */

let lenis: Lenis | null = null

/**
 * Inertial smooth scrolling for the public site (mouse/trackpad only; touch keeps native scrolling).
 * Pauses while a Radix dialog or menu has locked the page.
 */
export function useSmoothScroll() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (prefersReducedMotion()) return
    lenis = new Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 4) })
    let raf = requestAnimationFrame(function loop(t) {
      lenis?.raf(t)
      raf = requestAnimationFrame(loop)
    })
    // Radix marks <body data-scroll-locked> while a modal is open.
    const mo = new MutationObserver(() => {
      if (document.body.hasAttribute('data-scroll-locked')) lenis?.stop()
      else lenis?.start()
    })
    mo.observe(document.body, { attributes: true, attributeFilter: ['data-scroll-locked'] })
    return () => {
      cancelAnimationFrame(raf)
      mo.disconnect()
      lenis?.destroy()
      lenis = null
    }
  }, [])

  useEffect(() => {
    lenis?.scrollTo(0, { immediate: true })
  }, [pathname])
}

/** Smoothly scrolls to an element (native smooth scroll when Lenis is off). */
export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  if (lenis) lenis.scrollTo(el, { offset: -16 })
  else el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
}

/* ── Scroll-driven chrome ─────────────────────────────────────── */

/** Scroll position and direction, throttled to animation frames. */
export function useScrollState() {
  const [state, setState] = useState({ y: 0, dir: 'up' as 'up' | 'down', progress: 0 })
  useEffect(() => {
    let last = window.scrollY
    let ticking = false
    const update = () => {
      ticking = false
      const y = window.scrollY
      const max = document.documentElement.scrollHeight - window.innerHeight
      setState((s) => {
        const dir = Math.abs(y - last) < 4 ? s.dir : y > last ? 'down' : 'up'
        last = y
        return { y, dir, progress: max > 0 ? Math.min(1, y / max) : 0 }
      })
    }
    const on = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(update)
      }
    }
    update()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
    }
  }, [])
  return state
}

export function ScrollProgress({ progress, className }: { progress: number; className?: string }) {
  return (
    <div className={cn('pointer-events-none absolute inset-x-0 bottom-0 h-px', className)} aria-hidden>
      <div className="h-full origin-left bg-brand" style={{ transform: `scaleX(${progress})` }} />
    </div>
  )
}

/** Translates an element against the scroll for depth. `speed` 0.2 = moves at 20% of scroll. */
export function useParallax<T extends HTMLElement>(speed = 0.2) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return
    let raf = 0
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const rect = el.parentElement?.getBoundingClientRect()
        if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) return
        el.style.transform = `translate3d(0, ${(-rect.top * speed).toFixed(1)}px, 0)`
      })
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => {
      window.removeEventListener('scroll', on)
      cancelAnimationFrame(raf)
    }
  }, [speed])
  return ref
}

/* ── Reveals ──────────────────────────────────────────────────── */

/** Image that wipes open from the bottom and settles from a slight zoom when scrolled into view. */
export function ImageReveal({
  src,
  srcSet,
  sizes,
  alt = '',
  className,
  imgClassName,
  priority = false,
}: {
  src: string
  srcSet?: string
  sizes?: string
  alt?: string
  className?: string
  imgClassName?: string
  priority?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref)
  const [loaded, setLoaded] = useState(false)
  const shown = inView && loaded
  return (
    <div ref={ref} className={cn('relative overflow-hidden bg-muted', className)}>
      {/* The image itself is never clipped or hidden, so the browser's lazy loader sees it and fetches it. */}
      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        ref={(img) => {
          if (img?.complete && img.naturalWidth > 0) setLoaded(true)
        }}
        className={cn(
          'size-full object-cover transition-transform duration-[1.8s] ease-[cubic-bezier(0.2,0.7,0.2,1)]',
          shown ? 'scale-100' : 'scale-[1.15]',
          imgClassName,
        )}
      />
      {/* Cover panel that lifts away to "wipe" the image open. */}
      <div
        aria-hidden
        className="absolute inset-0 origin-top bg-background transition-transform duration-[1.3s] ease-[cubic-bezier(0.77,0,0.18,1)]"
        style={{ transform: shown ? 'scaleY(0)' : 'scaleY(1)' }}
      />
    </div>
  )
}

/**
 * Heading whose words rise out of a mask one after another.
 * Plain strings are split into words; inline elements (e.g. <em>) animate as one unit.
 */
export function SplitHeading({
  as: Tag = 'h2',
  children,
  className,
  delay = 0,
  stagger = 60,
}: {
  as?: ElementType
  children: ReactNode
  className?: string
  delay?: number
  stagger?: number
}) {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref)
  const units: ReactNode[] = []
  Children.forEach(children, (child) => {
    if (typeof child === 'string') child.split(/(\s+)/).forEach((w) => w && units.push(w))
    else if (isValidElement(child)) units.push(child)
  })
  let i = 0
  return (
    <Tag ref={ref} className={className}>
      {units.map((u, k) =>
        typeof u === 'string' && /^\s+$/.test(u) ? (
          ' '
        ) : (
          <span key={k} className="inline-block overflow-hidden pb-[0.12em] align-bottom -mb-[0.12em]">
            <span
              className="inline-block transition-transform duration-[1s] ease-[cubic-bezier(0.2,0.7,0.2,1)]"
              style={{ transform: inView ? 'none' : 'translateY(110%)', transitionDelay: `${delay + i++ * stagger}ms` }}
            >
              {u}
            </span>
          </span>
        ),
      )}
    </Tag>
  )
}

/* ── Cursor ───────────────────────────────────────────────────── */

/** A "View" disc that follows the pointer over elements marked data-cursor="view". Fine pointers only. */
export function ViewCursor() {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches || prefersReducedMotion()) return
    let x = 0
    let y = 0
    let cx = 0
    let cy = 0
    let raf = 0
    const loop = () => {
      cx += (x - cx) * 0.2
      cy += (y - cy) * 0.2
      if (ref.current) ref.current.style.transform = `translate3d(${cx}px, ${cy}px, 0)`
      raf = requestAnimationFrame(loop)
    }
    const move = (e: PointerEvent) => {
      x = e.clientX
      y = e.clientY
      setActive(!!(e.target as Element | null)?.closest?.('[data-cursor="view"]'))
    }
    window.addEventListener('pointermove', move, { passive: true })
    raf = requestAnimationFrame(loop)
    return () => {
      window.removeEventListener('pointermove', move)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div ref={ref} className="pointer-events-none fixed left-0 top-0 z-[60] hidden [@media(pointer:fine)]:block" aria-hidden>
      <div
        className={cn(
          '-ml-11 -mt-11 grid size-22 place-items-center rounded-full bg-brand text-[10px] font-medium uppercase tracking-[0.22em] text-white transition-[transform,opacity] duration-300 ease-out',
          active ? 'scale-100 opacity-100' : 'scale-0 opacity-0',
        )}
      >
        View
      </div>
    </div>
  )
}

/* ── Intro ────────────────────────────────────────────────────── */

const INTRO_KEY = 'reos-intro-seen'

/** Decided once per page load, so hero animations can wait for the curtain only when it actually plays. */
export const INTRO_PLAYS: boolean = (() => {
  try {
    if (typeof window === 'undefined' || prefersReducedMotion() || sessionStorage.getItem(INTRO_KEY)) return false
    sessionStorage.setItem(INTRO_KEY, '1')
    return true
  } catch {
    return false
  }
})()

/** Delay (ms) for above-the-fold entrance animations. */
export const ENTRANCE_DELAY = INTRO_PLAYS ? 1300 : 100

/** Brief brand curtain on the first visit of a session, lifted as soon as the page is ready. */
export function IntroCurtain() {
  const [phase, setPhase] = useState<'hidden' | 'in' | 'out'>(INTRO_PLAYS ? 'in' : 'hidden')

  useEffect(() => {
    if (phase !== 'in') return
    const t1 = setTimeout(() => setPhase('out'), 1100)
    return () => clearTimeout(t1)
  }, [phase])

  useEffect(() => {
    if (phase !== 'out') return
    const t2 = setTimeout(() => setPhase('hidden'), 900)
    return () => clearTimeout(t2)
  }, [phase])

  if (phase === 'hidden') return null
  return (
    <div
      className={cn(
        'fixed inset-0 z-[70] grid place-items-center bg-zinc-950 text-white transition-transform duration-[0.9s] ease-[cubic-bezier(0.77,0,0.18,1)]',
        phase === 'out' && '-translate-y-full',
      )}
      aria-hidden
    >
      <div className="overflow-hidden">
        <p className="animate-reveal font-display text-5xl md:text-7xl">
          RealEstate <em className="text-[oklch(0.8_0.08_70)]">OS</em>
        </p>
      </div>
      <div className="absolute bottom-10 left-1/2 h-px w-40 -translate-x-1/2 overflow-hidden bg-white/15">
        <div className="h-full origin-left animate-[intro-bar_1.1s_ease-out_both] bg-white/70" />
      </div>
    </div>
  )
}

/** Fades page content in on each route change. */
export function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return (
    <div key={pathname} className="animate-[page-in_0.6s_cubic-bezier(0.2,0.7,0.2,1)_both]">
      {children}
    </div>
  )
}
