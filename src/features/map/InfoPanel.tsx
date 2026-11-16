import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Columns3, ExternalLink, FileText, Info, LocateFixed, X } from 'lucide-react'
import { FLOOR_STATUS, getCondition, getFloors } from '@/data/giftCityGIS.js'
import { cn } from '@/lib/utils'
import { imageAt } from '@/features/projects/model'
import type { Property } from '@/features/projects/model'
import type { UnitView } from '@/features/client/units'
import { FactList, SourceBadge } from './provenance'
import { InvestmentIntel, LocationIntel } from './intel'
import type { DemoBuilding, Described, Selection } from './describe'

const TABS = ['Overview', 'Location', 'Investment', 'Documents'] as const
type Tab = (typeof TABS)[number]

interface Props {
  sel: Selection
  d: Described
  projects: Property[]
  units: UnitView[]
  inCompare: boolean
  onCompare: () => void
  onZoom: () => void
  onClose: () => void
}

export function InfoPanel({ sel, d, projects, units, inCompare, onCompare, onZoom, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('Overview')

  return (
    <div className="flex h-full flex-col bg-background">
      {d.image && (
        <div className="relative h-36 shrink-0 overflow-hidden bg-muted">
          <img src={imageAt(d.image, 800)} alt="" className="size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      )}
      <header className="relative shrink-0 border-b px-5 pb-3 pt-4">
        <button onClick={onClose} className={cn('absolute right-3 grid size-8 place-items-center rounded-md hover:bg-accent', d.image ? '-top-32 bg-background/80 backdrop-blur' : 'top-3')} aria-label="Close panel">
          <X className="size-4" />
        </button>
        <div className="flex items-center gap-2 pr-10">
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{d.kindLabel}</span>
          <SourceBadge source={d.source} />
        </div>
        <h2 className="mt-1.5 font-display text-3xl leading-tight">{d.title}</h2>
        <p className="text-sm text-muted-foreground">{d.subtitle}</p>
        {d.caveat && (
          <p className="mt-3 flex gap-2 rounded-md bg-muted/70 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
            <Info className="mt-px size-3.5 shrink-0" /> {d.caveat}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button onClick={onZoom} className="inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs hover:bg-accent">
            <LocateFixed className="size-3.5" /> Zoom to
          </button>
          <button
            onClick={onCompare}
            className={cn('inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs', inCompare ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent')}
            aria-pressed={inCompare}
          >
            <Columns3 className="size-3.5" /> {inCompare ? 'In comparison' : 'Compare'}
          </button>
          {sel.kind === 'project' && (
            <Link to={`/projects/${sel.property._id}`} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs text-primary-foreground hover:bg-primary/90">
              View project <ArrowUpRight className="size-3.5" />
            </Link>
          )}
        </div>
      </header>

      <nav className="flex shrink-0 border-b px-3" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn('-mb-px border-b-2 px-2.5 py-2.5 text-xs font-medium transition-colors', tab === t ? 'border-brand text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}
          >
            {t}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto" data-lenis-prevent>
        {tab === 'Overview' && (
          <>
            <FactList facts={d.overview} className="px-5" />
            {sel.kind === 'demo-building' && <DemoBuildingDetail b={sel.building} />}
          </>
        )}
        {tab === 'Location' && <LocationIntel d={d} projects={projects} />}
        {tab === 'Investment' && <InvestmentIntel sel={sel} d={d} projects={projects} units={units} />}
        {tab === 'Documents' && <Documents d={d} />}
      </div>
    </div>
  )
}

function Documents({ d }: { d: Described }) {
  return (
    <div className="px-5 py-4">
      {d.image && <img src={imageAt(d.image, 800)} alt={d.title} className="mb-4 aspect-[16/10] w-full rounded-md object-cover" />}
      {d.documents.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">No documents available for this item.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {d.documents.map((doc) => {
            const body = (
              <>
                <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm">{doc.label}</span>
                  {doc.note && <span className="block text-[11px] text-muted-foreground">{doc.note}</span>}
                </span>
                <SourceBadge source={doc.source} />
                {doc.href && <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />}
              </>
            )
            return (
              <li key={doc.label}>
                {doc.href ? (
                  <a href={doc.href} target="_blank" rel="noreferrer" className="flex items-start gap-3 px-3 py-2.5 hover:bg-accent">
                    {body}
                  </a>
                ) : (
                  <div className="flex items-start gap-3 px-3 py-2.5 opacity-70">{body}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">Ownership and legal status must be confirmed from official records before any transaction.</p>
    </div>
  )
}

interface Floor {
  id: string
  label: string
  status: string
  tenant: string | null
}

/** Floor stack and condition for the illustrative buildings (kept from the original map). */
function DemoBuildingDetail({ b }: { b: DemoBuilding }) {
  const floors = getFloors(b) as Floor[]
  const cond = getCondition(b)
  const fs = (s: string) => FLOOR_STATUS[s as keyof typeof FLOOR_STATUS]
  return (
    <div className="border-t px-5 py-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Floor stack</p>
        <SourceBadge source="demo" />
      </div>
      <div className="flex h-24 flex-col-reverse gap-px">
        {floors.map((f) => (
          <div key={f.id} className="min-h-px flex-1" style={{ background: fs(f.status)?.color }} title={`${f.label}: ${fs(f.status)?.label}`} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {Array.from(new Set(floors.map((f) => f.status))).map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className="size-2" style={{ background: fs(s)?.color }} />
            {fs(s)?.label}
          </li>
        ))}
      </ul>
      <p className="mb-2 mt-4 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {cond.mode === 'operational' ? `Condition · ${cond.rating}` : 'Construction milestones'}
      </p>
      <ul className="space-y-2">
        {(cond.mode === 'operational' ? cond.components!.map((c) => ({ name: c.name, pct: c.score })) : cond.milestones!).map((m) => (
          <li key={m.name} className="text-xs">
            <div className="flex justify-between">
              <span>{m.name}</span>
              <span className="tabular-nums text-muted-foreground">{m.pct}%</span>
            </div>
            <div className="mt-1 h-1 rounded bg-muted">
              <div className="h-full rounded bg-brand" style={{ width: `${m.pct}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
