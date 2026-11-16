import { useState, type FormEvent, type ReactNode } from 'react'
import { useAction, useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { CalendarPlus, Check, Mail, Pencil, Phone, Sparkles, Trash2 } from 'lucide-react'
import { api } from '@convex/_generated/api'
import { Dialog, SheetContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatINR, nowTimeLabel, todayISO } from '@/lib/format'
import { cn } from '@/lib/utils'
import { PIPELINE_STAGES, type Followup, type Lead, type Payment } from './model'
import { Avatar, ScoreBadge, useMoveLead } from './parts'
import { LeadFormDialog } from './LeadFormDialog'
import ErrorBoundary from '@/components/ErrorBoundary'

interface LeadSheetProps {
  lead: Lead | null
  followups: Followup[]
  payments: Payment[]
  onClose: () => void
}

export function LeadSheet({ lead, followups, payments, onClose }: LeadSheetProps) {
  const [editing, setEditing] = useState(false)
  return (
    <>
      <Dialog open={!!lead} onOpenChange={(o) => !o && onClose()}>
        {lead && (
          <SheetContent
            title={
              <span className="flex items-center gap-3">
                <Avatar name={lead.name} />
                <span className="truncate">{lead.name}</span>
              </span>
            }
            actions={
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil /> Edit
              </Button>
            }
          >
            <LeadSheetBody
              lead={lead}
              followups={followups.filter((f) => f.leadId === lead._id)}
              payments={payments.filter((p) => p.leadId === lead._id)}
              onDeleted={onClose}
            />
          </SheetContent>
        )}
      </Dialog>
      {lead && <LeadFormDialog open={editing} onOpenChange={setEditing} lead={lead} />}
    </>
  )
}

function LeadSheetBody({
  lead,
  followups,
  payments,
  onDeleted,
}: {
  lead: Lead
  followups: Followup[]
  payments: Payment[]
  onDeleted: () => void
}) {
  const moveLead = useMoveLead()
  const deleteLead = useMutation(api.leads.deleteLead)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function remove() {
    try {
      await deleteLead({ id: lead._id })
      toast.success(`${lead.name} deleted`)
      onDeleted()
    } catch (err) {
      toast.error('Could not delete lead', { description: err instanceof Error ? err.message : undefined })
    }
  }

  return (
    <div className="divide-y">
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <ScoreBadge score={lead.score} />
          {lead.source && <Badge variant="outline">{lead.source}</Badge>}
          {lead.automationStatus && <Badge variant="secondary">Automation: {lead.automationStatus}</Badge>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={`tel:${lead.phone}`}>
              <Phone /> {lead.phone}
            </a>
          </Button>
          {lead.email && (
            <Button variant="outline" size="sm" asChild>
              <a href={`mailto:${lead.email}`}>
                <Mail /> Email
              </a>
            </Button>
          )}
        </div>
        <div className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Stage</span>
          <Select
            value={lead.status}
            onValueChange={(s) => void moveLead(lead._id, lead.name, s)}
            options={Array.from(new Set([...PIPELINE_STAGES, lead.status])).map((s) => ({ value: s, label: s }))}
          />
        </div>
      </div>

      <Section title="Requirements">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Detail label="Project" value={lead.project} />
          <Detail label="Budget" value={formatINR(lead.budget)} />
          <Detail label="Configuration" value={lead.bhkPreference} />
          <Detail label="Property type" value={lead.propertyType} />
          <Detail label="Location" value={lead.preferredLocation} />
          <Detail label="Purpose" value={lead.purpose} />
          <Detail label="Home loan" value={lead.loanRequired == null ? undefined : lead.loanRequired ? 'Required' : 'Not needed'} />
          <Detail label="Owner" value={lead.assignedExecutive} />
          <Detail label="Occupation" value={lead.occupation} />
          <Detail label="Annual income" value={lead.annualIncome != null ? formatINR(lead.annualIncome) : undefined} />
        </dl>
        {lead.notes && <p className="mt-4 whitespace-pre-wrap rounded-lg bg-muted/60 p-3 text-sm">{lead.notes}</p>}
      </Section>

      <ErrorBoundary title="AI insight is unavailable">
        <PredictionSection lead={lead} />
      </ErrorBoundary>
      <FollowupsSection lead={lead} followups={followups} />

      <Section title="Payments">
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded.</p>
        ) : (
          <ul className="space-y-2">
            {payments.map((p) => (
              <li key={p._id} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate">{p.stage}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(p.date)}</div>
                </div>
                <div className="text-right">
                  <div className="tabular-nums">{formatINR(p.amount)}</div>
                  <PaymentStatusBadge status={p.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className="flex items-center justify-between p-5">
        <span className="text-xs text-muted-foreground">Created {formatDate(new Date(lead._creationTime).toISOString())}</span>
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-sm">Delete this lead?</span>
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="destructive" onClick={remove}>
              Delete
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 /> Delete lead
          </Button>
        )}
      </div>
    </div>
  )
}

function PredictionSection({ lead }: { lead: Lead }) {
  const prediction = useQuery(api.predictions.getPredictionByLead, { leadId: lead._id })
  const run = useAction(api.predictions.runPrediction)
  const [running, setRunning] = useState(false)

  async function analyse() {
    setRunning(true)
    try {
      await run({ leadId: lead._id })
      toast.success('AI analysis updated')
    } catch (err) {
      toast.error('AI analysis failed', { description: err instanceof Error ? err.message : undefined })
    } finally {
      setRunning(false)
    }
  }

  return (
    <Section
      title="AI insight"
      action={
        <Button size="sm" variant="outline" onClick={analyse} disabled={running}>
          <Sparkles /> {running ? 'Analysing…' : prediction ? 'Refresh' : 'Analyse'}
        </Button>
      }
    >
      {prediction === undefined ? (
        <Skeleton className="h-16" />
      ) : prediction === null ? (
        <p className="text-sm text-muted-foreground">
          No analysis yet. Run one to get conversion probability and the next best action.
        </p>
      ) : (
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, prediction.conversionProbability)}%` }} />
            </div>
            <span className="tabular-nums font-medium">{Math.round(prediction.conversionProbability)}%</span>
          </div>
          <p className="text-xs text-muted-foreground">Conversion probability</p>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="text-xs font-medium text-primary">Next best action</div>
            <p className="mt-1">{prediction.nextBestAction}</p>
          </div>
          {prediction.bestFitProperty && (
            <p>
              <span className="text-muted-foreground">Best fit: </span>
              {prediction.bestFitProperty}
            </p>
          )}
          {prediction.factorsToConvert.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {prediction.factorsToConvert.slice(0, 4).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Section>
  )
}

function FollowupsSection({ lead, followups }: { lead: Lead; followups: Followup[] }) {
  const add = useMutation(api.crm.addFollowup)
  const toggle = useMutation(api.crm.updateFollowupStatus)
  const addActivity = useMutation(api.activity.addActivity)
  const [task, setTask] = useState('')
  const [date, setDate] = useState(todayISO())

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!task.trim()) return
    try {
      await add({
        leadId: lead._id,
        leadName: lead.name,
        date,
        time: '10:00',
        task: task.trim(),
        status: 'Pending',
        assignedTo: lead.assignedExecutive ?? 'Unassigned',
      })
      await addActivity({ message: `Follow-up scheduled for ${lead.name}`, time: nowTimeLabel() })
      setTask('')
      toast.success('Follow-up scheduled')
    } catch (err) {
      toast.error('Could not schedule follow-up', { description: err instanceof Error ? err.message : undefined })
    }
  }

  const sorted = [...followups].sort((a, b) => (a.status === b.status ? a.date.localeCompare(b.date) : a.status === 'Pending' ? -1 : 1))

  return (
    <Section title="Follow-ups">
      {sorted.length > 0 && (
        <ul className="mb-3 space-y-1">
          {sorted.map((f) => {
            const done = f.status === 'Completed'
            return (
              <li key={f._id} className="flex items-start gap-3 rounded-md py-1.5">
                <button
                  onClick={() => void toggle({ id: f._id, status: done ? 'Pending' : 'Completed' })}
                  className={cn(
                    'mt-0.5 grid size-4 shrink-0 place-items-center rounded border',
                    done ? 'border-success bg-success text-white' : 'border-input hover:border-primary',
                  )}
                  aria-label={done ? 'Mark as pending' : 'Mark as done'}
                >
                  {done && <Check className="size-3" />}
                </button>
                <div className={cn('min-w-0 flex-1 text-sm', done && 'text-muted-foreground line-through')}>{f.task}</div>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDate(f.date)}</span>
              </li>
            )
          })}
        </ul>
      )}
      <form onSubmit={submit} className="flex gap-2">
        <Input value={task} onChange={(e) => setTask(e.target.value)} placeholder="Add a follow-up…" className="h-8 flex-1" aria-label="Follow-up task" />
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 w-36" aria-label="Due date" />
        <Button type="submit" size="sm" variant="secondary" disabled={!task.trim()}>
          <CalendarPlus /> Add
        </Button>
      </form>
    </Section>
  )
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const variant = status === 'Paid' ? 'success' : status === 'Overdue' ? 'destructive' : 'warning'
  return <Badge variant={variant}>{status}</Badge>
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

function Detail({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate">{value ?? '—'}</dd>
    </div>
  )
}
