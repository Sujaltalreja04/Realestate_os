import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Columns3, SearchX } from 'lucide-react'
import { ClientContainer, ClientPageHeader } from '@/components/marketing'
import { ImageReveal } from '@/components/motion'
import { Skeleton } from '@/components/ui/skeleton'
import { formatINR } from '@/lib/format'
import { cn } from '@/lib/utils'
import { imageAt, srcSetFor } from '@/features/projects/model'
import { useUnits, type UnitView } from './units'

const BUDGET_STEPS = [1e7, 1.5e7, 2e7, 2.5e7, 3e7, 4e7, 6e7]
const PURPOSES = ['Live in', 'Invest', 'Either'] as const
const FACINGS = ['Any', 'East', 'North', 'West', 'South'] as const

interface Prefs {
  budget: number
  bhk: number[]
  readyOnly: boolean
  purpose: (typeof PURPOSES)[number]
  facing: (typeof FACINGS)[number]
}

/** 0–100 fit score with the reasons behind it, so the ranking is explainable. */
function score(u: UnitView, p: Prefs): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let s = 40
  const price = u.unit.price ?? Infinity
  if (price <= p.budget) {
    s += 25
    reasons.push(`Within budget, ${formatINR(p.budget - price)} to spare`)
  } else {
    s -= Math.min(35, ((price - p.budget) / p.budget) * 100)
  }
  if (p.bhk.length === 0 || p.bhk.includes(u.bhk)) {
    s += 15
    if (p.bhk.length) reasons.push(`${u.bhk} BHK as requested`)
  }
  const ready = u.project?.status === 'Ready to Move'
  if (p.readyOnly && !ready) s -= 25
  if (ready) reasons.push('Ready to move in')
  if (p.facing !== 'Any' && u.unit.facing === p.facing) {
    s += 10
    reasons.push(`${p.facing}-facing`)
  }
  if (p.purpose === 'Invest' && u.pricePerSqft && u.pricePerSqft < 11000) {
    s += 10
    reasons.push('Below-average price per sq.ft')
  }
  if (u.unit.views.length) reasons.push(`${u.unit.views[0]} view`)
  return { score: Math.max(0, Math.min(100, Math.round(s))), reasons: reasons.slice(0, 3) }
}

