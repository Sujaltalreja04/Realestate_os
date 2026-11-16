import type { Doc } from '@convex/_generated/dataModel'
import { PIPELINE_STAGES, stageGroup } from '@/features/crm/model'

type Lead = Doc<'leads'>
type Payment = Doc<'payments'>

/** Every figure in Sales OS is derived here from live Convex data; nothing is hardcoded. */
export function salesMetrics(leads: Lead[], payments: Payment[], siteVisits: Doc<'siteVisits'>[]) {
  const won = leads.filter((l) => stageGroup(l.status) === 'won')
  const lost = leads.filter((l) => stageGroup(l.status) === 'lost')
  const sum = (ps: Payment[]) => ps.reduce((s, p) => s + p.amount, 0)

  const countBy = <T,>(xs: T[], key: (x: T) => string | undefined) => {
    const m = new Map<string, T[]>()
    for (const x of xs) {
      const k = key(x) || 'Unknown'
      m.set(k, [...(m.get(k) ?? []), x])
    }
    return m
  }

  const bySource = Array.from(countBy(leads, (l) => l.source)).map(([source, ls]) => ({
    source,
    leads: ls.length,
    won: ls.filter((l) => stageGroup(l.status) === 'won').length,
  }))

  const byProject = Array.from(countBy(leads, (l) => l.project)).map(([project, ls]) => ({
    project,
    leads: ls.length,
    won: ls.filter((l) => stageGroup(l.status) === 'won').length,
    value: ls.filter((l) => stageGroup(l.status) === 'won').reduce((s, l) => s + (l.budget ?? 0), 0),
  }))

  const byOwner = Array.from(countBy(leads, (l) => l.assignedExecutive)).map(([owner, ls]) => ({
    owner,
    leads: ls.length,
    hot: ls.filter((l) => l.score >= 80 && stageGroup(l.status) !== 'lost').length,
    won: ls.filter((l) => stageGroup(l.status) === 'won').length,
  }))

  // Funnel: how many leads have reached at least each stage (Closed/Lost excluded from the ladder).
  const ladder = PIPELINE_STAGES.filter((s) => s !== 'Closed/Lost')
  const reached = (i: number) =>
    leads.filter((l) => {
      if (stageGroup(l.status) === 'lost') return false
      const idx = ladder.indexOf(l.status as (typeof ladder)[number])
      // Statuses outside the ladder (e.g. legacy "Booked") count as booked.
      return (idx === -1 ? ladder.indexOf('Token Paid') : idx) >= i
    }).length
  const funnel = [
    { label: 'Enquiry', value: leads.filter((l) => stageGroup(l.status) !== 'lost').length },
    { label: 'Contacted', value: reached(1) },
    { label: 'Site visit scheduled', value: reached(2) },
    { label: 'Visited', value: reached(3) },
    { label: 'Negotiation', value: reached(4) },
    { label: 'Booked', value: reached(5) },
  ]

  return {
    totalLeads: leads.length,
    won: won.length,
    lost: lost.length,
    conversion: leads.length ? (won.length / leads.length) * 100 : 0,
    siteVisits: siteVisits.length,
    collected: sum(payments.filter((p) => p.status === 'Paid')),
    receivable: sum(payments.filter((p) => p.status !== 'Paid')),
    overdue: sum(payments.filter((p) => p.status === 'Overdue')),
    bookedValue: won.reduce((s, l) => s + (l.budget ?? 0), 0),
    bySource: bySource.sort((a, b) => b.leads - a.leads),
    byProject: byProject.sort((a, b) => b.won - a.won || b.leads - a.leads),
    byOwner: byOwner.sort((a, b) => b.won - a.won || b.hot - a.hot),
    byMilestone: Array.from(countBy(payments.filter((p) => p.status === 'Paid'), (p) => p.stage))
      .map(([stage, ps]) => ({ stage, amount: sum(ps) }))
      .sort((a, b) => b.amount - a.amount),
    funnel,
  }
}
