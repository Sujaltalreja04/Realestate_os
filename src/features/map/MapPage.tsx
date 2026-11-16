import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import maplibregl, { type GeoJSONSource, type Map as MLMap, type MapGeoJSONFeature } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useAction } from 'convex/react'
import * as D from '@radix-ui/react-dialog'
import {
  AlertTriangle,
  BarChart3,
  Box,
  Columns3,
  Layers,
  ListFilter,
  Loader2,
  Map as MapIcon,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react'
import { api } from '@convex/_generated/api'
import { BUILDINGS, INFRASTRUCTURE, PARCELS, ZONES } from '@/data/giftCityGIS.js'
import { cn } from '@/lib/utils'
import { formatINR } from '@/lib/format'
import { bhkNumbers, type Property } from '@/features/projects/model'
import { useUnits } from '@/features/client/units'
import { SourceBadge, SourceLegend } from './provenance'
import { buildingHeight, fetchAreas, fetchPois, fetchPoisAround, POI_META, snapBBox, type BBox, type LngLat, type OsmArea, type OsmPoi, type PoiCategory } from './osm'
import { fmtKm, geocode, haversineKm } from './geo'
import { LOCALITY_COORDS, VIEWS } from './places'
import { describe, type Described, type Selection } from './describe'
import { InfoPanel } from './InfoPanel'
import { interpret, type MapQuery } from './aiSearch'

/* ── Constants ─────────────────────────────────────────────────── */

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services'
const BASEMAPS = {
  satellite: { label: 'Satellite', tiles: [`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`], attribution: 'Imagery © Esri, Maxar' },
  street: { label: 'Street', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], attribution: '© OpenStreetMap contributors' },
} as const
type Basemap = keyof typeof BASEMAPS

const ZONE_COLOR: Record<string, string> = { sez: '#b8894f', dta: '#6f8597', residential: '#7f9a78', social: '#a07f9b', utility: '#9a958c' }
const LANDUSE_COLOR = ['match', ['get', 'landuse'], 'construction', '#d97706', 'commercial', '#2563eb', 'retail', '#2563eb', 'residential', '#16a34a', 'industrial', '#7c3aed', 'grass', '#65a30d', '#94a3b8'] as unknown as string

const shortName = (n: string) => n.replace(/^Ai RealEstate OS /, '')
const toLngLat = (pts: number[][]) => pts.map(([lat, lng]) => [lng!, lat!])
const ring = (pts: number[][]) => {
  const r = toLngLat(pts)
  return [...r, r[0]!]
}

interface Layers {
  osmBuildings: boolean
  osmLanduse: boolean
  osmRoads: boolean
  projects: boolean
  demoParcels: boolean
  demoBuildings: boolean
  demoInfra: boolean
}
type OsmStatus = 'idle' | 'loading' | 'ok' | 'error'

interface ProjectFilter {
  status: string
  bhk: number | null
  maxCr: number | null
}

interface Result {
  key: string
  title: string
  subtitle: string
  km?: number
  sel: Selection
}

/* ── Page ──────────────────────────────────────────────────────── */

