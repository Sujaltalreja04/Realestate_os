import { useLocation } from 'react-router-dom'
import { ChevronRight, Menu, Search } from 'lucide-react'
import { navItemForPath } from '@/app/navigation'
import { Button } from '@/components/ui/button'
import { LanguageMenu, ThemeToggle } from './controls'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

interface TopbarProps {
  onOpenMobileNav: () => void
  onOpenSearch: () => void
}

export function Topbar({ onOpenMobileNav, onOpenSearch }: TopbarProps) {
  const { pathname } = useLocation()
  const { app, group, item } = navItemForPath(pathname)
  // Anything deeper than the matched nav item (e.g. a record id) shows as "Details".
  const isDetail = item && pathname !== item.path && !item.end

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur md:px-6">
      <Button variant="ghost" size="icon" className="-ml-2 md:hidden" onClick={onOpenMobileNav} aria-label="Open menu">
        <Menu />
      </Button>

      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
        <span className="hidden text-muted-foreground sm:inline">{app.name}</span>
        {group?.label && (
          <>
            <ChevronRight className="hidden size-3.5 text-muted-foreground/60 sm:inline" />
            <span className="hidden text-muted-foreground sm:inline">{group.label}</span>
          </>
        )}
        <ChevronRight className="hidden size-3.5 text-muted-foreground/60 sm:inline" />
        <span className={isDetail ? 'truncate text-muted-foreground' : 'truncate font-medium'}>{item?.label ?? app.name}</span>
        {isDetail && (
          <>
            <ChevronRight className="size-3.5 text-muted-foreground/60" />
            <span className="truncate font-medium">Details</span>
          </>
        )}
      </nav>

      <button
        onClick={onOpenSearch}
        className="hidden h-8 w-64 items-center gap-2 rounded-md border bg-card px-2.5 text-sm text-muted-foreground shadow-xs hover:bg-accent sm:flex"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="rounded border bg-muted px-1.5 font-sans text-[10px]">{isMac ? '⌘' : 'Ctrl'} K</kbd>
      </button>
      <Button variant="ghost" size="icon" className="sm:hidden" onClick={onOpenSearch} aria-label="Search">
        <Search />
      </Button>
      <LanguageMenu />
      <ThemeToggle />
    </header>
  )
}
