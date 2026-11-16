import { useMemo, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowUpRight, BedDouble, Building2, Check, Compass, Layers3, MapPin, Plus, Ruler, Trophy, X } from 'lucide-react'
import { ClientContainer, ClientPageHeader } from '@/components/marketing'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatINR } from '@/lib/format'
import { cn } from '@/lib/utils'
import { imageAt } from '@/features/projects/model'
import { useUnits, type UnitView } from './units'

const MAX = 3

interface Row {
  label: string
  value: (u: UnitView) => ReactNode
  /** Numeric value used to find the best home in this row. */
  metric?: (u: UnitView) => number | undefined
  better?: 'low' | 'high'
}
interface RowGroup {
  title: string
  rows: Row[]
}

const GROUPS: RowGroup[] = [
  {
    title: 'Price & value',
    rows: [
      { label: 'Price', value: (u) => formatINR(u.unit.price, { compact: false }), metric: (u) => u.unit.price, better: 'low' },
      { label: 'Price per sq.ft', value: (u) => (u.pricePerSqft ? `₹${u.pricePerSqft.toLocaleString('en-IN')}` : '—'), metric: (u) => u.pricePerSqft, better: 'low' },
    ],
  },
  {
    title: 'Space',
    rows: [
      { label: 'Configuration', value: (u) => u.unit.type },
      { label: 'Carpet area', value: (u) => (u.unit.area ? `${u.unit.area.toLocaleString('en-IN')} sq.ft` : '—'), metric: (u) => u.unit.area, better: 'high' },
      { label: 'Floor', value: (u) => `${u.unit.floor}`, metric: (u) => u.unit.floor, better: 'high' },
      { label: 'Facing', value: (u) => u.unit.facing ?? '—' },
      { label: 'Views', value: (u) => u.unit.views.join(', ') || '—' },
    ],
  },
  {
    title: 'Project',
    rows: [
      { label: 'Location', value: (u) => (u.project ? `${u.project.location}, Ahmedabad` : '—') },
      { label: 'Construction', value: (u) => u.unit.constructionStatus ?? u.project?.status ?? '—' },
      { label: 'Possession', value: (u) => (u.project?.completion === 'Ready' ? 'Ready now' : (u.project?.completion ?? '—')) },
      { label: 'Amenities', value: (u) => (u.project?.amenities ?? []).slice(0, 4).join(', ') || '—' },
      { label: 'Unit features', value: (u) => u.unit.amenities?.join(', ') || '—' },
    ],
  },
]
const ALL_ROWS = GROUPS.flatMap((g) => g.rows)

/** Best-value available home from each of up to three different projects. */
function defaultPicks(units: UnitView[]) {
  const best = new Map<string, UnitView>()
  for (const u of units) {
    if (u.unit.status !== 'Available' || !u.pricePerSqft) continue
    const cur = best.get(u.projectName)
    if (!cur || u.pricePerSqft < cur.pricePerSqft!) best.set(u.projectName, u)
  }
  return [...best.values()].sort((a, b) => (a.unit.price ?? 0) - (b.unit.price ?? 0)).slice(0, MAX)
}

