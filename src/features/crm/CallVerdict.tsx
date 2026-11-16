import { CheckCircle2, CircleSlash, Clock3, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react'
import type { Doc } from '@convex/_generated/dataModel'
import { cn } from '@/lib/utils'

export type CallAnalysis = NonNullable<Doc<'voiceCalls'>['analysis']>
export type Verdict = CallAnalysis['verdict']

export const VERDICT_META: Record<Verdict, { label: string; tone: string; dot: string; help: string; icon: typeof ThumbsUp }> = {
  pursue: {
    label: 'Pursue',
    tone: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    dot: 'bg-emerald-500',
    help: 'Clear intent and fit. Spend active sales time now.',
    icon: ThumbsUp,
  },
  nurture: {
    label: 'Nurture',
    tone: 'bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/30',
    dot: 'bg-amber-500',
    help: 'Interested but not ready. Keep warm with low-effort touches.',
    icon: Clock3,
  },
  drop: {
    label: 'Deprioritise',
    tone: 'bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/30',
    dot: 'bg-rose-500',
    help: 'Poor fit or low intent. Stop spending time.',
    icon: ThumbsDown,
  },
}

export function VerdictBadge({ verdict, score, className }: { verdict: Verdict; score?: number; className?: string }) {
  const m = VERDICT_META[verdict]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium', m.tone, className)} title={m.help}>
      <span className={cn('size-1.5 rounded-full', m.dot)} />
      {m.label}
      {score != null && <span className="tabular-nums opacity-70">{score}</span>}
    </span>
  )
}

/** Full verdict card. `dark` styles it for the live-call screen. */
export function VerdictCard({ a, dark }: { a: CallAnalysis; dark?: boolean }) {
  const m = VERDICT_META[a.verdict]
  const Icon = m.icon
  const muted = dark ? 'text-white/55' : 'text-muted-foreground'
  return (
    <div className={cn('rounded-xl border p-4', dark ? 'border-white/10 bg-white/[0.04]' : 'bg-card')}>
      <div className="flex items-start gap-3">
        <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg border', m.tone)}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold">{m.label}</p>
            <span className={cn('text-xs tabular-nums', muted)}>Lead quality {a.score}/100</span>
          </div>
          <p className={cn('mt-0.5 text-sm', dark ? 'text-white/85' : '')}>{a.summary}</p>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
        <div className={cn('h-full rounded-full', m.dot)} style={{ width: `${a.score}%` }} />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <List title="Buying signals" items={a.buyingSignals} icon={<CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />} muted={muted} />
        <List title="Concerns" items={a.concerns} icon={<CircleSlash className="size-3.5 shrink-0 text-rose-500" />} muted={muted} />
      </div>
      <div className={cn('mt-4 rounded-lg px-3 py-2.5 text-sm', dark ? 'bg-white/[0.06]' : 'bg-muted/60')}>
        <span className={cn('text-[11px] font-medium uppercase tracking-wider', muted)}>Next step</span>
        <p className="mt-0.5">
          {a.nextAction} <span className={muted}>· follow up in {a.followUpInDays === 0 ? 'today' : `${a.followUpInDays} day${a.followUpInDays === 1 ? '' : 's'}`}</span>
        </p>
      </div>
      <p className={cn('mt-3 flex items-center gap-1.5 text-[11px]', muted)}>
        <Sparkles className="size-3" />
        {a.model === 'rules' ? 'Rule-based estimate (AI was unavailable)' : `Analysed by ${a.model === 'gemma4' ? 'Gemma 4 via Sarvam' : a.model}`} from the call transcript and lead profile.
      </p>
    </div>
  )
}

function List({ title, items, icon, muted }: { title: string; items: string[]; icon: React.ReactNode; muted: string }) {
  return (
    <div>
      <p className={cn('mb-1.5 text-[11px] font-medium uppercase tracking-wider', muted)}>{title}</p>
      {items.length === 0 ? (
        <p className={cn('text-sm italic', muted)}>None noted</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((s) => (
            <li key={s} className="flex gap-2 text-sm">
              {icon}
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
