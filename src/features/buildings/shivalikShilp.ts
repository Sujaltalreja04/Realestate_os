import type { LngLat } from '@/features/map/osm'

/**
 * Shivalik Shilp, Iskcon Cross Road, Ahmedabad.
 *
 * Building facts: CityInfo Services listing (properties.cityinfoservices.com, read Nov 2026; the listing says its data
 * comes from the landlord/operator and may not be current).
 * Office records: public company registered-office addresses. These show which companies list an office here; they are
 * not a verified tenant or ownership register, and several entities can share one office number.
 */

export interface BuildingFacts {
  id: string
  name: string
  developer: string
  address: string
  center: LngLat
  status: string
  floorsLabel: string
  /** Floors above ground (ground is floor 0). */
  topFloor: number
  builtUpSqft: number
  perFloorSqft: number
  amenities: string[]
  /** Occupants named on the listing without a floor. */
  otherOccupants: string[]
  sources: { label: string; href?: string; note: string }[]
}

export const SHIVALIK_SHILP: BuildingFacts = {
  id: 'shivalik-shilp',
  name: 'Shivalik Shilp',
  developer: 'Shivalik Group',
  address: 'Iskcon Cross Road, Sanidhya, Ahmedabad, Gujarat 380015',
  center: [72.5069855, 23.0245701],
  status: 'Operational',
  floorsLabel: 'Basement + Ground + 13 floors',
  topFloor: 13,
  builtUpSqft: 210000,
  perFloorSqft: 15000,
  amenities: ['24x7 security', 'CCTV', 'Lifts', 'Visitor parking', 'Power backup'],
  otherOccupants: [
    'DB Schenker India',
    'Xatch Software Inc',
    'Aahvan Adventures (OPC)',
    'O2h Discovery (o2h Technology)',
    'Infraveo Technologies',
    'Zen Peoplecraft India',
    'Korea Trade-Investment Promotion Agency (KOTRA)',
    'Saumya Exports',
    'De Soto Technologies',
    'Kernshell Technologies',
    'Trumoms Foods and Beverages LLP',
    'Texolver Solutions',
    'Conception I Technology',
  ],
  sources: [
    {
      label: 'CityInfo Services listing',
      href: 'https://properties.cityinfoservices.com/shivalik-shilp-iskcon-cross-road-ahmedabad/nxyk587/pjd',
      note: 'Floors, areas, amenities, coordinates and named occupants. Supplied by landlord/operator; may be out of date.',
    },
    { label: 'Public company records', note: 'Registered-office addresses of companies. Not a verified tenant or owner register.' },
    { label: 'Building photographs', note: 'Shape of the 3D model. The model is an architectural approximation, not a survey.' },
  ],
}

export interface OfficeRecord {
  company: string
  /** 0 = ground floor. */
  floor: number
  unit: string
}

export const SHIVALIK_RECORDS: OfficeRecord[] = [
  { company: 'Ecovibes Green India Pvt. Ltd.', floor: 0, unit: 'Shop 7' },
  { company: 'Apurva Parikh Trading and Commercial LLP', floor: 4, unit: '413–414' },
  { company: 'Apurva Parikh Trading and Commercial Pvt. Ltd.', floor: 4, unit: '413–414' },
  { company: 'Birva Builders LLP', floor: 4, unit: '411' },
  { company: 'Lions Gate Realty LLP', floor: 4, unit: '421' },
  { company: 'RMD Ventures LLP', floor: 4, unit: '418' },
  { company: 'HGM Corporate Finance Advisory LLP', floor: 5, unit: '522' },
  { company: '7Script Technologies Pvt. Ltd.', floor: 5, unit: '502' },
  { company: 'Ahura Real Estate Properties Pvt. Ltd.', floor: 5, unit: '511' },
  { company: 'K D Networking Management LLP', floor: 5, unit: '523' },
  { company: 'Shani Peripherals Pvt. Ltd.', floor: 5, unit: '523' },
  { company: 'Digipple Marketing & Branding Solutions LLP', floor: 6, unit: '611' },
  { company: 'Genuin Codebase LLP', floor: 6, unit: '618' },
  { company: 'Famfunind Tech Pvt. Ltd.', floor: 6, unit: '618' },
  { company: 'Samatva Dynamics (OPC) Pvt. Ltd.', floor: 6, unit: '623' },
  { company: 'THH World HR Solutions LLP', floor: 6, unit: '627' },
  { company: 'Jivika Agri International Pvt. Ltd.', floor: 7, unit: '709' },
  { company: 'Jivika Chem International Pvt. Ltd.', floor: 7, unit: '709' },
  { company: 'AUUM Education Mudita LLP', floor: 7, unit: '703' },
  { company: 'AUUM Learning Mudita LLP', floor: 7, unit: '703' },
  { company: 'AUUM Training Mudita LLP', floor: 7, unit: '703' },
  { company: 'AUUM Mudita Strategies LLP', floor: 7, unit: '703' },
  { company: 'Apicem Analytics LLP', floor: 7, unit: '723' },
  { company: 'APNTTech Pvt. Ltd.', floor: 7, unit: '729' },
  { company: 'Dweck Enterprise LLP', floor: 7, unit: '724' },
  { company: 'Arclains Spaces LLP', floor: 7, unit: '705' },
  { company: 'Blue Dice Consultants LLP', floor: 7, unit: '728' },
  { company: 'Orinda Overseas LLP', floor: 8, unit: '804' },
  { company: 'Gamezoo Studio Pvt. Ltd.', floor: 8, unit: '807' },
  { company: 'Forensic Cybertech Pvt. Ltd.', floor: 8, unit: '816' },
  { company: 'Svan Texcon Pvt. Ltd.', floor: 9, unit: '905' },
  { company: 'Uniq Data Solution Pvt. Ltd.', floor: 9, unit: '920' },
  { company: 'CAC Media LLP', floor: 9, unit: '924' },
  { company: 'Apicem Partners Pvt. Ltd.', floor: 10, unit: '1018' },
  { company: 'Niyeahma Consultants LLP', floor: 10, unit: '1013' },
  { company: 'Digipple Digital Solutions Pvt. Ltd.', floor: 10, unit: '1014' },
  { company: 'Arham City Pvt. Ltd.', floor: 10, unit: '1004' },
  { company: 'Harshdip Builders Pvt. Ltd.', floor: 11, unit: '1118' },
  { company: 'Ishaan Infrastructures and Shelters Ltd.', floor: 11, unit: '1111' },
  { company: 'Conception I Pvt. Ltd.', floor: 12, unit: '1220' },
]

export const floorName = (f: number) => (f === 0 ? 'Ground floor' : `Floor ${f}`)
export const floorShort = (f: number) => (f === 0 ? 'G' : String(f))

/** Records grouped by floor, then by office number. */
export function recordsByFloor(records: OfficeRecord[]) {
  const m = new Map<number, Map<string, string[]>>()
  for (const r of records) {
    const units = m.get(r.floor) ?? m.set(r.floor, new Map()).get(r.floor)!
    ;(units.get(r.unit) ?? units.set(r.unit, []).get(r.unit)!).push(r.company)
  }
  return m
}
