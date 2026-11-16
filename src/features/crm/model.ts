import type { Doc } from '@convex/_generated/dataModel'

export type Lead = Doc<'leads'>
export type Followup = Doc<'followups'>
export type Payment = Doc<'payments'>
export type Builder = Doc<'builders'>
export type Broker = Doc<'brokers'>
export type SiteVisit = Doc<'siteVisits'>
export type Prediction = Doc<'predictions'>

/** Pipeline stages, in order. Must match the strings the backend and automation write to `leads.status`. */
export const PIPELINE_STAGES = [
  'New Lead',
  'Contacted',
  'Site Visit Scheduled',
  'Visited',
  'Negotiation',
  'Token Paid',
  'Loan Processing',
  'Registration',
  'Possession',
  'Closed/Lost',
] as const

export type StageGroup = 'open' | 'active' | 'won' | 'lost'

export function stageGroup(status: string): StageGroup {
  switch (status) {
    case 'New Lead':
    case 'Contacted':
      return 'open'
    case 'Site Visit Scheduled':
    case 'Visited':
    case 'Negotiation':
      return 'active'
    case 'Token Paid':
    case 'Loan Processing':
    case 'Registration':
    case 'Possession':
    case 'Booked':
      return 'won'
    case 'Closed/Lost':
      return 'lost'
    default:
      return 'open'
  }
}

export const STAGE_DOT: Record<StageGroup, string> = {
  open: 'bg-muted-foreground/60',
  active: 'bg-primary',
  won: 'bg-success',
  lost: 'bg-destructive',
}

export type Temperature = 'hot' | 'warm' | 'cold'

/** Same thresholds the old CRM used (≥80 hot). */
export function temperature(score: number): Temperature {
  if (score >= 80) return 'hot'
  if (score >= 50) return 'warm'
  return 'cold'
}

export const TEMPERATURE_BADGE: Record<Temperature, 'destructive' | 'warning' | 'secondary'> = {
  hot: 'destructive',
  warm: 'warning',
  cold: 'secondary',
}

export const LEAD_SOURCES = ['Website', 'Direct Walk-in', 'Direct Referral', 'Broker Network', 'Channel Partner VIP', 'Corporate Tie-up', 'Facebook Ads', 'Google Ads', 'Google Search']
export const PROPERTY_TYPES = ['Apartment', 'Villa', 'Plot', 'Commercial', 'Penthouse']
export const BHK_OPTIONS = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '5 BHK']
export const PURPOSES = ['Buy', 'Invest', 'Rent']
