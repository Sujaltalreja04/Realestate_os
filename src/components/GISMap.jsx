import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './GISMap.css';
import {
  Search, X, FileText, Download, MapPin, Compass, Plus, Minus, Maximize2, Minimize2,
  Building2, Layers, Zap, Route, Satellite, Map as MapIcon, Globe2, BarChart3, Play, Pause, Sun, Sunrise, Sunset,
  ChevronRight, Home, Box, Square, Navigation, ShieldCheck, Users, Ruler, CalendarDays, ExternalLink,
} from 'lucide-react';
import {
  GIFT_CENTER, GIFT_BOUNDS, STATUS, ZONES, FLOOR_STATUS,
  BUILDINGS, PARCELS, ROADS, INFRASTRUCTURE, getFloors, getCondition,
} from '../data/giftCityGIS';

/* ───────────── Map style (inline: never blocks on a remote style file) ───────────── */
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
const MAP_STYLE = {
  version: 8,
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: {
    street: { type: 'raster', tileSize: 256, maxzoom: 19, tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], attribution: '© OpenStreetMap contributors' },
    satellite: { type: 'raster', tileSize: 256, maxzoom: 19, tiles: [`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`], attribution: 'Imagery © Esri, Maxar' },
    roadsRef: { type: 'raster', tileSize: 256, maxzoom: 19, tiles: [`${ESRI}/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}`] },
    placesRef: { type: 'raster', tileSize: 256, maxzoom: 19, tiles: [`${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`] },
    openmaptiles: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' },
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#dcd8cf' } },
    { id: 'street', type: 'raster', source: 'street', layout: { visibility: 'none' } },
    { id: 'satellite', type: 'raster', source: 'satellite', paint: { 'raster-saturation': -0.05, 'raster-contrast': 0.08 } },
    { id: 'roadsRef', type: 'raster', source: 'roadsRef', paint: { 'raster-opacity': 0.85 } },
    { id: 'placesRef', type: 'raster', source: 'placesRef' },
  ],
};
const BASEMAPS = {
  hybrid: { label: 'Hybrid', icon: Globe2, layers: ['satellite', 'roadsRef', 'placesRef'] },
  satellite: { label: 'Satellite', icon: Satellite, layers: ['satellite'] },
  street: { label: 'Street', icon: MapIcon, layers: ['street'] },
};

const CENTER = [GIFT_CENTER[1], GIFT_CENTER[0]];
const HOME_3D = { center: CENTER, zoom: 16.1, pitch: 62, bearing: -32 };
const HOME_2D = { center: CENTER, zoom: 15.4, pitch: 0, bearing: 0 };
const INTRO = { center: [72.62, 23.2], zoom: 11.2, pitch: 0, bearing: 0 };
const MIN_Z = 10, MAX_Z = 19;

