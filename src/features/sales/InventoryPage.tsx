import { useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { Download, LayoutGrid } from 'lucide-react'
import { api } from '@convex/_generated/api'
import type { Doc } from '@convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Dialog, SheetContent } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { StackedBar } from '@/components/charts'
import { EmptyState, Page, PageHeader } from '@/components/page'
import { formatINR, nowTimeLabel } from '@/lib/format'
import { cn } from '@/lib/utils'

type Unit = Doc<'inventory'>

const STATUSES = ['Available', 'Hold', 'Booked', 'Sold'] as const
const STATUS_STYLE: Record<string, { cell: string; dot: string }> = {
  Available: { cell: 'border-success/40 bg-success/10 hover:bg-success/20', dot: 'bg-success' },
  Hold: { cell: 'border-warning/50 bg-warning/15 hover:bg-warning/25', dot: 'bg-warning' },
  Booked: { cell: 'border-primary/40 bg-primary/10 hover:bg-primary/20', dot: 'bg-primary' },
  Sold: { cell: 'border-border bg-muted text-muted-foreground hover:bg-muted/70', dot: 'bg-muted-foreground/50' },
}
const styleFor = (s: string) => STATUS_STYLE[s] ?? STATUS_STYLE.Sold!

export default function InventoryPage() {
  const inventory = useQuery(api.inventory.getInventory)
  const [type, setType] = useState('all')
  const [openId, setOpenId] = useState<string | null>(null)

  const types = useMemo(() => Array.from(new Set((inventory ?? []).map((u) => u.type))).sort(), [inventory])
  const towers = useMemo(() => {
    const m = new Map<string, Unit[]>()
    for (const u of inventory ?? []) m.set(u.tower, [...(m.get(u.tower) ?? []), u])
    return [...m].sort((a, b) => a[0].localeCompare(b[0]))
  }, [inventory])

  const open = inventory?.find((u) => u._id === openId) ?? null

  return (
    <Page>
      <PageHeader
        title="Inventory"
        description="Every unit by tower and floor. Click a unit to see details or change its status."
        actions={
          <Select
            className="w-44"
            aria-label="Unit type"
            value={type}
            onValueChange={setType}
            options={[{ value: 'all', label: 'All unit types' }, ...types.map((t) => ({ value: t, label: t }))]}
          />
        }
      />

      {inventory === undefined ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-80 rounded-xl" />
          ))}
        </div>
      ) : inventory.length === 0 ? (
        <EmptyState icon={LayoutGrid} title="No units in inventory" />
      ) : (
        <>
          <div className="rounded-xl border bg-card p-5 shadow-xs">
            <StackedBar
              parts={STATUSES.map((s) => ({
                label: s,
                value: inventory.filter((u) => u.status === s).length,
                className: styleFor(s).dot,
              }))}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {towers.map(([tower, units]) => {
              const floors = Array.from(new Set(units.map((u) => u.floor))).sort((a, b) => b - a)
              const avail = units.filter((u) => u.status === 'Available').length
              return (
                <section key={tower} className="rounded-xl border bg-card shadow-xs">
                  <header className="flex items-center justify-between border-b px-5 py-3">
                    <h3 className="text-sm font-semibold">{tower}</h3>
                    <span className="text-xs text-muted-foreground">
                      {avail} of {units.length} available
                    </span>
                  </header>
                  <div className="space-y-1.5 p-4">
                    {floors.map((f) => (
                      <div key={f} className="flex items-center gap-2">
                        <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">F{f}</span>
                        <div className="flex flex-1 flex-wrap gap-1.5">
                          {units
                            .filter((u) => u.floor === f)
                            .sort((a, b) => a.unit.localeCompare(b.unit))
                            .map((u) => {
                              const dim = type !== 'all' && u.type !== type
                              return (
                                <button
                                  key={u._id}
                                  onClick={() => setOpenId(u._id)}
                                  className={cn(
                                    'min-w-16 rounded-md border px-2 py-1.5 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                                    styleFor(u.status).cell,
                                    dim && 'opacity-30',
                                  )}
                                  aria-label={`Unit ${u.unit}, ${u.type}, ${u.status}`}
                                >
                                  <span className="block font-medium tabular-nums">{u.unit}</span>
                                  <span className="block truncate text-[10px] opacity-75">{u.type}</span>
                                </button>
                              )
                            })}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </>
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        {open && <UnitSheet unit={open} />}
      </Dialog>
    </Page>
  )
}

function UnitSheet({ unit }: { unit: Unit }) {
  const update = useMutation(api.inventory.updateInventoryStatus)
  const addActivity = useMutation(api.activity.addActivity)

  async function setStatus(status: string) {
    try {
      await update({ id: unit._id, status })
      await addActivity({ message: `${unit.tower} unit ${unit.unit} marked ${status}`, time: nowTimeLabel() })
      toast.success(`Unit ${unit.unit} marked ${status.toLowerCase()}`)
    } catch (err) {
      toast.error('Could not update unit', { description: err instanceof Error ? err.message : undefined })
    }
  }

  const rows: [string, string | undefined][] = [
    ['Type', unit.type],
    ['Floor', String(unit.floor)],
    ['Carpet area', unit.area ? `${unit.area.toLocaleString('en-IN')} sq.ft` : undefined],
    ['Facing', unit.facing],
    ['Views', unit.views.join(', ') || undefined],
    ['Construction', unit.constructionStatus],
  ]

  return (
    <SheetContent title={`${unit.tower} · Unit ${unit.unit}`} description={unit.type}>
      <div className="space-y-6 p-5">
        <div>
          <div className="text-xs text-muted-foreground">List price</div>
          <div className="text-2xl font-semibold tabular-nums">{formatINR(unit.price)}</div>
          {unit.price && unit.area ? (
            <div className="text-xs text-muted-foreground">₹{Math.round(unit.price / unit.area).toLocaleString('en-IN')} per sq.ft</div>
          ) : null}
        </div>

        <div className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Status</span>
          <Select
            value={unit.status}
            onValueChange={(s) => void setStatus(s)}
            options={Array.from(new Set([...STATUSES, unit.status])).map((s) => ({ value: s, label: s }))}
          />
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="mt-0.5">{v ?? '—'}</dd>
            </div>
          ))}
        </dl>

        {unit.amenities && unit.amenities.length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground">Unit features</div>
            <p className="mt-1 text-sm">{unit.amenities.join(' · ')}</p>
          </div>
        )}

        {unit.floorPlan && <img src={unit.floorPlan} alt={`Floor plan for unit ${unit.unit}`} className="w-full rounded-lg border" />}

        <div className="flex flex-wrap gap-2">
          {unit.brochure && (
            <Button variant="outline" size="sm" asChild>
              <a href={unit.brochure} target="_blank" rel="noreferrer">
                <Download /> Brochure
              </a>
            </Button>
          )}
        </div>
        {unit.reraNumber && <p className="font-mono text-xs text-muted-foreground">RERA {unit.reraNumber}</p>}
      </div>
    </SheetContent>
  )
}
