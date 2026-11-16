import { useEffect, useState } from 'react'
import * as D from '@radix-ui/react-dialog'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { ClientContainer, ClientPageHeader } from '@/components/marketing'
import { ImageReveal } from '@/components/motion'
import { cn } from '@/lib/utils'
import { imageAt, srcSetFor } from '@/features/projects/model'
import { GALLERY, type GalleryCategory } from '@/data/demo'

const CATEGORIES: ('All' | GalleryCategory)[] = ['All', 'Exteriors', 'Interiors', 'Amenities', 'Construction']

export default function GalleryPage() {
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>('All')
  const [open, setOpen] = useState<number | null>(null)
  const items = GALLERY.filter((g) => cat === 'All' || g.category === cat)
  const current = open != null ? items[open] : undefined

  useEffect(() => {
    if (open == null) return
    const on = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setOpen((i) => (i == null ? i : (i + 1) % items.length))
      if (e.key === 'ArrowLeft') setOpen((i) => (i == null ? i : (i - 1 + items.length) % items.length))
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [open, items.length])

  return (
    <>
      <ClientPageHeader
        eyebrow="Gallery"
        title={
          <>
            Light, space and <em>detail.</em>
          </>
        }
        description="Photography and renders from every project, from the first slab to the finished show homes."
      />
      <ClientContainer>
        <div className="mb-8 flex flex-wrap gap-x-8 gap-y-2 border-b">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                '-mb-px border-b-2 pb-3 text-[11px] font-medium uppercase tracking-[0.22em] transition-colors',
                cat === c ? 'border-brand text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {c}
              <span className="ml-2 text-muted-foreground">{c === 'All' ? GALLERY.length : GALLERY.filter((g) => g.category === c).length}</span>
            </button>
          ))}
        </div>

        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {items.map((g, i) => (
            <button
              key={g.id}
              onClick={() => setOpen(i)}
              data-cursor="view"
              className="group mb-4 block w-full break-inside-avoid text-left"
              aria-label={`Open ${g.title}`}
            >
              <ImageReveal
                src={imageAt(g.src, 960)}
                srcSet={srcSetFor(g.src, [480, 960, 1280])}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                alt={g.title}
                className={g.tall ? 'aspect-[3/4]' : 'aspect-[4/3]'}
                imgClassName="group-hover:!scale-[1.04] !duration-700"
              />
              <div className="mt-3 flex items-baseline justify-between gap-3">
                <span className="font-display text-xl">{g.title}</span>
                <span className="shrink-0 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{g.project}</span>
              </div>
            </button>
          ))}
        </div>
      </ClientContainer>

      <D.Root open={open != null} onOpenChange={(o) => !o && setOpen(null)}>
        <D.Portal>
          <D.Content className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-white" aria-describedby={undefined}>
            <div className="flex items-center justify-between p-4 md:p-6">
              <D.Title className="font-display text-2xl">
                {current?.title} <span className="ml-2 text-sm text-white/50">{current?.project}</span>
              </D.Title>
              <D.Close className="grid size-10 place-items-center hover:bg-white/10" aria-label="Close">
                <X className="size-5" />
              </D.Close>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-8 md:px-20">
              {current && (
                <img key={current.id} src={imageAt(current.src, 2000)} alt={current.title} className="animate-reveal max-h-full max-w-full object-contain" />
              )}
              <button
                onClick={() => setOpen((i) => (i == null ? i : (i - 1 + items.length) % items.length))}
                className="absolute left-2 grid size-12 place-items-center hover:bg-white/10 md:left-6"
                aria-label="Previous"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                onClick={() => setOpen((i) => (i == null ? i : (i + 1) % items.length))}
                className="absolute right-2 grid size-12 place-items-center hover:bg-white/10 md:right-6"
                aria-label="Next"
              >
                <ChevronRight className="size-6" />
              </button>
            </div>
            <p className="pb-6 text-center text-xs tabular-nums text-white/50">
              {(open ?? 0) + 1} / {items.length}
            </p>
          </D.Content>
        </D.Portal>
      </D.Root>
    </>
  )
}
