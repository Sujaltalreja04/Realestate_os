import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from 'convex/react'
import { AlertTriangle, ArrowRight, Building2, CalendarClock, LayoutGrid, Megaphone, Sparkles, Wallet } from 'lucide-react'
import { api } from '@convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Page, PageHeader, StatCard } from '@/components/page'
import { formatINR, formatNumber, formatPercent, todayISO } from '@/lib/format'
import { salesMetrics } from './metrics'

/** A one-screen leadership briefing. Every sentence is computed from live data. */
export default function ExecutivePage() {
  const leads = useQuery(api.leads.getLeads)
  const payments = useQuery(api.crm.getPayments)
  const visits = useQuery(api.crm.getSiteVisits)
  const inventory = useQuery(api.inventory.getInventory)
  const followups = useQuery(api.crm.getFollowups)

  const data = useMemo(() => {
    if (!leads || !payments || !visits || !inventory || !followups) return null
    const m = salesMetrics(leads, payments, visits)
    const available = inventory.filter((u) => u.status === 'Available')
    const today = todayISO()
    const bestChannel = m.bySource.filter((s) => s.leads >= 2).sort((a, b) => b.won / b.leads - a.won / a.leads)[0]
    const byTower = new Map<string, number>()
    for (const u of available) byTower.set(u.tower, (byTower.get(u.tower) ?? 0) + 1)
    return {
      m,
      totalUnits: inventory.length,
      available,
      availableValue: available.reduce((s, u) => s + (u.price ?? 0), 0),
      towerMostStock: [...byTower].sort((a, b) => b[1] - a[1])[0],
      bestChannel,
      topProject: m.byProject[0],
      overdueFollowups: followups.filter((f) => f.status !== 'Completed' && f.date < today).length,
      overduePayments: payments.filter((p) => p.status === 'Overdue'),
    }
  }, [leads, payments, visits, inventory, followups])

  return (
    <Page className="max-w-6xl">
      <PageHeader
        title="Executive briefing"
        description="Where the business stands today, and what needs attention."
        actions={
          <Button variant="outline" asChild>
            <Link to="/sales/copilot">
              <Sparkles /> Ask Copilot
            </Link>
          </Button>
        }
      />

      {!data ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-[106px] rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Booked value" value={formatINR(data.m.bookedValue)} hint={`${data.m.won} bookings`} />
            <StatCard label="Collected" value={formatINR(data.m.collected)} hint={`${formatINR(data.m.receivable)} receivable`} />
            <StatCard label="Lead-to-booking" value={formatPercent(data.m.conversion, 1)} hint={`across ${data.m.totalLeads} leads`} />
            <StatCard
              label="Unsold stock"
              value={`${data.available.length} / ${data.totalUnits}`}
              hint={`${formatINR(data.availableValue)} at list price`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border bg-card shadow-xs">
              <h3 className="border-b px-5 py-3 text-sm font-semibold">Highlights</h3>
              <ul className="divide-y">
                {data.topProject && (
                  <Insight icon={Building2} title="Top project" to="/sales">
                    <strong>{data.topProject.project.replace(/^Ai RealEstate OS /, '')}</strong> leads with {data.topProject.won} bookings from{' '}
                    {data.topProject.leads} leads.
                  </Insight>
                )}
                {data.bestChannel && (
                  <Insight icon={Megaphone} title="Best-converting channel" to="/sales">
                    <strong>{data.bestChannel.source}</strong> converts {formatPercent((data.bestChannel.won / data.bestChannel.leads) * 100)} of
                    its {data.bestChannel.leads} leads to bookings.
                  </Insight>
                )}
                {data.towerMostStock && (
                  <Insight icon={LayoutGrid} title="Most unsold stock" to="/sales/inventory">
                    <strong>{data.towerMostStock[0]}</strong> has {data.towerMostStock[1]} units still available.
                  </Insight>
                )}
              </ul>
            </section>

            <section className="rounded-xl border bg-card shadow-xs">
              <h3 className="border-b px-5 py-3 text-sm font-semibold">Needs attention</h3>
              <ul className="divide-y">
                {data.overduePayments.length > 0 ? (
                  <Insight icon={Wallet} tone="danger" title="Overdue payments" to="/crm/payments">
                    {data.overduePayments.length} payments worth <strong>{formatINR(data.overduePayments.reduce((s, p) => s + p.amount, 0))}</strong> are
                    overdue.
                  </Insight>
                ) : (
                  <Insight icon={Wallet} title="Payments">
                    No overdue payments.
                  </Insight>
                )}
                {data.overdueFollowups > 0 ? (
                  <Insight icon={CalendarClock} tone="danger" title="Missed follow-ups" to="/crm/followups">
                    <strong>{formatNumber(data.overdueFollowups)}</strong> follow-ups are past their due date.
                  </Insight>
                ) : (
                  <Insight icon={CalendarClock} title="Follow-ups">
                    The team is up to date on follow-ups.
                  </Insight>
                )}
                {data.m.lost > 0 && (
                  <Insight icon={AlertTriangle} tone="warning" title="Lost deals" to="/crm/pipeline">
                    {data.m.lost} leads closed as lost. Review reasons in the pipeline.
                  </Insight>
                )}
              </ul>
            </section>
          </div>
        </>
      )}
    </Page>
  )
}

function Insight({
  icon: Icon,
  title,
  children,
  to,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: ReactNode
  to?: string
  tone?: 'danger' | 'warning'
}) {
  const iconClass = tone === 'danger' ? 'bg-destructive/10 text-destructive' : tone === 'warning' ? 'bg-warning/15 text-[oklch(0.5_0.12_70)]' : 'bg-primary/10 text-primary'
  const body = (
    <>
      <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${iconClass}`}>
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-muted-foreground">{title}</span>
        <span className="mt-0.5 block text-sm [&_strong]:font-semibold">{children}</span>
      </span>
      {to && <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground" />}
    </>
  )
  return (
    <li>
      {to ? (
        <Link to={to} className="flex items-start gap-3 px-5 py-4 hover:bg-muted/40">
          {body}
        </Link>
      ) : (
        <div className="flex items-start gap-3 px-5 py-4">{body}</div>
      )}
    </li>
  )
}
