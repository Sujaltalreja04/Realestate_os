import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { formatINR } from '@/lib/format'
import { Input } from '@/components/ui/input'
import type { Property } from '@/features/projects/model'
import type { UnitView } from '@/features/client/units'
import { Missing, SourceBadge, FactList } from './provenance'
import { countBuildingsAround, fetchPoisAround, POI_META, type LngLat, type OsmPoi, type PoiCategory } from './osm'
import { fmtKm, fmtMin, haversineKm, routeBetween, type Route } from './geo'
import { KEY_DESTINATIONS, LOCALITY_COORDS } from './places'
import type { Described, Selection } from './describe'

const shortName = (n: string) => n.replace(/^Ai RealEstate OS /, '')

function Section({ title, source, children }: { title: string; source?: Parameters<typeof SourceBadge>[0]['source']; children: React.ReactNode }) {
  return (
    <section className="border-t px-5 py-4 first:border-t-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{title}</h4>
        {source && <SourceBadge source={source} />}
      </div>
      {children}
    </section>
  )
}

/* ── Location intelligence ─────────────────────────────────────── */

export function LocationIntel({ d, projects }: { d: Described; projects: Property[] }) {
  const [pois, setPois] = useState<OsmPoi[] | null>(null)
  const [buildings, setBuildings] = useState<number | null>(null)
  const [osmError, setOsmError] = useState(false)
  const [routes, setRoutes] = useState<Record<string, Route>>({})
  // Key on the coordinates text: the array itself is a new object every render.
  const key = `${d.center[0].toFixed(5)},${d.center[1].toFixed(5)}`

  useEffect(() => {
    let live = true
    setRoutes({})
    setPois(null)
    setBuildings(null)
    setOsmError(false)
    fetchPoisAround(d.center, 3000).then(
      (p) => live && setPois(p),
      () => live && (setOsmError(true), setPois([])),
    )
    countBuildingsAround(d.center, 1000).then(
      (n) => live && setBuildings(n),
      () => live && setBuildings(-1),
    )
    const dests = KEY_DESTINATIONS.filter((k) => haversineKm(k.center, d.center) > 0.8)
    Promise.all(dests.map(async (k) => [k.name, await routeBetween(d.center, k.center)] as const)).then((rs) => live && setRoutes(Object.fromEntries(rs)))
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const nearest = useMemo(() => {
    if (!pois) return []
    const by = new Map<PoiCategory, { poi: OsmPoi; km: number; count1: number; count3: number }>()
    for (const p of pois) {
      const km = haversineKm(d.center, p.center)
      const cur = by.get(p.category)
      const entry = cur ?? { poi: p, km, count1: 0, count3: 0 }
      if (km < entry.km) Object.assign(entry, { poi: p, km })
      if (km <= 1) entry.count1++
      entry.count3++
      by.set(p.category, entry)
    }
    return [...by.entries()].sort((a, b) => a[1].km - b[1].km)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pois, key])

  const nearbyProjects = projects
    .map((p) => ({ p, c: LOCALITY_COORDS[p.location]?.center }))
    .filter((x): x is { p: Property; c: LngLat } => !!x.c)
    .map((x) => ({ ...x, km: haversineKm(d.center, x.c) }))
    .filter((x) => x.km > 0.05 && x.km < 15)
    .sort((a, b) => a.km - b.km)

  return (
    <div>
      <Section title="Connectivity" source="estimate">
        <ul className="space-y-2.5 text-sm">
          {KEY_DESTINATIONS.filter((k) => haversineKm(k.center, d.center) > 0.8).map((k) => {
            const r = routes[k.name]
            return (
              <li key={k.name} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate">{k.name}</span>
                {r ? (
                  <span className="shrink-0 tabular-nums">
                    {fmtKm(r.km)} · <span className="font-medium">{fmtMin(r.min)}</span>
                  </span>
                ) : (
                  <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                )}
              </li>
            )
          })}
        </ul>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {Object.values(routes).some((r) => r.method === 'straight')
            ? 'Some times use a straight-line estimate (×1.35 road factor, 28 km/h) because the routing service was unavailable.'
            : 'Road route via OSRM on OpenStreetMap roads. Driving time without live traffic.'}
        </p>
      </Section>

      <Section title="Nearest amenities" source="verified">
        {pois === null ? (
          <Loading />
        ) : osmError ? (
          <OsmDown />
        ) : nearest.length === 0 ? (
          <Missing>No mapped amenities within 3 km</Missing>
        ) : (
          <ul className="space-y-2 text-sm">
            {nearest.map(([cat, n]) => (
              <li key={cat} className="grid grid-cols-[auto_1fr_auto] items-baseline gap-2">
                <span className="mt-1 size-2 rounded-full" style={{ background: POI_META[cat].color }} />
                <span className="min-w-0">
                  <span className="block truncate">{n.poi.name ?? POI_META[cat].label}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {POI_META[cat].label} · {n.count1} within 1 km · {n.count3} within 3 km
                  </span>
                </span>
                <span className="tabular-nums text-muted-foreground">{fmtKm(n.km)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">Places from OpenStreetMap; distances are straight-line (estimate).</p>
      </Section>

      <Section title="Surrounding development">
        <FactList
          facts={[
            {
              label: 'Buildings within 1 km',
              value: buildings === null ? <Loading /> : buildings < 0 ? <Missing>OSM unavailable</Missing> : buildings.toLocaleString('en-IN'),
              source: 'verified',
              note: 'Mapped building outlines; coverage varies by area.',
            },
            {
              label: 'Platform projects within 15 km',
              value: nearbyProjects.length ? nearbyProjects.map((x) => `${shortName(x.p.name)} (${fmtKm(x.km)})`).join(', ') : 'None',
              source: 'platform',
              note: 'Distances to locality centres (approximate).',
            },
          ]}
        />
      </Section>
    </div>
  )
}

/* ── Investment intelligence ───────────────────────────────────── */

export function InvestmentIntel({ sel, d, projects, units }: { sel: Selection; d: Described; projects: Property[]; units: UnitView[] }) {
  // Price per sq.ft from listed units, grouped by project.
  const psf = useMemo(() => {
    const m = new Map<string, number[]>()
    for (const u of units) if (u.project && u.pricePerSqft) m.set(u.project._id, [...(m.get(u.project._id) ?? []), u.pricePerSqft])
    return m
  }, [units])
  const stats = (id: string) => {
    const xs = psf.get(id)
    if (!xs?.length) return null
    return { avg: xs.reduce((a, b) => a + b, 0) / xs.length, min: Math.min(...xs), max: Math.max(...xs), n: xs.length }
  }

  const comparables = projects
    .map((p) => ({ p, c: LOCALITY_COORDS[p.location]?.center, s: stats(p._id) }))
    .filter((x): x is { p: Property; c: LngLat; s: NonNullable<ReturnType<typeof stats>> } => !!x.c && !!x.s)
    .map((x) => ({ ...x, km: haversineKm(d.center, x.c) }))
    .sort((a, b) => a.km - b.km)

  if (sel.kind === 'project') {
    const p = sel.property
    const s = stats(p._id)
    const typical = units.filter((u) => u.project?._id === p._id && u.unit.price && u.unit.area)
    return (
      <div>
        <Section title="Valuation">
          <FactList
            facts={[
              { label: 'Starting price', value: formatINR(p.price), source: 'platform' },
              {
                label: 'Price per sq.ft',
                value: s ? `₹${Math.round(s.avg).toLocaleString('en-IN')} avg` : null,
                source: s ? 'estimate' : 'platform',
                note: s ? `Mean of ${s.n} listed units (₹${s.min.toLocaleString('en-IN')}–₹${s.max.toLocaleString('en-IN')}). Unit prices ÷ carpet area.` : 'No unit areas listed.',
              },
              { label: 'Price history', value: <Missing>No historical price data recorded</Missing>, source: 'platform' },
              {
                label: 'Buyer demand',
                value: `${p.stats.views.toLocaleString('en-IN')} views · ${p.stats.inquiries} enquiries (${p.stats.trend})`,
                source: 'platform',
                note: 'Listing engagement, not a price trend.',
              },
            ]}
          />
        </Section>
        <Comparables rows={comparables.filter((c) => c.p._id !== p._id)} />
        {typical[0] && <YieldCalculator price={Math.round(typical.reduce((a, u) => a + u.unit.price!, 0) / typical.length)} />}
      </div>
    )
  }

  if (sel.kind === 'demo-parcel') {
    const pc = sel.parcel
    return (
      <div>
        <Section title="Development potential" source="estimate">
          <FactList
            facts={[
              { label: 'Plot area', value: `${pc.areaSqm.toLocaleString('en-IN')} m²`, source: 'demo' },
              { label: 'FAR', value: pc.far, source: 'demo' },
              { label: 'Max built-up', value: `${Math.round(pc.areaSqm * pc.far).toLocaleString('en-IN')} m²`, source: 'estimate', note: 'Area × FAR.' },
              {
                label: 'Saleable (approx.)',
                value: `${Math.round(pc.areaSqm * pc.far * 10.7639 * 0.7).toLocaleString('en-IN')} sq.ft`,
                source: 'estimate',
                note: 'Assumes 70% efficiency (carpet ÷ built-up).',
              },
              { label: 'Land value', value: <Missing>Not shown (no verified price)</Missing>, source: 'demo' },
            ]}
          />
        </Section>
        <Comparables rows={comparables} context />
      </div>
    )
  }

  return (
    <div>
      <Section title="Valuation">
        <p className="text-sm text-muted-foreground">
          No verified valuation, rent or transaction data is available for this {d.kindLabel.toLowerCase()}. Nearby listings on the platform are shown for context only.
        </p>
      </Section>
      <Comparables rows={comparables} context />
    </div>
  )
}

function Comparables({ rows, context }: { rows: { p: Property; km: number; s: { avg: number; n: number } }[]; context?: boolean }) {
  return (
    <Section title={context ? 'Nearest platform listings' : 'Comparable projects'} source="platform">
      {rows.length === 0 ? (
        <Missing>No comparable listings</Missing>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-muted-foreground">
              <th className="pb-2 font-normal">Project</th>
              <th className="pb-2 text-right font-normal">₹/sq.ft</th>
              <th className="pb-2 text-right font-normal">From</th>
              <th className="pb-2 text-right font-normal">Distance</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 4).map((r) => (
              <tr key={r.p._id} className="border-t">
                <td className="py-2">{shortName(r.p.name)}</td>
                <td className="py-2 text-right tabular-nums">₹{Math.round(r.s.avg).toLocaleString('en-IN')}</td>
                <td className="py-2 text-right tabular-nums">{formatINR(r.p.price)}</td>
                <td className="py-2 text-right tabular-nums text-muted-foreground">{fmtKm(r.km)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground">₹/sq.ft averaged from listed units; distances between locality centres.</p>
    </Section>
  )
}

/** Rental yield & ROI from the user's own assumptions — never presented as market data. */
function YieldCalculator({ price }: { price: number }) {
  const [rent, setRent] = useState('')
  const [appr, setAppr] = useState('5')
  const [years, setYears] = useState('5')
  const r = Number(rent)
  const a = Number(appr) / 100
  const y = Math.max(1, Number(years) || 5)
  const gross = r > 0 ? ((r * 12) / price) * 100 : null
  const net = r > 0 ? ((r * 12 * 0.8) / price) * 100 : null
  const value = price * Math.pow(1 + a, y)
  const roi = r > 0 ? ((value - price + r * 12 * 0.8 * y) / price) * 100 : ((value - price) / price) * 100

  return (
    <Section title="Rental yield & ROI" source="estimate">
      <p className="mb-3 text-[11px] text-muted-foreground">
        No verified rent data is available. Enter your own assumptions; results are calculated from them, on an average unit price of {formatINR(price)}.
      </p>
      <div className="grid grid-cols-3 gap-2">
        <label className="text-[11px] text-muted-foreground">
          Rent / month (₹)
          <Input inputMode="numeric" placeholder="e.g. 45000" value={rent} onChange={(e) => setRent(e.target.value.replace(/\D/g, ''))} className="mt-1 h-8" />
        </label>
        <label className="text-[11px] text-muted-foreground">
          Appreciation %/yr
          <Input inputMode="decimal" value={appr} onChange={(e) => setAppr(e.target.value)} className="mt-1 h-8" />
        </label>
        <label className="text-[11px] text-muted-foreground">
          Years held
          <Input inputMode="numeric" value={years} onChange={(e) => setYears(e.target.value.replace(/\D/g, ''))} className="mt-1 h-8" />
        </label>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Metric label="Gross yield" value={gross != null ? `${gross.toFixed(2)}%` : '—'} />
        <Metric label="Net yield" value={net != null ? `${net.toFixed(2)}%` : '—'} />
        <Metric label={`${y}-yr ROI`} value={`${roi.toFixed(0)}%`} />
      </dl>
      <p className="mt-2 text-[11px] text-muted-foreground">Net assumes 20% of rent goes to maintenance, vacancy and tax. ROI = appreciation + net rent, before loan costs.</p>
    </Section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/60 px-2 py-2">
      <dd className="font-semibold tabular-nums">{value}</dd>
      <dt className="text-[10px] text-muted-foreground">{label}</dt>
    </div>
  )
}

function Loading() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Loader2 className="size-3.5 animate-spin" /> Loading…
    </span>
  )
}

function OsmDown() {
  return (
    <p className="flex items-start gap-2 text-xs text-muted-foreground">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
      OpenStreetMap servers are busy right now. Try again in a minute.
    </p>
  )
}
