import { useEffect, useState } from 'react'
import { Outlet, useLocation, useOutletContext } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { CommandPalette } from './CommandPalette'
import { ThemeContext } from './controls'
import { useTheme } from '@/hooks/use-theme'
import { appForPath } from '@/app/navigation'

interface RootContext {
  openSearch: () => void
}

export const useRootContext = () => useOutletContext<RootContext>()

/** Shared by all three apps: theme, ⌘K search, scroll reset on navigation. */
export function RootLayout() {
  const themeState = useTheme()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
    document.getElementById('app-main')?.scrollTo(0, 0)
  }, [pathname])

  return (
    <ThemeContext.Provider value={themeState}>
      <Outlet context={{ openSearch: () => setPaletteOpen(true) } satisfies RootContext} />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </ThemeContext.Provider>
  )
}

const COLLAPSE_KEY = 'reos-sidebar-collapsed'

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

/** Internal tools layout (CRM, Sales OS): sidebar + top bar. */
export function StaffLayout() {
  const { openSearch } = useRootContext()
  const { pathname } = useLocation()
  const app = appForPath(pathname)
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1')
      } catch {
        /* ignore */
      }
      return !c
    })

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar app={app} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} className="hidden md:flex" />

      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 md:hidden" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 md:hidden" aria-describedby={undefined}>
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <Sidebar app={app} onNavigate={() => setMobileOpen(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMobileNav={() => setMobileOpen(true)} onOpenSearch={openSearch} />
        <main id="app-main" className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
