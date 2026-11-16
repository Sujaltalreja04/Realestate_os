import { useMemo, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { ClientContainer, ClientPageHeader } from '@/components/marketing'
import { ChatPanel } from '@/features/ai/ChatPanel'
import { formatINR } from '@/lib/format'
import { ADVISOR_PROMPTS } from '@/data/demo'
import type { Property } from '@/features/projects/model'

const short = (n: string) => n.replace(/^Ai RealEstate OS /, '')

export function emi(principal: number, annualRatePct: number, years: number) {
  const r = annualRatePct / 12 / 100
  const n = years * 12
  if (r === 0) return principal / n
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

/** Grounded fallback when the AI service is unreachable: answers from live project data. */
function answerFromData(q: string, ps: Property[]): string {
  const t = q.toLowerCase()
  const list = (xs: Property[]) => xs.map((p) => `- **${short(p.name)}**, ${p.location}: ${p.bhk}, from ${formatINR(p.price)} (${p.status})`).join('\n')
  if (t.includes('ready')) {
    const r = ps.filter((p) => p.status === 'Ready to Move')
    return r.length ? `These are ready to move in today:\n\n${list(r)}` : 'None of our projects are ready to move in right now; the earliest possession is listed on each project page.'
  }
  const cr = t.match(/(\d+(\.\d+)?)\s*cr/)
  if (cr && (t.includes('under') || t.includes('below') || t.includes('budget') || t.includes('buy'))) {
    const cap = parseFloat(cr[1]!) * 1e7
    const r = ps.filter((p) => p.price <= cap)
    return r.length ? `Within ${formatINR(cap)}:\n\n${list(r)}` : `Nothing starts under ${formatINR(cap)} yet. The most affordable is ${short([...ps].sort((a, b) => a.price - b.price)[0]!.name)}.`
  }
  if (t.includes('emi') || t.includes('loan')) {
    const amt = cr ? parseFloat(cr[1]!) * 1e7 : 1.5e7
    const loan = amt * 0.8
    return `For a ${formatINR(amt)} home with 20% down, a ${formatINR(loan)} loan at 8.5% over 20 years is about **${formatINR(emi(loan, 8.5, 20), { compact: false })} per month**. Use the calculator on this page to try other numbers.`
  }
  if (t.includes('rera')) {
    return 'RERA (Real Estate Regulation Act, 2016) requires projects to be registered before sale. It locks the approved plans, makes developers keep 70% of buyer money in an escrow account for construction, and sets penalties for late possession. Every one of our projects shows its RERA number on its page.'
  }
  return `Here's what we have right now:\n\n${list(ps)}\n\nAsk me about budget, possession, loans or a specific project.`
}

export default function AdvisorPage() {
  const properties = useQuery(api.properties.getProperties)
  const ps = properties ?? []
  const context = useMemo(
    () =>
      properties
        ? `You are a friendly, factual property advisor for a residential developer in Ahmedabad. Use only these projects:\n${properties
            .map((p) => `- ${short(p.name)} (${p.location}): ${p.bhk}, from ₹${(p.price / 1e7).toFixed(2)} Cr, ${p.status}, possession ${p.completion}, RERA ${p.reraNumber ?? 'listed'}, amenities: ${(p.amenities ?? []).join(', ')}`)
            .join('\n')}\nKeep answers short. Use ₹ Cr/L. Suggest booking a site visit when relevant.`
        : undefined,
    [properties],
  )

  return (
    <>
      <ClientPageHeader
        eyebrow="Advisor"
        title={
          <>
            Ask us <em>anything.</em>
          </>
        }
        description="Prices, possession dates, loans, RERA. Get a straight answer in seconds, from our AI advisor that knows every project."
      />
      <ClientContainer>
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <ChatPanel
            prompts={ADVISOR_PROMPTS}
            context={context}
            placeholder="e.g. Which 3 BHK is closest to SG Highway?"
            fallback={(q) => answerFromData(q, ps)}
            intro={
              <div>
                <p className="font-display text-3xl">Hello. What are you looking for?</p>
                <p className="mt-2 text-sm text-muted-foreground">Try one of these, or type your own question.</p>
              </div>
            }
          />
          <EmiCalculator />
        </div>
      </ClientContainer>
    </>
  )
}

function EmiCalculator() {
  const [price, setPrice] = useState(1.5e7)
  const [down, setDown] = useState(20)
  const [rate, setRate] = useState(8.5)
  const [years, setYears] = useState(20)
  const loan = price * (1 - down / 100)
  const monthly = emi(loan, rate, years)
  const total = monthly * years * 12

  const sliders = [
    { label: 'Home price', value: formatINR(price), min: 5e6, max: 6e7, step: 5e5, v: price, set: setPrice },
    { label: 'Down payment', value: `${down}%`, min: 10, max: 50, step: 5, v: down, set: setDown },
    { label: 'Interest rate', value: `${rate.toFixed(2)}%`, min: 7, max: 11, step: 0.05, v: rate, set: setRate },
    { label: 'Tenure', value: `${years} years`, min: 5, max: 30, step: 1, v: years, set: setYears },
  ]

  return (
    <aside className="h-fit border bg-card p-6 lg:sticky lg:top-24">
      <p className="text-[11px] uppercase tracking-[0.22em] text-brand">Loan calculator</p>
      <p className="mt-4 font-display text-5xl tabular-nums">{formatINR(monthly, { compact: false })}</p>
      <p className="text-sm text-muted-foreground">per month</p>
      <div className="mt-8 space-y-6">
        {sliders.map((s) => (
          <label key={s.label} className="block">
            <span className="flex justify-between text-sm">
              <span className="text-muted-foreground">{s.label}</span>
              <span className="font-medium tabular-nums">{s.value}</span>
            </span>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={s.v}
              onChange={(e) => s.set(+e.target.value)}
              className="mt-2 w-full accent-[var(--brand)]"
            />
          </label>
        ))}
      </div>
      <dl className="mt-8 grid grid-cols-2 gap-4 border-t pt-6 text-sm">
        <div>
          <dt className="text-muted-foreground">Loan amount</dt>
          <dd className="mt-0.5 font-medium">{formatINR(loan)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Total interest</dt>
          <dd className="mt-0.5 font-medium">{formatINR(total - loan)}</dd>
        </div>
      </dl>
    </aside>
  )
}
