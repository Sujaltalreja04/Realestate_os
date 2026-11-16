import { useMemo, useState } from 'react'
import { ArrowDownWideNarrow, Search, Users } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { EmptyState } from '@/components/page'
import { formatINR } from '@/lib/format'
import { PIPELINE_STAGES, temperature, type Lead } from './model'
import { Avatar, ScoreBadge, StageBadge } from './parts'

type SortKey = 'score' | 'name' | 'budget' | 'recent'

export function LeadsTable({ leads, onOpen }: { leads: Lead[]; onOpen: (lead: Lead) => void }) {
  const [q, setQ] = useState('')
  const [stage, setStage] = useState('all')
  const [temp, setTemp] = useState('all')
  const [owner, setOwner] = useState('all')
  const [sort, setSort] = useState<SortKey>('score')

  const owners = useMemo(
    () => Array.from(new Set(leads.map((l) => l.assignedExecutive).filter((x): x is string => !!x))).sort(),
    [leads],
  )

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const filtered = leads.filter(
      (l) =>
        (stage === 'all' || l.status === stage) &&
        (temp === 'all' || temperature(l.score) === temp) &&
        (owner === 'all' || l.assignedExecutive === owner) &&
        (!needle ||
          [l.name, l.phone, l.email, l.project, l.preferredLocation].some((f) => f?.toLowerCase().includes(needle))),
    )
    const cmp: Record<SortKey, (a: Lead, b: Lead) => number> = {
      score: (a, b) => b.score - a.score,
      name: (a, b) => a.name.localeCompare(b.name),
      budget: (a, b) => (b.budget ?? 0) - (a.budget ?? 0),
      recent: (a, b) => b._creationTime - a._creationTime,
    }
    return filtered.sort(cmp[sort])
  }, [leads, q, stage, temp, owner, sort])

  const filtersActive = q || stage !== 'all' || temp !== 'all' || owner !== 'all'

  return (
    <div className="rounded-xl border bg-card shadow-xs">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, phone, email, project…"
            className="h-8 pl-8"
            aria-label="Search leads"
          />
        </div>
        <Select
          size="sm"
          className="w-44"
          aria-label="Stage"
          value={stage}
          onValueChange={setStage}
          options={[{ value: 'all', label: 'All stages' }, ...PIPELINE_STAGES.map((s) => ({ value: s, label: s }))]}
        />
        <Select
          size="sm"
          className="w-32"
          aria-label="Temperature"
          value={temp}
          onValueChange={setTemp}
          options={[
            { value: 'all', label: 'Any score' },
            { value: 'hot', label: 'Hot (80+)' },
            { value: 'warm', label: 'Warm (50–79)' },
            { value: 'cold', label: 'Cold (<50)' },
          ]}
        />
        {owners.length > 0 && (
          <Select
            size="sm"
            className="w-40"
            aria-label="Owner"
            value={owner}
            onValueChange={setOwner}
            options={[{ value: 'all', label: 'All owners' }, ...owners.map((o) => ({ value: o, label: o }))]}
          />
        )}
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <ArrowDownWideNarrow className="size-4" />
          <Select
            size="sm"
            className="w-32"
            aria-label="Sort"
            value={sort}
            onValueChange={(v) => setSort(v as SortKey)}
            options={[
              { value: 'score', label: 'Score' },
              { value: 'recent', label: 'Newest' },
              { value: 'budget', label: 'Budget' },
              { value: 'name', label: 'Name' },
            ]}
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={filtersActive ? 'No leads match these filters' : 'No leads yet'}
          description={filtersActive ? 'Try clearing a filter or searching for something else.' : 'Add your first lead to start tracking the pipeline.'}
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Lead</TH>
              <TH>Stage</TH>
              <TH>Score</TH>
              <TH className="hidden lg:table-cell">Project</TH>
              <TH className="hidden text-right md:table-cell">Budget</TH>
              <TH className="hidden xl:table-cell">Source</TH>
              <TH className="hidden lg:table-cell">Owner</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((l) => (
              <TR
                key={l._id}
                tabIndex={0}
                onClick={() => onOpen(l)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen(l))}
                className="cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
              >
                <TD>
                  <div className="flex items-center gap-3">
                    <Avatar name={l.name} />
                    <div className="min-w-0">
                      <div className="truncate font-medium">{l.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{l.phone}</div>
                    </div>
                  </div>
                </TD>
                <TD>
                  <StageBadge status={l.status} />
                </TD>
                <TD>
                  <ScoreBadge score={l.score} />
                </TD>
                <TD className="hidden max-w-56 truncate text-muted-foreground lg:table-cell">{l.project}</TD>
                <TD className="hidden text-right tabular-nums md:table-cell">{formatINR(l.budget)}</TD>
                <TD className="hidden text-muted-foreground xl:table-cell">{l.source ?? '—'}</TD>
                <TD className="hidden text-muted-foreground lg:table-cell">{l.assignedExecutive ?? '—'}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <div className="border-t px-5 py-2.5 text-xs text-muted-foreground">
        {rows.length} of {leads.length} leads
      </div>
    </div>
  )
}
