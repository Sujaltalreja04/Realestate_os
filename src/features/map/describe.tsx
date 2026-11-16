import type { ReactNode } from 'react'
import { BUILDINGS, INFRASTRUCTURE, PARCELS, STATUS, ZONES } from '@/data/giftCityGIS.js'
import { formatINR } from '@/lib/format'
import type { Property } from '@/features/projects/model'
import type { UnitView } from '@/features/client/units'
import { Missing, type Fact, type Source } from './provenance'
import { buildingHeight, POI_META, type LngLat, type OsmArea, type OsmPoi } from './osm'
import { fmtCoord, ringAreaM2 } from './geo'
import { LOCALITY_COORDS } from './places'

export type DemoBuilding = (typeof BUILDINGS)[number]
export type DemoParcel = (typeof PARCELS)[number]
export type DemoInfra = (typeof INFRASTRUCTURE)[number]

export type Selection =
  | { kind: 'project'; property: Property; units: UnitView[] }
  | { kind: 'osm'; area: OsmArea }
  | { kind: 'poi'; poi: OsmPoi }
  | { kind: 'demo-parcel'; parcel: DemoParcel }
  | { kind: 'demo-building'; building: DemoBuilding }
  | { kind: 'demo-infra'; infra: DemoInfra }
  | { kind: 'place'; name: string; center: LngLat; osmId?: string }

export interface DocLink {
  label: string
  href?: string
  source: Source
  note?: string
}

export interface Described {
  id: string
  title: string
  subtitle: string
  kindLabel: string
  source: Source
  center: LngLat
  image?: string
  overview: Fact[]
  documents: DocLink[]
  /** Short note shown under the title when the whole record has caveats. */
  caveat?: ReactNode
}

const shortName = (n: string) => n.replace(/^Ai RealEstate OS /, '')
const toLngLat = (pts: number[][]) => pts.map(([lat, lng]) => [lng!, lat!] as LngLat)
const centroid = (pts: LngLat[]): LngLat => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length]
const sqft = (m2: number) => m2 * 10.7639
const fmtArea = (m2: number) => `${Math.round(m2).toLocaleString('en-IN')} m² (${Math.round(sqft(m2)).toLocaleString('en-IN')} sq.ft)`

const LANDUSE_LABEL: Record<string, string> = {
  construction: 'Construction site',
  commercial: 'Commercial',
  residential: 'Residential',
  retail: 'Retail',
  industrial: 'Industrial',
  grass: 'Grass / open land',
  recreation_ground: 'Recreation ground',
  farmland: 'Farmland',
  brownfield: 'Brownfield',
  greenfield: 'Greenfield',
}

