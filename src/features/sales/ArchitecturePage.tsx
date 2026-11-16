import { ArrowDown, Bot, Building2, Cloud, Database, Map, Mic, Users, BarChart3, type LucideIcon } from 'lucide-react'
import { Page, PageHeader } from '@/components/page'

interface Node {
  icon: LucideIcon
  title: string
  body: string
  tags: string[]
}

const APPS: Node[] = [
  { icon: Building2, title: 'Client site', body: 'Public site for buyers: projects, search, compare, 3D, map, advisor, account.', tags: ['/', 'React', 'MapLibre', 'three.js'] },
  { icon: Users, title: 'CRM', body: 'Leads, pipeline, follow-ups, payments, partners and AI call automation.', tags: ['/crm', 'Realtime'] },
  { icon: BarChart3, title: 'Sales OS', body: 'Analytics, executive briefing, inventory and the data copilot.', tags: ['/sales', 'Derived metrics'] },
]

const BACKEND: Node = {
  icon: Database,
  title: 'Convex backend',
  body: 'Typed queries, mutations and actions over one database. Every screen subscribes live, so changes appear everywhere instantly.',
  tags: ['leads', 'properties', 'inventory', 'payments', 'followups', 'siteVisits', 'voiceCalls', 'predictions', 'activityStream'],
}

const SERVICES: Node[] = [
  { icon: Bot, title: 'Sarvam chat', body: 'Gemma 4 (with Sarvam 105B as fallback) powers the copilot and buyer advisor, called from a Convex action so the key stays server-side.', tags: ['ai.copilotChat', 'gemma4'] },
  { icon: Mic, title: 'Sarvam voice', body: 'Bulbul v3 text-to-speech for live AI calls in English, Hindi and Gujarati.', tags: ['ai.textToSpeech'] },
  { icon: Map, title: 'Map tiles', body: 'Esri satellite and OpenStreetMap basemaps for the GIFT City GIS view.', tags: ['MapLibre GL'] },
  { icon: Cloud, title: 'Vercel', body: 'Static hosting with SPA rewrites and immutable asset caching.', tags: ['vercel.json'] },
]

const FLOWS = [
  { title: 'Buyer books a visit', steps: ['Project page form', 'leads.addLead', 'crm.addSiteVisit', 'Appears in CRM instantly'] },
  { title: 'AI call sequence', steps: ['CRM › Automation', 'automation.executePipelineAutomation', 'voiceCalls + followups written', 'Lead moves to Contacted'] },
  { title: 'Leadership briefing', steps: ['Sales OS › Executive', 'Live queries', 'Metrics derived in the browser', 'No stale reports'] },
]

export default function ArchitecturePage() {
  return (
    <Page className="max-w-6xl">
      <PageHeader title="Architecture" description="How the three apps, the backend and external services fit together." />

      <Tier label="Apps">
        <div className="grid gap-3 md:grid-cols-3">
          {APPS.map((n) => (
            <NodeCard key={n.title} n={n} />
          ))}
        </div>
      </Tier>
      <Connector />
      <Tier label="Backend">
        <NodeCard n={BACKEND} highlight />
      </Tier>
      <Connector />
      <Tier label="Services">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((n) => (
            <NodeCard key={n.title} n={n} />
          ))}
        </div>
      </Tier>

      <section className="pt-6">
        <h3 className="text-sm font-semibold">Key flows</h3>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {FLOWS.map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-5 shadow-xs">
              <p className="text-sm font-medium">{f.title}</p>
              <ol className="mt-4 space-y-2">
                {f.steps.map((s, i) => (
                  <li key={s} className="flex items-start gap-3 text-sm">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-medium text-primary">{i + 1}</span>
                    <span className={/\./.test(s) ? 'font-mono text-xs leading-5' : ''}>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>
    </Page>
  )
}

function Tier({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      {children}
    </section>
  )
}

function Connector() {
  return (
    <div className="flex justify-center py-1 text-muted-foreground" aria-hidden>
      <ArrowDown className="size-5" />
    </div>
  )
}

function NodeCard({ n, highlight }: { n: Node; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border bg-card p-5 shadow-xs ${highlight ? 'border-primary/40 ring-1 ring-primary/15' : ''}`}>
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <n.icon className="size-4" />
        </span>
        <h4 className="font-semibold">{n.title}</h4>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{n.body}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {n.tags.map((t) => (
          <code key={t} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
            {t}
          </code>
        ))}
      </div>
    </div>
  )
}
