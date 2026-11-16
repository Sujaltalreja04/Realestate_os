import { Download, FileText, Phone } from 'lucide-react'
import { ClientContainer, ClientPageHeader } from '@/components/marketing'
import { ImageReveal } from '@/components/motion'
import { formatDate, formatINR } from '@/lib/format'
import { cn } from '@/lib/utils'
import { imageAt } from '@/features/projects/model'
import { BUYER, CONSTRUCTION_UPDATES, DOCUMENTS, PAYMENT_SCHEDULE } from '@/data/demo'

export default function PortalPage() {
  const b = BUYER.booking
  const paid = PAYMENT_SCHEDULE.filter((p) => p.status === 'Paid').reduce((s, p) => s + p.amount, 0)
  const total = PAYMENT_SCHEDULE.reduce((s, p) => s + p.amount, 0)
  const next = PAYMENT_SCHEDULE.find((p) => p.status !== 'Paid')
  const progress = CONSTRUCTION_UPDATES[0]!.progress

  return (
    <>
      <ClientPageHeader
        eyebrow="My account"
        title={
          <>
            Welcome back, <em>{BUYER.name.split(' ')[0]}.</em>
          </>
        }
        description="Your home, payments and documents in one place."
      />
      <ClientContainer className="space-y-16">
        <div className="mx-auto -mt-6 max-w-[1400px] border border-dashed border-brand/50 bg-brand/5 px-4 py-2 text-xs text-muted-foreground">
          Demo account: sample data shown until buyer sign-in is connected.
        </div>

        {/* Booking */}
        <section className="grid gap-8 border bg-card md:grid-cols-[1.1fr_1fr]">
          <ImageReveal src={imageAt(b.image, 1200)} className="aspect-[4/3] md:aspect-auto md:min-h-[360px]" />
          <div className="flex flex-col p-6 md:p-10">
            <p className="text-[11px] uppercase tracking-[0.22em] text-brand">Your home</p>
            <h2 className="mt-3 font-display text-5xl">{b.project}</h2>
            <p className="mt-1 text-muted-foreground">
              {b.unit} · {b.type} · {b.area.toLocaleString('en-IN')} sq.ft
            </p>
            <div className="mt-8">
              <div className="flex justify-between text-sm">
                <span>Construction</span>
                <span className="tabular-nums">{progress}%</span>
              </div>
              <div className="mt-2 h-1.5 bg-muted">
                <div className="h-full bg-brand" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Expected possession {b.possession}</p>
            </div>
            <dl className="mt-auto grid grid-cols-2 gap-6 border-t pt-6 text-sm">
              <div>
                <dt className="text-muted-foreground">Paid so far</dt>
                <dd className="mt-1 font-display text-3xl">{formatINR(paid)}</dd>
                <dd className="text-xs text-muted-foreground">of {formatINR(total)}</dd>
              </div>
              {next && (
                <div>
                  <dt className="text-muted-foreground">Next instalment</dt>
                  <dd className="mt-1 font-display text-3xl">{formatINR(next.amount)}</dd>
                  <dd className="text-xs text-muted-foreground">
                    {next.stage} · due {formatDate(next.due)}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </section>

        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          {/* Payment schedule */}
          <section>
            <h3 className="font-display text-3xl">Payment schedule</h3>
            <ol className="mt-6 border-l">
              {PAYMENT_SCHEDULE.map((p) => (
                <li key={p.stage} className="relative pb-6 pl-6 last:pb-0">
                  <span
                    className={cn(
                      'absolute -left-[5px] top-1.5 size-2.5 rounded-full border-2',
                      p.status === 'Paid' ? 'border-brand bg-brand' : p.status === 'Due' ? 'border-brand bg-background' : 'border-border bg-background',
                    )}
                  />
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{p.stage}</span>
                    <span className="tabular-nums">{formatINR(p.amount, { compact: false })}</span>
                  </div>
                  <div className="mt-0.5 flex justify-between text-xs text-muted-foreground">
                    <span>{formatDate(p.due)}</span>
                    <span className={cn(p.status === 'Due' && 'font-medium text-brand')}>{p.status}</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <div className="space-y-12">
            <section>
              <h3 className="font-display text-3xl">Documents</h3>
              <ul className="mt-6 divide-y border-y">
                {DOCUMENTS.map((d) => (
                  <li key={d.name}>
                    <button className="group flex w-full items-center gap-3 py-3.5 text-left text-sm">
                      <FileText className="size-4 text-muted-foreground" />
                      <span className="flex-1">{d.name}</span>
                      <span className="text-xs text-muted-foreground">{d.size}</span>
                      <Download className="size-4 text-muted-foreground transition-colors group-hover:text-brand" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
            <section className="border bg-card p-6">
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Your advisor</p>
              <p className="mt-2 font-display text-3xl">{BUYER.advisor.name}</p>
              <p className="mt-4 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                <Phone className="size-3.5" /> {BUYER.advisor.phone}
              </p>
            </section>
          </div>
        </div>

        {/* Construction updates */}
        <section>
          <h3 className="font-display text-3xl">Construction updates</h3>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {CONSTRUCTION_UPDATES.map((u) => (
              <li key={u.date} className="border bg-card p-6">
                <p className="text-xs text-muted-foreground">{formatDate(u.date)}</p>
                <p className="mt-3 font-display text-2xl">{u.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{u.body}</p>
                <p className="mt-6 text-xs tabular-nums text-brand">{u.progress}% complete</p>
              </li>
            ))}
          </ol>
        </section>
      </ClientContainer>
    </>
  )
}
