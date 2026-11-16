import { useMemo } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Doc } from '@convex/_generated/dataModel'
import type { Property } from '@/features/projects/model'

/** Inventory rows don't reference a project; the old app mapped towers to projects like this. */
const TOWER_PROJECT: Record<string, string> = { 'Tower A': 'Skyview', 'Tower B': 'Edge', 'Tower C': 'Highlife' }

export interface UnitView {
  unit: Doc<'inventory'>
  project?: Property
  projectName: string
  label: string
  bhk: number
  pricePerSqft?: number
}

export function useUnits(): { units: UnitView[] | undefined; properties: Property[] | undefined } {
  const inventory = useQuery(api.inventory.getInventory)
  const properties = useQuery(api.properties.getProperties)
  const units = useMemo(() => {
    if (!inventory || !properties) return undefined
    return inventory.map((u) => {
      const short = TOWER_PROJECT[u.tower] ?? u.tower
      const project = properties.find((p) => p.name.endsWith(short))
      return {
        unit: u,
        project,
        projectName: short,
        label: `${short} · ${u.tower.replace('Tower ', 'T')}-${u.unit}`,
        bhk: Number(u.type.match(/\d+/)?.[0] ?? 0),
        pricePerSqft: u.price && u.area ? Math.round(u.price / u.area) : undefined,
      }
    })
  }, [inventory, properties])
  return { units, properties }
}
