import { useMemo, useState } from 'react'
import { useMutation } from 'convex/react'
import { toast } from 'sonner'
import { CalendarCheck, Check, Trash2 } from 'lucide-react'
import { api } from '@convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { EmptyState } from '@/components/page'
import { formatDate, todayISO } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Followup, Lead } from './model'

type Filter = 'pending' | 'overdue' | 'today' | 'completed' | 'all'

export function FollowupsView({
  followups,
  leads,
  onOpenLead,
}: {
  followups: Followup[]
  leads: Lead[]
  onOpenLead: (lead: Lead) => void
}) {
  const [filter, setFilter] = useState<Filter>('pending')
  const toggle = useMutation(api.crm.updateFollowupStatus)
  const remove = useMutation(api.crm.deleteFollowup)
  const today = todayISO()
  const leadById = useMemo(() => new Map(leads.map((l) => [l._id as string, l])), [leads])

  const counts = useMemo(() => {
    const pending = followups.filter((f) => f.status !== 'Completed')
    return {
      pending: pending.length,
      overdue: pending.filter((f) => f.date < today).length,
      today: pending.filter((f) => f.date === today).length,
      completed: followups.length - pending.length,
      all: followups.length,
    }
  }, [followups, today])

  const rows = useMemo(() => {
    const pred: Record<Filter, (f: Followup) => boolean> = {
      pending: (f) => f.status !== 'Completed',
      overdue: (f) => f.status !== 'Completed' && f.date < today,
      today: (f) => f.status !== 'Completed' && f.date === today,
      completed: (f) => f.status === 'Completed',
      all: () => true,
    }
    return followups.filter(pred[filter]).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
  }, [followups, filter, today])

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'pending', label: 'Open' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'today', label: 'Due today' },
    { id: 'completed', label: 'Completed' },
    { id: 'all', label: 'All' },
  ]

  return (
    <div className="rounded-xl border bg-card shadow-xs">
      <div className="flex flex-wrap gap-1 border-b p-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground',
              filter === f.id && 'bg-accent font-medium text-foreground',
            )}
          >
            {f.label}
            <span className={cn('tabular-nums text-xs', f.id === 'overdue' && counts.overdue > 0 && 'text-destructive')}>
              {counts[f.id]}
            </span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={CalendarCheck} title="Nothing here" description="No follow-ups match this view." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH className="w-10" />
              <TH>Task</TH>
              <TH>Lead</TH>
              <TH>Due</TH>
              <TH className="hidden md:table-cell">Assigned to</TH>
              <TH className="w-12" />
            </TR>
          </THead>
          <TBody>
            {rows.map((f) => {
              const done = f.status === 'Completed'
              const overdue = !done && f.date < today
              const lead = leadById.get(f.leadId)
              return (
                <TR key={f._id} className="group hover:bg-muted/40">
                  <TD>
                    <button
                      onClick={() => void toggle({ id: f._id, status: done ? 'Pending' : 'Completed' })}
                      className={cn(
                        'grid size-4 place-items-center rounded border',
                        done ? 'border-success bg-success text-white' : 'border-input hover:border-primary',
                      )}
                      aria-label={done ? 'Mark as pending' : 'Mark as done'}
                    >
                      {done && <Check className="size-3" />}
                    </button>
                  </TD>
                  <TD className={cn('max-w-80', done && 'text-muted-foreground line-through')}>{f.task}</TD>
                  <TD>
                    {lead ? (
                      <button className="hover:underline" onClick={() => onOpenLead(lead)}>
                        {f.leadName}
                      </button>
                    ) : (
                      f.leadName
                    )}
                  </TD>
                  <TD className="whitespace-nowrap">
                    <span className={cn(overdue && 'text-destructive')}>{formatDate(f.date)}</span>
                    <span className="ml-1.5 text-xs text-muted-foreground">{f.time}</span>
                    {overdue && (
                      <Badge variant="destructive" className="ml-2">
                        Overdue
                      </Badge>
                    )}
                  </TD>
                  <TD className="hidden text-muted-foreground md:table-cell">{f.assignedTo}</TD>
                  <TD>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                      aria-label="Delete follow-up"
                      onClick={() =>
                        remove({ id: f._id }).then(
                          () => toast.success('Follow-up deleted'),
                          () => toast.error('Could not delete follow-up'),
                        )
                      }
                    >
                      <Trash2 />
                    </Button>
                  </TD>
                </TR>
              )
            })}
          </TBody>
        </Table>
      )}
    </div>
  )
}
