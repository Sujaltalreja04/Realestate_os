import { useRef, useState, type FormEvent } from 'react'
import { Loader2, Send, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Msg {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = ['Who is on floor 7?', 'Which floors have the most companies?', 'What buildings are near this one?', 'Summarise this building for an investor']

/** Inline **bold** only; everything else stays plain text (no HTML from the model is ever rendered). */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return <>{parts.map((p, i) => (p.startsWith('**') && p.endsWith('**') && p.length > 4 ? <b key={i}>{p.slice(2, -2)}</b> : p))}</>
}

/** Minimal rendering of the model's markdown: paragraphs, bullet lists, bold. */
function Formatted({ text }: { text: string }) {
  const blocks: { list: boolean; lines: string[] }[] = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) {
      blocks.push({ list: false, lines: [] })
      continue
    }
    const bullet = /^([*•-]|\d+\.)\s+/.test(line)
    const last = blocks.at(-1)
    const content = bullet ? line.replace(/^([*•-]|\d+\.)\s+/, '') : line.replace(/^#+\s*/, '')
    if (last && last.list === bullet && last.lines.length) last.lines.push(content)
    else blocks.push({ list: bullet, lines: [content] })
  }
  return (
    <div className="space-y-2">
      {blocks
        .filter((b) => b.lines.length)
        .map((b, i) =>
          b.list ? (
            <ul key={i} className="list-disc space-y-1 pl-4">
              {b.lines.map((l, j) => (
                <li key={j}>
                  <Inline text={l} />
                </li>
              ))}
            </ul>
          ) : (
            <p key={i}>
              {b.lines.map((l, j) => (
                <span key={j} className="block">
                  <Inline text={l} />
                </span>
              ))}
            </p>
          ),
        )}
    </div>
  )
}

/** Chat about the current asset. The page's asset data is sent as context; the server keeps the Sarvam key. */
export function AssetAssistant({ context }: { context: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const end = useRef<HTMLDivElement>(null)

  async function ask(q: string) {
    const question = q.trim()
    if (!question || busy) return
    const next: Msg[] = [...msgs, { role: 'user', content: question }]
    setMsgs(next)
    setText('')
    setBusy(true)
    setError(null)
    try {
      const r = await fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next, context }) })
      const j = (await r.json().catch(() => ({}))) as { content?: string; error?: string }
      if (!r.ok || !j.content) throw new Error(j.error ?? `The assistant is unavailable (HTTP ${r.status}).`)
      setMsgs([...next, { role: 'assistant', content: j.content }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The assistant is unavailable.')
    } finally {
      setBusy(false)
      // Scroll only the chat list, never the page.
      setTimeout(() => {
        const box = end.current?.parentElement
        if (box) box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' })
      }, 50)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    void ask(text)
  }

  return (
    <div className="flex h-full min-h-[320px] flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4" data-lenis-prevent>
        {msgs.length === 0 && (
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <Sparkles className="size-4 text-brand" /> Ask about this building, its offices or what is around it.
            </p>
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => void ask(s)} className="block w-full rounded-md border px-3 py-2 text-left hover:bg-accent">
                {s}
              </button>
            ))}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={cn('max-w-[92%] rounded-lg px-3 py-2 text-sm leading-relaxed', m.role === 'user' ? 'ml-auto bg-primary text-primary-foreground' : 'bg-muted')}>
            {m.role === 'user' ? m.content : <Formatted text={m.content} />}
          </div>
        ))}
        {busy && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Thinking…
          </p>
        )}
        {error && <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">{error}</p>}
        <div ref={end} />
      </div>
      <form onSubmit={submit} className="flex shrink-0 gap-2 border-t p-3">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about offices, floors, nearby assets…" className="h-9 min-w-0 flex-1 rounded-md border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" />
        <button disabled={!text.trim() || busy} className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground disabled:opacity-40" aria-label="Send">
          <Send className="size-4" />
        </button>
      </form>
      <p className="shrink-0 px-3 pb-2 text-[10px] text-muted-foreground">AI answers come only from this page&apos;s data (Sarvam). Check important facts against the records.</p>
    </div>
  )
}
