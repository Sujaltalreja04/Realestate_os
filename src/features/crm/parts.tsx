import { useCallback } from 'react'
import { useMutation } from 'convex/react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { initials, nowTimeLabel } from '@/lib/format'
import { STAGE_DOT, TEMPERATURE_BADGE, stageGroup, temperature } from './model'

export function StageBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm', className)}>
      <span className={cn('size-1.5 shrink-0 rounded-full', STAGE_DOT[stageGroup(status)])} />
      <span className="truncate">{status}</span>
    </span>
  )
}

export function ScoreBadge({ score }: { score: number }) {
  const t = temperature(score)
  return (
    <Badge variant={TEMPERATURE_BADGE[t]} className="tabular-nums">
      {score}
      <span className="font-normal capitalize opacity-80">· {t}</span>
    </Badge>
  )
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  // Stable hue per name so the same person always gets the same colour.
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360
  return (
    <span
      className={cn('grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold', className)}
      style={{ background: `oklch(0.93 0.04 ${h})`, color: `oklch(0.4 0.09 ${h})` }}
      aria-hidden
    >
      {initials(name) || '?'}
    </span>
  )
}

/** Moves a lead to a new stage and records it in the activity stream, like the old CRM did. */
export function useMoveLead() {
  const updateStatus = useMutation(api.leads.updateLeadStatus)
  const addActivity = useMutation(api.activity.addActivity)
  return useCallback(
    async (id: Id<'leads'>, name: string, status: string) => {
      try {
        await updateStatus({ id, status })
        await addActivity({ message: `${name} moved to ${status}`, time: nowTimeLabel() })
        toast.success(`${name} → ${status}`)
      } catch (err) {
        toast.error('Could not update stage', { description: err instanceof Error ? err.message : undefined })
      }
    },
    [updateStatus, addActivity],
  )
}
