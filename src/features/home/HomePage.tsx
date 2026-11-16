import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from 'convex/react'
import { ArrowDown, ArrowRight, ArrowUpRight, Box, MessageSquareText, PlayCircle, Sofa } from 'lucide-react'
import { api } from '@convex/_generated/api'
import { Skeleton } from '@/components/ui/skeleton'
import { CountUp, Eyebrow, HeroSearch, Marquee, Reveal, Section, SectionHeader } from '@/components/marketing'
import { formatINR } from '@/lib/format'
import { imageAt, srcSetFor, type Property } from '@/features/projects/model'
import { ENTRANCE_DELAY, ImageReveal, SplitHeading, scrollToId, useParallax } from '@/components/motion'

const HERO_IMAGE = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00'
const INTENT_IMAGE = 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750'

const STANDARDS = [
  { title: 'Transparency', body: 'RERA numbers, prices and possession dates published up front.' },
  { title: 'Quality', body: 'Every slab, finish and fitting checked against a written standard.' },
  { title: 'Sustainability', body: 'Green open space, rainwater harvesting and EV-ready parking.' },
  { title: 'Community', body: 'Clubhouses, gardens and courts designed for neighbours to meet.' },
  { title: 'Technology', body: 'Walk every home in 3D before a single site visit.' },
]

const TOOLS = [
  { to: '/township', icon: Box, title: '3D township', body: 'Fly through towers, amenities and approach roads.' },
  { to: '/gallery', icon: PlayCircle, title: 'Virtual tours', body: 'Step inside furnished sample homes from anywhere.' },
  { to: '/interior', icon: Sofa, title: 'Interior studio', body: 'See your rooms styled in minutes, with AI.' },
  { to: '/advisor', icon: MessageSquareText, title: 'Advisor', body: 'Straight answers on pricing, loans and RERA.' },
]

const shortName = (n: string) => n.replace(/^Ai RealEstate OS /, '')

