import { useParams } from 'react-router-dom'
import AssetExplorer from './AssetExplorer'

/** Standalone page for one asset: /assets/:assetId */
export default function AssetPage() {
  const { assetId = '' } = useParams()
  return (
    <div className="h-[calc(100svh-4rem)] min-h-[620px]" data-lenis-prevent>
      <AssetExplorer assetId={assetId} />
    </div>
  )
}
