import {
  BarChart3,
  Box,
  Briefcase,
  Building2,
  CalendarClock,
  Columns3,
  Glasses,
  Handshake,
  Home,
  Image,
  KanbanSquare,
  LayoutGrid,
  Map,
  MessageSquareText,
  Network,
  PhoneCall,
  Swords,
  Search,
  Sofa,
  Sparkles,
  UserRound,
  Users,
  Wallet,
  Wand2,
  type LucideIcon,
} from 'lucide-react'

/**
 * The platform is three products, each with its own URL space and layout:
 *   Client site  /         public, buyer-facing website
 *   CRM          /crm      lead management for the sales team
 *   Sales OS     /sales    analytics, inventory and leadership tools
 */
export type AppId = 'client' | 'crm' | 'sales'

export interface NavItem {
  path: string
  label: string
  description: string
  icon: LucideIcon
  /** Only match this exact path (for index routes like /crm). */
  end?: boolean
}

export interface NavGroup {
  label?: string
  items: NavItem[]
}

export interface AppDef {
  id: AppId
  name: string
  tagline: string
  base: string
  icon: LucideIcon
  groups: NavGroup[]
}

export const CLIENT_NAV: NavItem[] = [
  { path: '/', label: 'Home', description: 'Start here', icon: Home, end: true },
  { path: '/projects', label: 'Projects', description: 'All developments', icon: Building2 },
  { path: '/finder', label: 'Find a home', description: 'Match homes to your needs', icon: Search },
  { path: '/compare', label: 'Compare', description: 'Side-by-side comparison', icon: Columns3 },
  { path: '/map', label: 'Map', description: 'India & Gujarat map with borders, satellite and search', icon: Map },
  { path: '/gallery', label: 'Gallery', description: 'Renders and virtual tours', icon: Image },
  { path: '/township', label: '3D township', description: 'Explore the site in 3D', icon: Box },
  { path: '/interior', label: 'Interior designer', description: 'Style your rooms with AI', icon: Sofa },
  { path: '/ar', label: 'AR / VR', description: 'Immersive walkthroughs', icon: Glasses },
  { path: '/advisor', label: 'AI advisor', description: 'Ask about any property', icon: MessageSquareText },
  { path: '/portal', label: 'My account', description: 'Bookings, payments and documents', icon: UserRound },
]

export const APPS: Record<AppId, AppDef> = {
  client: {
    id: 'client',
    name: 'Client site',
    tagline: 'Public website for buyers',
    base: '/',
    icon: Building2,
    groups: [{ items: CLIENT_NAV }],
  },
  crm: {
    id: 'crm',
    name: 'CRM',
    tagline: 'Leads and follow-ups',
    base: '/crm',
    icon: Users,
    groups: [
      {
        label: 'Leads',
        items: [
          { path: '/crm', label: 'All leads', description: 'Every buyer enquiry', icon: Users, end: true },
          { path: '/crm/pipeline', label: 'Pipeline', description: 'Leads by stage', icon: KanbanSquare },
          { path: '/crm/followups', label: 'Follow-ups', description: 'Calls and tasks due', icon: CalendarClock },
        ],
      },
      {
        label: 'Deals',
        items: [
          { path: '/crm/payments', label: 'Payments', description: 'Milestone collections', icon: Wallet },
          { path: '/crm/partners', label: 'Partners', description: 'Brokers and developers', icon: Handshake },
        ],
      },
      {
        label: 'Automation',
        items: [{ path: '/crm/tools', label: 'Automation & AI', description: 'Voice calls, drip, coaching', icon: Wand2 }],
      },
    ],
  },
  sales: {
    id: 'sales',
    name: 'Sales OS',
    tagline: 'Performance and inventory',
    base: '/sales',
    icon: BarChart3,
    groups: [
      {
        label: 'Performance',
        items: [
          { path: '/sales', label: 'Analytics', description: 'Funnel, channels and revenue', icon: BarChart3, end: true },
          { path: '/sales/executive', label: 'Executive', description: 'Leadership briefing', icon: Briefcase },
          { path: '/sales/calls', label: 'Call insights', description: 'Which leads are worth more time', icon: PhoneCall },
          { path: '/sales/competitors', label: 'Competitors', description: 'AI competitor analysis', icon: Swords },
        ],
      },
      {
        label: 'Operations',
        items: [
          { path: '/sales/inventory', label: 'Inventory', description: 'Unit availability by tower', icon: LayoutGrid },
          { path: '/sales/assets', label: 'Assets', description: 'Buildings, floors and offices on the map', icon: Building2 },
          { path: '/sales/copilot', label: 'Copilot', description: 'Ask questions about your data', icon: Sparkles },
        ],
      },
      {
        label: 'Platform',
        items: [{ path: '/sales/architecture', label: 'Architecture', description: 'Systems and data flows', icon: Network }],
      },
    ],
  },
}

export const APP_LIST: AppDef[] = [APPS.client, APPS.crm, APPS.sales]

export function appForPath(pathname: string): AppDef {
  if (pathname === '/crm' || pathname.startsWith('/crm/')) return APPS.crm
  if (pathname === '/sales' || pathname.startsWith('/sales/')) return APPS.sales
  return APPS.client
}

/** Client nav split: header links, the Explore mega-menu, and the account link. */
export const CLIENT_PRIMARY = CLIENT_NAV.filter((i) => ['/projects', '/finder', '/compare', '/map'].includes(i.path))
export const CLIENT_EXPLORE = CLIENT_NAV.filter((i) => ['/gallery', '/township', '/interior', '/ar', '/advisor'].includes(i.path))
export const CLIENT_ACCOUNT = CLIENT_NAV.find((i) => i.path === '/portal')!

/** Best nav item for a path: exact match first, then longest prefix. */
export function navItemForPath(pathname: string): { app: AppDef; group?: NavGroup; item?: NavItem } {
  const app = appForPath(pathname)
  let best: { group: NavGroup; item: NavItem } | undefined
  for (const group of app.groups)
    for (const item of group.items) {
      const hit = pathname === item.path || (!item.end && pathname.startsWith(item.path + '/'))
      if (hit && (!best || item.path.length > best.item.path.length)) best = { group, item }
    }
  return { app, ...best }
}

/**
 * Legacy tab ids (old #hash links and the old monolith's internal navigation) → new routes.
 */
export const LEGACY_TAB_TO_PATH: Record<string, string> = {
  landing: '/projects',
  finder: '/finder',
  compare: '/compare',
  'gis-map': '/map',
  visualize: '/gallery',
  '3d-township': '/township',
  interior: '/interior',
  'ar-viewer': '/ar',
  'ai-advisor': '/advisor',
  'customer-portal': '/portal',
  leads: '/crm',
  'sales-analytics': '/sales',
  'exec-insights': '/sales/executive',
  inventory: '/sales/inventory',
  copilot: '/sales/copilot',
  architecture: '/sales/architecture',
}