/** Turn any selection into a uniform, provenance-labelled description. */
export function describe(sel: Selection): Described {
  switch (sel.kind) {
    case 'project': {
      const p = sel.property
      const loc = LOCALITY_COORDS[p.location]
      const units = sel.units.filter((u) => u.project?._id === p._id)
      const avail = units.filter((u) => u.unit.status === 'Available')
      return {
        id: `project:${p._id}`,
        title: shortName(p.name),
        subtitle: `${p.location}, Ahmedabad`,
        kindLabel: 'Residential project',
        source: 'platform',
        center: loc?.center ?? [72.55, 23.03],
        image: p.image,
        caveat: 'Pin shows the locality centre; the listing has no exact site address.',
        overview: [
          { label: 'Developer', value: p.builder?.replace(/^Ai RealEstate OS/, 'RealEstate OS') ?? null, source: 'platform' },
          { label: 'Status', value: p.status, source: 'platform' },
          { label: 'Possession', value: p.completion === 'Ready' ? 'Ready now' : p.completion, source: 'platform' },
          { label: 'Configuration', value: p.bhk, source: 'platform' },
          { label: 'Starting price', value: formatINR(p.price), source: 'platform' },
          {
            label: 'Available units',
            value: units.length ? `${avail.length} of ${units.length} listed` : null,
            source: 'platform',
            note: units.length ? 'From inventory, matched to the project by tower.' : undefined,
          },
          { label: 'RERA no.', value: p.reraNumber ? <span className="font-mono text-xs">{p.reraNumber}</span> : null, source: 'platform', note: 'Verify on the GujRERA portal (link in Documents).' },
          { label: 'Location', value: loc ? `${loc.label} (approximate)` : p.location, source: 'estimate', note: loc ? `Locality centroid from OpenStreetMap (${loc.osm}).` : undefined },
          { label: 'Coordinates', value: loc ? fmtCoord(loc.center) : null, source: 'estimate', note: 'Locality-level, not the plot.' },
        ],
        documents: [
          ...(p.brochure ? [{ label: 'Project brochure (PDF)', href: p.brochure, source: 'platform' as const }] : []),
          ...units
            .filter((u) => u.unit.floorPlan)
            .slice(0, 3)
            .map((u) => ({ label: `Floor plan · ${u.unit.tower} ${u.unit.unit} (${u.unit.type})`, href: u.unit.floorPlan, source: 'platform' as const })),
          {
            label: 'Verify RERA registration (GujRERA)',
            href: 'https://gujrera.gujarat.gov.in/',
            source: 'verified',
            note: p.reraNumber ? `Search for ${p.reraNumber}` : undefined,
          },
          { label: 'Land records (AnyROR Gujarat)', href: 'https://anyror.gujarat.gov.in/', source: 'verified', note: 'Official 7/12 and ownership records.' },
        ],
      }
    }

    case 'osm': {
      const a = sel.area
      const t = a.tags
      const ring = a.geometry.type === 'Polygon' ? (a.geometry.coordinates[0] as LngLat[]) : []
      const area = ringAreaM2(ring)
      if (a.kind === 'road') {
        return {
          id: a.id,
          title: a.name ?? 'Unnamed road',
          subtitle: (t.highway ?? 'road').replace(/_/g, ' '),
          kindLabel: 'Road',
          source: 'verified',
          center: a.center,
          overview: [
            { label: 'Road class', value: (t.highway ?? '').replace(/_/g, ' '), source: 'verified' },
            { label: 'Reference', value: t.ref ?? null, source: 'verified' },
            { label: 'Lanes', value: t.lanes ?? null, source: 'verified' },
            { label: 'Speed limit', value: t.maxspeed ? `${t.maxspeed} km/h` : null, source: 'verified' },
            { label: 'Surface', value: t.surface ?? null, source: 'verified' },
            { label: 'One-way', value: t.oneway === 'yes' ? 'Yes' : t.oneway ? 'No' : null, source: 'verified' },
          ],
          documents: [{ label: 'View on OpenStreetMap', href: `https://www.openstreetmap.org/${a.id}`, source: 'verified' }],
        }
      }
      if (a.kind === 'landuse') {
        return {
          id: a.id,
          title: a.name ?? LANDUSE_LABEL[t.landuse ?? ''] ?? `Land use: ${t.landuse}`,
          subtitle: 'Land-use area',
          kindLabel: 'Land parcel (land use)',
          source: 'verified',
          center: a.center,
          caveat: 'OpenStreetMap land use describes how land looks on the ground. It is not a legal zoning or cadastral plot record.',
          overview: [
            { label: 'Land use', value: LANDUSE_LABEL[t.landuse ?? ''] ?? t.landuse, source: 'verified' },
            { label: 'Area', value: area ? fmtArea(area) : null, source: 'estimate', note: 'Calculated from the mapped boundary.' },
            { label: 'Centroid', value: fmtCoord(a.center), source: 'estimate' },
            { label: 'Boundary', value: `${ring.length - 1} vertices`, source: 'verified' },
            { label: 'Ownership', value: <Missing>Not published in open data</Missing>, source: 'verified', note: 'Check AnyROR / Sub-Registrar records.' },
            { label: 'Zoning / FSI', value: <Missing>Not available</Missing>, source: 'verified', note: 'Statutory zoning comes from the GUDA / AUDA development plan.' },
            { label: 'Market price', value: <Missing>No verified price</Missing>, source: 'verified' },
          ],
          documents: [
            { label: 'View on OpenStreetMap', href: `https://www.openstreetmap.org/${a.id}`, source: 'verified' },
            { label: 'Land records (AnyROR Gujarat)', href: 'https://anyror.gujarat.gov.in/', source: 'verified' },
          ],
        }
      }
      const h = buildingHeight(t)
      const levels = t['building:levels'] ? Number(t['building:levels']) : undefined
      const underConstruction = t.building === 'construction' || !!t.construction
      return {
        id: a.id,
        title: a.name ?? 'Unnamed building',
        subtitle: t['addr:street'] ? `${t['addr:housenumber'] ?? ''} ${t['addr:street']}`.trim() : 'Building',
        kindLabel: 'Building',
        source: 'verified',
        center: a.center,
        overview: [
          { label: 'Building type', value: t.building === 'yes' ? 'Not specified' : t.building?.replace(/_/g, ' '), source: 'verified' },
          { label: 'Usage', value: t.office ?? t.amenity ?? t.shop ?? t.tourism ?? null, source: 'verified' },
          { label: 'Floors', value: levels ?? null, source: 'verified' },
          {
            label: 'Height',
            value: `${Math.round(h.m)} m`,
            source: h.source,
            note: h.source === 'estimate' ? (levels ? 'Floors × 3.2 m.' : 'Not mapped; default 7 m used for display.') : undefined,
          },
          { label: 'Footprint', value: area ? fmtArea(area) : null, source: 'estimate', note: 'Calculated from the mapped outline.' },
          {
            label: 'Built-up area',
            value: area && levels ? fmtArea(area * levels) : null,
            source: 'estimate',
            note: area && levels ? 'Footprint × floors; excludes setbacks and cores.' : 'Needs floor count.',
          },
          { label: 'Construction', value: underConstruction ? 'Under construction' : 'Built (as mapped)', source: 'verified' },
          { label: 'Operator / developer', value: t.operator ?? t.owner ?? t.developer ?? null, source: 'verified' },
          { label: 'Occupancy & units', value: <Missing>No listing data</Missing>, source: 'verified' },
        ],
        documents: [
          { label: 'View on OpenStreetMap', href: `https://www.openstreetmap.org/${a.id}`, source: 'verified' },
          ...(t.website ? [{ label: 'Official website', href: t.website, source: 'verified' as const }] : []),
          ...(t.wikipedia ? [{ label: 'Wikipedia', href: `https://en.wikipedia.org/wiki/${encodeURIComponent(t.wikipedia.replace(/^en:/, ''))}`, source: 'verified' as const }] : []),
        ],
      }
    }

    case 'poi': {
      const p = sel.poi
      const t = p.tags
      return {
        id: p.id,
        title: p.name ?? POI_META[p.category].label.replace(/s$/, ''),
        subtitle: POI_META[p.category].label,
        kindLabel: 'Infrastructure',
        source: 'verified',
        center: p.center,
        overview: ([
          { label: 'Category', value: POI_META[p.category].label, source: 'verified' },
          { label: 'Type', value: (t.amenity ?? t.railway ?? t.aeroway ?? t.shop ?? t.leisure ?? t.power ?? t.man_made ?? '').replace(/_/g, ' '), source: 'verified' },
          { label: 'Operator', value: t.operator ?? null, source: 'verified' },
          { label: 'Network', value: t.network ?? null, source: 'verified' },
          { label: 'IATA', value: t.iata ?? null, source: 'verified' },
          { label: 'Opening hours', value: t.opening_hours ?? null, source: 'verified' },
          { label: 'Beds', value: t.beds ?? null, source: 'verified' },
          { label: 'Address', value: t['addr:full'] ?? t['addr:street'] ?? null, source: 'verified' },
          { label: 'Coordinates', value: fmtCoord(p.center), source: 'verified' },
        ] as Fact[]).filter((f) => f.value != null || ['Category', 'Coordinates'].includes(f.label)),
        documents: [
          { label: 'View on OpenStreetMap', href: `https://www.openstreetmap.org/${p.id}`, source: 'verified' },
          ...(t.website ? [{ label: 'Official website', href: t.website, source: 'verified' as const }] : []),
        ],
      }
    }

    case 'demo-parcel': {
      const p = sel.parcel
      const ring = toLngLat(p.polygon)
      return {
        id: `demo:${p.id}`,
        title: p.id,
        subtitle: ZONES[p.zone as keyof typeof ZONES]?.label ?? p.zone,
        kindLabel: 'Land parcel (illustrative)',
        source: 'demo',
        center: centroid(ring),
        caveat: 'Part of an illustrative GIFT City plan. Plot IDs, zoning and FAR are demo values; ownership and prices are not shown because they are not verified.',
        overview: [
          { label: 'Plot ID', value: p.id, source: 'demo' },
          { label: 'Zoning', value: ZONES[p.zone as keyof typeof ZONES]?.label ?? p.zone, source: 'demo' },
          { label: 'Availability', value: p.status, source: 'demo' },
          { label: 'Area', value: fmtArea(p.areaSqm), source: 'demo' },
          { label: 'FSI / FAR', value: p.far, source: 'demo' },
          { label: 'Permitted built-up', value: fmtArea(p.areaSqm * p.far), source: 'estimate', note: 'Area × FAR, using demo values.' },
          { label: 'Lease term', value: `${p.leaseYears} years`, source: 'demo' },
          { label: 'Boundary', value: `${ring.length} corner points`, source: 'demo' },
          { label: 'Coordinates', value: fmtCoord(centroid(ring)), source: 'demo' },
          { label: 'Ownership', value: <Missing>Not shown (unverified)</Missing>, source: 'demo', note: 'Check AnyROR / GIFT City Company Ltd.' },
          { label: 'Market price', value: <Missing>Not shown (unverified)</Missing>, source: 'demo' },
        ],
        documents: [
          { label: 'Land records (AnyROR Gujarat)', href: 'https://anyror.gujarat.gov.in/', source: 'verified' },
          { label: 'GIFT City official site', href: 'https://www.giftgujarat.in/', source: 'verified' },
        ],
      }
    }

    case 'demo-building': {
      const b = sel.building
      const ring = toLngLat(b.polygon)
      return {
        id: `demo:${b.id}`,
        title: b.name,
        subtitle: b.category,
        kindLabel: 'Building (illustrative)',
        source: 'demo',
        center: centroid(ring),
        caveat: 'Illustrative massing and figures. Real buildings with the same name appear in the OpenStreetMap layer.',
        overview: [
          { label: 'Usage', value: b.category, source: 'demo' },
          { label: 'Floors', value: b.floors, source: 'demo' },
          { label: 'Height', value: `${b.heightM} m`, source: 'demo' },
          { label: 'Built-up area', value: `${(b.builtUpSqft / 1e5).toFixed(1)} lakh sq.ft`, source: 'demo' },
          { label: 'Status', value: STATUS[b.status as keyof typeof STATUS]?.label ?? b.status, source: 'demo' },
          { label: b.yearCompleted ? 'Completed' : 'Progress', value: b.yearCompleted ?? `${b.completion ?? 0}%`, source: 'demo' },
          { label: 'Occupancy', value: b.occupancy != null ? `${b.occupancy}%` : null, source: 'demo' },
          { label: 'Developer / owner', value: <Missing>Not shown (unverified)</Missing>, source: 'demo' },
        ],
        documents: b.documents.map((d) => ({ label: `${d.name} (sample)`, source: 'demo' as const, note: d.date })),
      }
    }

    case 'demo-infra': {
      const i = sel.infra
      return {
        id: `demo:${i.id}`,
        title: i.name,
        subtitle: i.type,
        kindLabel: 'Utility (illustrative)',
        source: 'demo',
        center: [i.position[1]!, i.position[0]!],
        caveat: 'Illustrative position and capacity.',
        overview: [
          { label: 'Type', value: i.type, source: 'demo' },
          { label: 'Status', value: STATUS[i.status as keyof typeof STATUS]?.label ?? i.status, source: 'demo' },
          { label: 'Capacity', value: i.capacity, source: 'demo' },
        ],
        documents: [],
      }
    }

    case 'place':
      return {
        id: `place:${sel.center.join(',')}`,
        title: sel.name,
        subtitle: 'Search result',
        kindLabel: 'Location',
        source: 'verified',
        center: sel.center,
        overview: [{ label: 'Coordinates', value: fmtCoord(sel.center), source: 'verified', note: 'Geocoded with OpenStreetMap Nominatim.' }],
        documents: sel.osmId ? [{ label: 'View on OpenStreetMap', href: `https://www.openstreetmap.org/${sel.osmId}`, source: 'verified' }] : [],
      }
  }
}
