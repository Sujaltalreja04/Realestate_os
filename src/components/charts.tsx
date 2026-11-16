import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface BarDatum {
  label: string
  value: number
  /** Optional formatted value shown at the end of the bar. */
  display?: ReactNode
  hint?: ReactNode
}

/** Ranked horizontal bars. Best for categorical comparisons (channels, projects, people). */
export function BarList({ data, className, empty = 'No data yet' }: { data: BarDatum[]; className?: string; empty?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  if (data.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
  return (
    <ul className={cn('space-y-2.5', className)}>
      {data.map((d) => (
        <li key={d.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm">
          <span className="truncate">{d.label}</span>
          <span className="text-right tabular-nums font-medium">{d.display ?? d.value}</span>
          <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
          {d.hint && <span className="col-span-2 -mt-0.5 text-xs text-muted-foreground">{d.hint}</span>}
        </li>
      ))}
    </ul>
  )
}

/** Stage-by-stage funnel with conversion from the previous step. */
export function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const top = Math.max(1, steps[0]?.value ?? 1)
  return (
    <ol className="space-y-2">
      {steps.map((s, i) => {
        const prev = steps[i - 1]?.value
        const conv = prev ? Math.round((s.value / prev) * 100) : null
        return (
          <li key={s.label} className="grid grid-cols-[9rem_minmax(0,1fr)_3rem] items-center gap-3 text-sm sm:grid-cols-[11rem_minmax(0,1fr)_3.5rem]">
            <span className="truncate text-muted-foreground">{s.label}</span>
            <div className="h-7 overflow-hidden rounded-md bg-muted">
              <div
                className="flex h-full items-center rounded-md bg-primary/85 px-2 text-xs font-medium tabular-nums text-primary-foreground"
                style={{ width: `${Math.max(4, (s.value / top) * 100)}%` }}
              >
                {s.value}
              </div>
            </div>
            <span className="text-right text-xs tabular-nums text-muted-foreground">{conv == null ? '' : `${conv}%`}</span>
          </li>
        )
      })}
    </ol>
  )
}

/** Single stacked bar for part-of-whole (e.g. unit status mix). */
export function StackedBar({ parts }: { parts: { label: string; value: number; className: string }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
        {parts.map((p) => (
          <div key={p.label} className={p.className} style={{ width: `${(p.value / total) * 100}%` }} title={`${p.label}: ${p.value}`} />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-1.5">
            <span className={cn('size-2 rounded-full', p.className)} />
            {p.label} <span className="tabular-nums text-foreground">{p.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-xl border bg-card p-5 shadow-xs', className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
