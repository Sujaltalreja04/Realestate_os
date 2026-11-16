import { useMemo, useState } from 'react'
import { useMutation } from 'convex/react'
import { toast } from 'sonner'
import { Wallet } from 'lucide-react'
import { api } from '@convex/_generated/api'
import { Select } from '@/components/ui/select'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { EmptyState, StatCard } from '@/components/page'
import { formatDate, formatINR } from '@/lib/format'
import type { Payment } from './model'

const STATUSES = ['Paid', 'Pending', 'Overdue']

export function PaymentsView({ payments }: { payments: Payment[] }) {
  const [status, setStatus] = useState('all')
  const update = useMutation(api.crm.updatePaymentStatus)

  const totals = useMemo(() => {
    const sum = (s: string) => payments.filter((p) => p.status === s).reduce((a, p) => a + p.amount, 0)
    return { paid: sum('Paid'), pending: sum('Pending'), overdue: sum('Overdue'), gst: payments.reduce((a, p) => a + p.gstAmount, 0) }
  }, [payments])

  const rows = useMemo(
    () => payments.filter((p) => status === 'all' || p.status === status).sort((a, b) => b.date.localeCompare(a.date)),
    [payments, status],
  )

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Collected" value={formatINR(totals.paid)} />
        <StatCard label="Pending" value={formatINR(totals.pending)} />
        <StatCard label="Overdue" value={<span className={totals.overdue > 0 ? 'text-destructive' : ''}>{formatINR(totals.overdue)}</span>} />
        <StatCard label="GST billed" value={formatINR(totals.gst)} />
      </div>

      <div className="rounded-xl border bg-card shadow-xs">
        <div className="flex items-center justify-between gap-2 border-b p-3">
          <h3 className="pl-2 text-sm font-medium">Payment schedule</h3>
          <Select
            size="sm"
            className="w-36"
            aria-label="Status"
            value={status}
            onValueChange={setStatus}
            options={[{ value: 'all', label: 'All statuses' }, ...STATUSES.map((s) => ({ value: s, label: s }))]}
          />
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={Wallet} title="No payments" description="Payments recorded against bookings will appear here." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Buyer</TH>
                <TH>Milestone</TH>
                <TH>Date</TH>
                <TH className="text-right">Amount</TH>
                <TH className="hidden text-right md:table-cell">GST</TH>
                <TH className="w-36">Status</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((p) => (
                <TR key={p._id} className="hover:bg-muted/40">
                  <TD className="font-medium">{p.leadName}</TD>
                  <TD className="text-muted-foreground">{p.stage}</TD>
                  <TD className="whitespace-nowrap text-muted-foreground">{formatDate(p.date)}</TD>
                  <TD className="text-right tabular-nums">{formatINR(p.amount, { compact: false })}</TD>
                  <TD className="hidden text-right tabular-nums text-muted-foreground md:table-cell">
                    {formatINR(p.gstAmount, { compact: false })}
                  </TD>
                  <TD>
                    <Select
                      size="sm"
                      aria-label={`Status for ${p.leadName}`}
                      value={p.status}
                      onValueChange={(s) =>
                        update({ id: p._id, status: s }).then(
                          () => toast.success(`Marked ${s.toLowerCase()}`),
                          () => toast.error('Could not update payment'),
                        )
                      }
                      options={Array.from(new Set([...STATUSES, p.status])).map((s) => ({ value: s, label: s }))}
                    />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>
    </div>
  )
}
