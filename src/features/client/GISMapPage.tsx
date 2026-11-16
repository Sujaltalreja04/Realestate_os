import GISMap from '@/components/GISMap.jsx'

/** The GIFT City GIS map. `data-lenis-prevent` keeps mouse-wheel zoom on the map instead of page scrolling. */
export default function GISMapPage() {
  return (
    <div data-lenis-prevent>
      <GISMap />
    </div>
  )
}
