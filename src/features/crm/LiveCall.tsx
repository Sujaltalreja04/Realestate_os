import { useEffect, useRef, useSyncExternalStore } from 'react'
import * as D from '@radix-ui/react-dialog'
import { Check, FileText, Mic, MicOff, PhoneOff, Volume2 } from 'lucide-react'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { cn } from '@/lib/utils'
import { VerdictCard, type CallAnalysis } from './CallVerdict'
import { initials } from '@/lib/format'

type Lead = Doc<'leads'>
export type CallLang = 'en' | 'hi' | 'gu'
type Line = { sender: string; text: string; time: string }
type Phase = 'dialing' | 'connected' | 'ended' | 'failed'

const LANG_CODE: Record<CallLang, 'en-IN' | 'hi-IN' | 'gu-IN'> = { en: 'en-IN', hi: 'hi-IN', gu: 'gu-IN' }
// Sarvam bulbul:v3 voices per language: [female, male]. All six verified against the API.
const VOICES: Record<CallLang, [string, string]> = { en: ['neha', 'aditya'], hi: ['ritu', 'shubh'], gu: ['shreya', 'ratan'] }
const AGENT_NAME = 'Riya'

const FEMALE_NAMES = new Set(
  'priya neha aarti sonia rhea diya ananya pooja tanvi isha kiara manisha vidya sunita kavita geeta reena seema deepa rekha kavya ishita shreya shruti suhani rupali simran poonam nisha meera lata radha anjali swati mamta sapna ritu shalini divya archana amita heena hema nita rita asha usha kiran manju sudha leela'.split(' '),
)
const isFemale = (name: string) => FEMALE_NAMES.has(name.replace(/^(dr|mr|mrs|ms)\.?\s+/i, '').split(/\s+/)[0]!.toLowerCase())

