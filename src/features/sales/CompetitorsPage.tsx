import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { useAction } from 'convex/react'
import { AlertTriangle, Eye, Loader2, Plus, Sparkles, Target, TrendingUp, X } from 'lucide-react'
import { api } from '@convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Page, PageHeader } from '@/components/page'
import { cn } from '@/lib/utils'

interface Competitor {
  name: string
  positioning: string
  likelyTactics: string[]
  strengths: string[]
  weaknesses: string[]
  confidence: 'low' | 'medium' | 'high'
}
interface Opportunity {
  title: string
  detail: string
  impact: 'high' | 'medium' | 'low'
  effort: 'high' | 'medium' | 'low'
}
interface Report {
  competitors: Competitor[]
  ourGaps: string[]
  opportunities: Opportunity[]
  watchlist: string[]
}

const FOCUS = ['Overall strategy', 'Pricing & payment plans', 'Marketing & lead channels', 'Product, amenities & design', 'Digital experience & sales process']
const STORE = 'reos-competitor-report'

const arr = (x: unknown) => (Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string') : [])
function parse(text: string): Report | null {
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    const r = JSON.parse(m[0]) as Partial<Report>
    return {
      competitors: (Array.isArray(r.competitors) ? r.competitors : []).map((c) => ({
        name: String(c.name ?? ''),
        positioning: String(c.positioning ?? ''),
        likelyTactics: arr(c.likelyTactics),
        strengths: arr(c.strengths),
        weaknesses: arr(c.weaknesses),
        confidence: (['low', 'medium', 'high'].includes(c.confidence as string) ? c.confidence : 'low') as Competitor['confidence'],
      })),
      ourGaps: arr(r.ourGaps),
      opportunities: (Array.isArray(r.opportunities) ? r.opportunities : []).map((o) => ({
        title: String(o.title ?? ''),
        detail: String(o.detail ?? ''),
        impact: (['high', 'medium', 'low'].includes(o.impact as string) ? o.impact : 'medium') as Opportunity['impact'],
        effort: (['high', 'medium', 'low'].includes(o.effort as string) ? o.effort : 'medium') as Opportunity['effort'],
      })),
      watchlist: arr(r.watchlist),
    }
  } catch {
    return null
  }
}

function load(): { names: string[]; focus: string; report: Report; model: string; at: number } | null {
  try {
    const v = localStorage.getItem(STORE)
    return v ? JSON.parse(v) : null
  } catch {
    return null
  }
}

