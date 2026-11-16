import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Every value on the map carries where it came from. The UI never shows a fact without its source.
 *  - verified: public open data (OpenStreetMap) as published by its source
 *  - platform: RealEstate OS's own listing records (Convex)
 *  - estimate: calculated by this app from other values (formula shown in the note)
 *  - demo:     illustrative dataset, not a real record
 */
export type Source = 'verified' | 'platform' | 'estimate' | 'demo'

export const SOURCE_META: Record<Source, { label: string; className: string; dot: string; help: string }> = {
  verified: {
    label: 'Verified · OSM',
    className: 'border-emerald-600/30 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300',
    dot: 'bg-emerald-600',
    help: 'Public OpenStreetMap data. Community-mapped; not a legal or survey record.',
  },
  platform: {
    label: 'Platform',
    className: 'border-sky-600/30 bg-sky-600/10 text-sky-800 dark:text-sky-300',
    dot: 'bg-sky-600',
    help: 'From RealEstate OS listing records.',
  },
  estimate: {
    label: 'Estimate',
    className: 'border-amber-600/30 bg-amber-500/10 text-amber-800 dark:text-amber-300',
    dot: 'bg-amber-500',
    help: 'Calculated by this app. See the note for the method.',
  },
  demo: {
    label: 'Demo',
    className: 'border-fuchsia-600/30 bg-fuchsia-600/10 text-fuchsia-800 dark:text-fuchsia-300',
    dot: 'bg-fuchsia-600',
    help: 'Illustrative data for demonstration only. Not a real record.',
  },
}

export function SourceBadge({ source, className }: { source: Source; className?: string }) {
  const m = SOURCE_META[source]
  return (
    <span
      title={m.help}
      className={cn('inline-flex shrink-0 items-center gap-1 rounded-sm border px-1.5 py-px text-[10px] font-medium leading-4', m.className, className)}
    >
      <span className={cn('size-1.5 rounded-full', m.dot)} />
      {m.label}
    </span>
  )
}

export interface Fact {
  label: string
  value: ReactNode
  source: Source
  /** How it was derived, or where to verify it. */
  note?: ReactNode
}

/** Label/value rows, each with its provenance badge. Missing values say so instead of guessing. */
export function FactList({ facts, className }: { facts: Fact[]; className?: string }) {
  return (
    <dl className={cn('divide-y', className)}>
      {facts.map((f) => (
        <div key={f.label} className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] gap-3 py-2.5 text-sm">
          <dt className="text-muted-foreground">{f.label}</dt>
          <dd className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
              <span className="min-w-0 break-words">{f.value ?? <Missing />}</span>
              <SourceBadge source={f.source} />
            </div>
            {f.note && <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{f.note}</p>}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function Missing({ children = 'Not available' }: { children?: ReactNode }) {
  return <span className="italic text-muted-foreground">{children}</span>
}

export function SourceLegend({ className }: { className?: string }) {
  return (
    <ul className={cn('space-y-1.5 text-xs', className)}>
      {(Object.keys(SOURCE_META) as Source[]).map((s) => (
        <li key={s} className="flex items-start gap-2">
          <SourceBadge source={s} />
          <span className="text-muted-foreground">{SOURCE_META[s].help}</span>
        </li>
      ))}
    </ul>
  )
}
