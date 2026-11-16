import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAction, useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { Bot, FileText, Phone, PhoneCall, RotateCcw, Sparkles, Zap } from 'lucide-react'
import { api } from '@convex/_generated/api'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, SheetContent } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import ErrorBoundary from '@/components/ErrorBoundary'
import { EmptyState, Page, PageHeader, StatCard } from '@/components/page'
import { Panel } from '@/components/charts'
import { formatDate } from '@/lib/format'
import { Avatar, ScoreBadge } from './parts'
import { CallSession, LiveCall, type CallLang } from './LiveCall'
import { VerdictBadge, VerdictCard } from './CallVerdict'

type Call = Doc<'voiceCalls'>
const LANGS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'gu', label: 'Gujarati' },
]

export default function AutomationPage() {
  return (
    <Page>
      <PageHeader
        title="Automation & AI"
        description="AI voice calls that qualify new leads, send the brochure and book a follow-up, plus conversion predictions."
      />
      <RunAutomation />
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <ErrorBoundary title="Call log is unavailable">
          <CallLog />
        </ErrorBoundary>
        <ErrorBoundary title="Predictions are unavailable">
          <Predictions />
        </ErrorBoundary>
      </div>
    </Page>
  )
}

function RunAutomation() {
  const leads = useQuery(api.leads.getLeads)
  const reset = useMutation(api.automation.resetLeadAutomation)
  const [leadId, setLeadId] = useState<string>()
  const [lang, setLang] = useState('en')
  const [session, setSession] = useState<CallSession | null>(null)
  const runAutomation = useMutation(api.automation.executePipelineAutomation)
  const tts = useAction(api.ai.textToSpeech)
  const analyze = useAction(api.callAnalysis.analyzeCall)

  // Created inside the click so the browser lets the call play sound, and runs exactly once.
  function startCall(lead: Doc<'leads'>) {
    const s = new CallSession({ lead, lang: lang as CallLang, runAutomation, tts, analyze })
    setSession(s)
    void s.start()
  }
  function endSession() {
    session?.dispose()
    setSession(null)
  }

  const queue = useMemo(() => (leads ?? []).filter((l) => l.status === 'New Lead' && !l.automationStatus).sort((a, b) => b.score - a.score), [leads])
  const automated = (leads ?? []).filter((l) => l.automationStatus)
  const chosen = leads?.find((l) => l._id === leadId)

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Waiting for first call" icon={Phone} value={leads ? queue.length : '—'} hint="New leads not yet automated" />
        <StatCard label="Automated" icon={Bot} value={leads ? automated.length : '—'} hint="Called, brochure sent" />
        <StatCard label="Follow-ups booked" icon={Zap} value={leads ? automated.filter((l) => l.automationStatus === 'Follow-up Scheduled').length : '—'} />
      </div>

      <Panel title="Run the AI call sequence" description="Calls the lead, logs the transcript, emails the brochure, moves them to Contacted and books tomorrow's follow-up.">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <Select
              aria-label="Lead"
              placeholder={leads === undefined ? 'Loading leads…' : 'Choose a lead'}
              value={leadId}
              onValueChange={setLeadId}
              options={(leads ?? [])
                .slice()
                .sort((a, b) => Number(!!a.automationStatus) - Number(!!b.automationStatus) || b.score - a.score)
                .map((l) => ({ value: l._id, label: `${l.name} · ${l.status}${l.automationStatus ? ' · automated' : ''}` }))}
            />
          </div>
          <Select className="w-36" aria-label="Call language" value={lang} onValueChange={setLang} options={LANGS} />
          <Button disabled={!chosen || !!session} onClick={() => chosen && startCall(chosen)}>
            <PhoneCall /> Start call
          </Button>
          {chosen?.automationStatus && (
            <Button
              variant="outline"
              onClick={() =>
                reset({ leadId: chosen._id }).then(
                  () => toast.success(`${chosen.name} reset to New Lead`),
                  () => toast.error('Reset failed'),
                )
              }
            >
              <RotateCcw /> Reset
            </Button>
          )}
        </div>
        {queue.length > 0 && (
          <div className="mt-5 border-t pt-4">
            <p className="mb-2 text-xs text-muted-foreground">Next up, by score</p>
            <div className="flex flex-wrap gap-2">
              {queue.slice(0, 6).map((l) => (
                <button
                  key={l._id}
                  onClick={() => setLeadId(l._id)}
                  className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm hover:bg-accent"
                >
                  <Avatar name={l.name} className="size-6 text-[10px]" />
                  {l.name}
                  <ScoreBadge score={l.score} />
                </button>
              ))}
            </div>
          </div>
        )}
      </Panel>
      <LiveCall session={session} onClose={endSession} />
    </>
  )
}

