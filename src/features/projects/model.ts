import type { Doc } from '@convex/_generated/dataModel'

export type Property = Doc<'properties'>

/** Unsplash images are seeded at w=600; request a size that suits where they're shown. */
export function imageAt(url: string, width: number) {
  if (!url.includes('images.unsplash.com')) return url
  const u = new URL(url)
  u.searchParams.set('w', String(width))
  u.searchParams.set('q', width >= 1600 ? '70' : '75')
  u.searchParams.set('auto', 'format')
  return u.toString()
}

/** srcset across common widths so phones never download desktop-sized images. */
export function srcSetFor(url: string, widths = [640, 960, 1280, 1920, 2400]) {
  if (!url.includes('images.unsplash.com')) return undefined
  return widths.map((w) => `${imageAt(url, w)} ${w}w`).join(', ')
}

export function statusVariant(status: string): 'success' | 'default' | 'warning' {
  if (status === 'Ready to Move') return 'success'
  if (status === 'Newly Launched') return 'default'
  return 'warning'
}

/** "3 & 4 BHK" → [3, 4] */
export function bhkNumbers(bhk: string): number[] {
  return (bhk.match(/\d+/g) ?? []).map(Number)
}

export interface ProjectFilters {
  q: string
  location: string
  bhk: string
  budget: string
  status: string
}

export const BUDGETS = [
  { value: 'all', label: 'Any budget', test: () => true },
  { value: 'u15', label: 'Under ₹1.5 Cr', test: (p: number) => p < 1.5e7 },
  { value: '15-25', label: '₹1.5 – 2.5 Cr', test: (p: number) => p >= 1.5e7 && p <= 2.5e7 },
  { value: 'o25', label: 'Above ₹2.5 Cr', test: (p: number) => p > 2.5e7 },
]

export function matches(p: Property, f: ProjectFilters) {
  const q = f.q.trim().toLowerCase()
  return (
    (!q || [p.name, p.location, p.builder].some((x) => x?.toLowerCase().includes(q))) &&
    (f.location === 'all' || p.location === f.location) &&
    (f.bhk === 'all' || bhkNumbers(p.bhk).includes(Number(f.bhk))) &&
    (f.status === 'all' || p.status === f.status) &&
    (BUDGETS.find((b) => b.value === f.budget)?.test(p.price) ?? true)
  )
}