export default function CompetitorsPage() {
  const run = useAction(api.ai.competitorAnalysis)
  const saved = load()
  const [names, setNames] = useState<string[]>(saved?.names ?? [])
  const [draft, setDraft] = useState('')
  const [focus, setFocus] = useState(saved?.focus ?? FOCUS[0]!)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ report: Report; model: string; at: number } | null>(saved ? { report: saved.report, model: saved.model, at: saved.at } : null)

  const add = () => {
    const n = draft.trim()
    if (n && !names.includes(n) && names.length < 5) setNames([...names, n])
    setDraft('')
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add()
    }
  }

  async function analyse(e?: FormEvent) {
    e?.preventDefault()
    const list = draft.trim() ? [...names, draft.trim()].slice(0, 5) : names
    if (!list.length) return
    setNames(list)
    setDraft('')
    setBusy(true)
    setError(null)
    try {
      const res = await run({ competitors: list, focus })
      const report = parse(res.content)
      if (!report) throw new Error('The model returned an unreadable answer. Try again.')
      const r = { report, model: res.model, at: Date.now() }
      setResult(r)
      try {
        localStorage.setItem(STORE, JSON.stringify({ names: list, focus, ...r }))
      } catch {
        /* storage unavailable */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setBusy(false)
    }
  }

  const r = result?.report
  const quadrant = (o: Opportunity) => (o.impact === 'high' && o.effort !== 'high' ? 0 : o.impact === 'high' ? 1 : o.effort === 'low' ? 2 : 3)
  const QUADS = ['Quick wins', 'Big bets', 'Easy extras', 'Later']

  return (
    <Page className="max-w-6xl">
      <PageHeader title="Competitor intelligence" description="What rival developers are likely doing, where we fall short, and what to do next, grounded in our own projects and sales data." />

      <form onSubmit={(e) => void analyse(e)} className="rounded-xl border bg-card p-5 shadow-xs">
        <label className="text-sm font-medium" htmlFor="comp-input">
          Competitors <span className="font-normal text-muted-foreground">(up to 5)</span>
        </label>
        <div className="mt-2 flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring/40">
          {names.map((n) => (
            <span key={n} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-sm">
              {n}
              <button type="button" onClick={() => setNames(names.filter((x) => x !== n))} aria-label={`Remove ${n}`} className="text-muted-foreground hover:text-foreground">
                <X className="size-3.5" />
              </button>
            </span>
          ))}
          <input
            id="comp-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            onBlur={add}
            placeholder={names.length ? 'Add another…' : 'Type a developer or project name, press Enter'}
            className="h-8 min-w-48 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
            disabled={names.length >= 5}
          />
          {draft.trim() && (
            <button type="button" onClick={add} className="grid size-7 place-items-center rounded-md hover:bg-accent" aria-label="Add">
              <Plus className="size-4" />
            </button>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <p className="mb-2 text-sm font-medium">Focus</p>
            <div className="flex flex-wrap gap-1.5">
              {FOCUS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFocus(f)}
                  aria-pressed={focus === f}
                  className={cn('rounded-md border px-2.5 py-1.5 text-xs', focus === f ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent')}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" disabled={busy || (!names.length && !draft.trim())}>
            {busy ? <Loader2 className="animate-spin" /> : <Sparkles />} {busy ? 'Analysing…' : 'Analyse'}
          </Button>
        </div>
        <p className="mt-4 flex gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="mt-px size-3.5 shrink-0 text-amber-600" />
          The AI has no live internet access. Competitor details come from its general knowledge and can be outdated; verify prices and launches on GujRERA and the developers’ sites before acting.
        </p>
      </form>

      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>}

      {busy && !r && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {r && (
        <div className={cn('space-y-6 transition-opacity', busy && 'opacity-50')}>
          <p className="text-xs text-muted-foreground">
            Generated {new Date(result!.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} by {result!.model === 'gemma4' ? 'Gemma 4 via Sarvam' : result!.model}.
          </p>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Eye className="size-4 text-muted-foreground" /> What competitors are likely doing
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {r.competitors.map((c) => (
                <article key={c.name} className="rounded-xl border bg-card p-5 shadow-xs">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-base font-semibold">{c.name}</h4>
                    <Badge variant={c.confidence === 'high' ? 'success' : c.confidence === 'medium' ? 'warning' : 'secondary'}>{c.confidence} confidence</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{c.positioning}</p>
                  <Bullets title="Likely tactics" items={c.likelyTactics} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Bullets title="Strengths" items={c.strengths} tone="text-emerald-600" />
                    <Bullets title="Weaknesses" items={c.weaknesses} tone="text-rose-600" />
                  </div>
                </article>
              ))}
            </div>
          </section>

          {r.ourGaps.length > 0 && (
            <section className="rounded-xl border bg-card p-5 shadow-xs">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Target className="size-4 text-muted-foreground" /> Where we fall short
              </h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {r.ourGaps.map((g) => (
                  <li key={g} className="rounded-lg bg-muted/60 px-3 py-2.5 text-sm">
                    {g}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {r.opportunities.length > 0 && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="size-4 text-muted-foreground" /> What more we can do
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {QUADS.map((q, qi) => {
                  const items = r.opportunities.filter((o) => quadrant(o) === qi)
                  if (!items.length) return null
                  return (
                    <div key={q} className="rounded-xl border bg-card shadow-xs">
                      <p className="border-b px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {q} <span className="normal-case tracking-normal">· {qi === 0 ? 'high impact, manageable effort' : qi === 1 ? 'high impact, high effort' : qi === 2 ? 'low effort' : 'lower priority'}</span>
                      </p>
                      <ul className="divide-y">
                        {items.map((o) => (
                          <li key={o.title} className="px-4 py-3">
                            <p className="text-sm font-medium">{o.title}</p>
                            <p className="mt-0.5 text-sm text-muted-foreground">{o.detail}</p>
                            <p className="mt-1.5 text-[11px] text-muted-foreground">
                              Impact {o.impact} · effort {o.effort}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {r.watchlist.length > 0 && <Bullets title="Keep an eye on" items={r.watchlist} boxed />}
        </div>
      )}
    </Page>
  )
}

function Bullets({ title, items, tone, boxed }: { title: string; items: string[]; tone?: string; boxed?: boolean }) {
  if (!items.length) return null
  return (
    <div className={cn('mt-4', boxed && 'rounded-xl border bg-card p-5 shadow-xs')}>
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
      <ul className="space-y-1.5">
        {items.map((s) => (
          <li key={s} className="flex gap-2 text-sm">
            <span className={cn('mt-2 size-1 shrink-0 rounded-full bg-current', tone ?? 'text-muted-foreground')} />
            {s}
          </li>
        ))}
      </ul>
    </div>
  )
}
