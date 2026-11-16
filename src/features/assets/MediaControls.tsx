import { lazy, Suspense, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Box, Camera, Eye, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { deleteMedia, fmtBytes, putMedia, useMediaUrl } from './media'

// three.js only loads when a capture is opened.
const MediaViewer = lazy(() => import('./MediaViewer'))

/** Opens a stored 360° photo or 3D scan full screen. */
export function OpenMedia({ kind, mediaId, title, subtitle, children, className }: { kind: 'pano' | 'scan'; mediaId: string; title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open && (
        <Suspense fallback={null}>
          <MediaViewer kind={kind} mediaId={mediaId} title={title} subtitle={subtitle} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  )
}

/** Upload / view / remove one capture. Calls onChange with the new media id (or undefined when removed). */
export function MediaSlot({
  kind,
  mediaId,
  onChange,
  title,
  compact,
}: {
  kind: 'pano' | 'scan'
  mediaId?: string
  onChange: (id: string | undefined) => void
  title: string
  compact?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const { meta } = useMediaUrl(compact ? undefined : mediaId)
  const Icon = kind === 'pano' ? Camera : Box
  const label = kind === 'pano' ? '360°' : '3D scan'

  async function upload(file: File) {
    setBusy(true)
    try {
      const m = await putMedia(file, kind)
      if (mediaId) void deleteMedia(mediaId)
      onChange(m.id)
      toast.success(`${label} added (${fmtBytes(m.size)}). Save to keep it on the asset.`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="inline-flex items-center gap-1">
      <input
        ref={input}
        type="file"
        hidden
        accept={kind === 'pano' ? 'image/jpeg,image/png,image/webp' : '.glb,.gltf,model/gltf-binary'}
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void upload(f)
        }}
      />
      {mediaId ? (
        <>
          <OpenMedia kind={kind} mediaId={mediaId} title={title} className="inline-flex h-8 items-center gap-1 rounded-md border border-emerald-600/40 bg-emerald-600/10 px-2 text-xs text-emerald-800 hover:bg-emerald-600/20 dark:text-emerald-300">
            <Eye className="size-3.5" /> {label}
            {!compact && meta && <span className="text-[10px] opacity-70">· {fmtBytes(meta.size)}</span>}
          </OpenMedia>
          <button type="button" onClick={() => input.current?.click()} className="h-8 rounded-md border px-1.5 text-[11px] hover:bg-accent" title={`Replace ${label}`}>
            Replace
          </button>
          <button
            type="button"
            onClick={() => {
              void deleteMedia(mediaId)
              onChange(undefined)
            }}
            className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={`Remove ${label}`}
          >
            <X className="size-3.5" />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className={cn('inline-flex h-8 items-center gap-1 rounded-md border border-dashed px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50')}
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Icon className="size-3.5" />} {label}
        </button>
      )}
    </span>
  )
}
