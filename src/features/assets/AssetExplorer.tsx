import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import AssetViewer, { type ViewMode } from './AssetViewer'
import { AssetPanel, unitCounts, useAssetSurroundings } from './AssetPanel'
import { STATUS_META, useAssets, type Asset, type Unit } from './store'

const byUnit = (a: Unit, b: Unit) => a.unit.localeCompare(b.unit, 'en', { numeric: true })

interface Props {
  assetId: string
  onClose?: () => void
}

/** 3D asset with its surroundings, a floor-by-floor office directory and an AI assistant. */
export default function AssetExplorer({ assetId, onClose }: Props) {
  const assets = useAssets()
  const asset = assets.find((a) => a.id === assetId)
  if (!asset) return <div className="grid h-full place-items-center p-6 text-sm text-muted-foreground">This asset is not in the register.</div>
  return <Explorer asset={asset} assets={assets} onClose={onClose} />
}

function Explorer({ asset, assets, onClose }: { asset: Asset; assets: Asset[]; onClose?: () => void }) {
  const [selected, setSelected] = useState<number | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [mode, setMode] = useState<ViewMode>('real')
  const { areas, areasState, nearby, others } = useAssetSurroundings(asset, assets)
  const counts = useMemo(() => unitCounts(asset), [asset])
  const floorUnits = useMemo(() => (selected == null ? [] : asset.units.filter((u) => u.floor === selected).sort(byUnit)), [asset.units, selected])

  return (
    <div className="flex h-full flex-col bg-background lg:flex-row">
      <div className="relative min-h-[46svh] flex-1 lg:min-h-0">
        <AssetViewer
          asset={asset}
          selected={selected}
          hovered={hovered}
          mode={mode}
          counts={counts}
          floorUnits={floorUnits}
          surroundings={areas}
          others={others}
          onSelect={setSelected}
          onHover={setHovered}
          className="absolute inset-0"
        />
        <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border bg-background/95 text-xs shadow-lg backdrop-blur">
            {(
              [
                ['real', 'Realistic'],
                ['data', 'Offices per floor'],
              ] as const
            ).map(([k, label]) => (
              <button key={k} onClick={() => setMode(k)} className={cn('px-3 py-2', mode === k ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}>
                {label}
              </button>
            ))}
          </div>
          {selected != null && (
            <button onClick={() => setSelected(null)} className="rounded-lg border bg-background/95 px-3 py-2 text-xs shadow-lg backdrop-blur hover:bg-accent">
              Show whole building
            </button>
          )}
          <span className="rounded-lg border bg-background/95 px-3 py-2 text-xs text-muted-foreground shadow-lg backdrop-blur">
            {areasState === 'loading' ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="size-3 animate-spin" /> Loading surroundings…
              </span>
            ) : areasState === 'error' ? (
              'Surroundings unavailable (OpenStreetMap busy)'
            ) : (
              `${(areas ?? []).filter((a) => a.kind === 'building').length} nearby buildings · OpenStreetMap`
            )}
          </span>
        </div>
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex flex-wrap gap-1.5 text-[11px]">
          {selected != null &&
            (Object.keys(STATUS_META) as (keyof typeof STATUS_META)[]).map((s) => (
              <span key={s} className="flex items-center gap-1 rounded bg-background/90 px-2 py-1 backdrop-blur">
                <span className="size-2 rounded-sm" style={{ background: STATUS_META[s].color }} /> {STATUS_META[s].label}
              </span>
            ))}
          <span className="rounded bg-background/90 px-2 py-1 text-muted-foreground backdrop-blur">
            {selected != null ? 'Schematic layout: office blocks sized by area, positions illustrative' : 'Click a floor to open it · drag to rotate · scroll to zoom'}
          </span>
        </div>
      </div>

      <AssetPanel
        asset={asset}
        assets={assets}
        selected={selected}
        onSelect={setSelected}
        hovered={hovered}
        onHover={setHovered}
        nearby={nearby}
        areasState={areasState}
        onClose={onClose}
        className="max-h-[56svh] w-full shrink-0 border-t lg:max-h-none lg:w-[420px] lg:border-l lg:border-t-0"
      />
    </div>
  )
}

