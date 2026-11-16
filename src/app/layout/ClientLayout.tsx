import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowUpRight, Search, X } from 'lucide-react'
import { APPS, CLIENT_ACCOUNT, CLIENT_EXPLORE, CLIENT_PRIMARY } from '@/app/navigation'
import { cn } from '@/lib/utils'
import { IntroCurtain, PageTransition, ScrollProgress, ViewCursor, useScrollState, useSmoothScroll } from '@/components/motion'
import { useRootContext } from './AppShell'
import { LanguageMenu, ThemeToggle } from './controls'

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
      <img src="/favicon.svg" alt="" className="size-8" />
      <span className={cn('font-display text-2xl leading-none tracking-tight', inverted && 'text-white')}>
        RealEstate <em>OS</em>
      </span>
    </Link>
  )
}

/** Public, buyer-facing website layout with the editorial theme. */
export function ClientLayout() {
  const { openSearch } = useRootContext()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  useSmoothScroll()
  const { y, dir, progress } = useScrollState()
  const overlay = pathname === '/' && y < 24
  // Header slides away while reading down the page and returns on any upward scroll.
  const hidden = dir === 'down' && y > 320 && !menuOpen

  // Theme lives on <html> so portalled menus and dialogs share it.
  useEffect(() => {
    document.documentElement.classList.add('theme-editorial')
    return () => document.documentElement.classList.remove('theme-editorial')
  }, [])

  useEffect(() => setMenuOpen(false), [pathname])

  const navLink = ({ isActive }: { isActive: boolean }) =>
    cn(
      'relative py-2 text-[11px] font-medium uppercase tracking-[0.22em] transition-colors',
      'after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform hover:after:scale-x-100',
      overlay ? 'text-white/80 hover:text-white' : 'text-muted-foreground hover:text-foreground',
      isActive && 'text-current after:scale-x-100',
      isActive && (overlay ? 'text-white' : 'text-foreground'),
    )
  const ctrl = cn('inline-flex', overlay && '[&_button]:text-white [&_button:hover]:bg-white/10')

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header
        className={cn(
          'sticky top-0 z-40 transition-[background-color,transform] duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)]',
          hidden && '-translate-y-full',
          overlay ? 'border-b border-white/15 bg-transparent' : 'border-b bg-background/85 backdrop-blur-xl',
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-8 px-4 md:px-6">
          <Logo inverted={overlay} />

          <nav className="hidden items-center gap-8 lg:flex" aria-label="Main">
            {CLIENT_PRIMARY.map((i) => (
              <NavLink key={i.path} to={i.path} end={i.end} className={navLink}>
                {i.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={openSearch}
              aria-label="Search"
              className={cn('grid size-9 place-items-center transition-colors', overlay ? 'text-white hover:bg-white/10' : 'hover:bg-accent')}
            >
              <Search className="size-4" />
            </button>
            <div className={cn('hidden sm:flex', ctrl)}>
              <LanguageMenu compact />
              <ThemeToggle />
            </div>
            <Link
              to="/projects"
              className={cn(
                'ml-2 hidden h-10 items-center px-5 text-[11px] font-medium uppercase tracking-[0.22em] transition-colors md:inline-flex',
                overlay ? 'bg-white text-zinc-900 hover:bg-white/90' : 'bg-primary text-primary-foreground hover:bg-primary/90',
              )}
            >
              Book a visit
            </Link>
            <button
              onClick={() => setMenuOpen(true)}
              className={cn(
                'ml-2 inline-flex h-10 items-center gap-3 text-[11px] font-medium uppercase tracking-[0.22em]',
                overlay ? 'text-white' : 'text-foreground',
              )}
              aria-label="Open menu"
            >
              <span className="hidden sm:inline">Menu</span>
              <span className="flex w-6 flex-col gap-1.5" aria-hidden>
                <span className="h-px w-full bg-current" />
                <span className="ml-auto h-px w-4 bg-current" />
              </span>
            </button>
          </div>
        </div>
        {!overlay && <ScrollProgress progress={progress} />}
      </header>

      <FullMenu open={menuOpen} onOpenChange={setMenuOpen} />

      <main className="flex-1">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>

      <Footer />
      <ViewCursor />
      <IntroCurtain />
    </div>
  )
}

/** Full-screen, multi-column menu (all screen sizes). */
function FullMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const cols = [
    { title: 'Homes', items: CLIENT_PRIMARY },
    { title: 'Experience', items: CLIENT_EXPLORE },
    { title: 'Account', items: [CLIENT_ACCOUNT] },
  ]
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Content
          className="animate-reveal fixed inset-0 z-50 flex flex-col overflow-y-auto bg-zinc-950 text-white [animation-duration:0.4s]"
          aria-describedby={undefined}
        >
          <div className="mx-auto flex h-16 w-full max-w-[1400px] shrink-0 items-center justify-between px-4 md:px-6">
            <Logo inverted />
            <Dialog.Title className="sr-only">Menu</Dialog.Title>
            <Dialog.Close className="inline-flex h-10 items-center gap-3 text-[11px] font-medium uppercase tracking-[0.22em]" aria-label="Close menu">
              Close <X className="size-5" />
            </Dialog.Close>
          </div>
          <div className="mx-auto grid w-full max-w-[1400px] flex-1 gap-12 px-4 py-12 md:grid-cols-[1.4fr_1fr_1fr] md:px-6 md:py-20">
            {cols.map((c, ci) => (
              <nav key={c.title} aria-label={c.title}>
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/50">{c.title}</p>
                <ul className={cn('mt-6', ci === 0 ? 'space-y-2' : 'space-y-4')}>
                  {c.items.map((i) => (
                    <li key={i.path}>
                      <NavLink
                        to={i.path}
                        end={i.end}
                        className={({ isActive }) =>
                          cn(
                            'group inline-flex items-baseline gap-3 transition-colors hover:text-[oklch(0.8_0.08_70)]',
                            ci === 0 ? 'font-display text-5xl md:text-7xl' : 'font-display text-2xl md:text-3xl',
                            !isActive && 'text-white/85',
                          )
                        }
                      >
                        {i.label}
                        <ArrowUpRight className="size-5 opacity-0 transition-opacity group-hover:opacity-100" />
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
          <div className="border-t border-white/10">
            <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-4 py-6 text-xs text-white/50 md:px-6">
              <span>Ahmedabad · GIFT City</span>
              <span className="flex gap-6">
                {[APPS.crm, APPS.sales].map((a) => (
                  <Link key={a.id} to={a.base} className="uppercase tracking-[0.22em] hover:text-white">
                    {a.name}
                  </Link>
                ))}
              </span>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Footer() {
  const cols = [
    { title: 'Homes', items: CLIENT_PRIMARY },
    { title: 'Experience', items: CLIENT_EXPLORE },
  ]
  return (
    <footer className="bg-zinc-950 text-white">
      <div className="mx-auto max-w-[1400px] px-4 pt-20 md:px-6">
        <div className="grid gap-12 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <p className="font-display text-4xl leading-tight md:text-5xl">
              Homes built to <em className="text-[oklch(0.8_0.08_70)]">last.</em>
            </p>
            <p className="mt-4 max-w-sm text-sm text-white/55">
              RERA-registered residences across Ahmedabad and GIFT City, with 3D tours and transparent pricing.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="text-[11px] uppercase tracking-[0.28em] text-white/45">{c.title}</h4>
              <ul className="mt-5 space-y-3 text-sm text-white/75">
                {c.items.map((i) => (
                  <li key={i.path}>
                    <Link to={i.path} className="hover:text-white">
                      {i.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h4 className="text-[11px] uppercase tracking-[0.28em] text-white/45">For teams</h4>
            <ul className="mt-5 space-y-3 text-sm text-white/75">
              {[APPS.crm, APPS.sales].map((a) => (
                <li key={a.id}>
                  <Link to={a.base} className="hover:text-white">
                    {a.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p
          aria-hidden
          className="mt-20 select-none border-t border-white/10 pt-6 text-center font-display text-[clamp(3.5rem,15vw,13rem)] leading-[0.8] tracking-tight text-white/[0.07]"
        >
          RealEstate OS
        </p>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1400px] flex-wrap justify-between gap-3 px-4 py-6 text-xs text-white/45 md:px-6">
          <span>© {new Date().getFullYear()} RealEstate OS. All rights reserved.</span>
          <span>Prices and availability are indicative and subject to change.</span>
        </div>
      </div>
    </footer>
  )
}