const clean = (t: string) =>
  t
    .replace(/[*_`#>]/g, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()

const chunk = (t: string, max = 480) => {
  const out: string[] = []
  let cur = ''
  for (const s of t.split(/(?<=[.!?।])\s+/)) {
    if ((cur + ' ' + s).length > max && cur) {
      out.push(cur)
      cur = s
    } else cur = cur ? `${cur} ${s}` : s
  }
  if (cur) out.push(cur)
  return out
}

const b64ToBuf = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/* ───────────────────────── Call session ─────────────────────────
 * Lives outside React so it runs exactly once per call, regardless of
 * re-renders or StrictMode's double effects. Created and started from the
 * "Start call" click, which also unlocks audio playback in the browser. */

export interface CallState {
  phase: Phase
  lines: Line[]
  current: number
  progress: number
  elapsed: number
  muted: boolean
  voice: 'sarvam' | 'browser'
  result: { summary: string; sentiment: string } | null
  error: string | null
  analysis: CallAnalysis | null
  analysisStatus: 'idle' | 'pending' | 'done' | 'failed'
}

interface Deps {
  lead: Lead
  lang: CallLang
  runAutomation: (args: { leadId: Id<'leads'>; language: string }) => Promise<{ callId: Id<'voiceCalls'>; transcript: Line[]; summary: string; sentiment: string }>
  analyze: (args: { callId: Id<'voiceCalls'> }) => Promise<CallAnalysis>
  tts: (args: { text: string; languageCode: 'en-IN' | 'hi-IN' | 'gu-IN'; speaker: string }) => Promise<string | null>
}

export class CallSession {
  readonly lead: Lead
  readonly lang: CallLang
  readonly analyser: AnalyserNode
  private deps: Deps
  private ctx: AudioContext
  private gain: GainNode
  private source: AudioBufferSourceNode | null = null
  private stopped = false
  private timer: ReturnType<typeof setInterval> | null = null
  private listeners = new Set<() => void>()
  state: CallState = {
    phase: 'dialing',
    lines: [],
    current: -1,
    progress: 0,
    elapsed: 0,
    muted: false,
    voice: 'sarvam',
    result: null,
    error: null,
    analysis: null,
    analysisStatus: 'idle',
  }

  constructor(deps: Deps) {
    this.deps = deps
    this.lead = deps.lead
    this.lang = deps.lang
    // Must be created inside the click handler so the browser allows sound.
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.ctx = new Ctx()
    void this.ctx.resume()
    this.gain = this.ctx.createGain()
    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = 128
    this.analyser.connect(this.gain)
    this.gain.connect(this.ctx.destination)
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  getState = () => this.state
  private set(patch: Partial<CallState>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((l) => l())
  }

  setMuted(muted: boolean) {
    this.gain.gain.value = muted ? 0 : 1
    if (muted) window.speechSynthesis?.pause()
    else window.speechSynthesis?.resume()
    this.set({ muted })
  }

  hangUp() {
    this.stopped = true
    try {
      this.source?.stop()
    } catch {
      /* already stopped */
    }
    window.speechSynthesis?.cancel()
    if (this.timer) clearInterval(this.timer)
    if (this.state.phase !== 'failed') this.set({ phase: 'ended' })
  }

  dispose() {
    this.hangUp()
    this.listeners.clear()
    void this.ctx.close()
  }

  async start() {
    const stopRing = this.ringback()
    const ringStarted = performance.now()
    let script: Line[]
    try {
      const res = await this.deps.runAutomation({ leadId: this.lead._id, language: this.lang })
      script = res.transcript
      this.set({ lines: script, result: { summary: res.summary, sentiment: res.sentiment }, analysisStatus: 'pending' })
      // Judge the lead from the transcript while the call plays; shown when it ends.
      this.deps.analyze({ callId: res.callId }).then(
        (analysis) => this.set({ analysis, analysisStatus: 'done' }),
        () => this.set({ analysisStatus: 'failed' }),
      )
    } catch (err) {
      stopRing()
      this.set({ phase: 'failed', error: err instanceof Error ? err.message : 'Call could not be placed' })
      return
    }

    // Fetch the first two lines while it rings, then stay two lines ahead.
    const cache = new Map<number, Promise<AudioBuffer[] | null>>()
    const prefetch = (i: number) => {
      if (i < script.length && !cache.has(i)) cache.set(i, this.fetchAudio(script[i]!))
    }
    prefetch(0)
    prefetch(1)
    await Promise.all([wait(Math.max(0, 4200 - (performance.now() - ringStarted))), cache.get(0)])
    stopRing()
    if (this.stopped) return

    this.set({ phase: 'connected' })
    this.timer = setInterval(() => this.set({ elapsed: this.state.elapsed + 1 }), 1000)
    await wait(500)

    for (let i = 0; i < script.length; i++) {
      if (this.stopped) return
      prefetch(i + 1)
      prefetch(i + 2)
      this.set({ current: i, progress: 0 })
      const bufs = await cache.get(i)!
      if (this.stopped) return
      if (bufs) await this.play(bufs)
      else {
        this.set({ voice: 'browser' })
        await this.speakBrowser(script[i]!)
      }
      await wait(350)
    }
    if (!this.stopped) {
      if (this.timer) clearInterval(this.timer)
      this.set({ phase: 'ended' })
    }
  }

  private async fetchAudio(line: Line): Promise<AudioBuffer[] | null> {
    try {
      const speaker = line.sender === 'agent' ? VOICES[this.lang][0] : VOICES[this.lang][isFemale(this.lead.name) ? 0 : 1]
      const parts = chunk(clean(line.text))
      const b64s = await Promise.all(parts.map((text) => this.deps.tts({ text, languageCode: LANG_CODE[this.lang], speaker })))
      if (b64s.some((b) => !b)) return null
      return await Promise.all(b64s.map((b) => this.ctx.decodeAudioData(b64ToBuf(b!))))
    } catch (err) {
      console.warn('[LiveCall] Sarvam audio unavailable, using browser voice:', err)
      return null
    }
  }

  private async play(bufs: AudioBuffer[]) {
    if (this.ctx.state !== 'running') await this.ctx.resume()
    const total = bufs.reduce((s, b) => s + b.duration, 0)
    let done = 0
    for (const buf of bufs) {
      if (this.stopped) return
      await new Promise<void>((resolve) => {
        const src = this.ctx.createBufferSource()
        src.buffer = buf
        src.connect(this.analyser)
        this.source = src
        const start = this.ctx.currentTime
        const tick = () => {
          if (this.source !== src) return
          this.set({ progress: Math.min(1, (done + (this.ctx.currentTime - start)) / total) })
          requestAnimationFrame(tick)
        }
        src.onended = () => {
          done += buf.duration
          resolve()
        }
        src.start()
        tick()
      })
    }
    this.source = null
    this.set({ progress: 1 })
  }

  private speakBrowser(line: Line) {
    return new Promise<void>((resolve) => {
      const synth = window.speechSynthesis
      const text = clean(line.text)
      if (!synth) {
        const ms = Math.max(1500, text.split(' ').length * 330)
        const t0 = performance.now()
        const tick = () => {
          const k = (performance.now() - t0) / ms
          this.set({ progress: Math.min(1, k) })
          if (k < 1 && !this.stopped) requestAnimationFrame(tick)
          else resolve()
        }
        tick()
        return
      }
      const u = new SpeechSynthesisUtterance(text)
      u.lang = LANG_CODE[this.lang]
      const voices = synth.getVoices().filter((v) => v.lang.startsWith(LANG_CODE[this.lang].slice(0, 2)))
      if (voices.length) u.voice = voices[line.sender === 'agent' ? 0 : Math.min(1, voices.length - 1)]!
      u.pitch = line.sender === 'agent' ? 1.1 : isFemale(this.lead.name) ? 1.05 : 0.85
      const words = text.split(/\s+/).length
      let spoken = 0
      u.onboundary = (e) => {
        if (e.name === 'word') this.set({ progress: Math.min(1, ++spoken / words) })
      }
      u.onend = () => {
        this.set({ progress: 1 })
        resolve()
      }
      u.onerror = () => resolve()
      synth.speak(u)
    })
  }

  /** Indian ringback: 400+450 Hz, 0.4s on / 0.2s off / 0.4s on / 2s off. */
  private ringback() {
    const ctx = this.ctx
    const g = ctx.createGain()
    g.gain.value = 0
    g.connect(this.gain)
    const oscs = [400, 450].map((f) => {
      const o = ctx.createOscillator()
      o.frequency.value = f
      o.connect(g)
      o.start()
      return o
    })
    const t0 = ctx.currentTime + 0.05
    for (let k = 0; k < 20; k++) {
      const t = t0 + k * 3
      g.gain.setValueAtTime(0.08, t)
      g.gain.setValueAtTime(0, t + 0.4)
      g.gain.setValueAtTime(0.08, t + 0.6)
      g.gain.setValueAtTime(0, t + 1.0)
    }
    return () => {
      g.gain.cancelScheduledValues(ctx.currentTime)
      g.gain.value = 0
      oscs.forEach((o) => {
        try {
          o.stop()
        } catch {
          /* already stopped */
        }
      })
      g.disconnect()
    }
  }
}

/* ───────────────────────── UI ───────────────────────── */

export function LiveCall({ session, onClose }: { session: CallSession | null; onClose: () => void }) {
  return (
    <D.Root open={!!session} onOpenChange={(o) => !o && onClose()}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <D.Content
          onPointerDownOutside={(e) => e.preventDefault()}
          className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6"
          aria-describedby={undefined}
        >
          {session && <CallScreen session={session} onClose={onClose} />}
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}

function CallScreen({ session, onClose }: { session: CallSession; onClose: () => void }) {
  const s = useSyncExternalStore(session.subscribe, session.getState)
  const { lead, lang } = session
  const transcriptEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [s.current, s.lines.length])

  const speaking = s.phase === 'connected' && s.current >= 0 ? s.lines[s.current]?.sender : undefined
  const mmss = `${String(Math.floor(s.elapsed / 60)).padStart(2, '0')}:${String(s.elapsed % 60).padStart(2, '0')}`

  return (
    <div className="relative flex h-full w-full max-w-5xl flex-col overflow-hidden bg-zinc-950 text-white shadow-2xl md:h-[min(760px,100%)] md:flex-row md:rounded-2xl">
      <D.Title className="sr-only">Call with {lead.name}</D.Title>

      <section className="relative flex flex-col items-center justify-between gap-6 bg-gradient-to-b from-zinc-900 to-zinc-950 px-6 py-8 md:w-[380px] md:shrink-0">
        <div className="flex w-full items-center justify-between text-xs text-white/50">
          <span className="flex items-center gap-1.5">
            <span className={cn('size-1.5 rounded-full', s.phase === 'connected' ? 'animate-pulse bg-emerald-400' : s.phase === 'dialing' ? 'bg-amber-400' : 'bg-white/30')} />
            {s.phase === 'dialing' ? 'Dialing' : s.phase === 'connected' ? 'Live' : s.phase === 'failed' ? 'Failed' : 'Call ended'}
          </span>
          <span>AI agent · {AGENT_NAME}</span>
        </div>

        <div className="flex flex-col items-center text-center">
          <div className="relative grid size-32 place-items-center">
            {s.phase === 'dialing' &&
              [0, 1, 2].map((k) => (
                <span key={k} className="absolute inset-0 rounded-full border border-emerald-400/40" style={{ animation: `call-ring 2.4s ${k * 0.8}s ease-out infinite` }} />
              ))}
            <span
              className={cn(
                'relative grid size-28 place-items-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 text-3xl font-semibold ring-4 transition-all duration-300',
                speaking === 'lead' ? 'scale-105 ring-emerald-400/70' : 'ring-white/10',
              )}
            >
              {initials(lead.name)}
            </span>
          </div>
          <h2 className="mt-6 text-2xl font-semibold">{lead.name}</h2>
          <p className="mt-1 text-sm text-white/55">{lead.phone}</p>
          <p className="mt-4 font-mono text-lg tabular-nums text-white/80">
            {s.phase === 'dialing' ? 'Ringing…' : s.phase === 'failed' ? '—' : mmss}
          </p>
        </div>

        <Waveform analyser={session.analyser} active={s.phase === 'connected' && !!speaking} synthetic={s.voice === 'browser'} tone={speaking === 'agent' ? 'agent' : 'lead'} />

        {s.phase === 'ended' || s.phase === 'failed' ? (
          <button onClick={onClose} className="h-12 w-full rounded-full bg-white text-sm font-semibold text-zinc-900 hover:bg-white/90">
            Close
          </button>
        ) : (
          <div className="flex items-center gap-6">
            <button
              onClick={() => session.setMuted(!s.muted)}
              className={cn('grid size-14 place-items-center rounded-full transition-colors', s.muted ? 'bg-white text-zinc-900' : 'bg-white/10 hover:bg-white/20')}
              aria-label={s.muted ? 'Unmute' : 'Mute'}
            >
              {s.muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
            </button>
            <button onClick={() => session.hangUp()} className="grid size-16 place-items-center rounded-full bg-red-500 shadow-lg shadow-red-500/30 hover:bg-red-600" aria-label="End call">
              <PhoneOff className="size-6" />
            </button>
            <span className="grid size-14 place-items-center rounded-full bg-white/10" title={s.voice === 'sarvam' ? 'Sarvam AI voice' : 'Browser voice'}>
              <Volume2 className="size-5" />
            </span>
          </div>
        )}
      </section>

      <section className="flex min-h-0 flex-1 flex-col border-t border-white/10 md:border-l md:border-t-0">
        <header className="border-b border-white/10 px-6 py-4">
          <p className="text-sm font-medium">Live transcript</p>
          <p className="text-xs text-white/45">
            {lead.project.replace(/^Ai RealEstate OS /, '')} · {lang === 'en' ? 'English' : lang === 'hi' ? 'Hindi' : 'Gujarati'} ·{' '}
            {s.voice === 'sarvam' ? 'Sarvam AI voice' : 'Browser voice (Sarvam unavailable)'}
          </p>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5" data-lenis-prevent>
          {s.phase === 'dialing' && <p className="text-sm text-white/40">Connecting to {lead.name.split(' ')[0]}…</p>}
          {s.phase === 'failed' && <p className="text-sm text-red-300">{s.error}</p>}
          {s.lines.slice(0, s.phase === 'ended' ? s.lines.length : s.current + 1).map((l, i) => {
            const agent = l.sender === 'agent'
            const live = i === s.current && s.phase === 'connected'
            const words = clean(l.text).split(' ')
            const shown = live ? words.slice(0, Math.max(1, Math.ceil(words.length * s.progress))).join(' ') : clean(l.text)
            return (
              <div key={i} className={cn('flex animate-reveal gap-3 [animation-duration:0.35s]', !agent && 'flex-row-reverse')}>
                <span className={cn('grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold', agent ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-white/80')}>
                  {agent ? AGENT_NAME[0] : initials(lead.name)}
                </span>
                <div className={cn('max-w-[80%]', !agent && 'text-right')}>
                  <p className="mb-1 text-[11px] text-white/40">
                    {agent ? `${AGENT_NAME} (AI)` : lead.name.split(' ')[0]} · {l.time}
                  </p>
                  <p className={cn('inline-block rounded-2xl px-4 py-2.5 text-left text-sm leading-relaxed', agent ? 'rounded-tl-sm bg-white/[0.07]' : 'rounded-tr-sm bg-emerald-500/15')}>
                    {shown}
                    {live && s.progress < 1 && <span className="ml-0.5 inline-block h-3.5 w-0.5 translate-y-0.5 animate-pulse bg-white/70" />}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={transcriptEnd} />
        </div>

        {s.phase === 'ended' && s.result && (
          <footer className="animate-reveal max-h-[55%] overflow-y-auto border-t border-white/10 bg-white/[0.03] px-6 py-5" data-lenis-prevent>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/45">Worth more time?</p>
            {s.analysis ? (
              <VerdictCard a={s.analysis} dark />
            ) : s.analysisStatus === 'pending' ? (
              <p className="flex items-center gap-2 text-sm text-white/60"><span className="size-2 animate-pulse rounded-full bg-emerald-400" /> Analysing the conversation…</p>
            ) : (
              <p className="text-sm text-white/60">Analysis unavailable. You can run it later from the call log.</p>
            )}
            <div className="mt-5" />
            <p className="text-xs font-medium uppercase tracking-wider text-white/45">Call outcome</p>
            <p className="mt-2 text-sm text-white/85">{s.result.summary}</p>
            <ul className="mt-4 flex flex-wrap gap-2 text-xs">
              <Outcome>Sentiment: {s.result.sentiment}</Outcome>
              <Outcome icon={<FileText className="size-3.5" />}>Brochure sent</Outcome>
              <Outcome>Follow-up booked for tomorrow</Outcome>
              <Outcome>Moved to Contacted</Outcome>
            </ul>
          </footer>
        )}
      </section>
    </div>
  )
}

function Outcome({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-200">
      {icon ?? <Check className="size-3.5" />}
      {children}
    </li>
  )
}

/** Live bars from the audio analyser (or a synthetic shimmer for browser speech, which can't be tapped). */
function Waveform({ analyser, active, synthetic, tone }: { analyser: AnalyserNode; active: boolean; synthetic: boolean; tone: 'agent' | 'lead' }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const g = c.getContext('2d')!
    const data = new Uint8Array(analyser.frequencyBinCount)
    let raf = 0
    const BARS = 32
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw)
      const w = (c.width = c.clientWidth * devicePixelRatio)
      const h = (c.height = c.clientHeight * devicePixelRatio)
      g.clearRect(0, 0, w, h)
      if (!synthetic) analyser.getByteFrequencyData(data)
      const color = tone === 'agent' ? '52,211,153' : '255,255,255'
      for (let i = 0; i < BARS; i++) {
        let v: number
        if (!active) v = 0.06
        else if (synthetic) v = 0.2 + 0.5 * Math.abs(Math.sin(t / 180 + i * 0.7) * Math.sin(t / 310 + i))
        else v = Math.max(0.06, (data[Math.floor((i / BARS) * data.length * 0.7)] ?? 0) / 255)
        const bh = v * h
        const bw = (w / BARS) * 0.55
        const x = (i + 0.225) * (w / BARS)
        g.fillStyle = `rgba(${color},${active ? 0.35 + v * 0.65 : 0.2})`
        g.beginPath()
        g.roundRect(x, (h - bh) / 2, bw, bh, bw / 2)
        g.fill()
      }
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [analyser, active, synthetic, tone])
  return <canvas ref={ref} className="h-16 w-full max-w-[260px]" aria-hidden />
}
