import { useMemo } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Page, PageHeader } from '@/components/page'
import { ChatPanel } from '@/features/ai/ChatPanel'
import { COPILOT_PROMPTS } from '@/data/demo'
import { formatINR, todayISO } from '@/lib/format'
import { stageGroup } from '@/features/crm/model'
import { salesMetrics } from './metrics'

export default function CopilotPage() {
  const leads = useQuery(api.leads.getLeads)
  const payments = useQuery(api.crm.getPayments)
  const visits = useQuery(api.crm.getSiteVisits)
  const inventory = useQuery(api.inventory.getInventory)
  const followups = useQuery(api.crm.getFollowups)

  const facts = useMemo(() => {
    if (!leads || !payments || !visits || !inventory || !followups) return null
    const m = salesMetrics(leads, payments, visits)
    const hot = leads.filter((l) => l.score >= 80 && ['open', 'active'].includes(stageGroup(l.status))).sort((a, b) => b.score - a.score)
    const byTower = new Map<string, number>()
    for (const u of inventory.filter((u) => u.status === 'Available')) byTower.set(u.tower, (byTower.get(u.tower) ?? 0) + 1)
    const overdue = followups.filter((f) => f.status !== 'Completed' && f.date < todayISO())
    return { m, hot, byTower: [...byTower].sort((a, b) => b[1] - a[1]), overdue }
  }, [leads, payments, visits, inventory, followups])

  const context = facts
    ? `You are the sales copilot for a residential real-estate developer. Be concise, use ₹ Cr/L, and base answers on these live figures:
- Leads: ${facts.m.totalLeads}; bookings: ${facts.m.won}; lost: ${facts.m.lost}; conversion ${facts.m.conversion.toFixed(1)}%
- Collected ${formatINR(facts.m.collected)}; receivable ${formatINR(facts.m.receivable)}; overdue ${formatINR(facts.m.overdue)}
- Funnel: ${facts.m.funnel.map((f) => `${f.label} ${f.value}`).join(', ')}
- Top channels: ${facts.m.bySource.slice(0, 4).map((s) => `${s.source} ${s.leads} leads/${s.won} won`).join('; ')}
- Hot open leads: ${facts.hot.slice(0, 8).map((l) => `${l.name} (${l.score}, ${l.status}, ${l.project}, owner ${l.assignedExecutive ?? 'none'})`).join('; ')}
- Unsold units by tower: ${facts.byTower.map(([t, n]) => `${t} ${n}`).join(', ')}
- Overdue follow-ups: ${facts.overdue.length}`
    : undefined

  function fallback(q: string): string {
    if (!facts) return 'Data is still loading. Try again in a moment.'
    const t = q.toLowerCase()
    if (t.includes('call') || t.includes('first') || t.includes('priorit'))
      return `Call these first (highest score, still open):\n\n${facts.hot
        .slice(0, 5)
        .map((l) => `- **${l.name}**, score ${l.score}, ${l.status}, ${l.project.replace(/^Ai RealEstate OS /, '')}`)
        .join('\n')}${facts.overdue.length ? `\n\nAlso clear **${facts.overdue.length} overdue follow-ups**.` : ''}`
    if (t.includes('tower') || t.includes('unsold') || t.includes('stock'))
      return `Unsold homes by tower:\n\n${facts.byTower.map(([tw, n]) => `- **${tw}**: ${n} available`).join('\n')}`
    if (t.includes('draft') || t.includes('message')) {
      const l = facts.hot[0]
      return l
        ? `Hi ${l.name.split(' ')[0]}, thank you for your interest in ${l.project.replace(/^Ai RealEstate OS /, '')}. We've held a few ${l.bhkPreference ?? ''} homes with the views you asked about. Would Saturday at 11 am work for a site visit? I can arrange pickup.`
        : 'No hot leads right now.'
    }
    return `**Pipeline snapshot**\n\n- ${facts.m.totalLeads} leads, ${facts.m.won} booked (${facts.m.conversion.toFixed(1)}% conversion)\n- ${formatINR(facts.m.collected)} collected, ${formatINR(facts.m.receivable)} still due\n- ${facts.hot.length} hot leads open; ${facts.overdue.length} follow-ups overdue`
  }

  return (
    <Page className="max-w-5xl">
      <PageHeader title="Copilot" description="Ask about your pipeline, inventory and collections. Answers use live CRM data." />
      <ChatPanel
        className="rounded-xl shadow-xs"
        prompts={COPILOT_PROMPTS}
        context={context}
        fallback={fallback}
        placeholder="Ask about leads, inventory, collections…"
        intro={
          <div>
            <p className="text-lg font-semibold">What do you need to know?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {facts ? `Working from ${facts.m.totalLeads} leads, ${inventory?.length ?? 0} units and ${payments?.length ?? 0} payments.` : 'Loading live data…'}
            </p>
          </div>
        }
      />
    </Page>
  )
}
