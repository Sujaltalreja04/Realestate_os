import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Box, Download, FileUp, Map as MapIcon, Plus, RotateCcw, Save, Trash2, Upload } from 'lucide-react'
import { Page, PageHeader } from '@/components/page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { MediaSlot } from './MediaControls'
import type { LngLat } from '@/features/map/osm'
import {
  CSV_TEMPLATE,
  deleteAsset,
  exportJson,
  importJson,
  newAsset,
  newUnit,
  resetAssets,
  saveAsset,
  STATUS_META,
  unitsFromCsv,
  useAssets,
  type Asset,
  type AssetKind,
  type Unit,
  type UnitStatus,
} from './store'

const KINDS: AssetKind[] = ['office', 'retail', 'mixed', 'residential', 'other']

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** "23.02457, 72.50699" or a Google Maps link ("@23.02,72.50" or "q=23.02,72.50") → [lng, lat]. */
function parseCoords(s: string): LngLat | null {
  const m = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ?? s.match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/)
  if (!m) return null
  const lat = Number(m[1])
  const lng = Number(m[2])
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lng, lat] : null
}

/** Admin: add and edit assets and their offices. Saved in this browser; the map updates immediately. */
export default function AssetsAdminPage() {
  const assets = useAssets()
  const [params, setParams] = useSearchParams()
  const selectedId = params.get('id') ?? assets[0]?.id ?? null
  const stored = assets.find((a) => a.id === selectedId) ?? null
  const [draft, setDraft] = useState<Asset | null>(stored)
  const [coordText, setCoordText] = useState('')
  const csvInput = useRef<HTMLInputElement>(null)
  const jsonInput = useRef<HTMLInputElement>(null)

  // Load the selected asset into the form (and when it changes in another tab).
  useEffect(() => {
    setDraft(stored)
    setCoordText(stored ? `${stored.center[1].toFixed(6)}, ${stored.center[0].toFixed(6)}` : '')
  }, [stored])

  const dirty = useMemo(() => {
    if (!draft || !stored) return false
    const c = parseCoords(coordText)
    // The box shows 6 decimals (~10 cm), so smaller differences are not edits.
    const moved = !c || Math.abs(c[0] - stored.center[0]) > 2e-6 || Math.abs(c[1] - stored.center[1]) > 2e-6
    return moved || JSON.stringify(draft) !== JSON.stringify(stored)
  }, [draft, stored, coordText])
  const select = (id: string) => setParams({ id })
  const set = <K extends keyof Asset>(k: K, v: Asset[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d))
  const setUnit = (id: string, patch: Partial<Unit>) => setDraft((d) => (d ? { ...d, units: d.units.map((u) => (u.id === id ? { ...u, ...patch } : u)) } : d))
  const num = (s: string) => (s.trim() === '' ? undefined : Number(s))

  function save() {
    if (!draft) return
    const c = parseCoords(coordText)
    if (!c) return toast.error('Location: enter "latitude, longitude" or paste a Google Maps link.')
    if (!draft.name.trim()) return toast.error('Give the asset a name.')
    if (!(draft.floors >= 0)) return toast.error('Floors must be 0 or more.')
    const bad = draft.units.find((u) => !u.unit.trim())
    if (bad) return toast.error('Every office row needs an office number.')
    saveAsset({ ...draft, name: draft.name.trim(), center: c, units: draft.units.map((u) => ({ ...u, unit: u.unit.trim() })) })
    toast.success('Saved. The map and 3D view are updated.')
  }

  function addAsset() {
    const base = assets.find((a) => a.id === selectedId)?.center ?? [72.5069855, 23.0245701]
    const a = newAsset([base[0] + 0.0015, base[1] + 0.001])
    saveAsset(a)
    select(a.id)
  }

  async function onCsv(file: File, mode: 'append' | 'replace') {
    try {
      const { units, skipped } = unitsFromCsv(await file.text())
      if (!units.length) return toast.error('No office rows found in the CSV.')
      setDraft((d) => (d ? { ...d, units: mode === 'replace' ? units : [...d.units, ...units] } : d))
      toast.success(`${units.length} offices loaded${skipped ? `, ${skipped} rows skipped` : ''}. Review them, then Save.`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not read the CSV.')
    }
  }

  async function onJson(file: File) {
    try {
      const n = importJson(await file.text())
      toast.success(`${n} assets imported.`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not import the file.')
    }
  }

  const unitsSorted = draft ? [...draft.units].sort((a, b) => b.floor - a.floor || a.unit.localeCompare(b.unit, 'en', { numeric: true })) : []

  return (
    <Page>
      <PageHeader
        title="Assets"
        description="Buildings and their offices. Changes appear on the map and in 3D straight away. Saved in this browser for the demo; export JSON to back up or move data."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => download(`assets-${new Date().toISOString().slice(0, 10)}.json`, exportJson(), 'application/json')}>
              <Download className="size-4" /> Export JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => jsonInput.current?.click()}>
              <Upload className="size-4" /> Import JSON
            </Button>
            <Button size="sm" onClick={addAsset}>
              <Plus className="size-4" /> New asset
            </Button>
            <input ref={jsonInput} type="file" accept="application/json,.json" hidden onChange={(e) => (e.target.files?.[0] && void onJson(e.target.files[0]), (e.target.value = ''))} />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-1">
          {assets.map((a) => (
            <button
              key={a.id}
              onClick={() => select(a.id)}
              className={cn('flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2.5 text-left text-sm', a.id === selectedId ? 'border-primary bg-primary/5' : 'hover:bg-accent')}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{a.name}</span>
                <span className="block text-xs text-muted-foreground">
                  G + {a.floors} · {a.units.length} offices
                </span>
              </span>
            </button>
          ))}
          <button
            onClick={() => {
              if (confirm('Reset the register to the demo data? Your changes in this browser will be lost (export first if needed).')) resetAssets()
            }}
            className="mt-3 flex items-center gap-1.5 px-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3" /> Reset demo data
          </button>
        </aside>

        {!draft ? (
          <p className="text-sm text-muted-foreground">Select or add an asset.</p>
        ) : (
          <div className="space-y-6">
            <section className="rounded-xl border bg-card p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">Building</h3>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/assets/${encodeURIComponent(draft.id)}`}>
                      <Box className="size-4" /> View in 3D
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/map?asset=${encodeURIComponent(draft.id)}`}>
                      <MapIcon className="size-4" /> Show on map
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Delete ${draft.name} and its ${draft.units.length} offices?`)) {
                        deleteAsset(draft.id)
                        setParams({})
                      }
                    }}
                  >
                    <Trash2 className="size-4" /> Delete
                  </Button>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Name">
                  <Input value={draft.name} onChange={(e) => set('name', e.target.value)} />
                </Field>
                <Field label="Type">
                  <select value={draft.kind} onChange={(e) => set('kind', e.target.value as AssetKind)} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                    {KINDS.map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Location (lat, lng or Google Maps link)">
                  <Input value={coordText} onChange={(e) => setCoordText(e.target.value)} placeholder="23.024570, 72.506986" />
                </Field>
                <Field label="Floors above ground">
                  <Input type="number" min={0} max={120} value={draft.floors} onChange={(e) => set('floors', Math.max(0, Math.round(Number(e.target.value) || 0)))} />
                </Field>
                <Field label="Basements">
                  <Input type="number" min={0} max={10} value={draft.basements ?? ''} onChange={(e) => set('basements', num(e.target.value))} />
                </Field>
                <Field label="Area per floor (sq.ft)">
                  <Input type="number" min={0} value={draft.perFloorSqft ?? ''} onChange={(e) => set('perFloorSqft', num(e.target.value))} />
                </Field>
                <Field label="Total built-up (sq.ft)">
                  <Input type="number" min={0} value={draft.builtUpSqft ?? ''} onChange={(e) => set('builtUpSqft', num(e.target.value))} />
                </Field>
                <Field label="Rotation (degrees)">
                  <Input type="number" min={0} max={180} value={draft.rotationDeg ?? ''} placeholder="Auto from map outline" onChange={(e) => set('rotationDeg', num(e.target.value))} />
                </Field>
                <Field label="Status">
                  <Input value={draft.status ?? ''} placeholder="Operational / Under construction" onChange={(e) => set('status', e.target.value || undefined)} />
                </Field>
                <Field label="Developer">
                  <Input value={draft.developer ?? ''} onChange={(e) => set('developer', e.target.value || undefined)} />
                </Field>
                <Field label="Address" className="sm:col-span-2">
                  <Input value={draft.address ?? ''} onChange={(e) => set('address', e.target.value || undefined)} />
                </Field>
                <Field label="Description" className="sm:col-span-2 lg:col-span-3">
                  <textarea value={draft.description ?? ''} onChange={(e) => set('description', e.target.value || undefined)} rows={2} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
                </Field>
              </div>
            </section>

            <section className="rounded-xl border bg-card p-5">
              <h3 className="font-semibold">Real captures</h3>
              <p className="mb-4 text-xs text-muted-foreground">
                Real photos and scans make the 3D views true to life. Files are stored in this browser. Per-office 360° photos and scans are in the offices table below.
              </p>
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Exterior 3D scan (drone)</p>
                  <p className="text-xs text-muted-foreground">A .glb from drone photogrammetry. Replaces the generated building on the map and in 3D; floors stay clickable.</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <MediaSlot kind="scan" mediaId={draft.exteriorScanId} onChange={(id) => set('exteriorScanId', id)} title={`${draft.name} · exterior scan`} />
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      Metres per unit
                      <Input type="number" step="0.01" min={0.001} value={draft.scanScale ?? 1} onChange={(e) => set('scanScale', Number(e.target.value) > 0 ? Number(e.target.value) : 1)} className="h-8 w-24" />
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Lobby 360° photos</p>
                  <p className="text-xs text-muted-foreground">One equirectangular photo per floor lobby (2:1 JPG). Shown from the walk-through.</p>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: draft.floors + 1 }, (_, i) => i).map((fl) => (
                      <span key={fl} className="inline-flex items-center gap-1 rounded-md border px-1.5 py-1 text-xs">
                        <span className="w-6 text-center font-mono text-muted-foreground">{fl === 0 ? 'G' : fl}</span>
                        <MediaSlot
                          kind="pano"
                          compact
                          mediaId={draft.lobbyPanos?.[String(fl)]}
                          title={`${draft.name} · ${fl === 0 ? 'Ground floor' : `Floor ${fl}`} lobby`}
                          onChange={(id) => {
                            const next = { ...(draft.lobbyPanos ?? {}) }
                            if (id) next[String(fl)] = id
                            else delete next[String(fl)]
                            set('lobbyPanos', next)
                          }}
                        />
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <details className="mt-5 rounded-lg border bg-muted/30 p-4 text-xs leading-relaxed">
                <summary className="cursor-pointer text-sm font-medium">Capture guide: how to shoot each one</summary>
                <div className="mt-3 grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="font-medium">360° photos (offices, lobbies)</p>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-muted-foreground">
                      <li>Insta360 X3/X4 or Ricoh Theta; a phone's panorama mode works in a pinch.</li>
                      <li>Tripod at 1.5 m, centre of the room, lights on, blinds open.</li>
                      <li>Export equirectangular JPG (2:1), ideally 6000×3000 or more, under 20 MB.</li>
                      <li>Get the occupant's permission before photographing an occupied office.</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">Drone scan (exterior)</p>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-muted-foreground">
                      <li>DJI Mini/Air/Mavic; orbit the building at 2–3 heights with 70–80% overlap (300–600 photos).</li>
                      <li>Process in RealityCapture, Pix4D, DroneDeploy or Polycam; export glTF-Binary (.glb), metres, Y-up.</li>
                      <li>Decimate to ~300k–800k triangles and compress textures (Draco/KTX2) to stay under ~100 MB.</li>
                      <li>Check local drone rules (DGCA Digital Sky) and get permissions before flying.</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">Phone 3D scan (sample office)</p>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-muted-foreground">
                      <li>Polycam, Luma AI or Scaniverse; LiDAR iPhones give the cleanest rooms.</li>
                      <li>Walk slowly around the room's edge, then the middle; 2–5 minutes per office.</li>
                      <li>Export .glb in metres; under ~50 MB opens quickly on phones and headsets.</li>
                      <li>Upload it on the office's row below (3D scan).</li>
                    </ul>
                  </div>
                </div>
              </details>
            </section>

            <section className="rounded-xl border bg-card p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold">Offices ({draft.units.length})</h3>
                  <p className="text-xs text-muted-foreground">Floor: 0 = ground, negative = basement. Area drives the size of each office block in 3D.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => download('offices-template.csv', CSV_TEMPLATE, 'text/csv')}>
                    <Download className="size-4" /> CSV template
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => csvInput.current?.click()}>
                    <FileUp className="size-4" /> Upload CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => set('units', [...draft.units, newUnit(1)])}>
                    <Plus className="size-4" /> Add office
                  </Button>
                  <input
                    ref={csvInput}
                    type="file"
                    accept=".csv,text/csv"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      e.target.value = ''
                      if (!f) return
                      void onCsv(f, draft.units.length && confirm('Replace the existing offices with this CSV? (Cancel adds them instead.)') ? 'replace' : 'append')
                    }}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="w-16 py-2 pr-2 font-normal">Floor</th>
                      <th className="w-24 py-2 pr-2 font-normal">Office</th>
                      <th className="py-2 pr-2 font-normal">Occupant</th>
                      <th className="py-2 pr-2 font-normal">Owner</th>
                      <th className="w-24 py-2 pr-2 font-normal">Area (sq.ft)</th>
                      <th className="w-40 py-2 pr-2 font-normal">Status</th>
                      <th className="py-2 pr-2 font-normal">Captures</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {unitsSorted.map((u) => (
                      <tr key={u.id} className="border-t">
                        <td className="py-1.5 pr-2">
                          <Input type="number" value={u.floor} onChange={(e) => setUnit(u.id, { floor: Math.round(Number(e.target.value) || 0) })} className="h-8" />
                        </td>
                        <td className="py-1.5 pr-2">
                          <Input value={u.unit} onChange={(e) => setUnit(u.id, { unit: e.target.value })} className="h-8" />
                        </td>
                        <td className="py-1.5 pr-2">
                          <Input value={u.occupant ?? ''} onChange={(e) => setUnit(u.id, { occupant: e.target.value || undefined })} className="h-8" />
                        </td>
                        <td className="py-1.5 pr-2">
                          <Input value={u.owner ?? ''} onChange={(e) => setUnit(u.id, { owner: e.target.value || undefined })} className="h-8" placeholder="Only with consent" />
                        </td>
                        <td className="py-1.5 pr-2">
                          <Input type="number" min={0} value={u.areaSqft ?? ''} onChange={(e) => setUnit(u.id, { areaSqft: num(e.target.value) })} className="h-8" />
                        </td>
                        <td className="py-1.5 pr-2">
                          <select value={u.status} onChange={(e) => setUnit(u.id, { status: e.target.value as UnitStatus })} className="h-8 w-full rounded-md border bg-background px-2 text-sm">
                            {(Object.keys(STATUS_META) as UnitStatus[]).map((s) => (
                              <option key={s} value={s}>
                                {STATUS_META[s].label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="whitespace-nowrap py-1.5 pr-2">
                          <span className="inline-flex gap-1">
                            <MediaSlot kind="pano" compact mediaId={u.panoId} onChange={(id) => setUnit(u.id, { panoId: id })} title={`Office ${u.unit || '—'} · 360°`} />
                            <MediaSlot kind="scan" compact mediaId={u.scanId} onChange={(id) => setUnit(u.id, { scanId: id })} title={`Office ${u.unit || '—'} · 3D scan`} />
                          </span>
                        </td>
                        <td className="py-1.5">
                          <button onClick={() => set('units', draft.units.filter((x) => x.id !== u.id))} className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={`Remove office ${u.unit}`}>
                            <Trash2 className="size-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {draft.units.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No offices yet. Add them one by one or upload a CSV.</p>}
              </div>
            </section>

            <div className="sticky bottom-4 flex items-center justify-end gap-3 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur">
              <span className="mr-auto text-xs text-muted-foreground">{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
              <Button variant="outline" size="sm" disabled={!dirty} onClick={() => (setDraft(stored), stored && setCoordText(`${stored.center[1].toFixed(6)}, ${stored.center[0].toFixed(6)}`))}>
                Discard
              </Button>
              <Button size="sm" disabled={!dirty} onClick={save}>
                <Save className="size-4" /> Save
              </Button>
            </div>
          </div>
        )}
      </div>
    </Page>
  )
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}