export default function ComparePage() {
  const { units } = useUnits()
  const [params, setParams] = useSearchParams()
  const ids = (params.get('units') ?? '').split(',').filter(Boolean).slice(0, MAX)

  const selected = useMemo(() => {
    if (!units) return []
    const chosen = ids.map((id) => units.find((u) => u.unit._id === id)).filter((u): u is UnitView => !!u)
    return chosen.length ? chosen : defaultPicks(units)
  }, [units, ids.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  const current = selected.map((u) => u.unit._id as string)
  const setIds = (next: string[]) => setParams(next.length ? { units: next.join(',') } : {}, { replace: true })

  const bestOf = (row: Row) => {
    if (!row.metric || selected.length < 2) return undefined
    const vals = selected.map(row.metric).filter((v): v is number => v != null)
    if (vals.length < 2 || new Set(vals).size === 1) return undefined
    return row.better === 'low' ? Math.min(...vals) : Math.max(...vals)
  }
  const wins = (u: UnitView) => ALL_ROWS.filter((r) => r.metric && bestOf(r) != null && r.metric(u) === bestOf(r)).map((r) => r.label)

  // Picker grouped by project so it's easy to compare across developments.
  const options = (units ?? [])
    .filter((u) => !current.includes(u.unit._id) && u.unit.status === 'Available')
    .sort((a, b) => a.projectName.localeCompare(b.projectName) || (a.unit.price ?? 0) - (b.unit.price ?? 0))
    .map((u) => ({ value: u.unit._id as string, label: `${u.projectName} · ${u.unit.type} · ${u.unit.tower} ${u.unit.unit} · ${formatINR(u.unit.price)}` }))

  const cols = `minmax(150px,200px) repeat(${selected.length + (selected.length < MAX ? 1 : 0)}, minmax(220px,1fr))`

  return (
    <>
      <ClientPageHeader
        eyebrow="Compare"
        title={
          <>
            Side by side, <em>honestly.</em>
          </>
        }
        description="Up to three homes across projects. The better figure in each row is marked, so the trade-offs are obvious."
      />
      <ClientContainer>
        {units === undefined ? (
          <Skeleton className="h-[640px] rounded-2xl" />
        ) : (
          <div className="overflow-x-auto rounded-2xl border bg-card font-sans shadow-sm" data-lenis-prevent>
            <div className="min-w-[760px]">
              {/* Home cards */}
              <div className="grid border-b" style={{ gridTemplateColumns: cols }}>
                <div className="flex flex-col justify-end p-5">
                  <p className="text-sm font-semibold">{selected.length} homes</p>
                  <p className="mt-1 text-xs text-muted-foreground">Best value in each row is highlighted.</p>
                </div>
                {selected.map((u) => {
                  const w = wins(u)
                  return (
                    <div key={u.unit._id} className="border-l p-4">
                      <div className="relative overflow-hidden rounded-xl bg-muted">
                        <img src={imageAt(u.project?.image ?? '', 720)} alt={u.projectName} className="aspect-[16/10] w-full object-cover" />
                        <button
                          onClick={() => setIds(current.filter((id) => id !== u.unit._id))}
                          className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition-colors hover:bg-black/75"
                          aria-label={`Remove ${u.label}`}
                        >
                          <X className="size-4" />
                        </button>
                        {u.project && (
                          <span className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-medium text-zinc-900 shadow-sm">{u.project.status}</span>
                        )}
                      </div>
                      <div className="mt-4 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold tracking-tight">{u.projectName}</p>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="size-3" /> {u.project?.location ?? '—'} · {u.unit.tower}, unit {u.unit.unit}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight">{formatINR(u.unit.price)}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                        <Spec icon={BedDouble}>{u.unit.type}</Spec>
                        {u.unit.area && <Spec icon={Ruler}>{u.unit.area.toLocaleString('en-IN')} sq.ft</Spec>}
                        <Spec icon={Layers3}>Floor {u.unit.floor}</Spec>
                        {u.unit.facing && <Spec icon={Compass}>{u.unit.facing}</Spec>}
                      </div>
                      {w.length > 0 && (
                        <p className="mt-3 flex items-start gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                          <Trophy className="mt-px size-3.5 shrink-0" /> Best on {w.join(', ').toLowerCase()}
                        </p>
                      )}
                      {u.project && (
                        <Link to={`/projects/${u.project._id}`} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline">
                          View project <ArrowUpRight className="size-3.5" />
                        </Link>
                      )}
                    </div>
                  )
                })}
                {selected.length < MAX && (
                  <div className="flex flex-col border-l p-4">
                    <div className="grid aspect-[16/10] place-items-center rounded-xl border-2 border-dashed text-muted-foreground">
                      <span className="flex flex-col items-center gap-2 text-sm">
                        <Plus className="size-5" /> Add a home
                      </span>
                    </div>
                    <Select className="mt-4" aria-label="Add a home" placeholder="Choose a home…" onValueChange={(id) => setIds([...current, id])} options={options} />
                    <p className="mt-2 text-xs text-muted-foreground">Available homes, grouped by project.</p>
                  </div>
                )}
              </div>

              {/* Rows */}
              {GROUPS.map((g) => (
                <div key={g.title}>
                  <div className="flex items-center gap-2 border-b bg-muted/40 px-5 py-2.5 text-xs font-semibold text-muted-foreground">
                    {g.title === 'Project' ? <Building2 className="size-3.5" /> : null}
                    {g.title}
                  </div>
                  {g.rows.map((row) => {
                    const b = bestOf(row)
                    return (
                      <div key={row.label} className="grid border-b last:border-b-0 hover:bg-muted/30" style={{ gridTemplateColumns: cols }}>
                        <div className="px-5 py-3.5 text-sm text-muted-foreground">{row.label}</div>
                        {selected.map((u) => {
                          const win = b != null && row.metric?.(u) === b
                          return (
                            <div key={u.unit._id} className={cn('border-l px-4 py-3.5 text-sm tabular-nums', win && 'bg-emerald-500/[0.07]')}>
                              <span className={cn(win && 'font-semibold')}>{row.value(u)}</span>
                              {win && (
                                <span className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-emerald-600 px-1.5 py-px align-middle text-[10px] font-medium text-white">
                                  <Check className="size-2.5" /> Best
                                </span>
                              )}
                            </div>
                          )
                        })}
                        {selected.length < MAX && <div className="border-l" />}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </ClientContainer>
    </>
  )
}

function Spec({ icon: Icon, children }: { icon: typeof BedDouble; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-muted-foreground">
      <Icon className="size-3.5" />
      {children}
    </span>
  )
}