export default function MapPage() {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MLMap | null>(null)
  const markers = useRef(new Map<string, maplibregl.Marker>())
  const areas = useRef(new Map<string, OsmArea>())
  const pois = useRef(new Map<string, OsmPoi>())
  const loaded = useRef(new Set<string>())
  const chat = useAction(api.ai.copilotChat)
  const { units, properties } = useUnits()
  const projects = useMemo(() => properties ?? [], [properties])

  const [basemap, setBasemap] = useState<Basemap>('satellite')
  const [is3d, setIs3d] = useState(true)
  const [layers, setLayers] = useState<Layers>({
    osmBuildings: true,
    osmLanduse: true,
    osmRoads: true,
    projects: true,
    demoParcels: true,
    demoBuildings: false,
    demoInfra: false,
  })
  const [poiCats, setPoiCats] = useState<Set<PoiCategory>>(() => new Set(Object.keys(POI_META) as PoiCategory[]))
  const [zones, setZones] = useState<Set<string>>(() => new Set(Object.keys(ZONES)))
  const [filter, setFilter] = useState<ProjectFilter>({ status: 'all', bhk: null, maxCr: null })
  const [osmStatus, setOsmStatus] = useState<OsmStatus>('idle')
  const [zoom, setZoom] = useState(15.4)
  const [sel, setSel] = useState<Selection | null>(null)
  const [compare, setCompare] = useState<Described[]>([])
  const [compareOpen, setCompareOpen] = useState(false)
  const [panelTab, setPanelTab] = useState<'search' | 'layers' | 'analytics'>('layers')
  const [mobilePanel, setMobilePanel] = useState(false)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<{ query?: MapQuery; items: Result[]; note?: string } | null>(null)
  const [viewStats, setViewStats] = useState<{ cats: [PoiCategory, number][]; buildings: number; projects: Property[] } | null>(null)
  const [ready, setReady] = useState(false)
  const [osmCounts, setOsmCounts] = useState({ buildings: 0, places: 0 })

  const described = useMemo(() => (sel ? describe(sel) : null), [sel])

  /* ── Map setup ─────────────────────────────────────────────── */

  useEffect(() => {
    if (!container.current) return
    const map = new maplibregl.Map({
      container: container.current,
      style: {
        version: 8,
        sources: { base: { type: 'raster', tiles: [...BASEMAPS.satellite.tiles], tileSize: 256, maxzoom: 19, attribution: BASEMAPS.satellite.attribution } },
        layers: [{ id: 'base', type: 'raster', source: 'base', paint: { 'raster-saturation': -0.3, 'raster-brightness-max': 0.92 } }],
      },
      center: VIEWS.gift.center,
      zoom: VIEWS.gift.zoom,
      pitch: 55,
      bearing: -25,
      maxZoom: 19,
      minZoom: 8,
      attributionControl: { compact: true, customAttribution: 'Map data © OpenStreetMap contributors · Routing OSRM' },
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right')
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')

    map.on('load', () => {
      const empty = { type: 'FeatureCollection' as const, features: [] }
      // Demo (illustrative GIFT City plan)
      map.addSource('demo-parcels', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: PARCELS.map((p) => ({ type: 'Feature', properties: { id: p.id, zone: p.zone, status: p.status }, geometry: { type: 'Polygon', coordinates: [ring(p.polygon)] } })) },
      })
      map.addSource('demo-buildings', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: BUILDINGS.map((b) => ({ type: 'Feature', properties: { id: b.id, zone: b.zone, height: b.heightM, color: ZONE_COLOR[b.zone] ?? '#999' }, geometry: { type: 'Polygon', coordinates: [ring(b.polygon)] } })),
        },
      })
      map.addSource('demo-infra', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: INFRASTRUCTURE.map((i) => ({ type: 'Feature', properties: { id: i.id }, geometry: { type: 'Point', coordinates: [i.position[1]!, i.position[0]!] } })) },
      })
      // Live OpenStreetMap
      map.addSource('osm-areas', { type: 'geojson', data: empty, promoteId: 'id' })
      map.addSource('osm-pois', { type: 'geojson', data: empty })
      map.addSource('highlight', { type: 'geojson', data: empty })
      map.addSource('search-radius', { type: 'geojson', data: empty })

      map.addLayer({ id: 'osm-landuse', type: 'fill', source: 'osm-areas', filter: ['==', ['get', 'kind'], 'landuse'], paint: { 'fill-color': LANDUSE_COLOR, 'fill-opacity': 0.18 } })
      map.addLayer({ id: 'osm-landuse-line', type: 'line', source: 'osm-areas', filter: ['==', ['get', 'kind'], 'landuse'], paint: { 'line-color': LANDUSE_COLOR, 'line-width': 1, 'line-opacity': 0.6 } })
      map.addLayer({ id: 'demo-parcels-fill', type: 'fill', source: 'demo-parcels', paint: { 'fill-color': '#c026d3', 'fill-opacity': 0.12 } })
      map.addLayer({ id: 'demo-parcels-line', type: 'line', source: 'demo-parcels', paint: { 'line-color': '#c026d3', 'line-width': 1.5, 'line-dasharray': [2, 1.5] } })
      map.addLayer({
        id: 'osm-roads',
        type: 'line',
        source: 'osm-areas',
        filter: ['==', ['get', 'kind'], 'road'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#fbbf24', 'line-opacity': 0.75, 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1, 17, 5] },
      })
      map.addLayer({ id: 'osm-roads-hit', type: 'line', source: 'osm-areas', filter: ['==', ['get', 'kind'], 'road'], paint: { 'line-color': '#000', 'line-opacity': 0, 'line-width': 14 } })
      map.addLayer({
        id: 'osm-buildings',
        type: 'fill-extrusion',
        source: 'osm-areas',
        filter: ['==', ['get', 'kind'], 'building'],
        paint: {
          'fill-extrusion-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#f59e0b', ['boolean', ['get', 'named'], false], '#e7e2d8', '#cfc8bb'],
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-opacity': 0.92,
        },
      })
      map.addLayer({ id: 'demo-buildings', type: 'fill-extrusion', source: 'demo-buildings', layout: { visibility: 'none' }, paint: { 'fill-extrusion-color': ['get', 'color'], 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-opacity': 0.75 } })
      map.addLayer({ id: 'demo-infra', type: 'circle', source: 'demo-infra', layout: { visibility: 'none' }, paint: { 'circle-radius': 6, 'circle-color': '#c026d3', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } })
      map.addLayer({ id: 'search-radius', type: 'line', source: 'search-radius', paint: { 'line-color': '#c49a63', 'line-width': 2, 'line-dasharray': [2, 2] } })
      map.addLayer({
        id: 'osm-pois',
        type: 'circle',
        source: 'osm-pois',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3, 15, 6.5],
          'circle-color': ['get', 'color'],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5,
        },
      })
      map.addLayer({ id: 'highlight-fill', type: 'fill', source: 'highlight', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': '#f59e0b', 'fill-opacity': 0.25 } })
      map.addLayer({ id: 'highlight-line', type: 'line', source: 'highlight', paint: { 'line-color': '#f59e0b', 'line-width': 3 } })
      map.addLayer({ id: 'highlight-point', type: 'circle', source: 'highlight', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 11, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': '#f59e0b', 'circle-stroke-width': 3 } })

      setReady(true)
    })

    // Hover tooltip for interactive layers.
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10, className: 'reos-tip' })
    const HOVER = ['osm-pois', 'demo-infra', 'osm-buildings', 'demo-buildings', 'osm-roads-hit', 'demo-parcels-fill', 'osm-landuse']
    map.on('mousemove', (e) => {
      const f = map.getLayer('osm-pois') ? map.queryRenderedFeatures(e.point, { layers: HOVER.filter((l) => map.getLayer(l)) })[0] : undefined
      map.getCanvas().style.cursor = f ? 'pointer' : ''
      const label = f ? tooltipFor(f, areas.current, pois.current) : null
      if (label) popup.setLngLat(e.lngLat).setHTML(label).addTo(map)
      else popup.remove()
    })
    map.on('mouseout', () => popup.remove())

    return () => {
      popup.remove()
      map.remove()
      mapRef.current = null
    }
  }, [])

  /* ── Live OSM loading for the current viewport ──────────────── */

  const syncOsmSources = useCallback(() => {
    const map = mapRef.current
    if (!map?.getSource('osm-areas')) return
    ;(map.getSource('osm-areas') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: [...areas.current.values()].map((a) => ({
        type: 'Feature',
        id: a.id,
        properties: { id: a.id, kind: a.kind, landuse: a.tags.landuse ?? '', named: !!a.name, height: a.kind === 'building' ? buildingHeight(a.tags).m : 0 },
        geometry: a.geometry,
      })),
    })
    setOsmCounts({ buildings: [...areas.current.values()].filter((a) => a.kind === 'building').length, places: pois.current.size })
    ;(map.getSource('osm-pois') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: [...pois.current.values()].map((p) => ({ type: 'Feature', properties: { id: p.id, cat: p.category, color: POI_META[p.category].color }, geometry: { type: 'Point', coordinates: p.center } })),
    })
  }, [])

  const refreshViewStats = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    const b = map.getBounds()
    const inView = (c: LngLat) => b.contains(c)
    const counts = new Map<PoiCategory, number>()
    for (const p of pois.current.values()) if (inView(p.center)) counts.set(p.category, (counts.get(p.category) ?? 0) + 1)
    let buildings = 0
    for (const a of areas.current.values()) if (a.kind === 'building' && inView(a.center)) buildings++
    setViewStats({
      cats: [...counts].sort((a, b2) => b2[1] - a[1]),
      buildings,
      projects: projects.filter((p) => LOCALITY_COORDS[p.location] && inView(LOCALITY_COORDS[p.location]!.center)),
    })
  }, [projects])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    let timer: ReturnType<typeof setTimeout>
    const load = () => {
      clearTimeout(timer)
      timer = setTimeout(async () => {
        const z = map.getZoom()
        setZoom(z)
        const b = map.getBounds()
        const view: BBox = { s: b.getSouth(), w: b.getWest(), n: b.getNorth(), e: b.getEast() }
        const jobs: Promise<void>[] = []
        if (z >= 11.5) {
          const pb = snapBBox(view, 0.05)
          const key = `p:${pb.s},${pb.w},${pb.n},${pb.e}`
          if (!loaded.current.has(key) && (pb.n - pb.s) * (pb.e - pb.w) < 0.12)
            jobs.push(
              fetchPois(pb).then((ps) => {
                ps.forEach((p) => pois.current.set(p.id, p))
                loaded.current.add(key)
              }),
            )
        }
        if (z >= 13.5) {
          const ab = snapBBox(view, 0.02)
          const key = `a:${ab.s},${ab.w},${ab.n},${ab.e}`
          if (!loaded.current.has(key) && (ab.n - ab.s) * (ab.e - ab.w) < 0.006)
            jobs.push(
              fetchAreas(ab).then((as) => {
                as.forEach((a) => areas.current.set(a.id, a))
                loaded.current.add(key)
              }),
            )
        }
        if (!jobs.length) {
          refreshViewStats()
          return
        }
        setOsmStatus('loading')
        const res = await Promise.allSettled(jobs)
        setOsmStatus(res.some((r) => r.status === 'rejected') ? 'error' : 'ok')
        syncOsmSources()
        refreshViewStats()
      }, 450)
    }
    map.on('moveend', load)
    load()
    return () => {
      map.off('moveend', load)
      clearTimeout(timer)
    }
  }, [ready, syncOsmSources, refreshViewStats])

  /* ── Clicks: one handler with a clear priority order ────────── */

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const ORDER = ['osm-pois', 'demo-infra', 'osm-buildings', 'demo-buildings', 'osm-roads-hit', 'demo-parcels-fill', 'osm-landuse']
    const onClick = (e: maplibregl.MapMouseEvent) => {
      const layersOn = ORDER.filter((l) => map.getLayer(l) && map.getLayoutProperty(l, 'visibility') !== 'none')
      const hits = map.queryRenderedFeatures(e.point, { layers: layersOn })
      const f = ORDER.map((l) => hits.find((h) => h.layer.id === l)).find(Boolean)
      if (!f) return setSel(null)
      const id = String(f.properties?.id)
      switch (f.layer.id) {
        case 'osm-pois': {
          const p = pois.current.get(id)
          if (p) setSel({ kind: 'poi', poi: p })
          break
        }
        case 'osm-buildings':
        case 'osm-roads-hit':
        case 'osm-landuse': {
          const a = areas.current.get(id)
          if (a) setSel({ kind: 'osm', area: a })
          break
        }
        case 'demo-infra':
          setSel({ kind: 'demo-infra', infra: INFRASTRUCTURE.find((i) => i.id === id)! })
          break
        case 'demo-buildings':
          setSel({ kind: 'demo-building', building: BUILDINGS.find((b) => b.id === id)! })
          break
        case 'demo-parcels-fill':
          setSel({ kind: 'demo-parcel', parcel: PARCELS.find((p) => p.id === id)! })
          break
      }
    }
    map.on('click', onClick)
    return () => {
      map.off('click', onClick)
    }
  }, [ready])

  /* ── Layer visibility & filters ─────────────────────────────── */

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const vis = (id: string, on: boolean) => map.getLayer(id) && map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none')
    vis('osm-buildings', layers.osmBuildings)
    vis('osm-landuse', layers.osmLanduse)
    vis('osm-landuse-line', layers.osmLanduse)
    vis('osm-roads', layers.osmRoads)
    vis('osm-roads-hit', layers.osmRoads)
    vis('demo-parcels-fill', layers.demoParcels)
    vis('demo-parcels-line', layers.demoParcels)
    vis('demo-buildings', layers.demoBuildings)
    vis('demo-infra', layers.demoInfra)
    map.setFilter('osm-pois', ['in', ['get', 'cat'], ['literal', [...poiCats]]])
    const zoneFilter: maplibregl.FilterSpecification = ['in', ['get', 'zone'], ['literal', [...zones]]]
    for (const l of ['demo-parcels-fill', 'demo-parcels-line', 'demo-buildings']) map.setFilter(l, zoneFilter)
  }, [layers, poiCats, zones, ready])

  useEffect(() => {
    const src = mapRef.current?.getSource('base') as maplibregl.RasterTileSource | undefined
    src?.setTiles([...BASEMAPS[basemap].tiles])
  }, [basemap, ready])

  useEffect(() => {
    mapRef.current?.easeTo({ pitch: is3d ? 55 : 0, bearing: is3d ? -25 : 0, duration: 800 })
  }, [is3d])

  /* ── Project markers (HTML, price pills) ────────────────────── */

  const projectMatches = useCallback(
    (p: Property) =>
      (filter.status === 'all' || p.status === filter.status) &&
      (filter.bhk == null || bhkNumbers(p.bhk).includes(filter.bhk)) &&
      (filter.maxCr == null || p.price <= filter.maxCr * 1e7),
    [filter],
  )

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    for (const m of markers.current.values()) m.remove()
    markers.current.clear()
    if (!layers.projects) return
    for (const p of projects) {
      const loc = LOCALITY_COORDS[p.location]
      if (!loc || !projectMatches(p)) continue
      const el = document.createElement('button')
      el.type = 'button'
      el.className = 'reos-marker'
      el.setAttribute('aria-label', `${shortName(p.name)}, from ${formatINR(p.price)}`)
      el.innerHTML = `<span class="reos-marker-dot"></span><span class="reos-marker-label"><b>${shortName(p.name)}</b> ${formatINR(p.price)}</span>`
      el.addEventListener('click', (ev) => {
        ev.stopPropagation()
        setSel({ kind: 'project', property: p, units: units ?? [] })
      })
      markers.current.set(p._id, new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat(loc.center).addTo(map))
    }
  }, [projects, layers.projects, projectMatches, ready, units])

  /* ── Selection highlight & camera ───────────────────────────── */

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const src = map.getSource('highlight') as GeoJSONSource
    if (!sel || !described) {
      src.setData({ type: 'FeatureCollection', features: [] })
      return
    }
    let geometry: GeoJSON.Geometry = { type: 'Point', coordinates: described.center }
    if (sel.kind === 'osm') geometry = sel.area.geometry
    if (sel.kind === 'demo-parcel') geometry = { type: 'Polygon', coordinates: [ring(sel.parcel.polygon)] }
    if (sel.kind === 'demo-building') geometry = { type: 'Polygon', coordinates: [ring(sel.building.polygon)] }
    src.setData({ type: 'Feature', properties: {}, geometry })
    for (const m of markers.current.values()) m.getElement().classList.remove('is-active')
    if (sel.kind === 'project') markers.current.get(sel.property._id)?.getElement().classList.add('is-active')
  }, [sel, described, ready])

  const flyTo = (c: LngLat, z?: number) =>
    mapRef.current?.flyTo({
      center: c,
      zoom: z ?? Math.max(mapRef.current.getZoom(), 15.5),
      duration: 1200,
      padding: { right: window.innerWidth >= 1024 ? 420 : 0, left: window.innerWidth >= 1024 ? 360 : 0, top: 0, bottom: window.innerWidth < 1024 ? window.innerHeight * 0.4 : 0 },
    })

  const select = (s: Selection, fly = true) => {
    setSel(s)
    setMobilePanel(false)
    if (fly) flyTo(describe(s).center)
  }

  const toggleCompare = (d: Described) =>
    setCompare((c) => (c.some((x) => x.id === d.id) ? c.filter((x) => x.id !== d.id) : [...c, d].slice(-3)))

  /* ── Search ─────────────────────────────────────────────────── */

  async function resolveAnchor(near: string): Promise<{ name: string; center: LngLat } | null> {
    const n = near.toLowerCase()
    const loc = Object.entries(LOCALITY_COORDS).find(([k, v]) => k.toLowerCase().includes(n) || n.includes(k.toLowerCase()) || v.label.toLowerCase().includes(n))
    if (loc) return { name: loc[1].label, center: loc[1].center }
    const proj = projects.find((p) => p.name.toLowerCase().includes(n))
    if (proj && LOCALITY_COORDS[proj.location]) return { name: shortName(proj.name), center: LOCALITY_COORDS[proj.location]!.center }
    const named = [...pois.current.values(), ...areas.current.values()].find((x) => x.name?.toLowerCase().includes(n))
    if (named) return { name: named.name!, center: named.center }
    if (/gift/.test(n)) return { name: 'GIFT City', center: VIEWS.gift.center }
    return geocode(near)
  }

  function drawRadius(c: LngLat | null, km: number) {
    const src = mapRef.current?.getSource('search-radius') as GeoJSONSource | undefined
    if (!src) return
    if (!c) return src.setData({ type: 'FeatureCollection', features: [] })
    const pts = Array.from({ length: 65 }, (_, i) => {
      const a = (i / 64) * Math.PI * 2
      return [c[0] + (km / (111.32 * Math.cos((c[1] * Math.PI) / 180))) * Math.cos(a), c[1] + (km / 110.54) * Math.sin(a)]
    })
    src.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: pts } })
  }

  async function runSearch(e?: FormEvent, forceAi = false) {
    e?.preventDefault()
    const text = query.trim()
    if (!text) return
    setSearching(true)
    setPanelTab('search')
    setMobilePanel(true)
    try {
      // Short name lookups are instant; questions go through the AI interpreter.
      const isQuestion = forceAi || text.split(/\s+/).length > 2 || /bhk|cr|lakh|under|near|within|ready|school|hospital|metro/i.test(text)
      if (!isQuestion) {
        const t = text.toLowerCase()
        const items: Result[] = [
          ...projects.filter((p) => p.name.toLowerCase().includes(t) || p.location.toLowerCase().includes(t)).map((p) => ({ key: p._id, title: shortName(p.name), subtitle: `Project · ${p.location}`, sel: { kind: 'project', property: p, units: units ?? [] } as Selection })),
          ...[...pois.current.values()].filter((p) => p.name?.toLowerCase().includes(t)).slice(0, 8).map((p) => ({ key: p.id, title: p.name!, subtitle: POI_META[p.category].label, sel: { kind: 'poi', poi: p } as Selection })),
          ...[...areas.current.values()].filter((a) => a.name?.toLowerCase().includes(t)).slice(0, 8).map((a) => ({ key: a.id, title: a.name!, subtitle: a.kind === 'building' ? 'Building' : a.kind === 'road' ? 'Road' : 'Land use', sel: { kind: 'osm', area: a } as Selection })),
          ...PARCELS.filter((p) => p.id.toLowerCase().includes(t)).map((p) => ({ key: p.id, title: p.id, subtitle: 'Plot (demo)', sel: { kind: 'demo-parcel', parcel: p } as Selection })),
        ]
        if (!items.length) {
          const g = await geocode(text)
          if (g) items.push({ key: 'geo', title: g.name, subtitle: 'Place · OpenStreetMap', sel: { kind: 'place', name: g.name, center: g.center, osmId: g.osmId } })
        }
        setResults({ items, note: items.length ? undefined : 'No matches. Try a locality, building or project name.' })
        if (items.length === 1) select(items[0]!.sel)
        return
      }

      const q = await interpret(text, chat)
      const anchor = q.near ? await resolveAnchor(q.near) : null
      const radius = q.radiusKm ?? (q.target === 'amenities' ? 3 : 10)
      const items: Result[] = []
      let note: string | undefined
      if (q.near && !anchor) note = `Couldn't find "${q.near}" on the map; showing results without a location filter.`

      if (q.target === 'place' && anchor) {
        items.push({ key: 'anchor', title: anchor.name, subtitle: 'Place', sel: { kind: 'place', name: anchor.name, center: anchor.center } })
      } else if (q.target === 'amenities') {
        const c = anchor?.center ?? (mapRef.current!.getCenter().toArray() as LngLat)
        try {
          const found = await fetchPoisAround(c, radius * 1000)
          found.forEach((p) => pois.current.set(p.id, p))
          syncOsmSources()
          found
            .filter((p) => !q.category || p.category === q.category)
            .map((p) => ({ p, km: haversineKm(c, p.center) }))
            .sort((a, b) => a.km - b.km)
            .slice(0, 25)
            .forEach(({ p, km }) => items.push({ key: p.id, title: p.name ?? POI_META[p.category].label, subtitle: POI_META[p.category].label, km, sel: { kind: 'poi', poi: p } }))
        } catch {
          note = 'OpenStreetMap is busy; amenity search is temporarily unavailable.'
        }
        drawRadius(c, radius)
        mapRef.current?.flyTo({ center: c, zoom: radius > 5 ? 12 : 13.5, duration: 1200 })
      } else {
        // Projects: listing filters, optional distance to the anchor, optional nearby amenity check.
        const list = projects.filter(
          (p) =>
            (!q.bhk || bhkNumbers(p.bhk).includes(q.bhk)) &&
            (q.maxPriceCr == null || p.price <= q.maxPriceCr * 1e7) &&
            (q.minPriceCr == null || p.price >= q.minPriceCr * 1e7) &&
            (!q.status || p.status === q.status),
        )
        const withLoc = list.map((p) => ({ p, c: LOCALITY_COORDS[p.location]?.center })).filter((x): x is { p: Property; c: LngLat } => !!x.c)
        let scored = withLoc.map((x) => ({ ...x, km: anchor ? haversineKm(anchor.center, x.c) : undefined }))
        if (anchor) scored = scored.filter((x) => x.km! <= radius).sort((a, b) => a.km! - b.km!)
        if (q.category) {
          const checks = await Promise.all(
            scored.map(async (x) => {
              try {
                const around = await fetchPoisAround(x.c, 2000)
                const hit = around.filter((p) => p.category === q.category).sort((a, b) => haversineKm(x.c, a.center) - haversineKm(x.c, b.center))[0]
                return { ...x, amenity: hit ? `${hit.name ?? POI_META[hit.category].label} · ${fmtKm(haversineKm(x.c, hit.center))}` : null }
              } catch {
                return { ...x, amenity: undefined }
              }
            }),
          )
          const failed = checks.some((c) => c.amenity === undefined)
          scored = checks.filter((c) => c.amenity !== null)
          if (failed) note = 'OpenStreetMap is busy, so the nearby-amenity check was skipped for some projects.'
          scored.forEach((x) => {
            const a = (x as { amenity?: string | null }).amenity
            items.push({ key: x.p._id, title: shortName(x.p.name), subtitle: `${x.p.bhk} · from ${formatINR(x.p.price)}${a ? ` · ${a}` : ''}`, km: x.km, sel: { kind: 'project', property: x.p, units: units ?? [] } })
          })
        } else {
          scored.forEach((x) => items.push({ key: x.p._id, title: shortName(x.p.name), subtitle: `${x.p.bhk} · ${x.p.status} · from ${formatINR(x.p.price)}`, km: x.km, sel: { kind: 'project', property: x.p, units: units ?? [] } }))
        }
        drawRadius(anchor?.center ?? null, radius)
        const pts = items.map((i) => describe(i.sel).center)
        if (anchor) pts.push(anchor.center)
        if (pts.length) {
          const b = new maplibregl.LngLatBounds(pts[0], pts[0])
          pts.forEach((p) => b.extend(p))
          mapRef.current?.fitBounds(b, { padding: 120, maxZoom: 14, duration: 1200 })
        }
      }
      if (!items.length && !note) note = 'Nothing on the platform matches these filters.'
      setResults({ query: q, items, note })
    } finally {
      setSearching(false)
    }
  }

  /* ── Render ─────────────────────────────────────────────────── */

  const toggle = <K extends keyof Layers>(k: K) => setLayers((l) => ({ ...l, [k]: !l[k] }))
  const inCompare = !!described && compare.some((c) => c.id === described.id)
  const visibleProjects = projects.filter(projectMatches)

  const sidePanel = (
    <div className="flex h-full flex-col">
      <form onSubmit={(e) => void runSearch(e)} className="shrink-0 border-b p-3">
        <div className="flex items-center gap-1.5 rounded-lg border bg-card px-2.5 focus-within:ring-2 focus-within:ring-ring/40">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or ask: 3 BHK under 2 Cr near a metro"
            className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Search the map"
          />
          <button
            type="button"
            onClick={() => void runSearch(undefined, true)}
            className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2 text-[11px] font-medium text-primary-foreground disabled:opacity-40"
            disabled={!query.trim() || searching}
            title="Ask with AI"
          >
            {searching ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />} Ask
          </button>
        </div>
      </form>

      <div className="flex shrink-0 border-b px-2" role="tablist">
        {(
          [
            ['layers', 'Layers', Layers],
            ['search', 'Results', ListFilter],
            ['analytics', 'Analytics', BarChart3],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            role="tab"
            aria-selected={panelTab === id}
            onClick={() => setPanelTab(id)}
            className={cn('-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium', panelTab === id ? 'border-brand text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}
          >
            <Icon className="size-3.5" /> {label}
            {id === 'search' && results?.items.length ? <span className="rounded bg-muted px-1 tabular-nums">{results.items.length}</span> : null}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 text-sm" data-lenis-prevent>
        {panelTab === 'layers' && (
          <div className="space-y-6">
            <Group title="Platform listings" source="platform">
              <Toggle on={layers.projects} onChange={() => toggle('projects')} label={`Projects (${visibleProjects.length})`} swatch="#0284c7" />
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                <select value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))} className="h-8 rounded-md border bg-card px-1.5 text-xs" aria-label="Status">
                  <option value="all">Any status</option>
                  {Array.from(new Set(projects.map((p) => p.status))).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <select value={filter.bhk ?? ''} onChange={(e) => setFilter((f) => ({ ...f, bhk: e.target.value ? Number(e.target.value) : null }))} className="h-8 rounded-md border bg-card px-1.5 text-xs" aria-label="BHK">
                  <option value="">Any BHK</option>
                  {[2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n} BHK
                    </option>
                  ))}
                </select>
                <select value={filter.maxCr ?? ''} onChange={(e) => setFilter((f) => ({ ...f, maxCr: e.target.value ? Number(e.target.value) : null }))} className="h-8 rounded-md border bg-card px-1.5 text-xs" aria-label="Budget">
                  <option value="">Any price</option>
                  {[1.5, 2, 3, 5].map((n) => (
                    <option key={n} value={n}>
                      ≤ ₹{n} Cr
                    </option>
                  ))}
                </select>
              </div>
            </Group>

            <Group title="OpenStreetMap" source="verified" hint={zoom < 13.5 ? 'Zoom in to load buildings, land use and roads.' : undefined}>
              <Toggle on={layers.osmBuildings} onChange={() => toggle('osmBuildings')} label="Buildings (3D)" swatch="#cfc8bb" />
              <Toggle on={layers.osmLanduse} onChange={() => toggle('osmLanduse')} label="Land-use areas" swatch="#65a30d" />
              <Toggle on={layers.osmRoads} onChange={() => toggle('osmRoads')} label="Roads" swatch="#fbbf24" />
              <p className="mb-1 mt-3 text-[11px] text-muted-foreground">Infrastructure {zoom < 11.5 && '(zoom in to load)'}</p>
              {(Object.keys(POI_META) as PoiCategory[]).map((c) => (
                <Toggle
                  key={c}
                  on={poiCats.has(c)}
                  onChange={() =>
                    setPoiCats((s) => {
                      const n = new Set(s)
                      if (n.has(c)) n.delete(c)
                      else n.add(c)
                      return n
                    })
                  }
                  label={POI_META[c].label}
                  swatch={POI_META[c].color}
                  round
                />
              ))}
            </Group>

            <Group title="Illustrative GIFT City plan" source="demo">
              <Toggle on={layers.demoParcels} onChange={() => toggle('demoParcels')} label={`Land parcels (${PARCELS.length})`} swatch="#c026d3" dashed />
              <Toggle on={layers.demoBuildings} onChange={() => toggle('demoBuildings')} label="Masterplan buildings" swatch="#b8894f" />
              <Toggle on={layers.demoInfra} onChange={() => toggle('demoInfra')} label="Utilities" swatch="#c026d3" round />
              <p className="mb-1 mt-3 text-[11px] text-muted-foreground">Zones</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(ZONES).map(([z, v]) => (
                  <button
                    key={z}
                    onClick={() =>
                      setZones((s) => {
                        const n = new Set(s)
                        if (n.has(z)) n.delete(z)
                        else n.add(z)
                        return n
                      })
                    }
                    aria-pressed={zones.has(z)}
                    className={cn('flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px]', zones.has(z) ? 'bg-card' : 'opacity-40')}
                  >
                    <span className="size-2" style={{ background: ZONE_COLOR[z] }} /> {v.label}
                  </button>
                ))}
              </div>
            </Group>

            <Group title="Data sources">
              <SourceLegend />
            </Group>
          </div>
        )}

        {panelTab === 'search' && (
          <div>
            {searching && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Searching…
              </p>
            )}
            {!searching && !results && (
              <div className="space-y-2 text-muted-foreground">
                <p>Try asking:</p>
                {['3 BHK under 2 Cr', 'Ready to move homes near SG Highway', 'Hospitals near GIFT City', 'Homes near a metro station', 'Schools within 2 km of Bopal'].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setQuery(s)
                      setTimeout(() => document.querySelector<HTMLButtonElement>('[title="Ask with AI"]')?.click(), 0)
                    }}
                    className="block w-full rounded-md border px-3 py-2 text-left text-foreground hover:bg-accent"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {!searching && results && (
              <div className="space-y-3">
                {results.query && (
                  <div className="rounded-md bg-muted/60 p-3 text-xs">
                    <p className="flex items-center gap-1.5 font-medium">
                      <Sparkles className="size-3.5 text-brand" /> {results.query.summary}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {chips(results.query).map((c) => (
                        <span key={c} className="rounded border bg-card px-1.5 py-0.5">
                          {c}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {results.query.interpretedBy === 'ai' ? 'Interpreted by AI (Sarvam).' : 'Interpreted by keyword rules.'} Results come only from map data.
                    </p>
                  </div>
                )}
                {results.note && <p className="flex gap-2 text-xs text-muted-foreground"><AlertTriangle className="size-3.5 shrink-0 text-amber-600" /> {results.note}</p>}
                <ul className="divide-y rounded-md border">
                  {results.items.map((r) => (
                    <li key={r.key}>
                      <button onClick={() => select(r.sel)} className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-accent">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{r.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">{r.subtitle}</span>
                        </span>
                        {r.km != null && <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{fmtKm(r.km)}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
                <button onClick={() => (setResults(null), drawRadius(null, 0))} className="text-xs text-muted-foreground underline-offset-4 hover:underline">
                  Clear results
                </button>
              </div>
            )}
          </div>
        )}

        {panelTab === 'analytics' && <Analytics stats={viewStats} units={units ?? []} zoom={zoom} osmStatus={osmStatus} />}
      </div>
    </div>
  )

  return (
    <div className="relative h-[calc(100svh-4rem)] min-h-[560px] overflow-hidden bg-zinc-900" data-lenis-prevent>
      <style>{MARKER_CSS}</style>
      <div className="absolute inset-0">
        <div ref={container} className="h-full w-full" />
      </div>

      {/* Desktop side panel */}
      <aside className="absolute bottom-4 left-4 top-4 z-10 hidden w-[340px] overflow-hidden rounded-xl border bg-background/95 shadow-2xl backdrop-blur lg:block">{sidePanel}</aside>

      {/* Top controls */}
      <div className={cn('absolute right-4 top-4 z-10 flex flex-wrap justify-end gap-2 lg:left-[372px] lg:justify-start', sel ? 'lg:right-[424px]' : 'lg:right-4')}>
        <div className="flex overflow-hidden rounded-lg border bg-background/95 text-xs shadow-lg backdrop-blur">
          {(Object.keys(BASEMAPS) as Basemap[]).map((k) => (
            <button key={k} onClick={() => setBasemap(k)} className={cn('px-3 py-2', basemap === k ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}>
              {BASEMAPS[k].label}
            </button>
          ))}
          <button onClick={() => setIs3d((v) => !v)} className="flex items-center gap-1.5 border-l px-3 py-2 hover:bg-accent">
            {is3d ? <MapIcon className="size-3.5" /> : <Box className="size-3.5" />} {is3d ? '2D' : '3D'}
          </button>
        </div>
        <div className="flex overflow-hidden rounded-lg border bg-background/95 text-xs shadow-lg backdrop-blur">
          {(Object.keys(VIEWS) as (keyof typeof VIEWS)[]).map((k) => (
            <button key={k} onClick={() => mapRef.current?.flyTo({ center: VIEWS[k].center, zoom: VIEWS[k].zoom, duration: 1400 })} className="px-3 py-2 hover:bg-accent">
              {VIEWS[k].label}
            </button>
          ))}
        </div>
        <OsmChip status={osmStatus} zoom={zoom} counts={osmCounts} />
      </div>

      {/* Mobile: search button + sheet */}
      <button
        onClick={() => setMobilePanel(true)}
        className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm text-primary-foreground shadow-xl lg:hidden"
      >
        <SlidersHorizontal className="size-4" /> Search & layers
      </button>
      <D.Root open={mobilePanel} onOpenChange={setMobilePanel}>
        <D.Portal>
          <D.Overlay className="fixed inset-0 z-40 bg-black/40 lg:hidden" />
          <D.Content className="fixed inset-x-0 bottom-0 z-50 h-[78svh] overflow-hidden rounded-t-2xl bg-background shadow-2xl lg:hidden" aria-describedby={undefined}>
            <D.Title className="sr-only">Map search and layers</D.Title>
            <D.Close className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-md hover:bg-accent" aria-label="Close">
              <X className="size-4" />
            </D.Close>
            <div className="h-full pt-2">{sidePanel}</div>
          </D.Content>
        </D.Portal>
      </D.Root>

      {/* Info panel: right column on desktop, bottom sheet on mobile */}
      {sel && described && (
        <aside className="animate-reveal absolute inset-x-0 bottom-0 z-20 h-[62%] overflow-hidden rounded-t-2xl border bg-background shadow-2xl [animation-duration:0.35s] lg:inset-x-auto lg:bottom-4 lg:right-4 lg:top-4 lg:h-auto lg:w-[400px] lg:rounded-xl">
          <InfoPanel
            key={described.id}
            sel={sel}
            d={described}
            projects={projects}
            units={units ?? []}
            inCompare={inCompare}
            onCompare={() => toggleCompare(described)}
            onZoom={() => flyTo(described.center, 17)}
            onClose={() => setSel(null)}
          />
        </aside>
      )}

      {/* Compare tray */}
      {compare.length > 0 && (
        <div className={cn('absolute bottom-6 z-10 flex items-center gap-2 rounded-full border bg-background/95 py-1.5 pl-4 pr-1.5 text-sm shadow-xl backdrop-blur', 'left-1/2 -translate-x-1/2 max-lg:bottom-20', sel && 'lg:left-[calc(50%-200px)]')}>
          <Columns3 className="size-4 text-brand" />
          <span className="max-w-[40vw] truncate">{compare.map((c) => c.title).join(' · ')}</span>
          <button onClick={() => setCompareOpen(true)} disabled={compare.length < 2} className="rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-40">
            Compare {compare.length}
          </button>
          <button onClick={() => setCompare([])} className="grid size-7 place-items-center rounded-full hover:bg-accent" aria-label="Clear comparison">
            <X className="size-3.5" />
          </button>
        </div>
      )}
      <CompareDialog items={compare} open={compareOpen} onOpenChange={setCompareOpen} onRemove={(id) => setCompare((c) => c.filter((x) => x.id !== id))} />
    </div>
  )
}

/* ── Pieces ────────────────────────────────────────────────────── */

function chips(q: MapQuery) {
  const c: string[] = [q.target === 'amenities' ? 'Amenities' : q.target === 'place' ? 'Go to place' : 'Projects']
  if (q.bhk) c.push(`${q.bhk} BHK`)
  if (q.minPriceCr != null) c.push(`≥ ₹${q.minPriceCr} Cr`)
  if (q.maxPriceCr != null) c.push(`≤ ₹${q.maxPriceCr} Cr`)
  if (q.status) c.push(q.status)
  if (q.near) c.push(`near ${q.near}`)
  if (q.radiusKm) c.push(`within ${q.radiusKm} km`)
  if (q.category) c.push(POI_META[q.category].label)
  return c
}

function tooltipFor(f: MapGeoJSONFeature, areas: Map<string, OsmArea>, pois: Map<string, OsmPoi>) {
  const id = String(f.properties?.id)
  const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!)
  switch (f.layer.id) {
    case 'osm-pois': {
      const p = pois.get(id)
      return p ? `<b>${esc(p.name ?? POI_META[p.category].label)}</b><br/><span>${POI_META[p.category].label}</span>` : null
    }
    case 'osm-buildings':
    case 'osm-roads-hit':
    case 'osm-landuse': {
      const a = areas.get(id)
      if (!a) return null
      const kind = a.kind === 'building' ? 'Building' : a.kind === 'road' ? 'Road' : `Land use: ${a.tags.landuse}`
      return a.name ? `<b>${esc(a.name)}</b><br/><span>${kind}</span>` : `<span>${kind}</span>`
    }
    case 'demo-parcels-fill':
      return `<b>${esc(id)}</b><br/><span>Plot · demo data</span>`
    case 'demo-buildings':
      return `<b>${esc(BUILDINGS.find((b) => b.id === id)?.name ?? id)}</b><br/><span>Masterplan · demo</span>`
    case 'demo-infra':
      return `<b>${esc(INFRASTRUCTURE.find((i) => i.id === id)?.name ?? id)}</b><br/><span>Utility · demo</span>`
  }
  return null
}

function Group({ title, source, hint, children }: { title: string; source?: Parameters<typeof SourceBadge>[0]['source']; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{title}</h3>
        {source && <SourceBadge source={source} />}
      </div>
      {hint && <p className="mb-2 text-[11px] text-amber-700 dark:text-amber-400">{hint}</p>}
      <div className="space-y-0.5">{children}</div>
    </section>
  )
}

function Toggle({ on, onChange, label, swatch, round, dashed }: { on: boolean; onChange: () => void; label: string; swatch: string; round?: boolean; dashed?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1 hover:bg-accent">
      <input type="checkbox" checked={on} onChange={onChange} className="size-3.5 accent-[var(--brand)]" />
      <span
        className={cn('size-3 shrink-0', round ? 'rounded-full' : 'rounded-sm', dashed && 'border-2 border-dashed bg-transparent')}
        style={dashed ? { borderColor: swatch } : { background: swatch }}
      />
      <span className={cn('text-[13px]', !on && 'text-muted-foreground')}>{label}</span>
    </label>
  )
}

function OsmChip({ status, zoom, counts }: { status: OsmStatus; zoom: number; counts: { buildings: number; places: number } }) {
  const loadedAny = counts.buildings + counts.places > 0
  const text =
    status === 'loading'
      ? 'Loading OpenStreetMap…'
      : status === 'error'
        ? loadedAny
          ? 'Some OpenStreetMap areas failed; move the map to retry'
          : 'OpenStreetMap is busy; move the map to retry'
        : zoom < 11.5 && !loadedAny
          ? 'Zoom in for live map data'
          : status === 'idle'
            ? 'Connecting to OpenStreetMap…'
            : `OpenStreetMap: ${counts.buildings} buildings · ${counts.places} places`
  return (
    <span
      className={cn(
        'flex items-center gap-1.5 rounded-lg border bg-background/95 px-3 py-2 text-xs shadow-lg backdrop-blur',
        status === 'error' && 'text-amber-700 dark:text-amber-400',
      )}
    >
      {status === 'loading' ? <Loader2 className="size-3.5 animate-spin" /> : <span className={cn('size-2 rounded-full', status === 'error' ? 'bg-amber-500' : 'bg-emerald-500')} />}
      {text}
    </span>
  )
}

function Analytics({
  stats,
  units,
  zoom,
  osmStatus,
}: {
  stats: { cats: [PoiCategory, number][]; buildings: number; projects: Property[] } | null
  units: { project?: Property; pricePerSqft?: number }[]
  zoom: number
  osmStatus: OsmStatus
}) {
  if (!stats) return <p className="text-muted-foreground">Move the map to analyse an area.</p>
  const max = Math.max(1, ...stats.cats.map((c) => c[1]))
  const psf = units.filter((u) => u.pricePerSqft && stats.projects.some((p) => p._id === u.project?._id)).map((u) => u.pricePerSqft!)
  const avg = psf.length ? psf.reduce((a, b) => a + b, 0) / psf.length : null
  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">Figures for the area currently on screen.</p>
      <Group title="Listings in view" source="platform">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Projects" value={String(stats.projects.length)} />
          <Stat label="Avg ₹/sq.ft" value={avg ? `₹${Math.round(avg).toLocaleString('en-IN')}` : '—'} badge={avg ? 'estimate' : undefined} />
        </div>
        {stats.projects.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            From {formatINR(Math.min(...stats.projects.map((p) => p.price)))} · {stats.projects.map((p) => shortName(p.name)).join(', ')}
          </p>
        )}
      </Group>
      <Group title="Built environment" source="verified" hint={zoom < 13.5 ? 'Zoom in to count buildings.' : undefined}>
        <Stat label="Mapped buildings loaded" value={stats.buildings.toLocaleString('en-IN')} />
      </Group>
      <Group title="Infrastructure in view" source="verified" hint={osmStatus === 'error' ? 'Some areas could not load.' : zoom < 11.5 ? 'Zoom in to load amenities.' : undefined}>
        {stats.cats.length === 0 ? (
          <p className="text-xs italic text-muted-foreground">No amenities loaded for this area.</p>
        ) : (
          <ul className="space-y-2">
            {stats.cats.map(([c, n]) => (
              <li key={c} className="text-xs">
                <div className="flex justify-between">
                  <span>{POI_META[c].label}</span>
                  <span className="tabular-nums">{n}</span>
                </div>
                <div className="mt-1 h-1.5 rounded bg-muted">
                  <div className="h-full rounded" style={{ width: `${(n / max) * 100}%`, background: POI_META[c].color }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Group>
    </div>
  )
}

function Stat({ label, value, badge }: { label: string; value: string; badge?: Parameters<typeof SourceBadge>[0]['source'] }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground">
        {label}
        {badge && <SourceBadge source={badge} />}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  )
}

function CompareDialog({ items, open, onOpenChange, onRemove }: { items: Described[]; open: boolean; onOpenChange: (o: boolean) => void; onRemove: (id: string) => void }) {
  const labels = Array.from(new Set(items.flatMap((i) => i.overview.map((f) => f.label))))
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <D.Content className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-xl border bg-background shadow-2xl md:inset-10" aria-describedby={undefined}>
          <div className="flex items-center justify-between border-b px-5 py-4">
            <D.Title className="font-display text-3xl">Comparison</D.Title>
            <D.Close className="grid size-9 place-items-center rounded-md hover:bg-accent" aria-label="Close">
              <X className="size-4" />
            </D.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-auto" data-lenis-prevent>
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead className="sticky top-0 bg-background">
                <tr>
                  <th className="w-44 border-b p-4" />
                  {items.map((i) => (
                    <th key={i.id} className="border-b border-l p-4 text-left align-top font-normal">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{i.kindLabel}</p>
                          <p className="mt-1 font-display text-2xl leading-tight">{i.title}</p>
                        </div>
                        <button onClick={() => onRemove(i.id)} className="rounded p-1 text-muted-foreground hover:bg-accent" aria-label={`Remove ${i.title}`}>
                          <X className="size-3.5" />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {labels.map((l) => (
                  <tr key={l} className="hover:bg-muted/40">
                    <th className="border-b p-4 text-left text-xs font-normal text-muted-foreground">{l}</th>
                    {items.map((i) => {
                      const f = i.overview.find((x) => x.label === l)
                      return (
                        <td key={i.id} className="border-b border-l p-4 align-top">
                          {f ? (
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <span>{f.value ?? <span className="italic text-muted-foreground">Not available</span>}</span>
                              <SourceBadge source={f.source} />
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}

const MARKER_CSS = `
.reos-marker{display:flex;flex-direction:column;align-items:center;gap:4px;background:none;border:0;padding:0;cursor:pointer}
.reos-marker-label{white-space:nowrap;border-radius:999px;background:#0c4a6e;color:#fff;font:500 12px/1 Inter,sans-serif;padding:7px 11px;box-shadow:0 6px 18px rgba(0,0,0,.35);transition:transform .2s,background .2s}
.reos-marker-label b{font-weight:600;margin-right:4px}
.reos-marker-dot{order:2;width:10px;height:10px;border-radius:50%;background:#0284c7;border:2px solid #fff;box-shadow:0 0 0 4px rgba(2,132,199,.35)}
.reos-marker:hover .reos-marker-label,.reos-marker.is-active .reos-marker-label{transform:translateY(-2px) scale(1.05);background:#c49a63}
.reos-tip .maplibregl-popup-content{padding:6px 9px;border-radius:6px;font:12px/1.35 Inter,sans-serif;color:#1c1917}
.reos-tip .maplibregl-popup-content span{color:#78716c}
`
