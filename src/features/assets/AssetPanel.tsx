import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Box, Building2, ChevronRight, ExternalLink, Footprints, Layers3, Loader2, MapPin, Pencil, Search, Smartphone, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchAreas, type OsmArea } from '@/features/map/osm'
import { fmtKm, haversineKm } from '@/features/map/geo'
import { AssetAssistant } from './AssetAssistant'
import { OpenMedia } from './MediaControls'
import { assetContext, STATUS_META, useAssets, type Asset, type Unit } from './store'

// three.js is only downloaded when someone walks inside or starts AR.
const FloorInterior = lazy(() => import('./FloorInterior'))

const floorName = (f: number) => (f === 0 ? 'Ground floor' : f < 0 ? `Basement ${-f}` : `Floor ${f}`)
const floorShort = (f: number) => (f === 0 ? 'G' : f < 0 ? `B${-f}` : String(f))
const byUnit = (a: Unit, b: Unit) => a.unit.localeCompare(b.unit, 'en', { numeric: true })

/** Real buildings and roads around an asset (OpenStreetMap), plus a distance-sorted list of named neighbours. */
export function useAssetSurroundings(asset: Asset, assets: Asset[]) {
  const [areas, setAreas] = useState<OsmArea[] | null>(null)
  const [areasState, setAreasState] = useState<'loading' | 'ok' | 'error'>('loading')

  // Real surroundings from OpenStreetMap (cached per session by osm.ts).
  useEffect(() => {
    let live = true
    setAreasState('loading')
    const [lng, lat] = asset.center
    fetchAreas({ s: lat - 0.0042, w: lng - 0.0046, n: lat + 0.0042, e: lng + 0.0046 })
      .then((a) => live && (setAreas(a), setAreasState('ok')))
      .catch(() => live && setAreasState('error'))
    return () => {
      live = false
    }
  }, [asset.center])

  const others = useMemo(() => assets.filter((a) => a.id !== asset.id), [assets, asset.id])

  const nearby = useMemo(() => {
    const list: { name: string; distanceM: number; heightM: number; type: string }[] = []
    for (const a of areas ?? []) {
      if (a.kind !== 'building' || !a.name) continue
      const d = haversineKm(asset.center, a.center) * 1000
      if (d < 25) continue
      const lv = Number(a.tags['building:levels'])
      list.push({ name: a.name, distanceM: d, heightM: Number(a.tags.height) || (lv ? lv * 3.2 : 7), type: a.tags.building === 'yes' ? 'building' : a.tags.building ?? 'building' })
    }
    for (const o of others) {
      const d = haversineKm(asset.center, o.center) * 1000
      if (d < 2000) list.push({ name: `${o.name} (in register)`, distanceM: d, heightM: 4.8 + o.floors * 3.8, type: o.kind })
    }
    return list.sort((a, b) => a.distanceM - b.distanceM)
  }, [areas, others, asset.center])
  return { areas, areasState, nearby, others }
}

export const unitCounts = (asset: Asset) => {
  const m = new Map<number, number>()
  for (const u of asset.units) m.set(u.floor, (m.get(u.floor) ?? 0) + 1)
  return m
}

interface PanelProps {
  asset: Asset
  assets: Asset[]
  selected: number | null
  onSelect: (f: number | null) => void
  hovered: number | null
  onHover: (f: number | null) => void
  nearby: { name: string; distanceM: number; heightM: number; type: string }[]
  areasState: 'loading' | 'ok' | 'error'
  onClose?: () => void
  /** Extra controls shown under the header (e.g. view mode on the map). */
  toolbar?: ReactNode
  /** Office highlighted from the 3D view (clicked label or block). */
  focusUnitId?: string | null
  onFocusUnit?: (id: string | null) => void
  className?: string
}

