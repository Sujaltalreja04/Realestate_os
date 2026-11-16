import { Building, Handshake } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { EmptyState } from '@/components/page'
import { formatINR } from '@/lib/format'
import type { Broker, Builder } from './model'
import { Avatar } from './parts'

export function PartnersView({ builders, brokers }: { builders: Builder[]; brokers: Broker[] }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-xl border bg-card shadow-xs">
        <div className="border-b px-5 py-3">
          <h3 className="text-sm font-medium">Channel partners</h3>
          <p className="text-xs text-muted-foreground">Brokers referring buyers, by commission earned</p>
        </div>
        {brokers.length === 0 ? (
          <EmptyState icon={Handshake} title="No brokers yet" />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Broker</TH>
                <TH className="text-right">Referrals</TH>
                <TH className="text-right">Commission</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {[...brokers]
                .sort((a, b) => b.commissionEarned - a.commissionEarned)
                .map((b) => (
                  <TR key={b._id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <Avatar name={b.name} />
                        <div className="min-w-0">
                          <div className="truncate font-medium">{b.name}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {b.agency} · RERA {b.reraNumber}
                          </div>
                        </div>
                      </div>
                    </TD>
                    <TD className="text-right tabular-nums">{b.leadReferralsCount}</TD>
                    <TD className="text-right tabular-nums">{formatINR(b.commissionEarned)}</TD>
                    <TD>
                      <Badge variant={b.status === 'Active' ? 'success' : 'secondary'}>{b.status}</Badge>
                    </TD>
                  </TR>
                ))}
            </TBody>
          </Table>
        )}
      </div>

      <div className="rounded-xl border bg-card shadow-xs">
        <div className="border-b px-5 py-3">
          <h3 className="text-sm font-medium">Developers</h3>
          <p className="text-xs text-muted-foreground">Builders and their commission terms</p>
        </div>
        {builders.length === 0 ? (
          <EmptyState icon={Building} title="No developers yet" />
        ) : (
          <ul className="divide-y">
            {builders.map((b) => (
              <li key={b._id} className="space-y-2 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">{b.company}</div>
                    <div className="text-xs text-muted-foreground">
                      {b.name} · {b.contact}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{b.commissionAgreement}</span>
                </div>
                {b.activeProjects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {b.activeProjects.map((p) => (
                      <Badge key={p} variant="outline">
                        {p}
                      </Badge>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
