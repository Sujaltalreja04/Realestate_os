/**
 * Demo content for screens the backend doesn't model yet (buyer account, gallery, interiors,
 * walkthroughs). Clearly fictional; replace with Convex tables when those features go live.
 */

export const IMG = {
  exteriorPool: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750',
  towerBlock: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00',
  villaDusk: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c',
  glassTower: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab',
  modernHouse: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914',
  bedroom: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304',
  living: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c',
  lounge: 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343',
  kitchen: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136',
} as const

/* ── Gallery ─────────────────────────────────────────────────── */

export type GalleryCategory = 'Exteriors' | 'Interiors' | 'Amenities' | 'Construction'

export interface GalleryItem {
  id: string
  src: string
  title: string
  project: string
  category: GalleryCategory
  tall?: boolean
}

export const GALLERY: GalleryItem[] = [
  { id: 'g1', src: IMG.towerBlock, title: 'Tower facade at dusk', project: 'Skyview', category: 'Exteriors', tall: true },
  { id: 'g2', src: IMG.living, title: 'Double-height living room', project: 'Skyview', category: 'Interiors' },
  { id: 'g3', src: IMG.exteriorPool, title: 'Poolside courtyard', project: 'Highlife', category: 'Amenities' },
  { id: 'g4', src: IMG.kitchen, title: 'Modular kitchen', project: 'Highlife', category: 'Interiors', tall: true },
  { id: 'g5', src: IMG.villaDusk, title: 'Villa garden elevation', project: 'Signature Villas', category: 'Exteriors' },
  { id: 'g6', src: IMG.bedroom, title: 'Master bedroom', project: 'Signature Villas', category: 'Interiors' },
  { id: 'g7', src: IMG.glassTower, title: 'Structure topped out, Tower C', project: 'Edge', category: 'Construction', tall: true },
  { id: 'g8', src: IMG.lounge, title: 'Residents’ lounge', project: 'Edge', category: 'Amenities' },
  { id: 'g9', src: IMG.modernHouse, title: 'Show villa entrance', project: 'Signature Villas', category: 'Exteriors' },
]

/* ── Interior studio ─────────────────────────────────────────── */

export const ROOMS = [
  { id: 'living', label: 'Living room', image: IMG.living },
  { id: 'bedroom', label: 'Bedroom', image: IMG.bedroom },
  { id: 'kitchen', label: 'Kitchen', image: IMG.kitchen },
  { id: 'lounge', label: 'Lounge', image: IMG.lounge },
] as const

export const STYLES = [
  {
    id: 'warm-minimal',
    label: 'Warm minimal',
    description: 'Oak, linen and limewash. Calm, uncluttered, easy to live with.',
    palette: ['#efe7da', '#c9b08c', '#8a6f4e', '#3b3128'],
    filter: 'sepia(0.25) saturate(0.9) brightness(1.04)',
    costPerSqft: 1800,
  },
  {
    id: 'contemporary',
    label: 'Contemporary',
    description: 'Clean lines, matte black accents and a single statement wall.',
    palette: ['#f2f2f0', '#9aa0a6', '#3c4043', '#111111'],
    filter: 'grayscale(0.35) contrast(1.08)',
    costPerSqft: 2200,
  },
  {
    id: 'indian-modern',
    label: 'Indian modern',
    description: 'Teak, brass and handloom textiles, with jaali screens for light.',
    palette: ['#f4e3c3', '#d08b3e', '#8c3b1f', '#2f4a3a'],
    filter: 'saturate(1.25) hue-rotate(-8deg) contrast(1.03)',
    costPerSqft: 2600,
  },
  {
    id: 'coastal',
    label: 'Coastal calm',
    description: 'Soft blues, cane furniture and plenty of daylight.',
    palette: ['#eef4f6', '#a9c8d3', '#5a8a9c', '#26414c'],
    filter: 'hue-rotate(12deg) saturate(0.85) brightness(1.06)',
    costPerSqft: 2000,
  },
] as const