/* ───────────── helpers ───────────── */
const fmtNum = (n) => new Intl.NumberFormat('en-IN').format(n);
const fmtINR = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
const ll = ([lat, lng]) => [lng, lat];
const ring = (p) => { const r = p.map(ll); return [...r, r[0]]; };
const centroid = (p) => [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length];
const posOf = (i) => i.position ?? (i.polygon ? centroid(i.polygon) : i.path[Math.floor(i.path.length / 2)]);
const statusMatch = (fb) => ['match', ['get', 'status'], ...Object.entries(STATUS).flatMap(([k, s]) => [k, s.color]), fb];
const zoneMatch = ['match', ['get', 'zone'], ...Object.entries(ZONES).flatMap(([k, z]) => [k, z.color]), '#888'];
const fc = (features) => ({ type: 'FeatureCollection', features });
const polyFeature = (i, props) => ({ type: 'Feature', properties: { id: i.id, name: i.name, status: i.status, ...props }, geometry: { type: 'Polygon', coordinates: [ring(i.polygon)] } });
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hexMix = (a, b, t) => {
  const pa = a.match(/\w\w/g).map((x) => parseInt(x, 16)), pb = b.match(/\w\w/g).map((x) => parseInt(x, 16));
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('');
};
const occupancyOf = (b) => {
  const f = getFloors(b).filter((x) => x.status !== 'lobby');
  return b.status === 'operational' ? Math.round((f.filter((x) => x.status === 'occupied').length / f.length) * 100) : null;
};
const fmtHour = (h) => `${Math.floor(h) % 12 || 12}:${String(Math.round((h % 1) * 60)).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;

/* ───────────── GeoJSON sources ───────────── */
const FLOOR_FEATURES = BUILDINGS.flatMap((b) => {
  const h = b.heightM / b.floors;
  if (b.status === 'planned') return [polyFeature(b, { bid: b.id, fid: `${b.id}-ghost`, base: 0, top: b.heightM, color: '#C7D9F5', muted: '#E2E8F0' })];
  return getFloors(b).map((f) => ({
    ...polyFeature(b, {}),
    properties: { id: f.id, status: b.status, bid: b.id, fid: f.id, base: f.level * h, top: (f.level + 1) * h - Math.min(0.8, h * 0.18), color: FLOOR_STATUS[f.status].color, muted: '#E7E5E4' },
  }));
});
const SOURCES = {
  floors: fc(FLOOR_FEATURES),
  buildings: fc(BUILDINGS.map((b) => polyFeature(b, { height: b.heightM }))),
  parcels: fc(PARCELS.map((p) => polyFeature(p, { zone: p.zone }))),
  roads: fc(ROADS.map((r) => ({ type: 'Feature', properties: { id: r.id, name: r.name, status: r.status }, geometry: { type: 'LineString', coordinates: r.path.map(ll) } }))),
};
const REGISTRY = {
  building: Object.fromEntries(BUILDINGS.map((i) => [i.id, i])),
  parcel: Object.fromEntries(PARCELS.map((i) => [i.id, i])),
  road: Object.fromEntries(ROADS.map((i) => [i.id, i])),
  infrastructure: Object.fromEntries(INFRASTRUCTURE.map((i) => [i.id, i])),
};
const LAYERS = {
  buildings: { label: 'Registered Buildings', icon: Building2, count: BUILDINGS.length },
  osm: { label: 'City 3D Buildings', icon: Box, count: 'OSM' },
  parcels: { label: 'Land Parcels', icon: Layers, count: PARCELS.length },
  infrastructure: { label: 'Infrastructure', icon: Zap, count: INFRASTRUCTURE.length },
  roads: { label: 'Planned Roads', icon: Route, count: ROADS.length },
};
const GLYPH = {
  building: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v8h4M18 9h2a2 2 0 0 1 2 2v11h-4M10 6h4M10 10h4M10 14h4M10 18h4"/></svg>',
  infrastructure: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
};

/* Sun model: hour → light direction, warmth, sky */
const sunAt = (h) => {
  const t = Math.min(1, Math.max(0, (h - 6) / 13));
  const s = Math.sin(Math.PI * t);
  return { elev: Math.max(5, s * 75), azim: 80 + t * 200, golden: Math.max(0, 1 - s * 2.4) };
};

export default function GISMap() {
  const shellRef = useRef(null);
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const touringRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [basemap, setBasemap] = useState('hybrid');
  const [is3D, setIs3D] = useState(true);
  const [zoom, setZoom] = useState(INTRO.zoom);
  const [bearing, setBearing] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [visible, setVisible] = useState({ buildings: true, osm: true, parcels: true, infrastructure: true, roads: false });
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [drawer, setDrawer] = useState('explore');
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('overview');
  const [hover, setHover] = useState(null);
  const [hour, setHour] = useState(16.5);
  const [touring, setTouring] = useState(false);

  /* ── init ── */
  useEffect(() => {
    const map = new maplibregl.Map({
      container: mapEl.current, style: MAP_STYLE, ...INTRO,
      minZoom: MIN_Z, maxZoom: MAX_Z, maxPitch: 78,
      maxBounds: [[GIFT_BOUNDS[0][1] - 0.25, GIFT_BOUNDS[0][0] - 0.25], [GIFT_BOUNDS[1][1] + 0.25, GIFT_BOUNDS[1][0] + 0.25]],
      canvasContextAttributes: { antialias: true },
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.on('zoom', () => setZoom(map.getZoom()));
    map.on('rotate', () => setBearing(map.getBearing()));
    map.on('dragstart', () => setTouring(false));

    map.on('load', () => {
      Object.entries(SOURCES).forEach(([k, data]) => map.addSource(k, { type: 'geojson', data, promoteId: 'id' }));
      const sel = (on, off) => ['case', ['boolean', ['feature-state', 'selected'], false], on, off];

      map.addLayer({ id: 'parcels-fill', type: 'fill', source: 'parcels', paint: { 'fill-color': zoneMatch, 'fill-opacity': sel(0.45, ['match', ['get', 'status'], 'available', 0.3, 0.16]) } });
      map.addLayer({ id: 'parcels-line', type: 'line', source: 'parcels', paint: { 'line-color': zoneMatch, 'line-width': sel(3.5, 2), 'line-dasharray': [2.5, 1.5] } });
      map.addLayer({ id: 'roads-line', type: 'line', source: 'roads', layout: { 'line-cap': 'round' }, paint: { 'line-color': statusMatch('#64748B'), 'line-width': 5, 'line-opacity': 0.85, 'line-dasharray': [2, 1] } });
      map.addLayer({ id: 'reg-buildings-fill', type: 'fill', source: 'buildings', paint: { 'fill-color': statusMatch('#999'), 'fill-opacity': sel(0.9, 0.65), 'fill-outline-color': '#ffffff' } });

      map.addLayer({ id: 'osm-buildings-3d', type: 'fill-extrusion', source: 'openmaptiles', 'source-layer': 'building', minzoom: 13, paint: {
        'fill-extrusion-color': '#f1efe9',
        'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13, 0, 14, ['coalesce', ['get', 'render_height'], 6]],
        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
        'fill-extrusion-opacity': 0.92, 'fill-extrusion-vertical-gradient': true,
      } });
      map.addLayer({ id: 'floors-3d', type: 'fill-extrusion', source: 'floors', paint: {
        'fill-extrusion-color': ['get', 'color'],
        'fill-extrusion-base': ['get', 'base'], 'fill-extrusion-height': ['get', 'top'],
        'fill-extrusion-opacity': 0.97, 'fill-extrusion-vertical-gradient': true,
      } });
      map.addLayer({ id: 'parcels-label', type: 'symbol', source: 'parcels', minzoom: 15.6, layout: { 'text-field': ['get', 'id'], 'text-font': ['Noto Sans Bold'], 'text-size': 11, 'text-letter-spacing': 0.05 }, paint: { 'text-color': '#fff', 'text-halo-color': 'rgba(15,23,42,.75)', 'text-halo-width': 1.6 } });

      // hover + click
      const hoverable = ['floors-3d', 'reg-buildings-fill', 'parcels-fill', 'roads-line'];
      map.on('mousemove', (e) => {
        const layers = hoverable.filter((id) => map.getLayoutProperty(id, 'visibility') !== 'none');
        const f = map.queryRenderedFeatures(e.point, { layers })[0];
        map.getCanvas().style.cursor = f ? 'pointer' : '';
        if (!f) return setHover(null);
        const p = f.properties;
        if (f.layer.id === 'floors-3d') {
          const b = REGISTRY.building[p.bid];
          const fl = getFloors(b).find((x) => x.id === p.fid);
          setHover({ x: e.point.x, y: e.point.y, kind: 'building', item: b, floor: fl });
        } else {
          const kind = f.layer.id.startsWith('reg-') ? 'building' : f.layer.id.startsWith('parcels') ? 'parcel' : 'road';
          setHover({ x: e.point.x, y: e.point.y, kind, item: REGISTRY[kind][p.id] });
        }
      });
      map.on('mouseout', () => setHover(null));
      map.on('click', (e) => {
        const f = map.queryRenderedFeatures(e.point, { layers: hoverable.filter((id) => map.getLayoutProperty(id, 'visibility') !== 'none') })[0];
        if (!f) return;
        setTouring(false);
        if (f.layer.id === 'floors-3d') { setSelected({ kind: 'building', item: REGISTRY.building[f.properties.bid], floor: f.properties.fid }); setTab('floors'); return; }
        const kind = f.layer.id.startsWith('reg-') ? 'building' : f.layer.id.startsWith('parcels') ? 'parcel' : 'road';
        setSelected({ kind, item: REGISTRY[kind][f.properties.id] }); setTab('overview');
      });

      // DOM markers
      const add = (kind, item) => {
        const el = document.createElement('div');
        el.className = `gx-marker gx-marker-${kind}`;
        el.style.setProperty('--c', STATUS[item.status].color);
        el.innerHTML = `<span class="gx-marker-halo"></span><span class="gx-marker-dot">${GLYPH[kind]}</span><span class="gx-marker-tag">${esc(item.name)}</span>`;
        el.addEventListener('click', (ev) => { ev.stopPropagation(); setTouring(false); setSelected({ kind, item }); setTab('overview'); });
        new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(ll(posOf(item))).addTo(map);
        markersRef.current.push({ kind, item, el });
      };
      BUILDINGS.forEach((b) => add('building', b));
      INFRASTRUCTURE.forEach((i) => add('infrastructure', i));

      setReady(true);
      // Cinematic fly-in
      setTimeout(() => map.flyTo({ ...HOME_3D, duration: 4200, curve: 1.6, essential: true }), 400);
    });

    const onFs = () => setFullscreen(document.fullscreenElement === shellRef.current);
    const onKey = (e) => { if (e.key === 'Escape') { setSelected(null); setTouring(false); } };
    document.addEventListener('fullscreenchange', onFs);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      window.removeEventListener('keydown', onKey);
      markersRef.current = [];
      map.remove(); mapRef.current = null;
    };
  }, []);

  /* ── basemap ── */
  useEffect(() => {
    if (!ready) return;
    const on = new Set(BASEMAPS[basemap].layers);
    ['street', 'satellite', 'roadsRef', 'placesRef'].forEach((id) => mapRef.current.setLayoutProperty(id, 'visibility', on.has(id) ? 'visible' : 'none'));
  }, [basemap, ready]);

  /* ── layers / filter / 2D-3D ── */
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    const f = statusFilter === 'all' ? null : ['==', ['get', 'status'], statusFilter];
    ['parcels-fill', 'parcels-line', 'parcels-label', 'roads-line', 'reg-buildings-fill', 'floors-3d'].forEach((id) => map.setFilter(id, f));
    const vis = {
      'reg-buildings-fill': visible.buildings && !is3D, 'floors-3d': visible.buildings && is3D,
      'osm-buildings-3d': visible.osm && is3D,
      'parcels-fill': visible.parcels, 'parcels-line': visible.parcels, 'parcels-label': visible.parcels,
      'roads-line': visible.roads,
    };
    Object.entries(vis).forEach(([id, on]) => map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none'));
    markersRef.current.forEach(({ kind, item, el }) => {
      const on = (kind === 'building' ? visible.buildings && !is3D : visible.infrastructure) && (statusFilter === 'all' || item.status === statusFilter);
      el.style.display = on ? '' : 'none';
    });
  }, [visible, statusFilter, is3D, ready]);

  const switchView = (to3D) => {
    setIs3D(to3D);
    const map = mapRef.current;
    map.easeTo(to3D ? { pitch: 62, bearing: map.getBearing() || -32, zoom: Math.max(map.getZoom(), 16), duration: 1300 } : { pitch: 0, bearing: 0, duration: 1100 });
  };

  /* ── sun / time of day ── */
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    const { elev, azim, golden } = sunAt(hour);
    map.setLight({ anchor: 'map', position: [1.5, azim, 90 - elev], color: hexMix('#ffffff', '#ffb070', golden), intensity: 0.28 + 0.27 * (elev / 75) });
    map.setSky?.({
      'sky-color': hexMix('#6fa8e8', '#f59e6b', golden), 'horizon-color': hexMix('#e3eefa', '#ffd2a6', golden),
      'fog-color': hexMix('#eef2f6', '#f6cfae', golden), 'sky-horizon-blend': 0.55, 'horizon-fog-blend': 0.6, 'fog-ground-blend': 0.55,
    });
    map.setPaintProperty('satellite', 'raster-brightness-max', 1 - golden * 0.22);
    map.setPaintProperty('satellite', 'raster-hue-rotate', golden * -8);
    map.setPaintProperty('osm-buildings-3d', 'fill-extrusion-color', hexMix('#f3f1ec', '#f4c9a0', golden * 0.7));
  }, [hour, ready]);

  /* ── selection: fly + highlight ── */
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    markersRef.current.forEach(({ item, el }) => el.classList.toggle('active', item === selected?.item));
    if (!selected) return;
    const zoomTo = selected.kind === 'parcel' || selected.kind === 'road' ? 16.6 : is3D ? 17.3 : 16.8;
    map.flyTo({
      center: ll(posOf(selected.item)), zoom: zoomTo, duration: touringRef.current ? 3200 : 1400, essential: true,
      padding: { right: 380, left: drawer ? 340 : 80, top: 60, bottom: 60 },
      ...(is3D ? { pitch: 64, bearing: touringRef.current ? map.getBearing() + 55 : map.getBearing() } : {}),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.item, ready]);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    ['parcels', 'buildings', 'roads'].forEach((src) => map.removeFeatureState({ source: src }));
    const srcOf = { building: 'buildings', parcel: 'parcels', road: 'roads' }[selected?.kind];
    if (srcOf) map.setFeatureState({ source: srcOf, id: selected.item.id }, { selected: true });
    const bid = selected?.kind === 'building' ? selected.item.id : null;
    map.setPaintProperty('floors-3d', 'fill-extrusion-color', !bid ? ['get', 'color'] : [
      'case', ['==', ['get', 'fid'], selected.floor ?? ''], '#2563EB', ['==', ['get', 'bid'], bid], ['get', 'color'], ['get', 'muted'],
    ]);
  }, [selected, ready]);

  /* ── city tour ── */
  useEffect(() => {
    touringRef.current = touring;
    if (!touring) return;
    const list = BUILDINGS.filter((b) => b.status !== 'planned');
    let i = Math.max(0, list.indexOf(selected?.item) + 1);
    const go = () => { setSelected({ kind: 'building', item: list[i++ % list.length] }); setTab('overview'); };
    go();
    const t = setInterval(go, 6500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [touring]);

  /* ── derived ── */
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return Object.entries(REGISTRY).flatMap(([kind, items]) => Object.values(items).map((item) => ({ kind, item })))
      .filter(({ item }) => `${item.id} ${item.name} ${item.owner ?? ''} ${item.category ?? ''}`.toLowerCase().includes(q)).slice(0, 7);
  }, [query]);

  const insights = useMemo(() => {
    const ops = BUILDINGS.filter((b) => b.status === 'operational');
    const floors = ops.flatMap((b) => getFloors(b).filter((f) => f.status !== 'lobby'));
    const occ = floors.filter((f) => f.status === 'occupied').length;
    const uc = BUILDINGS.filter((b) => b.status === 'under-construction');
    const health = ops.map((b) => getCondition(b).score);
    return {
      occupancy: Math.round((occ / floors.length) * 100), occFloors: occ, totalFloors: floors.length,
      builtUp: BUILDINGS.reduce((s, b) => s + b.builtUpSqft, 0),
      avgHealth: Math.round(health.reduce((a, b) => a + b, 0) / health.length),
      ucProgress: Math.round(uc.reduce((s, b) => s + (b.completion ?? 0), 0) / uc.length), ucCount: uc.length,
      availParcels: PARCELS.filter((p) => p.status === 'available'),
      ranking: ops.map((b) => ({ b, occ: occupancyOf(b), health: getCondition(b).score })).sort((a, z) => z.occ - a.occ),
      byStatus: Object.keys(STATUS).map((k) => ({ k, n: [...BUILDINGS, ...PARCELS, ...INFRASTRUCTURE].filter((i) => i.status === k).length })),
    };
  }, []);

  const filteredBuildings = BUILDINGS.filter((b) => statusFilter === 'all' || b.status === statusFilter);
  const zoomPct = Math.round(((zoom - MIN_Z) / (MAX_Z - MIN_Z)) * 100);
  const toggleFs = () => (document.fullscreenElement ? document.exitFullscreen() : shellRef.current.requestFullscreen());
  const pick = (r) => { setTouring(false); setSelected(r); setTab('overview'); setQuery(''); };
  const goHome = () => { setSelected(null); setTouring(false); mapRef.current.flyTo({ ...(is3D ? HOME_3D : HOME_2D), duration: 1600 }); };
  const SunIcon = hour < 9 ? Sunrise : hour > 17 ? Sunset : Sun;

  return (
    <div ref={shellRef} className={`gx-shell ${drawer ? 'drawer-open' : ''} ${selected ? 'details-open' : ''}`}>
      <div ref={mapEl} className="gx-map" />
      <div className="gx-vignette" />
      {!ready && <div className="gx-loading"><div className="gx-spinner" />Loading GIFT City…</div>}

      {/* Icon rail */}
      <nav className="gx-rail">
        <div className="gx-rail-logo"><Globe2 size={20} /></div>
        {[['explore', Building2, 'Explore'], ['layers', Layers, 'Layers'], ['insights', BarChart3, 'Insights']].map(([k, Icon, label]) => (
          <button key={k} className={drawer === k ? 'on' : ''} onClick={() => setDrawer(drawer === k ? null : k)} title={label}>
            <Icon size={19} /><span>{label}</span>
          </button>
        ))}
        <div className="gx-rail-spacer" />
        <button onClick={goHome} title="GIFT City home"><Home size={19} /><span>Home</span></button>
      </nav>

      {/* Drawer */}
      {drawer && (
        <aside className="gx-drawer">
          <div className="gx-drawer-head">
            <div>
              <small>GIFT City · Gandhinagar</small>
              <h3>{drawer === 'explore' ? 'Explore Buildings' : drawer === 'layers' ? 'Map Layers' : 'City Insights'}</h3>
            </div>
            <button className="gx-icon-btn" onClick={() => setDrawer(null)}><X size={16} /></button>
          </div>

          {drawer === 'explore' && (<>
            <div className="gx-chips">
              <button className={statusFilter === 'all' ? 'on' : ''} style={{ '--c': '#0f172a' }} onClick={() => setStatusFilter('all')}>All</button>
              {['operational', 'under-construction', 'planned'].map((k) => (
                <button key={k} className={statusFilter === k ? 'on' : ''} style={{ '--c': STATUS[k].color }} onClick={() => setStatusFilter(statusFilter === k ? 'all' : k)}>{STATUS[k].label}</button>
              ))}
            </div>
            <div className="gx-cards">
              {filteredBuildings.map((b) => {
                const occ = occupancyOf(b);
                return (
                  <button key={b.id} className={`gx-bcard ${selected?.item === b ? 'on' : ''}`} style={{ '--c': STATUS[b.status].color }} onClick={() => pick({ kind: 'building', item: b })}>
                    <div className="gx-bcard-tower">{Array.from({ length: Math.min(9, Math.ceil(b.floors / 3)) }).map((_, i) => <i key={i} />)}</div>
                    <div className="gx-bcard-body">
                      <b>{b.name}</b>
                      <small>{b.category} · {b.floors} floors · {b.heightM} m</small>
                      <div className="gx-bcard-meta">
                        <span className="gx-dot-label"><i />{STATUS[b.status].label}</span>
                        {occ != null ? <span>{occ}% occupied</span> : b.completion != null ? <span>{b.completion}% built</span> : <span>Planned</span>}
                      </div>
                      <div className="gx-mini-bar"><div style={{ width: `${occ ?? b.completion ?? 0}%` }} /></div>
                    </div>
                    <ChevronRight size={16} className="gx-chev" />
                  </button>
                );
              })}
            </div>
          </>)}

          {drawer === 'layers' && (<>
            <div className="gx-label">Base map</div>
            <div className="gx-basemaps">
              {Object.entries(BASEMAPS).map(([k, { label, icon: Icon }]) => (
                <button key={k} className={`gx-bm gx-bm-${k} ${basemap === k ? 'on' : ''}`} onClick={() => setBasemap(k)}>
                  <span className="gx-bm-thumb"><Icon size={18} /></span>{label}
                </button>
              ))}
            </div>
            <div className="gx-label">Overlays</div>
            {Object.entries(LAYERS).map(([k, { label, icon: Icon, count }]) => (
              <button key={k} className={`gx-layer ${visible[k] ? 'on' : ''}`} onClick={() => setVisible((v) => ({ ...v, [k]: !v[k] }))}>
                <span className="gx-layer-ic"><Icon size={16} /></span><span className="gx-layer-name">{label}</span><em>{count}</em>
                <span className="gx-switch"><i /></span>
              </button>
            ))}
            <div className="gx-label">Development status</div>
            <div className="gx-chips wrap">
              <button className={statusFilter === 'all' ? 'on' : ''} style={{ '--c': '#0f172a' }} onClick={() => setStatusFilter('all')}>All</button>
              {Object.entries(STATUS).map(([k, s]) => (
                <button key={k} className={statusFilter === k ? 'on' : ''} style={{ '--c': s.color }} onClick={() => setStatusFilter(statusFilter === k ? 'all' : k)}>{s.label}</button>
              ))}
            </div>
            <div className="gx-label">Parcel zones</div>
            <div className="gx-zones">
              {Object.entries(ZONES).map(([k, z]) => <span key={k}><i style={{ borderColor: z.color, background: `${z.color}40` }} />{z.label}</span>)}
            </div>
          </>)}

          {drawer === 'insights' && (<>
            <div className="gx-kpis">
              <div className="gx-kpi"><span>City Occupancy</span><b>{insights.occupancy}%</b><small>{insights.occFloors}/{insights.totalFloors} floors</small></div>
              <div className="gx-kpi"><span>Built-up Area</span><b>{(insights.builtUp / 1e6).toFixed(2)}M</b><small>sq ft registered</small></div>
              <div className="gx-kpi"><span>Avg. Health</span><b>{insights.avgHealth}</b><small>condition score</small></div>
              <div className="gx-kpi"><span>Construction</span><b>{insights.ucProgress}%</b><small>{insights.ucCount} active sites</small></div>
            </div>
            <div className="gx-label">Status mix</div>
            <div className="gx-stack">
              {insights.byStatus.map(({ k, n }) => <div key={k} style={{ flex: n, background: STATUS[k].color }} title={`${STATUS[k].label}: ${n}`} />)}
            </div>
            <div className="gx-zones">{insights.byStatus.map(({ k, n }) => <span key={k}><i style={{ background: STATUS[k].color, borderColor: STATUS[k].color }} />{STATUS[k].label} · {n}</span>)}</div>
            <div className="gx-label">Occupancy by building</div>
            {insights.ranking.map(({ b, occ, health }) => (
              <button key={b.id} className="gx-rank" onClick={() => pick({ kind: 'building', item: b })}>
                <span>{b.name}</span>
                <div className="gx-mini-bar"><div style={{ width: `${occ}%` }} /></div>
                <b>{occ}%</b><em title="Health score">{health}</em>
              </button>
            ))}
            <div className="gx-label">Available land</div>
            {insights.availParcels.map((p) => (
              <button key={p.id} className="gx-rank" onClick={() => pick({ kind: 'parcel', item: p })}>
                <span>{p.id} · {ZONES[p.zone].label}</span><b>{fmtNum(p.areaSqm)} m²</b><em>{p.pricePerSqm ? `₹${Math.round(p.pricePerSqm / 1000)}k` : '—'}</em>
              </button>
            ))}
          </>)}
        </aside>
      )}

      {/* Search */}
      <div className="gx-search-wrap">
        <div className="gx-search">
          <Search size={17} />
          <input placeholder="Search GIFT City — buildings, plots, owners, tenants…" value={query} onChange={(e) => setQuery(e.target.value)} />
          {query && <button className="gx-icon-btn sm" onClick={() => setQuery('')}><X size={14} /></button>}
        </div>
        {results.length > 0 && (
          <div className="gx-results">
            {results.map((r) => (
              <button key={r.item.id} onClick={() => pick(r)}>
                <span className="gx-res-ic" style={{ '--c': STATUS[r.item.status].color }}>
                  {r.kind === 'building' ? <Building2 size={15} /> : r.kind === 'parcel' ? <Layers size={15} /> : r.kind === 'road' ? <Route size={15} /> : <Zap size={15} />}
                </span>
                <span className="gx-res-txt"><b>{r.item.name}</b><small>{r.kind} · {r.item.id} · {STATUS[r.item.status].label}</small></span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* View controls */}
      <div className="gx-controls">
        <div className="gx-seg">
          <button className={!is3D ? 'on' : ''} onClick={() => switchView(false)}><Square size={14} />2D</button>
          <button className={is3D ? 'on' : ''} onClick={() => switchView(true)}><Box size={14} />3D</button>
        </div>
        <div className="gx-ctrl-col">
          <button onClick={() => mapRef.current.easeTo({ bearing: 0, pitch: is3D ? 62 : 0, duration: 700 })} title="Reset north">
            <Compass size={18} style={{ transform: `rotate(${-bearing - 45}deg)` }} />
          </button>
          <button onClick={() => mapRef.current.zoomIn()} title="Zoom in"><Plus size={18} /></button>
          <span className="gx-zoom">{zoomPct}%</span>
          <button onClick={() => mapRef.current.zoomOut()} title="Zoom out"><Minus size={18} /></button>
          <button onClick={toggleFs} title="Fullscreen">{fullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button>
        </div>
      </div>

      {/* Bottom dock: tour + sun */}
      <div className="gx-dock">
        <button className={`gx-tour ${touring ? 'on' : ''}`} onClick={() => { if (!touring && !is3D) switchView(true); setTouring((t) => !t); }}>
          {touring ? <Pause size={15} /> : <Play size={15} />}{touring ? 'Stop tour' : 'City tour'}
        </button>
        <div className="gx-sun">
          <SunIcon size={16} />
          <input type="range" min="6" max="19" step="0.25" value={hour} onChange={(e) => setHour(Number(e.target.value))} style={{ '--p': ((hour - 6) / 13) * 100 }} />
          <span>{fmtHour(hour)}</span>
        </div>
      </div>

      {/* 3D legend */}
      {is3D && visible.buildings && (
        <div className="gx-legend">
          {['occupied', 'fitout', 'vacant', 'construction'].map((k) => <span key={k}><i style={{ background: FLOOR_STATUS[k].color }} />{FLOOR_STATUS[k].label}</span>)}
        </div>
      )}

      {/* Hover card */}
      {hover && !(selected?.item === hover.item && !hover.floor) && (
        <div className="gx-hover" style={{ left: hover.x, top: hover.y }}>
          <div className="gx-hover-title"><i style={{ background: STATUS[hover.item.status].color }} />{hover.item.name}</div>
          {hover.floor
            ? <div className="gx-hover-sub">Floor {hover.floor.label} · <b style={{ color: FLOOR_STATUS[hover.floor.status].color }}>{FLOOR_STATUS[hover.floor.status].label}</b>{hover.floor.tenant ? ` · ${hover.floor.tenant}` : ''}</div>
            : <div className="gx-hover-sub">{STATUS[hover.item.status].label} · click to open</div>}
        </div>
      )}

      {selected && <DetailsPanel sel={selected} tab={tab} setTab={setTab} onClose={() => { setSelected(null); setTouring(false); }} onSelect={(s) => { setSelected(s); }} />}
    </div>
  );
}

/* ───────────── Details panel ───────────── */
function DetailsPanel({ sel, tab, setTab, onClose, onSelect }) {
  const { kind, item } = sel;
  const status = STATUS[item.status];
  const pos = posOf(item);
  const isB = kind === 'building';
  const occ = isB ? occupancyOf(item) : null;
  const cond = isB && item.status !== 'planned' ? getCondition(item) : null;
  const tabs = isB ? ['overview', 'floors', 'condition', 'documents'] : ['overview'];
  const t = tabs.includes(tab) ? tab : 'overview';

  return (
    <aside className="gx-details" style={{ '--c': status.color }}>
      <div className="gx-hero">
        <div className="gx-hero-top">
          <span className="gx-kind">{kind} · {item.id}</span>
          <button className="gx-icon-btn light" onClick={onClose}><X size={16} /></button>
        </div>
        <h2>{item.name}</h2>
        <div className="gx-hero-meta">
          <span className="gx-pill"><i />{status.label}</span>
          {item.category && <span className="gx-pill ghost">{item.category}</span>}
          {item.zone && <span className="gx-pill ghost">{ZONES[item.zone].label}</span>}
        </div>
        {isB && (
          <div className="gx-stats">
            <div><Building2 size={14} /><b>{item.floors}</b><small>Floors</small></div>
            <div><Ruler size={14} /><b>{item.heightM}m</b><small>Height</small></div>
            <div><Users size={14} /><b>{occ != null ? `${occ}%` : item.completion != null ? `${item.completion}%` : '—'}</b><small>{occ != null ? 'Occupied' : 'Built'}</small></div>
            <div><ShieldCheck size={14} /><b>{cond?.score ?? '—'}</b><small>Health</small></div>
          </div>
        )}
      </div>

      {tabs.length > 1 && (
        <div className="gx-tabs">
          {tabs.map((k) => <button key={k} className={t === k ? 'on' : ''} onClick={() => setTab(k)}>{k}</button>)}
        </div>
      )}

      <div className="gx-details-body">
        {t === 'overview' && (<>
          {isB && (<>
            <Section title="Building">
              <Row k="Built-up Area" v={`${fmtNum(item.builtUpSqft)} sq ft`} />
              <Row k={item.yearCompleted ? 'Completed' : 'Status'} v={item.yearCompleted ?? (item.completion != null ? `${item.completion}% complete` : 'Not started')} />
              {item.completion != null && <div className="gx-bar"><div style={{ width: `${item.completion}%` }} /></div>}
            </Section>
            <Section title="Ownership">
              <Row k="Owner" v={item.owner} />
              {PARCELS.find((p) => p.id === item.plot) && <Row k="Land Parcel" v={<button className="gx-link-btn" onClick={() => onSelect({ kind: 'parcel', item: PARCELS.find((p) => p.id === item.plot) })}>{item.plot}</button>} />}
              {item.tenants.length > 0 && <div className="gx-tags">{item.tenants.map((x) => <span key={x}>{x}</span>)}</div>}
            </Section>
          </>)}

          {kind === 'parcel' && (<>
            <Section title="Land">
              <Row k="Plot Area" v={`${fmtNum(item.areaSqm)} m²`} />
              <Row k="Permissible FAR" v={item.far} />
              <Row k="Max Built-up" v={`${fmtNum(Math.round(item.areaSqm * item.far * 10.764))} sq ft`} />
              <Row k="Lease Tenure" v={`${item.leaseYears} years`} />
              {item.pricePerSqm > 0 && <Row k="Indicative Rate" v={`${fmtINR(item.pricePerSqm)}/m²`} />}
              {item.pricePerSqm > 0 && <Row k="Indicative Value" v={fmtINR(item.pricePerSqm * item.areaSqm)} />}
            </Section>
            <Section title="Ownership">
              <Row k="Allottee" v={item.owner} />
              {BUILDINGS.filter((b) => b.plot === item.id).map((b) => <Row key={b.id} k="Building" v={<button className="gx-link-btn" onClick={() => onSelect({ kind: 'building', item: b })}>{b.name}</button>} />)}
            </Section>
          </>)}

          {kind === 'road' && <Section title="Road"><Row k="Right of Way" v={`${item.widthM} m`} /><Row k="Lanes" v={item.lanes} /></Section>}
          {kind === 'infrastructure' && <Section title="Facility"><Row k="Type" v={item.type} /><Row k="Capacity" v={item.capacity} /><Row k="Operator" v="GIFT City Company Ltd." /></Section>}

          <Section title="Location">
            <Row k="Coordinates" v={<span className="gx-mono">{pos[0].toFixed(5)}°N, {pos[1].toFixed(5)}°E</span>} />
            <div className="gx-actions">
              <a href={`https://www.google.com/maps?q=${pos[0]},${pos[1]}`} target="_blank" rel="noreferrer"><MapPin size={14} />Google Maps</a>
              <a href={`https://earth.google.com/web/@${pos[0]},${pos[1]},60a,600d,35y,0h,60t,0r`} target="_blank" rel="noreferrer"><Navigation size={14} />Google Earth</a>
            </div>
          </Section>
        </>)}

        {t === 'floors' && <FloorStack building={item} floorId={sel.floor} onFloor={(floor) => onSelect({ ...sel, floor })} />}
        {t === 'condition' && <ConditionReport building={item} />}
        {t === 'documents' && (
          <Section title={`${item.documents?.length ?? 0} documents`}>
            {item.documents?.map((d) => (
              <div key={d.name} className="gx-doc">
                <span className="gx-doc-ic">{d.type}</span>
                <div><b>{d.name}</b><small><CalendarDays size={11} /> {d.date}</small></div>
                <button className="gx-icon-btn sm" title="Download"><Download size={14} /></button>
              </div>
            ))}
            {!item.documents?.length && <p className="gx-empty"><FileText size={16} /> No documents on file.</p>}
          </Section>
        )}
      </div>
    </aside>
  );
}

