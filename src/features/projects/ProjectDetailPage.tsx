import { lazy, Suspense, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { ArrowLeft, Box, CalendarCheck, Check, Download, Image as ImageIcon, MapPin, PlayCircle, ShieldCheck } from 'lucide-react'
import { api } from '@convex/_generated/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/form'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, Page } from '@/components/page'
import { formatINR, formatNumber, nowTimeLabel, todayISO } from '@/lib/format'
import { imageAt, statusVariant, type Property } from './model'
import { presetFor } from './three/presets'
import { cn } from '@/lib/utils'

// three.js only loads when someone opens the 3D view or the tour.
const PropertyViewer = lazy(() => import('./three/PropertyViewer'))
const VirtualTour = lazy(() => import('./three/VirtualTour').then((m) => ({ default: m.VirtualTour })))
const shortName = (n: string) => n.replace(/^Ai RealEstate OS /, '')

export default function ProjectDetailPage() {
  const { projectId } = useParams()
  const properties = useQuery(api.properties.getProperties)
  const p = properties?.find((x) => x._id === projectId)
  const [tourOpen, setTourOpen] = useState(false)

  if (properties === undefined) {
    return (
      <Page>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="aspect-[21/9] rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </Page>
    )
  }
  if (!p) {
    return (
      <Page>
        <EmptyState
          icon={MapPin}
          title="Project not found"
          description="It may have been removed or the link is out of date."
          action={
            <Button variant="outline" asChild>
              <Link to="/projects">Back to projects</Link>
            </Button>
          }
        />
      </Page>
    )
  }

  const preset = presetFor(p.image, p.name)
  const facts = [
    { label: 'Starting price', value: formatINR(p.price) },
    { label: 'Configuration', value: p.bhk },
    { label: 'Possession', value: p.completion === 'Ready' ? 'Ready now' : p.completion },
    { label: 'Developer', value: p.builder?.replace(/^Ai RealEstate OS/, 'RealEstate OS') ?? '—' },
  ]

  return (
    <Page className="max-w-6xl">
      <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
        <Link to="/projects">
          <ArrowLeft /> All projects
        </Link>
      </Button>

      <ProjectHero p={p} preset={preset} onTour={() => setTourOpen(true)} />
      {tourOpen && (
        <Suspense fallback={null}>
          <VirtualTour preset={preset} title={shortName(p.name)} open onOpenChange={setTourOpen} />
        </Suspense>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-8">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
              {p.reraNumber && (
                <Badge variant="outline" className="font-normal">
                  <ShieldCheck className="size-3" /> RERA registered
                </Badge>
              )}
            </div>
            <h2 className="mt-3 font-display text-5xl leading-none tracking-tight">{shortName(p.name)}</h2>
            <p className="mt-1 flex items-center gap-1 text-muted-foreground">
              <MapPin className="size-4" /> {p.location}, Ahmedabad
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4">
            {facts.map((f) => (
              <div key={f.label} className="bg-card p-4">
                <dt className="text-xs text-muted-foreground">{f.label}</dt>
                <dd className="mt-1 truncate font-semibold">{f.value}</dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setTourOpen(true)}>
              <PlayCircle /> Start virtual tour
            </Button>
            <Button variant="outline" asChild>
              <Link to="/township">
                <Box /> Site plan in 3D
              </Link>
            </Button>
            {p.brochure && (
              <Button variant="outline" asChild>
                <a href={p.brochure} target="_blank" rel="noreferrer">
                  <Download /> Brochure
                </a>
              </Button>
            )}
          </div>

          {p.amenities && p.amenities.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold">Amenities</h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {p.amenities.map((a) => (
                  <li key={a} className="flex items-center gap-2 text-sm">
                    <Check className="size-4 text-primary" /> {a}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold">Market interest</h3>
            <div className="mt-3 grid grid-cols-3 gap-4">
              <Metric label="Views this month" value={formatNumber(p.stats.views)} />
              <Metric label="Enquiries" value={formatNumber(p.stats.inquiries)} />
              <Metric label="Price trend" value={p.stats.trend} />
            </div>
          </section>

          {p.reraNumber && (
            <p className="text-xs text-muted-foreground">
              RERA: <span className="font-mono">{p.reraNumber}</span>
            </p>
          )}
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <BookVisitCard property={p} />
        </aside>
      </div>
    </Page>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function BookVisitCard({ property }: { property: Property }) {
  const addLead = useMutation(api.leads.addLead)
  const addSiteVisit = useMutation(api.crm.addSiteVisit)
  const addActivity = useMutation(api.activity.addActivity)
  const [form, setForm] = useState({ name: '', phone: '', email: '', date: '' })
  const [saving, setSaving] = useState(false)
  const [booked, setBooked] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const leadId = await addLead({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        project: property.name,
        score: 70,
        status: 'Site Visit Scheduled',
        source: 'Website',
        preferredLocation: property.location,
      })
      await addSiteVisit({
        leadId,
        date: form.date,
        time: '11:00',
        type: 'Physical',
        executive: 'Unassigned',
        cabRequired: false,
        interestLevel: 'Warm',
      })
      await addActivity({ message: `${form.name.trim()} booked a site visit for ${property.name} on ${form.date}`, time: nowTimeLabel() })
      setBooked(form.date)
      setForm({ name: '', phone: '', email: '', date: '' })
    } catch (err) {
      toast.error('Could not book the visit', { description: err instanceof Error ? err.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  if (booked) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center shadow-xs">
        <div className="mx-auto grid size-10 place-items-center rounded-full bg-success/12">
          <CalendarCheck className="size-5 text-success" />
        </div>
        <h3 className="mt-3 font-semibold">Visit requested</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          We'll call to confirm your visit on {new Date(booked).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => setBooked(null)}>
          Book another
        </Button>
      </div>
    )
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border bg-card p-5 shadow-xs">
      <div>
        <h3 className="font-semibold">Book a site visit</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">Free, no obligation. A sales advisor will confirm by phone.</p>
      </div>
      <Field label="Full name" htmlFor="bv-name">
        <Input id="bv-name" required value={form.name} onChange={set('name')} autoComplete="name" />
      </Field>
      <Field label="Phone" htmlFor="bv-phone">
        <Input id="bv-phone" type="tel" required value={form.phone} onChange={set('phone')} autoComplete="tel" />
      </Field>
      <Field label="Email" htmlFor="bv-email">
        <Input id="bv-email" type="email" required value={form.email} onChange={set('email')} autoComplete="email" />
      </Field>
      <Field label="Preferred date" htmlFor="bv-date">
        <Input id="bv-date" type="date" required min={todayISO()} value={form.date} onChange={set('date')} />
      </Field>
      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? 'Booking…' : 'Request visit'}
      </Button>
    </form>
  )
}

/** Hero that switches between the project photograph and its interactive 3D model. */
function ProjectHero({ p, preset, onTour }: { p: Property; preset: ReturnType<typeof presetFor>; onTour: () => void }) {
  const [mode, setMode] = useState<'photo' | '3d'>('photo')
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-xl border bg-muted sm:aspect-[21/9]">
      {mode === 'photo' ? (
        <img src={imageAt(p.image, 1800)} alt={p.name} className="size-full object-cover" />
      ) : (
        <Suspense fallback={<div className="grid size-full place-items-center text-xs uppercase tracking-[0.22em] text-muted-foreground">Loading 3D…</div>}>
          <PropertyViewer preset={preset} className="size-full" />
        </Suspense>
      )}

      <div className="absolute left-4 top-4 flex bg-background/90 p-1 text-xs shadow-sm backdrop-blur">
        {(['photo', '3d'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn('flex items-center gap-1.5 px-3 py-1.5', mode === m ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}
            aria-pressed={mode === m}
          >
            {m === 'photo' ? <ImageIcon className="size-3.5" /> : <Box className="size-3.5" />}
            {m === 'photo' ? 'Photo' : '3D model'}
          </button>
        ))}
      </div>

      <button
        onClick={onTour}
        className="group absolute bottom-4 right-4 flex items-center gap-3 bg-zinc-950/85 py-2 pl-2 pr-4 text-white shadow-lg backdrop-blur transition-colors hover:bg-zinc-950"
      >
        <span className="grid size-9 place-items-center bg-white text-zinc-900 transition-transform group-hover:scale-105">
          <PlayCircle className="size-5" />
        </span>
        <span className="text-left">
          <span className="block text-[10px] uppercase tracking-[0.22em] text-white/60">Virtual tour</span>
          <span className="block text-sm font-medium">Walk through {shortName(p.name)}</span>
        </span>
      </button>

      {mode === '3d' && (
        <p className="pointer-events-none absolute bottom-4 left-4 hidden bg-background/85 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur sm:block">
          Drag to orbit · scroll to zoom · illustrative model
        </p>
      )}
    </div>
  )
}
