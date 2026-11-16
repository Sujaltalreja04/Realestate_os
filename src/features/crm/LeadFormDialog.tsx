import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, Textarea } from '@/components/ui/form'
import { Select } from '@/components/ui/select'
import { nowTimeLabel } from '@/lib/format'
import { BHK_OPTIONS, LEAD_SOURCES, PIPELINE_STAGES, PROPERTY_TYPES, PURPOSES, type Lead } from './model'

interface FormState {
  name: string
  phone: string
  email: string
  project: string
  status: string
  score: string
  source: string
  budget: string
  preferredLocation: string
  propertyType: string
  bhkPreference: string
  purpose: string
  assignedExecutive: string
  notes: string
}

const EMPTY: FormState = {
  name: '',
  phone: '',
  email: '',
  project: '',
  status: 'New Lead',
  score: '50',
  source: 'Website',
  budget: '',
  preferredLocation: '',
  propertyType: 'Apartment',
  bhkPreference: '3 BHK',
  purpose: 'Buy',
  assignedExecutive: '',
  notes: '',
}

function fromLead(l: Lead): FormState {
  return {
    name: l.name,
    phone: l.phone,
    email: l.email,
    project: l.project,
    status: l.status,
    score: String(l.score),
    source: l.source ?? '',
    budget: l.budget != null ? String(l.budget) : '',
    preferredLocation: l.preferredLocation ?? '',
    propertyType: l.propertyType ?? '',
    bhkPreference: l.bhkPreference ?? '',
    purpose: l.purpose ?? '',
    assignedExecutive: l.assignedExecutive ?? '',
    notes: l.notes ?? '',
  }
}

const opt = (xs: readonly string[]) => xs.map((x) => ({ value: x, label: x }))
const orUndef = (s: string) => (s.trim() ? s.trim() : undefined)

export function LeadFormDialog({
  open,
  onOpenChange,
  lead,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  /** When set, the dialog edits this lead; otherwise it creates one. */
  lead?: Lead
}) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const properties = useQuery(api.properties.getProperties)
  const addLead = useMutation(api.leads.addLead)
  const updateLead = useMutation(api.leads.updateLeadDetails)
  const addActivity = useMutation(api.activity.addActivity)

  useEffect(() => {
    if (open) setForm(lead ? fromLead(lead) : EMPTY)
  }, [open, lead])

  const set = <K extends keyof FormState>(k: K) => (v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }))

  const projectOptions = Array.from(new Set([...(properties ?? []).map((p) => p.name), ...(form.project ? [form.project] : [])]))

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('Name and phone are required')
      return
    }
    const score = Math.max(0, Math.min(100, Number(form.score) || 0))
    const budget = form.budget.trim() ? Number(form.budget) : undefined
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      project: form.project || projectOptions[0] || 'Unassigned',
      status: form.status,
      score,
      source: orUndef(form.source),
      budget: budget != null && !Number.isNaN(budget) ? budget : undefined,
      preferredLocation: orUndef(form.preferredLocation),
      propertyType: orUndef(form.propertyType),
      bhkPreference: orUndef(form.bhkPreference),
      purpose: orUndef(form.purpose),
      assignedExecutive: orUndef(form.assignedExecutive),
      notes: orUndef(form.notes),
    }
    setSaving(true)
    try {
      if (lead) {
        await updateLead({ id: lead._id, ...payload })
        toast.success('Lead updated')
      } else {
        await addLead(payload)
        await addActivity({ message: `New lead added: ${payload.name}`, time: nowTimeLabel() })
        toast.success('Lead created')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error('Could not save lead', { description: err instanceof Error ? err.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={lead ? 'Edit lead' : 'New lead'}
        description={lead ? undefined : 'Capture a buyer enquiry. You can enrich it later.'}
        className="max-w-2xl"
      >
        <form onSubmit={submit}>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Full name" htmlFor="lf-name">
              <Input id="lf-name" value={form.name} onChange={(e) => set('name')(e.target.value)} autoFocus required />
            </Field>
            <Field label="Phone" htmlFor="lf-phone">
              <Input id="lf-phone" type="tel" value={form.phone} onChange={(e) => set('phone')(e.target.value)} required />
            </Field>
            <Field label="Email" htmlFor="lf-email">
              <Input id="lf-email" type="email" value={form.email} onChange={(e) => set('email')(e.target.value)} />
            </Field>
            <Field label="Project">
              <Select
                value={form.project || undefined}
                onValueChange={set('project')}
                options={opt(projectOptions)}
                placeholder={properties === undefined ? 'Loading…' : 'Select project'}
              />
            </Field>

            <div className="col-span-full mt-1 border-t pt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Qualification
            </div>
            <Field label="Stage">
              <Select value={form.status} onValueChange={set('status')} options={opt(PIPELINE_STAGES)} />
            </Field>
            <Field label="Lead score" htmlFor="lf-score" hint="0–100. 80+ is treated as hot.">
              <Input id="lf-score" type="number" min={0} max={100} value={form.score} onChange={(e) => set('score')(e.target.value)} />
            </Field>
            <Field label="Budget (₹)" htmlFor="lf-budget">
              <Input id="lf-budget" type="number" min={0} inputMode="numeric" placeholder="e.g. 12000000" value={form.budget} onChange={(e) => set('budget')(e.target.value)} />
            </Field>
            <Field label="Source">
              <Select value={form.source || undefined} onValueChange={set('source')} options={opt(LEAD_SOURCES)} placeholder="Select source" />
            </Field>
            <Field label="Property type">
              <Select value={form.propertyType || undefined} onValueChange={set('propertyType')} options={opt(PROPERTY_TYPES)} placeholder="Any" />
            </Field>
            <Field label="Configuration">
              <Select value={form.bhkPreference || undefined} onValueChange={set('bhkPreference')} options={opt(BHK_OPTIONS)} placeholder="Any" />
            </Field>
            <Field label="Purpose">
              <Select value={form.purpose || undefined} onValueChange={set('purpose')} options={opt(PURPOSES)} placeholder="Select" />
            </Field>
            <Field label="Preferred location" htmlFor="lf-loc">
              <Input id="lf-loc" value={form.preferredLocation} onChange={(e) => set('preferredLocation')(e.target.value)} />
            </Field>
            <Field label="Owner" htmlFor="lf-owner">
              <Input id="lf-owner" placeholder="Sales executive" value={form.assignedExecutive} onChange={(e) => set('assignedExecutive')(e.target.value)} />
            </Field>
            <Field label="Notes" htmlFor="lf-notes" className="col-span-full">
              <Textarea id="lf-notes" rows={3} value={form.notes} onChange={(e) => set('notes')(e.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 border-t bg-muted/40 px-5 py-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : lead ? 'Save changes' : 'Create lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
