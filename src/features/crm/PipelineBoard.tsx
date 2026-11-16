import { useMemo, useState, type DragEvent } from 'react'
import { MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatINR } from '@/lib/format'
import { cn } from '@/lib/utils'
import { PIPELINE_STAGES, STAGE_DOT, stageGroup, type Lead } from './model'
import { ScoreBadge, useMoveLead } from './parts'

const DRAG_TYPE = 'application/x-lead-id'

export function PipelineBoard({ leads, onOpen }: { leads: Lead[]; onOpen: (lead: Lead) => void }) {
  const moveLead = useMoveLead()
  const [over, setOver] = useState<string | null>(null)

  // Any status the backend uses that isn't a known stage (e.g. legacy "Booked") gets its own column at the end.
  const columns = useMemo(() => {
    const known = new Set<string>(PIPELINE_STAGES)
    const extra = Array.from(new Set(leads.map((l) => l.status).filter((s) => !known.has(s))))
    return [...PIPELINE_STAGES, ...extra]
  }, [leads])

  const byStage = useMemo(() => {
    const m = new Map<string, Lead[]>()
    for (const l of leads) m.set(l.status, [...(m.get(l.status) ?? []), l])
    for (const list of m.values()) list.sort((a, b) => b.score - a.score)
    return m
  }, [leads])

  function onDrop(e: DragEvent, stage: string) {
    e.preventDefault()
    setOver(null)
    const id = e.dataTransfer.getData(DRAG_TYPE)
    const lead = leads.find((l) => l._id === id)
    if (lead && lead.status !== stage) void moveLead(lead._id, lead.name, stage)
  }

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 md:-mx-6 md:px-6">
      <div className="flex min-w-max gap-3">
        {columns.map((stage) => {
          const items = byStage.get(stage) ?? []
          const value = items.reduce((s, l) => s + (l.budget ?? 0), 0)
          return (
            <section
              key={stage}
              aria-label={stage}
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes(DRAG_TYPE)) {
                  e.preventDefault()
                  setOver(stage)
                }
              }}
              onDragLeave={() => setOver((o) => (o === stage ? null : o))}
              onDrop={(e) => onDrop(e, stage)}
              className={cn(
                'flex w-68 shrink-0 flex-col rounded-xl border bg-muted/40 transition-colors',
                over === stage && 'border-primary/50 bg-primary/5',
              )}
            >
              <header className="flex items-center gap-2 px-3 pb-2 pt-3">
                <span className={cn('size-2 rounded-full', STAGE_DOT[stageGroup(stage)])} />
                <h3 className="truncate text-sm font-medium">{stage}</h3>
                <span className="rounded-md bg-background px-1.5 text-xs tabular-nums text-muted-foreground ring-1 ring-border">
                  {items.length}
                </span>
                {value > 0 && <span className="ml-auto text-xs tabular-nums text-muted-foreground">{formatINR(value)}</span>}
              </header>
              <div className="flex min-h-24 flex-1 flex-col gap-2 p-2 pt-0">
                {items.map((l) => (
                  <article
                    key={l._id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(DRAG_TYPE, l._id)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    className="group cursor-grab rounded-lg border bg-card p-3 shadow-xs transition-shadow hover:shadow-sm active:cursor-grabbing"
                  >
                    <div className="flex items-start gap-2">
                      <button
                        onClick={() => onOpen(l)}
                        className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:underline"
                      >
                        <div className="truncate text-sm font-medium">{l.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{l.project}</div>
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="-mr-1 -mt-1 rounded p-1 text-muted-foreground opacity-0 hover:bg-accent focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
                          aria-label={`Move ${l.name}`}
                        >
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
                          <DropdownMenuLabel>Move to</DropdownMenuLabel>
                          {PIPELINE_STAGES.filter((s) => s !== l.status).map((s) => (
                            <DropdownMenuItem key={s} onSelect={() => void moveLead(l._id, l.name, s)}>
                              <span className={cn('size-1.5 rounded-full', STAGE_DOT[stageGroup(s)])} />
                              {s}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <ScoreBadge score={l.score} />
                      <span className="text-xs tabular-nums text-muted-foreground">{formatINR(l.budget)}</span>
                    </div>
                  </article>
                ))}
                {items.length === 0 && (
                  <div className="grid flex-1 place-items-center rounded-lg border border-dashed text-xs text-muted-foreground">
                    Drop here
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