export default function HomePage() {
  const properties = useQuery(api.properties.getProperties)
  const inventory = useQuery(api.inventory.getInventory)
  const heroImg = useParallax<HTMLImageElement>(0.25)

  const data = useMemo(() => {
    const list = properties ?? []
    return {
      projects: [...list].sort((a, b) => b.stats.inquiries - a.stats.inquiries),
      locations: Array.from(new Set(list.map((p) => p.location))),
      enquiries: list.reduce((s, p) => s + p.stats.inquiries, 0),
      amenities: new Set(list.flatMap((p) => p.amenities ?? [])).size,
    }
  }, [properties])

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative -mt-16 flex h-[100svh] min-h-[640px] flex-col justify-end overflow-hidden bg-zinc-950 text-white">
        <div className="absolute inset-0 animate-slow-zoom">
          <img
            ref={heroImg}
            src={imageAt(HERO_IMAGE, 1920)}
            srcSet={srcSetFor(HERO_IMAGE)}
            sizes="100vw"
            alt=""
            fetchPriority="high"
            className="absolute inset-x-0 -top-[10%] h-[120%] w-full object-cover will-change-transform"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/40" />
        <div className="relative mx-auto w-full max-w-[1400px] px-4 pb-16 md:px-6 md:pb-24">
          <p className="animate-reveal text-sm uppercase tracking-[0.35em] text-white/70" style={{ animationDelay: `${ENTRANCE_DELAY}ms` }}>
            Builders of
          </p>
          <SplitHeading as="h1" delay={ENTRANCE_DELAY + 100} className="font-display text-[clamp(4rem,14vw,12rem)] leading-[0.9] tracking-tight">
            <em>Landmarks</em>
          </SplitHeading>
          <div
            className="animate-reveal mt-8 flex flex-wrap items-end justify-between gap-6 border-t border-white/20 pt-6"
            style={{ animationDelay: `${ENTRANCE_DELAY + 450}ms` }}
          >
            <p className="max-w-md text-base text-white/75 md:text-lg">
              Homes across Ahmedabad and GIFT City, designed to outlast trends and built to be lived in.
            </p>
            <a
              href="#intent"
              onClick={(e) => {
                e.preventDefault()
                scrollToId('intent')
              }}
              className="inline-flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-white/80 hover:text-white"
            >
              Scroll <ArrowDown className="size-4 animate-bounce" />
            </a>
          </div>
        </div>
      </section>

      {/* ── Search band ── */}
      <div className="border-b bg-card">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 py-6 md:flex-row md:items-center md:px-6">
          <p className="shrink-0 font-display text-2xl md:w-56">Find your home</p>
          <HeroSearch locations={data.locations} className="max-w-none flex-1" />
        </div>
      </div>

      {/* ── Intent ── */}
      <Section id="intent">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
          <Reveal>
            <ImageReveal
              src={imageAt(INTENT_IMAGE, 1280)}
              srcSet={srcSetFor(INTENT_IMAGE, [640, 960, 1280, 1600])}
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="aspect-[4/5]"
            />
          </Reveal>
          <Reveal delay={120} className="flex flex-col justify-center">
            <Eyebrow>Beyond the build</Eyebrow>
            <SplitHeading className="mt-6 font-display text-5xl leading-[0.98] tracking-tight md:text-6xl lg:text-7xl">
              A home is where <em className="text-brand">life</em> moves forward.
            </SplitHeading>
            <div className="mt-10 max-w-lg space-y-5 text-base leading-relaxed text-muted-foreground md:text-lg">
              <p>We start with how a family will live: morning light, the walk to school, a quiet corner to read.</p>
              <p>Then we design the building around it, and publish every number that matters before you ask.</p>
              <p>The result is a home that holds its value because it holds up to daily life.</p>
            </div>
            <Link
              to="/projects"
              className="group mt-10 inline-flex w-fit items-center gap-3 border-b border-foreground pb-1 text-sm font-medium uppercase tracking-[0.2em]"
            >
              Our projects <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </div>
      </Section>

      {/* ── Numbers ── */}
      <section className="border-y bg-primary text-primary-foreground">
        <dl className="mx-auto grid max-w-[1400px] grid-cols-2 divide-primary-foreground/15 md:grid-cols-4 md:divide-x">
          {[
            { label: 'Projects', value: properties?.length },
            { label: 'Neighbourhoods', value: properties ? data.locations.length : undefined },
            { label: 'Homes planned', value: inventory?.length },
            { label: 'Buyer enquiries', value: properties ? data.enquiries : undefined, suffix: '+' },
          ].map((s) => (
            <div key={s.label} className="px-4 py-12 md:px-10 md:py-16">
              <dd className="font-display text-6xl leading-none md:text-7xl">
                {s.value == null ? '—' : <CountUp value={s.value} suffix={s.suffix} />}
              </dd>
              <dt className="mt-4 text-[11px] uppercase tracking-[0.28em] opacity-60">{s.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Projects, as alternating editorial blocks ── */}
      <Section>
        <Reveal>
          <SectionHeader
            eyebrow="Portfolio"
            title={
              <>
                Addresses with <em>character</em>
              </>
            }
            description={`${properties?.length ?? 'Our'} developments. One standard.`}
          />
        </Reveal>
        <div className="mt-20 space-y-24 md:space-y-36">
          {properties === undefined
            ? Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="aspect-[16/9] rounded-none" />)
            : data.projects.map((p, i) => <ProjectBlock key={p._id} p={p} index={i} />)}
        </div>
      </Section>

      {/* ── Standard ── */}
      <section className="border-t bg-muted/50 py-24 md:py-32">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6">
          <Reveal>
            <SectionHeader
              eyebrow="How we build"
              title={
                <>
                  The <em>standard</em>
                </>
              }
              description="Five commitments behind every project."
            />
          </Reveal>
        </div>
        <Marquee className="mt-16">
          {STANDARDS.map((s, i) => (
            <div key={s.title} className="mr-6 flex w-80 shrink-0 flex-col border bg-card p-8 md:w-96">
              <span className="font-display text-5xl text-brand">0{i + 1}</span>
              <h3 className="mt-10 font-display text-3xl">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </Marquee>
      </section>

      {/* ── Digital tools ── */}
      <Section>
        <div className="grid gap-16 lg:grid-cols-[1fr_1.3fr]">
          <Reveal>
            <SectionHeader
              eyebrow="Before you visit"
              title={
                <>
                  See it from <em>anywhere</em>
                </>
              }
              description="Tools that answer the questions a brochure can't."
            />
          </Reveal>
          <ul className="divide-y border-y">
            {TOOLS.map((t, i) => (
              <li key={t.to}>
                <Reveal delay={i * 80}>
                  <Link to={t.to} className="group grid grid-cols-[3rem_1fr_auto] items-center gap-4 py-7 md:grid-cols-[4rem_1fr_1.2fr_auto]">
                    <span className="font-display text-2xl text-muted-foreground">0{i + 1}</span>
                    <span className="flex items-center gap-3 font-display text-3xl md:text-4xl">
                      <t.icon className="hidden size-5 text-brand md:block" />
                      {t.title}
                    </span>
                    <span className="hidden text-sm text-muted-foreground md:block">{t.body}</span>
                    <ArrowUpRight className="size-6 text-muted-foreground transition-all group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-brand" />
                  </Link>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* ── Closing ── */}
      <section className="relative overflow-hidden bg-zinc-950 text-white">
        <img src={imageAt(HERO_IMAGE, 1280)} srcSet={srcSetFor(HERO_IMAGE, [640, 1280, 1920])} sizes="100vw" alt="" loading="lazy" className="absolute inset-0 size-full object-cover opacity-30" />
        <div className="relative mx-auto max-w-[1400px] px-4 py-28 text-center md:px-6 md:py-40">
          <Reveal>
            <Eyebrow className="justify-center text-[oklch(0.8_0.08_70)]">Visit us</Eyebrow>
            <SplitHeading className="mx-auto mt-6 max-w-4xl font-display text-5xl leading-[0.98] md:text-7xl lg:text-8xl">
              Walk through it <em>in person.</em>
            </SplitHeading>
            <p className="mx-auto mt-6 max-w-lg text-white/70">
              Pick a project and book a free site visit. An advisor will confirm by phone, and can arrange pickup.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link
                to="/projects"
                className="inline-flex h-12 items-center gap-3 bg-white px-8 text-xs font-medium uppercase tracking-[0.22em] text-zinc-900 transition-colors hover:bg-white/90"
              >
                Book a site visit <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/advisor"
                className="inline-flex h-12 items-center gap-3 border border-white/40 px-8 text-xs font-medium uppercase tracking-[0.22em] transition-colors hover:bg-white/10"
              >
                Ask an advisor
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}

function ProjectBlock({ p, index }: { p: Property; index: number }) {
  const flip = index % 2 === 1
  return (
    <article className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
      <Reveal className={flip ? 'lg:order-2 lg:col-span-7 lg:col-start-6' : 'lg:col-span-7'}>
        <Link to={`/projects/${p._id}`} data-cursor="view" className="group block" aria-label={`View ${shortName(p.name)}`}>
          <ImageReveal
            src={imageAt(p.image, 1280)}
            srcSet={srcSetFor(p.image, [640, 960, 1280, 1600])}
            sizes="(min-width: 1024px) 58vw, 100vw"
            alt={shortName(p.name)}
            className="aspect-[4/3]"
            imgClassName="group-hover:!scale-[1.04] !duration-[1.2s]"
          />
        </Link>
      </Reveal>
      <Reveal delay={120} className={flip ? 'lg:order-1 lg:col-span-5' : 'lg:col-span-5'}>
        <div className="flex items-baseline gap-4 text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
          <span className="font-display text-4xl normal-case tracking-normal text-brand">{String(index + 1).padStart(2, '0')}</span>
          {p.location} · {p.status}
        </div>
        <SplitHeading as="h3" delay={200} className="mt-6 font-display text-5xl leading-none md:text-6xl">
          {shortName(p.name)}
        </SplitHeading>
        <p className="mt-6 max-w-md text-muted-foreground">
          {p.bhk} residences{p.builder ? ` by ${p.builder}` : ''},{' '}
          {p.completion === 'Ready' ? 'ready to move in today' : `with possession from ${p.completion}`}.
        </p>
        {p.amenities && p.amenities.length > 0 && (
          <ul className="mt-6 flex flex-wrap gap-2">
            {p.amenities.slice(0, 4).map((a) => (
              <li key={a} className="border px-3 py-1 text-xs text-muted-foreground">
                {a}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-10 flex items-end justify-between gap-6 border-t pt-6">
          <div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Starting from</div>
            <div className="mt-1 font-display text-3xl">{formatINR(p.price)}</div>
          </div>
          <Link
            to={`/projects/${p._id}`}
            className="group inline-flex items-center gap-3 border-b border-foreground pb-1 text-xs font-medium uppercase tracking-[0.2em]"
          >
            Explore <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </Reveal>
    </article>
  )
}
