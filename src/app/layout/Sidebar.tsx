import { NavLink } from 'react-router-dom'
import { Check, ChevronsUpDown, ExternalLink, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { APP_LIST, type AppDef } from '@/app/navigation'
import { Tooltip } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface SidebarProps {
  app: AppDef
  collapsed?: boolean
  onToggleCollapsed?: () => void
  onNavigate?: () => void
  className?: string
}

export function Sidebar({ app, collapsed = false, onToggleCollapsed, onNavigate, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200',
        collapsed ? 'w-[60px]' : 'w-60',
        className,
      )}
    >
      <div className={cn('flex h-14 shrink-0 items-center px-2', collapsed && 'justify-center')}>
        <AppSwitcher app={app} collapsed={collapsed} />
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4" aria-label={app.name}>
        {app.groups.map((group, gi) => (
          <div key={group.label ?? gi} className="mt-4 first:mt-1">
            {group.label &&
              (collapsed ? (
                <div className="mx-auto mb-1 h-px w-6 bg-border" />
              ) : (
                <div className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </div>
              ))}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const link = (
                  <NavLink
                    to={item.path}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex h-8 items-center gap-2.5 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
                        isActive && 'bg-card font-medium text-foreground shadow-xs ring-1 ring-border',
                        collapsed && 'justify-center px-0',
                      )
                    }
                  >
                    <item.icon className="size-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                )
                return <li key={item.path}>{collapsed ? <Tooltip content={item.label}>{link}</Tooltip> : link}</li>
              })}
            </ul>
          </div>
        ))}
      </nav>

      {onToggleCollapsed && (
        <div className="border-t border-sidebar-border p-2">
          <button
            onClick={onToggleCollapsed}
            className={cn(
              'flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground',
              collapsed && 'justify-center px-0',
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            {!collapsed && 'Collapse'}
          </button>
        </div>
      )}
    </aside>
  )
}

export function AppMark({ app, className }: { app: AppDef; className?: string }) {
  return (
    <span className={cn('grid size-7 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground', className)}>
      <app.icon className="size-4" />
    </span>
  )
}

function AppSwitcher({ app, collapsed }: { app: AppDef; collapsed: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex w-full items-center gap-2.5 rounded-md p-1.5 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 data-[state=open]:bg-accent',
          collapsed && 'w-auto',
        )}
        aria-label="Switch app"
      >
        <AppMark app={app} />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-sm font-semibold">{app.name}</span>
              <span className="block truncate text-xs text-muted-foreground">RealEstate OS</span>
            </span>
            <ChevronsUpDown className="size-4 text-muted-foreground" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Switch to</DropdownMenuLabel>
        {APP_LIST.map((a) => (
          <DropdownMenuItem key={a.id} asChild>
            <NavLink to={a.base}>
              <AppMark app={a} className="size-6 [&_svg]:!size-3.5 [&_svg]:!text-primary-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm">{a.name}</span>
                <span className="block text-xs text-muted-foreground">{a.tagline}</span>
              </span>
              {a.id === app.id ? <Check /> : a.id === 'client' ? <ExternalLink /> : null}
            </NavLink>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
