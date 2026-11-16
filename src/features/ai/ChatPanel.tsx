import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useAction } from 'convex/react'
import { ArrowUp, RotateCcw, Sparkles } from 'lucide-react'
import { api } from '@convex/_generated/api'
import { cn } from '@/lib/utils'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  /** Which model answered; 'offline' when the built-in fallback was used. */
  model?: string
}

const MODEL_LABEL: Record<string, string> = {
  gemma4: 'Gemma 4 via Sarvam',
  'sarvam-105b-conversations': 'Sarvam 105B',
  offline: 'Offline answer from live data',
}

interface ChatPanelProps {
  /** Shown above the conversation before the first message. */
  intro: ReactNode
  prompts: string[]
  placeholder?: string
  /** Extra context prepended to the first user turn (e.g. live portfolio facts). */
  context?: string
  /** Answer used if the AI service is unavailable, so the UI never dead-ends. */
  fallback: (question: string) => string
  className?: string
}

/** Minimal markdown: paragraphs, bullet lists and **bold**. Avoids injecting HTML from the model. */
function renderText(text: string) {
  const blocks = text.trim().split(/\n{2,}/)
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
    )
  return blocks.map((b, i) => {
    const lines = b.split('\n')
    if (lines.every((l) => /^\s*([-*•]|\d+\.)\s+/.test(l)))
      return (
        <ul key={i} className="list-disc space-y-1 pl-5">
          {lines.map((l, j) => (
            <li key={j}>{inline(l.replace(/^\s*([-*•]|\d+\.)\s+/, ''))}</li>
          ))}
        </ul>
      )
    return (
      <p key={i} className="whitespace-pre-line">
        {inline(b)}
      </p>
    )
  })
}

export function ChatPanel({ intro, prompts, placeholder = 'Ask anything…', context, fallback, className }: ChatPanelProps) {
  const chat = useAction(api.ai.copilotChat)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, pending])

  async function send(text: string) {
    const q = text.trim()
    if (!q || pending) return
    const next: ChatMessage[] = [...messages, { role: 'user', content: q }]
    setMessages(next)
    setInput('')
    setPending(true)
    try {
      const payload = next.map((m, i) =>
        i === 0 && context && m.role === 'user' ? { ...m, content: `${context}\n\nQuestion: ${m.content}` } : m,
      )
      const res = await chat({ messages: payload.map(({ role, content }) => ({ role, content })) })
      setMessages((m) => [...m, res.content ? { role: 'assistant', content: res.content, model: res.model } : { role: 'assistant', content: fallback(q), model: 'offline' }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: fallback(q), model: 'offline' }])
    } finally {
      setPending(false)
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    void send(input)
  }

  return (
    <div className={cn('flex min-h-[560px] flex-col border bg-card', className)}>
      <div className="flex-1 space-y-6 overflow-y-auto p-5 md:p-8" data-lenis-prevent>
        {messages.length === 0 ? (
          <div className="space-y-8">
            {intro}
            <div className="grid gap-2 sm:grid-cols-2">
              {prompts.map((p) => (
                <button
                  key={p}
                  onClick={() => void send(p)}
                  className="border px-4 py-3 text-left text-sm transition-colors hover:border-brand hover:bg-accent"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="ml-auto max-w-[85%] bg-primary px-4 py-3 text-sm text-primary-foreground">
                {m.content}
              </div>
            ) : (
              <div key={i} className="flex max-w-[92%] gap-3">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center bg-brand/15 text-brand">
                  <Sparkles className="size-3.5" />
                </span>
                <div className="space-y-3 text-sm leading-relaxed">
                  {renderText(m.content)}
                  {m.model && <p className="text-[11px] text-muted-foreground">{MODEL_LABEL[m.model] ?? m.model}</p>}
                </div>
              </div>
            ),
          )
        )}
        {pending && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="grid size-7 place-items-center bg-brand/15 text-brand">
              <Sparkles className="size-3.5 animate-pulse" />
            </span>
            Thinking…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="flex items-end gap-2 border-t p-3">
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => setMessages([])}
            className="grid size-10 shrink-0 place-items-center text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="New conversation"
          >
            <RotateCcw className="size-4" />
          </button>
        )}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void send(input)
            }
          }}
          rows={1}
          placeholder={placeholder}
          aria-label="Message"
          className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          disabled={!input.trim() || pending}
          className="grid size-10 shrink-0 place-items-center bg-primary text-primary-foreground transition-opacity disabled:opacity-30"
          aria-label="Send"
        >
          <ArrowUp className="size-4" />
        </button>
      </form>
    </div>
  )
}
