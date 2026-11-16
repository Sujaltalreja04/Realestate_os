import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAction, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { ArrowUpRight, PhoneCall, Sparkles } from 'lucide-react'
import { api } from '@convex/_generated/api'
import type { Doc } from '@convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, SheetContent } from '@/components/ui/dialog'
import { EmptyState, Page, PageHeader, StatCard } from '@/components/page'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Avatar } from '@/features/crm/parts'
import { VERDICT_META, VerdictBadge, VerdictCard, type Verdict } from '@/features/crm/CallVerdict'

type Call = Doc<'voiceCalls'>
const ORDER: Verdict[] = ['pursue', 'nurture', 'drop']

/** Where should the sales team spend its time? AI verdicts from every analysed call. */
export default function CallInsightsPage() {
  const calls = useQuery(api.automation.getVoiceCalls, {})
  const analyze = useAction(api.callAnalysis.analyzeCall)
  const [running, setRunning] = useState<{ done: number; total: number } | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  // Latest call per lead decides that lead's verdict.
  const latest = useMemo(() => {
    const m = new Map<string, Call>()
    for (const c of calls ?? []) {
      const prev = m.get(c.leadId)
      if (!prev || c._creationTime > prev._creationTime) m.set(c.leadId, c)
    }
    return [...m.values()]
  }, [calls])

  const analysed = latest.filter((c) => c.analysis)
  const pending = latest.filter((c) => !c.analysis)
  const groups = ORDER.map((v) => ({ v, items: analysed.filter((c) => c.analysis!.verdict === v).sort((a, b) => b.analysis!.score - a.analysis!.score) }))
  const open = calls?.find((c) => c._id === openId) ?? null

  async function analyseAll() {
    setRunning({ done: 0, total: pending.length })
    let failed = 0
    for (const [i, c] of pending.entries()) {
      try {
        await analyze({ callId: c._id })
      } catch {
        failed++
      }
      setRunning({ done: i + 1, total: pending.length })
    }
    setRunning(null)
    if (failed) toast.error(`${failed} call${failed > 1 ? 's' : ''} could not be analysed`)
    else toast.success('All calls analysed')
  }

  return (
    <Page>
      <PageHeader
        title="Call insights"
        description="After every AI call, the conversation is judged: is this lead worth more of the team's time?"
        actions={
          pending.length > 0 && (
            <Button onClick={() => void analyseAll()} disabled={!!running}>
              <Sparkles /> {running ? `Analysing ${running.done}/${running.total}…` : `Analyse ${pending.length} new call${pending.length > 1 ? 's' : ''}`}
            </Button>
          )
        }
      />

      {calls === undefined ? (
        <div className="grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[106px] rounded-xl" />
          ))}
        </div>
      ) : latest.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            icon={PhoneCall}
            title="No AI calls yet"
            description="Place a call from CRM › Automation & AI to see verdicts here."
            action={
              <Button variant="outline" asChild>
                <Link to="/crm/tools">Go to Automation</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Leads called" value={latest.length} hint={`${analysed.length} analysed`} />
            {groups.map((g) => (
              <StatCard
                key={g.v}
                label={VERDICT_META[g.v].label}
                value={<span className="flex items-center gap-2">{g.items.length}<span className={cn('size-2 rounded-full', VERDICT_META[g.v].dot)} /></span>}
                hint={VERDICT_META[g.v].help}
              />
            ))}
          </div>

          {analysed.length > 0 && (
            <div className="rounded-xl border bg-card p-5 shadow-xs">
              <p className="text-sm font-medium">Time allocation</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Share of called leads in each bucket. Focus calls and visits on the green segment.</p>
              <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-muted">
                {groups.map((g) => (
                  <div key={g.v} className={VERDICT_META[g.v].dot} style={{ width: `${(g.items.length / analysed.length) * 100}%` }} title={`${VERDICT_META[g.v].label}: ${g.items.length}`} />
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            {groups.map((g) => (
              <section key={g.v} className="rounded-xl border bg-card shadow-xs">
                <header className="flex items-center justify-between border-b px-4 py-3">
                  <VerdictBadge verdict={g.v} />
                  <span className="text-xs tabular-nums text-muted-foreground">{g.items.length}</span>
                </header>
                {g.items.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">None</p>
                ) : (
                  <ul className="divide-y">
                    {g.items.map((c) => (
                      <li key={c._id}>
                        <button onClick={() => setOpenId(c._id)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/50">
                          <Avatar name={c.leadName} />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-medium">{c.leadName}</span>
                              <span className="text-xs tabular-nums text-muted-foreground">{c.analysis!.score}</span>
                            </span>
                            <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{c.analysis!.nextAction}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          {pending.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {pending.length} called lead{pending.length > 1 ? 's have' : ' has'} no verdict yet: {pending.map((c) => c.leadName).join(', ')}.
            </p>
          )}
        </>
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        {open && (
          <SheetContent
            title={open.leadName}
            description={`${open.project.replace(/^Ai RealEstate OS /, '')} · call on ${formatDate(open.date)}`}
            actions={
              <Button variant="outline" size="sm" asChild>
                <Link to={`/crm?lead=${open.leadId}`}>
                  Open lead <ArrowUpRight />
                </Link>
              </Button>
            }
          >
            <div className="space-y-5 p-5">
              {open.analysis && <VerdictCard a={open.analysis} />}
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Transcript</p>
                <ol className="space-y-2">
                  {open.transcript.map((t, i) => (
                    <li key={i} className={cn('rounded-lg p-3 text-sm', t.sender === 'agent' ? 'mr-8 bg-muted' : 'ml-8 bg-primary/10')}>
                      <span className="mb-0.5 block text-[11px] text-muted-foreground">{t.sender === 'agent' ? 'AI agent' : open.leadName}</span>
                      {t.text}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </SheetContent>
        )}
      </Dialog>
    </Page>
  )
}