function CallLog() {
  const calls = useQuery(api.automation.getVoiceCalls, {})
  const [openId, setOpenId] = useState<string | null>(null)
  // Read the live row so a fresh analysis appears without reopening the panel.
  const open = calls?.find((c) => c._id === openId) ?? null
  return (
    <div className="rounded-xl border bg-card shadow-xs">
      <div className="border-b px-5 py-3">
        <h3 className="text-sm font-semibold">Call log</h3>
        <p className="text-xs text-muted-foreground">Latest 100 AI calls</p>
      </div>
      {calls === undefined ? (
        <Skeleton className="m-5 h-48" />
      ) : calls.length === 0 ? (
        <EmptyState icon={PhoneCall} title="No calls yet" description="Run the sequence on a lead to see the transcript here." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Lead</TH>
              <TH>Project</TH>
              <TH>Verdict</TH>
              <TH className="text-right">Duration</TH>
              <TH>Date</TH>
            </TR>
          </THead>
          <TBody>
            {calls.map((c) => (
              <TR key={c._id} className="cursor-pointer hover:bg-muted/50" onClick={() => setOpenId(c._id)}>
                <TD className="font-medium">{c.leadName}</TD>
                <TD className="max-w-48 truncate text-muted-foreground">{c.project.replace(/^Ai RealEstate OS /, '')}</TD>
                <TD>{c.analysis ? <VerdictBadge verdict={c.analysis.verdict} score={c.analysis.score} /> : <span className="text-xs text-muted-foreground">Not analysed</span>}</TD>
                <TD className="text-right tabular-nums">
                  {Math.floor(c.duration / 60)}:{String(c.duration % 60).padStart(2, '0')}
                </TD>
                <TD className="text-muted-foreground">{formatDate(c.date)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        {open && (
          <SheetContent title={`Call with ${open.leadName}`} description={`${formatDate(open.date)} · ${open.sentiment}`}>
            <div className="space-y-6 p-5">
              <AnalysisBlock call={open} />
              <div className="rounded-lg bg-muted/60 p-4 text-sm">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Call summary</p>
                {open.summary}
              </div>
              <div className="flex gap-2">
                {open.brochureSent && (
                  <Badge variant="outline">
                    <FileText className="size-3" /> Brochure sent
                  </Badge>
                )}
                {open.followupScheduled && <Badge variant="outline">Follow-up booked</Badge>}
              </div>
              <ol className="space-y-3">
                {open.transcript.map((t, i) => {
                  const agent = /agent|ai|bot|assistant/i.test(t.sender)
                  return (
                    <li key={i} className={agent ? 'pr-10' : 'pl-10'}>
                      <div className={agent ? 'rounded-lg bg-muted p-3 text-sm' : 'rounded-lg bg-primary/10 p-3 text-sm'}>{t.text}</div>
                      <p className={`mt-1 text-[11px] text-muted-foreground ${agent ? '' : 'text-right'}`}>
                        {t.sender} · {t.time}
                      </p>
                    </li>
                  )
                })}
              </ol>
            </div>
          </SheetContent>
        )}
      </Dialog>
    </div>
  )
}

function Predictions() {
  const predictions = useQuery(api.predictions.getAllPredictions)
  const leads = useQuery(api.leads.getLeads)
  const runPrediction = useAction(api.predictions.runPrediction)
  const [running, setRunning] = useState<string | null>(null)
  const name = (id: string) => leads?.find((l) => l._id === id)?.name ?? 'Unknown lead'
  const sorted = [...(predictions ?? [])].sort((a, b) => b.conversionProbability - a.conversionProbability)

  async function refresh(id: Id<'leads'>) {
    setRunning(id)
    try {
      await runPrediction({ leadId: id })
      toast.success('Prediction updated')
    } catch (err) {
      toast.error('Prediction failed', { description: err instanceof Error ? err.message : undefined })
    } finally {
      setRunning(null)
    }
  }

  return (
    <div className="rounded-xl border bg-card shadow-xs">
      <div className="border-b px-5 py-3">
        <h3 className="text-sm font-semibold">Conversion predictions</h3>
        <p className="text-xs text-muted-foreground">AI estimate and next best action per lead</p>
      </div>
      {predictions === undefined ? (
        <Skeleton className="m-5 h-48" />
      ) : sorted.length === 0 ? (
        <EmptyState icon={Sparkles} title="No predictions yet" description="Open a lead in the CRM and run AI insight." />
      ) : (
        <ul className="divide-y">
          {sorted.map((p) => (
            <li key={p._id} className="space-y-2 px-5 py-4">
              <div className="flex items-center gap-3">
                <Link to={`/crm?lead=${p.leadId}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">
                  {name(p.leadId)}
                </Link>
                <span className="text-sm font-semibold tabular-nums">{Math.round(p.conversionProbability)}%</span>
                <Button size="sm" variant="ghost" disabled={running === p.leadId} onClick={() => void refresh(p.leadId)} aria-label="Refresh prediction">
                  <RotateCcw className={running === p.leadId ? 'animate-spin' : ''} />
                </Button>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, p.conversionProbability)}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{p.nextBestAction}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AnalysisBlock({ call }: { call: Call }) {
  const analyze = useAction(api.callAnalysis.analyzeCall)
  const [busy, setBusy] = useState(false)
  if (call.analysis) return <VerdictCard a={call.analysis} />
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed p-4">
      <p className="text-sm text-muted-foreground">Is this lead worth more time? Let AI judge the conversation.</p>
      <Button
        size="sm"
        disabled={busy}
        onClick={() => {
          setBusy(true)
          analyze({ callId: call._id }).then(
            () => setBusy(false),
            (err) => {
              setBusy(false)
              toast.error('Analysis failed', { description: err instanceof Error ? err.message : undefined })
            },
          )
        }}
      >
        <Sparkles /> {busy ? 'Analysing…' : 'Analyse call'}
      </Button>
    </div>
  )
}