function Section({ title, children }) {
  return <section className="gx-sec"><h4>{title}</h4>{children}</section>;
}
function Row({ k, v }) {
  return <div className="gx-row"><span>{k}</span><strong>{v}</strong></div>;
}

function FloorStack({ building, floorId, onFloor }) {
  if (building.status === 'planned') return <p className="gx-empty">Floors will appear once construction starts.</p>;
  const floors = getFloors(building);
  const counts = floors.reduce((m, f) => ({ ...m, [f.status]: (m[f.status] ?? 0) + 1 }), {});
  const active = floors.find((f) => f.id === floorId);
  return (
    <Section title="Floor-by-floor">
      <div className="gx-floor-legend">
        {Object.entries(counts).map(([k, n]) => <span key={k}><i style={{ background: FLOOR_STATUS[k].color }} />{FLOOR_STATUS[k].label} <b>{n}</b></span>)}
      </div>
      <div className="gx-floors">
        {[...floors].reverse().map((f) => (
          <button key={f.id} className={`gx-floor ${f.id === floorId ? 'on' : ''}`} style={{ '--fc': FLOOR_STATUS[f.status].color }} onClick={() => onFloor(f.id === floorId ? null : f.id)}>
            <span className="gx-floor-lbl">{f.label}</span>
            <span className="gx-floor-slab"><span>{f.tenant ?? FLOOR_STATUS[f.status].label}</span></span>
          </button>
        ))}
        <div className="gx-floor-ground" />
      </div>
      {active ? (
        <div className="gx-floor-card" style={{ '--fc': FLOOR_STATUS[active.status].color }}>
          <div className="gx-floor-card-head"><b>Floor {active.label}</b><span>{FLOOR_STATUS[active.status].label}</span></div>
          <Row k="Tenant" v={active.tenant ?? '—'} />
          <Row k="Floor Plate" v={`${fmtNum(active.areaSqft)} sq ft`} />
          {active.leaseExpiry && <Row k="Lease Expiry" v={active.leaseExpiry} />}
        </div>
      ) : <p className="gx-hint">Tap a floor here or on the 3D building to inspect it.</p>}
    </Section>
  );
}

