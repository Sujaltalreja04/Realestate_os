import { useMemo } from 'react'
import { useQuery } from 'convex/react'
import { CalendarCheck, IndianRupee, Percent, Users } from 'lucide-react'
import { api } from '@convex/_generated/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { BarList, Funnel, Panel } from '@/components/charts'
import { Page, PageHeader, StatCard } from '@/components/page'
import { formatINR, formatNumber, formatPercent } from '@/lib/format'
import { Avatar } from '@/features/crm/parts'
import { salesMetrics } from './metrics'

export default function AnalyticsPage() {
  const leads = useQuery(api.leads.getLeads)
  const payments = useQuery(api.crm.getPayments)
  const visits = useQuery(api.crm.getSiteVisits)

  const m = useMemo(() => (leads && payments && visits ? salesMetrics(leads, payments, visits) : null), [leads, payments, visits])

  return (
    <Page>
      <PageHeader title="Sales analytics" description="Live from the CRM: where leads come from, where they drop off, and what's been collected." />

      {!m ? (
        <AnalyticsSkeleton />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Leads" icon={Users} value={formatNumber(m.totalLeads)} hint={`${m.lost} closed or lost`} />
            <StatCard label="Site visits" icon={CalendarCheck} value={formatNumber(m.siteVisits)} hint="Scheduled and completed" />
            <StatCard label="Lead-to-booking" icon={Percent} value={formatPercent(m.conversion, 1)} hint={`${m.won} bookings`} />
            <StatCard
              label="Collected"
              icon={IndianRupee}
              value={formatINR(m.collected)}
              hint={
                m.overdue > 0 ? (
                  <span className="text-destructive">{formatINR(m.overdue)} overdue</span>
                ) : (
                  `${formatINR(m.receivable)} still due`
                )
              }
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <Panel title="Sales funnel" description="Leads that have reached each stage; % is conversion from the step before" className="lg:col-span-3">
              <Funnel steps={m.funnel} />
            </Panel>
            <Panel title="Leads by channel" description="Bookings shown under each channel" className="lg:col-span-2">
              <BarList
                data={m.bySource.slice(0, 7).map((s) => ({
                  label: s.source,
                  value: s.leads,
                  hint: s.won ? `${s.won} booked · ${Math.round((s.won / s.leads) * 100)}% conversion` : undefined,
                }))}
              />
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Bookings by project" description="Booked value uses each buyer's stated budget">
              <BarList
                data={m.byProject.map((p) => ({
                  label: p.project.replace(/^Ai RealEstate OS /, ''),
                  value: p.won,
                  display: `${p.won} / ${p.leads}`,
                  hint: p.value ? formatINR(p.value) : undefined,
                }))}
              />
            </Panel>
            <Panel title="Collections by milestone" description="Payments marked paid">
              <BarList
                empty="No payments collected yet"
                data={m.byMilestone.map((s) => ({ label: s.stage, value: s.amount, display: formatINR(s.amount) }))}
              />
            </Panel>
          </div>

          <div className="rounded-xl border bg-card shadow-xs">
            <div className="border-b px-5 py-3">
              <h3 className="text-sm font-semibold">Team performance</h3>
              <p className="text-xs text-muted-foreground">By assigned executive</p>
            </div>
            <Table>
              <THead>
                <TR>
                  <TH>Executive</TH>
                  <TH className="text-right">Leads</TH>
                  <TH className="text-right">Hot</TH>
                  <TH className="text-right">Bookings</TH>
                  <TH className="text-right">Conversion</TH>
                </TR>
              </THead>
              <TBody>
                {m.byOwner.map((o) => (
                  <TR key={o.owner}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <Avatar name={o.owner} />
                        <span className="font-medium">{o.owner}</span>
                      </div>
                    </TD>
                    <TD className="text-right tabular-nums">{o.leads}</TD>
                    <TD className="text-right tabular-nums">{o.hot}</TD>
                    <TD className="text-right tabular-nums">{o.won}</TD>
                    <TD className="text-right tabular-nums">{formatPercent(o.leads ? (o.won / o.leads) * 100 : 0)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </>
      )}
    </Page>
  )
}

function AnalyticsSkeleton() {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[106px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Skeleton className="h-72 rounded-xl lg:col-span-3" />
        <Skeleton className="h-72 rounded-xl lg:col-span-2" />
      </div>
    </>
  )
}
