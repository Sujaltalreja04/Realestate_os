import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from 'convex/react'
import { CalendarClock, Flame, IndianRupee, Plus, Users } from 'lucide-react'
import { api } from '@convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Page, PageHeader, StatCard } from '@/components/page'
import { formatINR, formatNumber, todayISO } from '@/lib/format'
import { stageGroup, type Lead } from './model'
import { LeadsTable } from './LeadsTable'
import { PipelineBoard } from './PipelineBoard'
import { LeadSheet } from './LeadSheet'
import { LeadFormDialog } from './LeadFormDialog'
import { FollowupsView } from './FollowupsView'
import { PaymentsView } from './PaymentsView'
import { PartnersView } from './PartnersView'

export type CrmView = 'leads' | 'pipeline' | 'followups' | 'payments' | 'partners'

const HEADERS: Record<CrmView, { title: string; description: string }> = {
  leads: { title: 'All leads', description: 'Every buyer enquiry, from first contact to possession.' },
  pipeline: { title: 'Pipeline', description: 'Drag leads between stages as deals progress.' },
  followups: { title: 'Follow-ups', description: 'Calls, visits and tasks your team owes buyers.' },
  payments: { title: 'Payments', description: 'Milestone payments across all bookings.' },
  partners: { title: 'Partners', description: 'Channel partners and developers.' },
}

export default function CrmPage({ view = 'leads' }: { view?: CrmView }) {
  const [params, setParams] = useSearchParams()
  const openLeadId = params.get('lead')
  const [creating, setCreating] = useState(false)

  // `?new=1` (from the command palette) opens the create dialog once.
  useEffect(() => {
    if (params.get('new') === '1') {
      setCreating(true)
      setParams((p) => {
        const n = new URLSearchParams(p)
        n.delete('new')
        return n
      }, { replace: true })
    }
  }, [params, setParams])

  const leads = useQuery(api.leads.getLeads)
  const followups = useQuery(api.crm.getFollowups)
  const payments = useQuery(api.crm.getPayments)
  const builders = useQuery(api.crm.getBuilders)
  const brokers = useQuery(api.crm.getBrokers)

  const setParam = (key: string, value: string | null) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p)
        if (value == null) next.delete(key)
        else next.set(key, value)
        return next
      },
      { replace: key === 'lead' ? false : true },
    )

  const openLead = (l: Lead) => setParam('lead', l._id)
  const openLeadDoc = useMemo(() => leads?.find((l) => l._id === openLeadId) ?? null, [leads, openLeadId])

  const stats = useMemo(() => {
    if (!leads || !followups || !payments) return null
    const today = todayISO()
    const live = leads.filter((l) => stageGroup(l.status) === 'open' || stageGroup(l.status) === 'active')
    return {
      total: leads.length,
      newCount: leads.filter((l) => l.status === 'New Lead').length,
      hot: live.filter((l) => l.score >= 80).length,
      pipelineValue: live.reduce((s, l) => s + (l.budget ?? 0), 0),
      liveCount: live.length,
      collected: payments.filter((p) => p.status === 'Paid').reduce((s, p) => s + p.amount, 0),
      won: leads.filter((l) => stageGroup(l.status) === 'won').length,
      due: followups.filter((f) => f.status !== 'Completed' && f.date <= today).length,
      overdue: followups.filter((f) => f.status !== 'Completed' && f.date < today).length,
    }
  }, [leads, followups, payments])

  const header = HEADERS[view]

  return (
    <Page>
      <PageHeader
        title={header.title}
        description={header.description}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus /> New lead
          </Button>
        }
      />

      {(view === 'leads' || view === 'pipeline') && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats ? (
            <>
              <StatCard label="Total leads" icon={Users} value={formatNumber(stats.total)} hint={`${stats.newCount} new, not yet contacted`} />
              <StatCard label="Hot leads" icon={Flame} value={formatNumber(stats.hot)} hint={`of ${stats.liveCount} in the live pipeline`} />
              <StatCard label="Pipeline value" icon={IndianRupee} value={formatINR(stats.pipelineValue)} hint={`${stats.won} booked · ${formatINR(stats.collected)} collected`} />
              <StatCard
                label="Follow-ups due"
                icon={CalendarClock}
                value={formatNumber(stats.due)}
                hint={stats.overdue > 0 ? <span className="text-destructive">{stats.overdue} overdue</span> : 'Nothing overdue'}
              />
            </>
          ) : (
            Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[106px] rounded-xl" />)
          )}
        </div>
      )}

      {view === 'leads' && (leads ? <LeadsTable leads={leads} onOpen={openLead} /> : <TableSkeleton />)}
      {view === 'pipeline' && (leads ? <PipelineBoard leads={leads} onOpen={openLead} /> : <Skeleton className="h-96 rounded-xl" />)}
      {view === 'followups' &&
        (followups && leads ? <FollowupsView followups={followups} leads={leads} onOpenLead={openLead} /> : <TableSkeleton />)}
      {view === 'payments' && (payments ? <PaymentsView payments={payments} /> : <TableSkeleton />)}
      {view === 'partners' && (builders && brokers ? <PartnersView builders={builders} brokers={brokers} /> : <TableSkeleton />)}

      <LeadSheet
        lead={openLeadDoc}
        followups={followups ?? []}
        payments={payments ?? []}
        onClose={() => setParam('lead', null)}
      />
      <LeadFormDialog open={creating} onOpenChange={setCreating} />
    </Page>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-px overflow-hidden rounded-xl border bg-card">
      <Skeleton className="h-12 rounded-none" />
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-12 rounded-none opacity-60" />
      ))}
    </div>
  )
}