/* ── Walkthrough (AR / VR) ───────────────────────────────────── */

export const WALKTHROUGH = [
  { id: 'entry', name: 'Entrance foyer', size: '8 × 6 ft', image: IMG.modernHouse, note: 'Shoe storage and a mirrored console on arrival.' },
  { id: 'living', name: 'Living & dining', size: '24 × 14 ft', image: IMG.living, note: 'Double-height ceiling with a 12 ft sliding door to the deck.' },
  { id: 'kitchen', name: 'Kitchen', size: '12 × 10 ft', image: IMG.kitchen, note: 'Modular kitchen with a separate utility and dry balcony.' },
  { id: 'bedroom', name: 'Master bedroom', size: '16 × 13 ft', image: IMG.bedroom, note: 'Walk-in wardrobe and an attached bath with skylight.' },
  { id: 'deck', name: 'Deck & pool', size: '30 × 12 ft', image: IMG.exteriorPool, note: 'Private deck overlooking the landscaped courtyard.' },
] as const

/* ── Buyer account (portal) ──────────────────────────────────── */

export const BUYER = {
  name: 'Ananya Mehta',
  email: 'ananya.mehta@example.com',
  phone: '+91 98XXX XX210',
  advisor: { name: 'Aarti Amin', phone: '+91 79XXX XX400' },
  booking: {
    project: 'Skyview',
    unit: 'Tower A · 1402',
    type: '3 BHK',
    area: 1850,
    price: 18500000,
    bookedOn: '2026-03-14',
    possession: 'Dec 2026',
    image: IMG.towerBlock,
  },
}

export const PAYMENT_SCHEDULE = [
  { stage: 'Booking amount', due: '2026-03-14', amount: 1850000, status: 'Paid' },
  { stage: 'Agreement (10%)', due: '2026-04-15', amount: 1850000, status: 'Paid' },
  { stage: 'Plinth completion', due: '2026-07-01', amount: 2775000, status: 'Paid' },
  { stage: '10th slab', due: '2026-10-01', amount: 2775000, status: 'Paid' },
  { stage: 'Top slab', due: '2026-12-01', amount: 2775000, status: 'Due' },
  { stage: 'Finishing', due: '2027-02-01', amount: 3700000, status: 'Upcoming' },
  { stage: 'Possession', due: '2027-04-01', amount: 2775000, status: 'Upcoming' },
] as const

export const DOCUMENTS = [
  { name: 'Allotment letter', date: '2026-03-14', size: '240 KB' },
  { name: 'Agreement for sale', date: '2026-04-15', size: '3.1 MB' },
  { name: 'Payment receipts (4)', date: '2026-10-02', size: '880 KB' },
  { name: 'RERA certificate', date: '2025-12-26', size: '410 KB' },
  { name: 'Floor plan, unit 1402', date: '2026-03-14', size: '1.2 MB' },
]

export const CONSTRUCTION_UPDATES = [
  { date: '2026-11-02', title: '14th floor slab cast', body: 'Tower A structure is now at 14 of 16 floors. Blockwork has started up to floor 9.', progress: 78 },
  { date: '2026-09-18', title: 'Facade glazing begins', body: 'Double-glazed units are being installed from the lower floors upward.', progress: 66 },
  { date: '2026-07-05', title: 'Clubhouse roof complete', body: 'The clubhouse shell is complete; pool waterproofing is under way.', progress: 54 },
]

/* ── Advisor ─────────────────────────────────────────────────── */

export const ADVISOR_PROMPTS = [
  'Which projects are ready to move in?',
  'What can I buy for under ₹2 Cr?',
  'How much home loan EMI for ₹1.5 Cr?',
  'Explain RERA and why it matters',
]

export const COPILOT_PROMPTS = [
  'Summarise this week’s pipeline',
  'Which leads should we call first today?',
  'Draft a follow-up message for a hot lead',
  'Which towers have the most unsold stock?',
]
