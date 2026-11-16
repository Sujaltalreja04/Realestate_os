import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from 'convex/react'
import * as D from '@radix-ui/react-dialog'
import { CornerDownLeft, Plus, Search, User } from 'lucide-react'
import { api } from '@convex/_generated/api'
import { APP_LIST } from '@/app/navigation'
import { cn } from '@/lib/utils'

interface Command {
  id: string
  group: string
  label: string
  hint?: string
  icon: React.ComponentType<{ className?: string }>
  run: () => void
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  // Only subscribe while the palette is open.
  const leads = useQuery(api.leads.getLeads, open ? {} : 'skip')

  useEffect(() => {
    if (open) {
      setQ('')
      setActive(0)
    }
  }, [open])

  const commands = useMemo<Command[]>(() => {
    const go = (path: string) => () => {
      onOpenChange(false)
      void navigate(path)
    }
    const needle = q.trim().toLowerCase()
    const match = (...xs: (string | undefined)[]) => !needle || xs.some((x) => x?.toLowerCase().includes(needle))

    const actions: Command[] = [
      { id: 'new-lead', group: 'Actions', label: 'Create lead', icon: Plus, run: go('/crm?new=1') },
    ].filter((c) => match(c.label, 'new add'))

    const pages: Command[] = APP_LIST.flatMap((app) =>
      app.groups
        .flatMap((g) => g.items)
        .filter((i) => match(i.label, i.description, app.name))
        .map((i) => ({
          id: `nav-${i.path}`,
          group: app.name,
          label: i.label,
          hint: i.description,
          icon: i.icon,
          run: go(i.path),
        })),
    )

    const leadCmds: Command[] = needle
      ? (leads ?? [])
          .filter((l) => match(l.name, l.phone, l.email, l.project))
          .slice(0, 8)
          .map((l) => ({
            id: `lead-${l._id}`,
            group: 'Leads',
            label: l.name,
            hint: `${l.status} · ${l.project}`,
            icon: User,
            run: go(`/crm?lead=${l._id}`),
          }))
      : []

    return [...actions, ...pages, ...leadCmds]
  }, [q, leads, navigate, onOpenChange])

  useEffect(() => setActive(0), [q])
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, commands.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      commands[active]?.run()
    }
  }

  let lastGroup = ''
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/30" />
        <D.Content
          className="fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border bg-popover shadow-2xl"
          onKeyDown={onKeyDown}
          aria-describedby={undefined}
        >
          <D.Title className="sr-only">Search</D.Title>
          <div className="flex items-center gap-2 border-b px-4">
            <Search className="size-4 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search pages, leads, actions…"
              className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              role="combobox"
              aria-expanded
              aria-controls="cmdk-list"
              aria-activedescendant={commands[active] ? `cmd-${commands[active].id}` : undefined}
            />
            <kbd className="rounded border bg-muted px-1.5 text-[10px] text-muted-foreground">ESC</kbd>
          </div>
          <div ref={listRef} id="cmdk-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
            {commands.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {leads === undefined && q ? 'Searching…' : 'No results'}
              </p>
            )}
            {commands.map((c, i) => {
              const header = c.group !== lastGroup ? c.group : null
              lastGroup = c.group
              return (
                <div key={c.id}>
                  {header && <div className="px-2 pb-1 pt-2 text-[11px] font-medium text-muted-foreground">{header}</div>}
                  <div
                    id={`cmd-${c.id}`}
                    data-index={i}
                    role="option"
                    aria-selected={i === active}
                    onMouseMove={() => setActive(i)}
                    onClick={c.run}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm',
                      i === active && 'bg-accent',
                    )}
                  >
                    <c.icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{c.label}</span>
                    {c.hint && <span className="truncate text-xs text-muted-foreground">{c.hint}</span>}
                    {i === active && <CornerDownLeft className="ml-auto size-3.5 shrink-0 text-muted-foreground" />}
                  </div>
                </div>
              )
            })}
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}