function ConditionReport({ building }) {
  if (building.status === 'planned') return <p className="gx-empty">No condition data for planned buildings.</p>;
  const c = getCondition(building);
  const tone = (v) => (v >= 85 ? '#10B981' : v >= 75 ? '#0EA5E9' : v >= 65 ? '#F59E0B' : '#EF4444');
  return (
    <Section title={c.mode === 'operational' ? 'Building health' : 'Construction progress'}>
      {c.mode === 'operational' && (
        <div className="gx-health">
          <div className="gx-ring" style={{ '--p': c.score, '--tc': tone(c.score) }}><b>{c.score}</b><small>/100</small></div>
          <div>
            <b style={{ color: tone(c.score) }}>{c.rating}</b>
            <small>Built {building.yearCompleted} · {c.age} years</small>
            <small>Last inspection {c.lastInspection}</small>
            <small>Next inspection {c.nextInspection}</small>
          </div>
        </div>
      )}
      {(c.components ?? c.milestones).map((m) => {
        const v = m.score ?? m.pct;
        return (
          <div key={m.name} className="gx-meter">
            <div><span>{m.name}</span><b>{v}{m.pct != null ? '%' : ''}</b></div>
            <div className="gx-bar"><div style={{ width: `${v}%`, background: m.pct != null ? STATUS['under-construction'].color : tone(v) }} /></div>
          </div>
        );
      })}
      {c.issues.length > 0 && <div className="gx-issues">{c.issues.map((i) => <div key={i}>{i}</div>)}</div>}
      {c.mode === 'construction' && <Row k="Last site inspection" v={c.lastInspection} />}
      <div className="gx-actions"><a href="#" onClick={(e) => e.preventDefault()}><ExternalLink size={14} />Full inspection report</a></div>
    </Section>
  );
}