export default function FinderPage() {
  const { units } = useUnits()
  const [prefs, setPrefs] = useState<Prefs>({ budget: 2.5e7, bhk: [], readyOnly: false, purpose: 'Either', facing: 'Any' })
  const set = <K extends keyof Prefs>(k: K, v: Prefs[K]) => setPrefs((p) => ({ ...p, [k]: v }))

  const results = useMemo(
    () =>
      (units ?? [])
        .filter((u) => u.unit.status === 'Available')
        .map((u) => ({ u, ...score(u, prefs) }))
        .filter((r) => r.score >= 45)
        .sort((a, b) => b.score - a.score),
    [units, prefs],
  )

  const compareHref = `/compare?units=${results
    .slice(0, 3)
    .map((r) => r.u.unit._id)
    .join(',')}`

  return (
    <>
      <ClientPageHeader
        eyebrow="Find a home"
        title={
          <>
            Tell us how you <em>live.</em>
          </>
        }
        description="Set a budget and a few preferences. We rank every available home by how well it fits, and tell you why."
      />
      <ClientContainer>
        <div className="grid gap-10 lg:grid-cols-[340px_1fr] lg:gap-16">
          <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start">
            <Pref label="Budget" value={`Up to ${formatINR(prefs.budget)}`}>
              <input
                type="range"
                min={0}
                max={BUDGET_STEPS.length - 1}
                value={BUDGET_STEPS.indexOf(prefs.budget)}
                onChange={(e) => set('budget', BUDGET_STEPS[+e.target.value]!)}
                className="w-full accent-[var(--brand)]"
                aria-label="Budget"
              />
              <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                <span>₹1 Cr</span>
                <span>₹6 Cr</span>
              </div>
            </Pref>
            <Pref label="Bedrooms">
              <Chips
                options={[2, 3, 4].map((n) => ({ value: n, label: `${n} BHK` }))}
                selected={prefs.bhk}
                onToggle={(n) => set('bhk', prefs.bhk.includes(n) ? prefs.bhk.filter((x) => x !== n) : [...prefs.bhk, n])}
              />
            </Pref>
            <Pref label="Buying to">
              <Chips options={PURPOSES.map((p) => ({ value: p, label: p }))} selected={[prefs.purpose]} onToggle={(v) => set('purpose', v)} />
            </Pref>
            <Pref label="Facing">
              <Chips options={FACINGS.map((f) => ({ value: f, label: f }))} selected={[prefs.facing]} onToggle={(v) => set('facing', v)} />
            </Pref>
            <label className="flex cursor-pointer items-center justify-between gap-4 border-t pt-6 text-sm">
              Ready to move only
              <input type="checkbox" checked={prefs.readyOnly} onChange={(e) => set('readyOnly', e.target.checked)} className="size-4 accent-[var(--brand)]" />
            </label>
          </aside>

          <section aria-live="polite">
            <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4 border-b pb-4">
              <p className="text-sm text-muted-foreground">
                {units === undefined ? 'Finding homes…' : `${results.length} home${results.length === 1 ? '' : 's'} match`}
              </p>
              {results.length >= 2 && (
                <Link to={compareHref} className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] hover:text-brand">
                  <Columns3 className="size-4" /> Compare top {Math.min(3, results.length)}
                </Link>
              )}
            </div>
            {units === undefined ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }, (_, i) => (
                  <Skeleton key={i} className="h-44 rounded-none" />
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="py-20 text-center">
                <SearchX className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-4 font-display text-3xl">Nothing fits just yet</p>
                <p className="mt-2 text-sm text-muted-foreground">Try a higher budget or fewer filters.</p>
              </div>
            ) : (
              <ol className="space-y-4">
                {results.map(({ u, score, reasons }, i) => (
                  <li key={u.unit._id} className="grid gap-5 border bg-card p-4 sm:grid-cols-[200px_1fr] md:p-5">
                    <ImageReveal
                      src={imageAt(u.project?.image ?? u.unit.floorPlan ?? '', 640)}
                      srcSet={srcSetFor(u.project?.image ?? '', [400, 640])}
                      sizes="200px"
                      className="aspect-[4/3] sm:aspect-auto sm:h-full"
                    />
                    <div className="flex flex-col">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                            #{i + 1} · {u.projectName} · {u.unit.tower} · Floor {u.unit.floor}
                          </p>
                          <h3 className="mt-2 font-display text-3xl">
                            {u.unit.type}, unit {u.unit.unit}
                          </h3>
                        </div>
                        <div className="text-right">
                          <div className="font-display text-4xl text-brand">{score}%</div>
                          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">fit</div>
                        </div>
                      </div>
                      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                        {reasons.map((r) => (
                          <li key={r} className="flex items-center gap-1.5">
                            <Check className="size-3.5 text-brand" /> {r}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-auto flex flex-wrap items-end justify-between gap-4 border-t pt-4 mt-5">
                        <div className="flex gap-8 text-sm">
                          <Fact label="Price" value={formatINR(u.unit.price)} />
                          <Fact label="Area" value={u.unit.area ? `${u.unit.area.toLocaleString('en-IN')} sq.ft` : '—'} />
                          <Fact label="Facing" value={u.unit.facing ?? '—'} />
                        </div>
                        {u.project && (
                          <Link
                            to={`/projects/${u.project._id}`}
                            className="group inline-flex items-center gap-2 border-b border-foreground pb-0.5 text-xs font-medium uppercase tracking-[0.2em]"
                          >
                            View project <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </ClientContainer>
    </>
  )
}

function Pref({ label, value, children }: { label: string; value?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{label}</span>
        {value && <span className="font-display text-xl">{value}</span>}
      </div>
      {children}
    </div>
  )
}

function Chips<T extends string | number>({
  options,
  selected,
  onToggle,
}: {
  options: { value: T; label: string }[]
  selected: T[]
  onToggle: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o.value)
        return (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(o.value)}
            className={cn(
              'border px-3.5 py-2 text-sm transition-colors',
              on ? 'border-primary bg-primary text-primary-foreground' : 'hover:border-foreground/40',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium tabular-nums">{value}</div>
    </div>
  )
}
