import type { LngLat } from './osm'

/**
 * Coordinates resolved from OpenStreetMap Nominatim (Nov 2026).
 * Project listings store only a locality name, not a site address, so project pins sit at the
 * locality centroid and are labelled "approximate" everywhere they appear.
 */
export const LOCALITY_COORDS: Record<string, { center: LngLat; osm: string; label: string }> = {
  Ambawadi: { center: [72.54908, 23.02261], osm: 'Ambawadi suburb', label: 'Ambawadi' },
  'SG Highway': { center: [72.51923, 23.05432], osm: 'Sarkhej–Gandhinagar Highway', label: 'SG Highway' },
  Bopal: { center: [72.47053, 23.02354], osm: 'South Bopal neighbourhood', label: 'Bopal' },
  'Sindhu Bhavan': { center: [72.5086, 23.03981], osm: 'Sindhu Bhavan Road', label: 'Sindhu Bhavan Road' },
}

/** Fixed destinations for connectivity (OSM coordinates). */
export const KEY_DESTINATIONS: { name: string; center: LngLat; osm: string }[] = [
  { name: 'SVPI International Airport', center: [72.63056, 23.07593], osm: 'way/37231777' },
  { name: 'Ahmedabad Junction (railway)', center: [72.601, 23.02633], osm: 'node/2669084968' },
  { name: 'Gandhinagar Capital (railway)', center: [72.63033, 23.23484], osm: 'node/2516708243' },
  { name: 'GIFT City', center: [72.6887, 23.16291], osm: 'GIFT City suburb' },
]

export const VIEWS = {
  gift: { center: [72.6835, 23.1595] as LngLat, zoom: 15.4, label: 'GIFT City' },
  ahmedabad: { center: [72.52, 23.035] as LngLat, zoom: 12.2, label: 'Project localities' },
  region: { center: [72.6, 23.1] as LngLat, zoom: 10.6, label: 'Ahmedabad–Gandhinagar' },
}