/** Floor directory, AI assistant and details for one asset. Used beside the 3D viewer and on the live map. */
export function AssetPanel({ asset, assets, selected, onSelect: setSelected, hovered, onHover: setHovered, nearby, areasState, onClose, toolbar, className, focusUnitId, onFocusUnit }: PanelProps) {
  // Bring the office picked in 3D into view in the list.
  useEffect(() => {
    if (!focusUnitId) return
    setTab('floors')
    const t = setTimeout(() => document.getElementById('unit-row-' + focusUnitId)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 60)
    return () => clearTimeout(t)
  }, [focusUnitId])
  const [tab, setTab] = useState<'floors' | 'ai' | 'about'>('floors')
  const [q, setQ] = useState('')
  const [walk, setWalk] = useState<number | null>(null)
  const [ar, setAr] = useState<'idle' | 'starting' | 'on' | 'unsupported'>('idle')
  const counts = useMemo(() => unitCounts(asset), [asset])
  async function startAr() {
    setAr('starting')
    try {
      const m = await import('./buildingAR')
      if (!(await m.arSupported())) return setAr('unsupported')
      await m.startBuildingAR(asset, () => setAr('idle'))
      setAr('on')
    } catch {
      setAr('unsupported')
    }
  }
  const floorUnits = useMemo(() => (selected == null ? [] : asset.units.filter((u) => u.floor === selected).sort(byUnit)), [asset.units, selected])
  const context = useMemo(() => assetContext(asset, assets, nearby), [asset, assets, nearby])
  const query = q.trim().toLowerCase()
  const matches = query ? asset.units.filter((u) => `${u.unit} ${u.occupant ?? ''} ${u.owner ?? ''}`.toLowerCase().includes(query)).slice(0, 30) : []
  const floorsDesc = Array.from({ length: asset.floors + 1 }, (_, i) => asset.floors - i)
  const totalArea = asset.units.reduce((s, u) => s + (u.areaSqft ?? 0), 0)

  return (
      <aside className={cn('flex min-h-0 flex-col bg-background', className)}>
        <header className="shrink-0 border-b px-5 pb-3 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                <Building2 className="size-3.5" /> {asset.kind} asset{asset.status ? ` · ${asset.status}` : ''}
              </p>
              <h2 className="mt-1 font-display text-3xl leading-tight">{asset.name}</h2>
              {asset.address && <p className="text-sm text-muted-foreground">{asset.address}</p>}
            </div>
            <div className="flex shrink-0 gap-1">
              <Link to={`/sales/assets?id=${encodeURIComponent(asset.id)}`} className="grid size-8 place-items-center rounded-md hover:bg-accent" title="Edit in admin" aria-label="Edit in admin">
                <Pencil className="size-4" />
              </Link>
              {onClose && (
                <button onClick={onClose} className="grid size-8 place-items-center rounded-md hover:bg-accent" aria-label="Close">
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <Fact label="Floors" value={`${asset.basements ? `B${asset.basements} + ` : ''}G + ${asset.floors}`} />
            <Fact label="Offices" value={`${asset.units.length}${totalArea ? ` · ${Math.round(totalArea).toLocaleString('en-IN')} sq.ft` : ''}`} />
            <Fact label="Per floor" value={asset.perFloorSqft ? `~${asset.perFloorSqft.toLocaleString('en-IN')} sq.ft` : '—'} />
          </dl>
          {toolbar && <div className="mt-3">{toolbar}</div>}
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <button onClick={() => setWalk(selected ?? Math.min(asset.floors, Math.max(0, [...counts.keys()].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))[0] ?? 1)))} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-primary-foreground">
              <Footprints className="size-3.5" /> Walk inside{selected != null ? ' ' + floorName(selected).toLowerCase() : ''} · 3D / VR
            </button>
            <button onClick={() => void startAr()} disabled={ar === 'starting' || ar === 'on'} className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 hover:bg-accent disabled:opacity-50">
              <Smartphone className="size-3.5" /> {ar === 'starting' ? 'Starting AR…' : 'View in AR'}
            </button>
          </div>
          {ar === 'unsupported' && (
            <p className="mt-2 rounded-md bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-800 dark:text-amber-300">
              AR needs Chrome on an ARCore Android phone (iPhone Safari does not support web AR yet). Open this page on such a phone to place the building on your table.
            </p>
          )}
        </header>
        {walk != null &&
          createPortal(
            <Suspense fallback={<div className="fixed inset-0 z-[70] grid place-items-center bg-black text-sm text-white/80">Loading floor…</div>}>
              <FloorInterior asset={asset} floor={walk} onClose={() => setWalk(null)} />
            </Suspense>,
            document.body,
          )}

        <nav className="flex shrink-0 border-b px-3" role="tablist">
          {(
            [
              ['floors', 'Floors & offices', Layers3],
              ['ai', 'Ask AI', Sparkles],
              ['about', 'Details & nearby', MapPin],
            ] as const
          ).map(([k, label, Icon]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={cn('-mb-px flex items-center gap-1.5 border-b-2 px-2.5 py-2.5 text-xs font-medium', tab === k ? 'border-brand text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}
            >
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto" data-lenis-prevent>
          {tab === 'ai' && <AssetAssistant key={asset.id} context={context} />}

          {tab === 'floors' && (
            <>
              <div className="border-b px-5 py-3">
                <label className="flex items-center gap-2 rounded-lg border bg-card px-2.5 focus-within:ring-2 focus-within:ring-ring/40">
                  <Search className="size-4 text-muted-foreground" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a company, owner or office no." className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none" />
                </label>
                {query && (
                  <ul className="mt-2 divide-y rounded-md border text-sm">
                    {matches.length === 0 && <li className="px-3 py-2 text-xs text-muted-foreground">No office matches.</li>}
                    {matches.map((u) => (
                      <li key={u.id}>
                        <button onClick={() => (setSelected(u.floor), setQ(''))} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent">
                          <span className="min-w-0 flex-1 truncate">{u.occupant ?? u.owner ?? STATUS_META[u.status].label}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {floorName(u.floor)} · {u.unit}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {selected != null ? (
                <section className="px-5 py-4">
                  <button onClick={() => setSelected(null)} className="mb-2 text-xs text-muted-foreground hover:text-foreground">
                    ← All floors
                  </button>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-2xl">{floorName(selected)}</h3>
                    <button onClick={() => setWalk(selected)} className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs hover:bg-accent">
                      <Box className="size-3.5" /> Walk inside
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {floorUnits.length} office{floorUnits.length === 1 ? '' : 's'} on record
                    {floorUnits.some((u) => u.areaSqft) ? ` · ${Math.round(floorUnits.reduce((s, u) => s + (u.areaSqft ?? 0), 0)).toLocaleString('en-IN')} sq.ft listed` : ''}
                  </p>
                  {floorUnits.length === 0 ? (
                    <p className="mt-4 rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">No offices recorded on this floor yet. Add them from the admin page.</p>
                  ) : (
                    <ul className="mt-3 divide-y rounded-md border">
                      {floorUnits.map((u) => (
                        <li
                          key={u.id}
                          id={'unit-row-' + u.id}
                          onClick={() => onFocusUnit?.(u.id)}
                          className={cn('flex cursor-pointer gap-3 px-3 py-2.5 transition-colors hover:bg-accent/60', focusUnitId === u.id && 'bg-amber-500/15 ring-2 ring-inset ring-amber-500')}
                        >
                          <span className="w-16 shrink-0">
                            <span className="block font-mono text-xs">{u.unit}</span>
                            {u.areaSqft ? <span className="block text-[11px] text-muted-foreground">{u.areaSqft.toLocaleString('en-IN')} sq.ft</span> : null}
                          </span>
                          <span className="min-w-0 flex-1 text-sm">
                            {(u.occupant ?? '').split(';').filter(Boolean).map((c) => (
                              <span key={c} className="block">
                                {c.trim()}
                              </span>
                            ))}
                            {!u.occupant && <span className="block text-muted-foreground">No occupant listed</span>}
                            {u.owner && <span className="block text-xs text-muted-foreground">Owner: {u.owner}</span>}
                            <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <span className="size-2 rounded-sm" style={{ background: STATUS_META[u.status].color }} /> {STATUS_META[u.status].label}
                              </span>
                              {u.source && <span>· {u.source}</span>}
                            </span>
                            {(u.panoId || u.scanId) && (
                              <span className="mt-1.5 flex gap-1.5">
                                {u.panoId && (
                                  <OpenMedia kind="pano" mediaId={u.panoId} title={"Office " + u.unit} subtitle={asset.name} className="rounded-md border px-2 py-0.5 text-[11px] hover:bg-accent">
                                    360° photo
                                  </OpenMedia>
                                )}
                                {u.scanId && (
                                  <OpenMedia kind="scan" mediaId={u.scanId} title={"Office " + u.unit} subtitle={asset.name} className="rounded-md border px-2 py-0.5 text-[11px] hover:bg-accent">
                                    3D scan
                                  </OpenMedia>
                                )}
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ) : (
                <section className="px-3 py-3">
                  <ul>
                    {floorsDesc.map((f) => {
                      const n = counts.get(f) ?? 0
                      const names = asset.units
                        .filter((u) => u.floor === f)
                        .flatMap((u) => (u.occupant ?? '').split(';'))
                        .map((s) => s.trim())
                        .filter(Boolean)
                      return (
                        <li key={f}>
                          <button
                            onClick={() => setSelected(f)}
                            onMouseEnter={() => setHovered(f)}
                            onMouseLeave={() => setHovered(null)}
                            className={cn('flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-accent', hovered === f && 'bg-accent')}
                          >
                            <span className="grid size-7 shrink-0 place-items-center rounded-md border bg-card font-mono text-xs">{floorShort(f)}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block">{floorName(f)}</span>
                              <span className="block truncate text-xs text-muted-foreground">{names.length ? names.slice(0, 2).join(', ') + (names.length > 2 ? ` +${names.length - 2}` : '') : 'No offices on record'}</span>
                            </span>
                            {n > 0 && <span className="rounded bg-sky-600/10 px-1.5 py-0.5 text-xs tabular-nums text-sky-800 dark:text-sky-300">{n}</span>}
                            <ChevronRight className="size-4 text-muted-foreground" />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )}
            </>
          )}

          {tab === 'about' && (
            <div className="space-y-5 px-5 py-4 text-sm">
              {asset.description && <p className="text-muted-foreground">{asset.description}</p>}
              <dl className="space-y-2">
                {asset.developer && <Row label="Developer" value={asset.developer} />}
                {asset.builtUpSqft && <Row label="Built-up area" value={`~${asset.builtUpSqft.toLocaleString('en-IN')} sq.ft`} />}
                {(asset.facts ?? []).map((f) => (
                  <Row
                    key={f.label}
                    label={f.label}
                    value={f.value}
                    source={
                      f.source &&
                      (f.href ? (
                        <a href={f.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 underline-offset-2 hover:underline">
                          {f.source} <ExternalLink className="size-2.5" />
                        </a>
                      ) : (
                        f.source
                      ))
                    }
                  />
                ))}
              </dl>
              <div>
                <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Nearby</p>
                {areasState === 'loading' && <p className="text-xs text-muted-foreground">Loading nearby buildings…</p>}
                {nearby.length === 0 && areasState !== 'loading' && <p className="text-xs text-muted-foreground">No named buildings found nearby.</p>}
                <ul className="divide-y rounded-md border">
                  {nearby.slice(0, 25).map((n) => (
                    <li key={n.name} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">{n.name}</span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {fmtKm(n.distanceM / 1000)} · ~{Math.round(n.heightM)} m
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-muted-foreground">Buildings and heights from OpenStreetMap (heights estimated where not mapped). Amber blocks in 3D are assets in your register.</p>
              </div>
            </div>
          )}
        </div>
      </aside>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card px-2.5 py-2">
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate font-medium">{value}</dd>
    </div>
  )
}

function Row({ label, value, source }: { label: string; value: string; source?: ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>
        {value}
        {source && <span className="block text-[11px] text-muted-foreground">{source}</span>}
      </dd>
    </div>
  )
}
