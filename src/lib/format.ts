const inrCompact = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })

/** ₹ amounts the way Indian real-estate teams read them: Cr / L, falling back to grouped rupees. */
export function formatINR(amount: number | undefined | null, opts: { compact?: boolean } = { compact: true }): string {
  if (amount == null || Number.isNaN(amount)) return '—'
  if (opts.compact) {
    if (Math.abs(amount) >= 1e7) return `₹${inrCompact.format(amount / 1e7)} Cr`
    if (Math.abs(amount) >= 1e5) return `₹${inrCompact.format(amount / 1e5)} L`
  }
  return `₹${Math.round(amount).toLocaleString('en-IN')}`
}

export function formatNumber(n: number) {
  return n.toLocaleString('en-IN')
}

export function formatPercent(n: number, digits = 0) {
  return `${n.toFixed(digits)}%`
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

/** Dates in this backend are free-form strings (mostly YYYY-MM-DD); show them readably when parseable. */
export function formatDate(value: string | undefined) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function relativeTime(ms: number) {
  const diff = Date.now() - ms
  const min = Math.round(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const h = Math.round(min / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function nowTimeLabel() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}
