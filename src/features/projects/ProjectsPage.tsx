import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from 'convex/react'
import { Building2, CalendarDays, MapPin, Search, X } from 'lucide-react'
import { api } from '@convex/_generated/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, Page, PageHeader } from '@/components/page'
import { formatINR } from '@/lib/format'
import { BUDGETS, bhkNumbers, imageAt, matches, statusVariant, type ProjectFilters, type Property } from './model'

const KEYS: (keyof ProjectFilters)[] = ['q', 'location', 'bhk', 'budget', 'status']

export default function ProjectsPage() {
  const properties = useQuery(api.properties.getProperties)
  const [params, setParams] = useSearchParams()

  // Filters live in the URL so a filtered list can be shared.
  const filters: ProjectFilters = {
    q: params.get('q') ?? '',
    location: params.get('location') ?? 'all',
    bhk: params.get('bhk') ?? 'all',
    budget: params.get('budget') ?? 'all',
    status: params.get('status') ?? 'all',
  }
  const set = (k: keyof ProjectFilters) => (v: string) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p)
        if (!v || v === 'all') n.delete(k)
        else n.set(k, v)
        return n
      },
      { replace: true },
    )
  const active = KEYS.some((k) => params.has(k))

  const options = useMemo(() => {
    const list = properties ?? []
    const uniq = (xs: string[]) => Array.from(new Set(xs)).sort()
    return {
      locations: uniq(list.map((p) => p.location)),
      statuses: uniq(list.map((p) => p.status)),
      bhks: Array.from(new Set(list.flatMap((p) => bhkNumbers(p.bhk)))).sort((a, b) => a - b),
    }
  }, [properties])

  const results = useMemo(() => (properties ?? []).filter((p) => matches(p, filters)), [properties, params]) // eslint-disable-line react-hooks/exhaustive-deps

  const all = (label: string, xs: string[]) => [{ value: 'all', label }, ...xs.map((x) => ({ value: x, label: x }))]

  return (
    <Page>
      <PageHeader
        title="Projects"
        description={
          properties
            ? `${properties.length} developments across ${options.locations.length} locations in Ahmedabad`
            : 'Developments across Ahmedabad'
        }
        actions={
          <Button variant="outline" asChild>
            <Link to="/compare">Compare projects</Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.q}
            onChange={(e) => set('q')(e.target.value)}
            placeholder="Search by project, area or developer"
            className="pl-8"
            aria-label="Search projects"
          />
        </div>
        <Select className="w-40" aria-label="Location" value={filters.location} onValueChange={set('location')} options={all('All locations', options.locations)} />
        <Select
          className="w-36"
          aria-label="Configuration"
          value={filters.bhk}
          onValueChange={set('bhk')}
          options={[{ value: 'all', label: 'Any BHK' }, ...options.bhks.map((n) => ({ value: String(n), label: `${n} BHK` }))]}
        />
        <Select className="w-40" aria-label="Budget" value={filters.budget} onValueChange={set('budget')} options={BUDGETS.map(({ value, label }) => ({ value, label }))} />
        <Select className="w-44" aria-label="Status" value={filters.status} onValueChange={set('status')} options={all('Any status', options.statuses)} />
        {active && (
          <Button variant="ghost" onClick={() => setParams({}, { replace: true })}>
            <X /> Clear
          </Button>
        )}
      </div>

      {properties === undefined ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border bg-card">
              <Skeleton className="aspect-[16/10] rounded-none" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            icon={Building2}
            title="No projects match these filters"
            description="Widen the budget or location to see more."
            action={
              <Button variant="outline" onClick={() => setParams({}, { replace: true })}>
                Clear filters
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {active && (
            <p className="-mt-2 text-sm text-muted-foreground">
              {results.length} of {properties.length} projects
            </p>
          )}
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((p) => (
              <ProjectCard key={p._id} p={p} />
            ))}
          </div>
        </>
      )}
    </Page>
  )
}

function ProjectCard({ p }: { p: Property }) {
  return (
    <Link
      to={`/projects/${p._id}`}
      className="group overflow-hidden rounded-xl border bg-card shadow-xs transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <img
          src={imageAt(p.image, 800)}
          alt=""
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <Badge variant={statusVariant(p.status)} className="absolute left-3 top-3 border-transparent bg-card/95 shadow-xs backdrop-blur">
          {p.status}
        </Badge>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <h3 className="truncate font-semibold">{p.name}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5" /> {p.location}, Ahmedabad
          </p>
        </div>
        <div className="flex items-end justify-between gap-3 border-t pt-3">
          <div>
            <div className="text-xs text-muted-foreground">Starting from</div>
            <div className="text-lg font-semibold tabular-nums">{formatINR(p.price)}</div>
          </div>
          <div className="text-right text-sm">
            <div className="font-medium">{p.bhk}</div>
            <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
              <CalendarDays className="size-3" />
              {p.completion === 'Ready' ? 'Ready now' : `Possession ${p.completion}`}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
