import React, { useEffect, useMemo, useState } from 'react'

type Granularity = 'weeks' | 'months' | 'quarters' | 'years'
type MilestoneType = 'start' | 'due' | 'stabilization' | 'complete'

type Member = { id: string; name: string; teamId: string }
type Team = { id: string; name: string; members: Member[] }

type Project = {
  id: string
  name: string
  priority: number
  teamMemberIds: string[]
  startDates: string
  dueDates: string
  stabilizationDates: string
  completeDates: string
  completed: boolean
}

type Shape = 'circle' | 'diamond' | 'square' | 'triangle'
type LegendSettings = {
  barColor: string
  milestone: Record<MilestoneType, { color: string; shape: Shape; size: number }>
}

type ViewState = {
  startDate: string
  endDate: string
  autoRange: boolean
  granularity: Granularity
  executiveMode: boolean
  useSystemToday: boolean
  manualToday: string
  includeCompleted: boolean
}
type ViewsMap = Record<string, ViewState>

const uid = () => Math.random().toString(36).slice(2, 10)
const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n))
const fmt = (d: Date) => d.toISOString().slice(0, 10)
const addDays = (d: Date, days: number) => { const x = new Date(d); x.setDate(x.getDate() + days); return x }

const parseDate = (s: string): Date | null => {
  const t = s.trim(); if (!t) return null
  const d = new Date(t); if (isNaN(d.getTime())) return null
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
const parseCommaDates = (value: string): Date[] =>
  value.split(',')
       .map(parseDate)
       .filter((d): d is Date => !!d)
       .sort((a, b) => a.getTime() - b.getTime())

function* tickGenerator(start: Date, end: Date, g: Granularity): Generator<Date, void, unknown> {
  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
  const startOfQuarter = (d: Date) => new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1)
  const startOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1)

  let cur = new Date(start)
  if (g === 'months') cur = startOfMonth(cur)
  if (g === 'quarters') cur = startOfQuarter(cur)
  if (g === 'years') cur = startOfYear(cur)

  while (cur <= end) {
    yield new Date(cur)
    if (g === 'weeks') cur = addDays(cur, 7)
    else if (g === 'months') cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
    else if (g === 'quarters') cur = new Date(cur.getFullYear(), cur.getMonth() + 3, 1)
    else cur = new Date(cur.getFullYear() + 1, 0, 1)
  }
}

const ALL_TYPES: MilestoneType[] = ['start', 'due', 'stabilization', 'complete']
const defaultLegend: LegendSettings = {
  barColor: '#0ea5e9',
  milestone: {
    start: { color: '#10b981', shape: 'circle', size: 10 },
    due: { color: '#ef4444', shape: 'diamond', size: 10 },
    stabilization: { color: '#f59e0b', shape: 'square', size: 10 },
    complete: { color: '#6366f1', shape: 'triangle', size: 12 },
  },
}
const todayISO = () => new Date().toISOString().slice(0, 10)
const defaultView = (): ViewState => ({
  startDate: fmt(addDays(new Date(), -30)),
  endDate: fmt(addDays(new Date(), 90)),
  autoRange: true,
  granularity: 'months',
  executiveMode: false,
  useSystemToday: true,
  manualToday: todayISO(),
  includeCompleted: true,
})

function load<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback }
  catch { return fallback }
}
function save<T>(key: string, value: T) { try { localStorage.setItem(key, JSON.stringify(value)) } catch {} }

const getProjectAllDates = (p: Project): Date[] => [
  ...parseCommaDates(p.startDates),
  ...parseCommaDates(p.dueDates),
  ...parseCommaDates(p.stabilizationDates),
  ...parseCommaDates(p.completeDates),
].sort((a, b) => a.getTime() - b.getTime())

const getProjectSpan = (p: Project) => {
  const all = getProjectAllDates(p)
  return all.length ? { start: all[0], end: all[all.length - 1] } : { start: null, end: null }
}

export default function ProjectManagementApp() {
  const [teams, setTeams] = useState<Team[]>(() =>
    load<Team[]>('pm_teams', [
      { id: uid(), name: 'AppDev', members: [{ id: uid(), name: 'Ava', teamId: 'TBD' }] },
      { id: uid(), name: 'Infra', members: [{ id: uid(), name: 'Noah', teamId: 'TBD' }] },
    ].map(t => ({ ...t, members: t.members.map(m => ({ ...m, teamId: t.id })) })))
  )

  const [projects, setProjects] = useState<Project[]>(() =>
    load<Project[]>('pm_projects', [{
      id: uid(), name: 'Unified Auth', priority: 1, teamMemberIds: [],
      startDates: '2025-01-10', dueDates: '2025-02-15',
      stabilizationDates: '2025-03-01', completeDates: '',
      completed: false
    }])
  )

  const [legend, setLegend] = useState<LegendSettings>(() => load('pm_legend', defaultLegend))
  const [views, setViews] = useState<ViewsMap>(() => load('pm_views', {}))
  const [activeTab, setActiveTab] = useState<string>('Unified')
  const [showLegend, setShowLegend] = useState(false)

  const ensureView = (key: string) => { if (!views[key]) setViews(v => ({ ...v, [key]: defaultView() })) }
  useEffect(() => { ensureView('Unified') }, [])
  useEffect(() => { save('pm_teams', teams) }, [teams])
  useEffect(() => { save('pm_projects', projects) }, [projects])
  useEffect(() => { save('pm_legend', legend) }, [legend])
  useEffect(() => { save('pm_views', views) }, [views])
  useEffect(() => { ensureView(activeTab) }, [activeTab])

  const tabs = useMemo(() => ['Unified', 'Completed', ...teams.map(t => t.id), 'Teams', 'Projects'], [teams])

  const view = views[activeTab] ?? defaultView()
  useEffect(() => {
    const v = views[activeTab]
    if (!v?.autoRange) return

    let relevant = projects
    if (activeTab === 'Completed') {
      relevant = relevant.filter(p => p.completed)
    } else if (activeTab !== 'Unified' && activeTab !== 'Teams' && activeTab !== 'Projects') {
      const teamId = activeTab
      const memberIds = teams.find(t => t.id === teamId)?.members.map(m => m.id) ?? []
      relevant = relevant.filter(p => p.teamMemberIds.some(id => memberIds.includes(id)))
      if (!v.includeCompleted) relevant = relevant.filter(p => !p.completed)
    } else {
      if (!v.includeCompleted) relevant = relevant.filter(p => !p.completed)
    }

    const all = relevant.flatMap(getProjectAllDates)
    if (!all.length) return
    const start = addDays(all[0], -7)
    const end = addDays(all[all.length - 1], +7)
    setViews(vs => ({ ...vs, [activeTab]: { ...vs[activeTab], startDate: fmt(start), endDate: fmt(end) } }))
  }, [projects, teams, activeTab, view.includeCompleted])

  const renderTabLabel = (key: string) => {
    if (key === 'Unified' || key === 'Teams' || key === 'Projects' || key === 'Completed') return key
    return `Team – ${teams.find(t => t.id === key)?.name ?? key}`
  }

  return (
    <div className="mx-auto max-w-[1200px] p-4">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">PIRA Project Timeline</h1>
        <button className="pm-outline" onClick={() => setShowLegend(true)}>Legend</button>
      </header>

      <nav className="mb-3 flex flex-wrap gap-2">
        {tabs.map(key => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={"pm-outline " + (activeTab === key ? "border-slate-900" : "")}
            title={renderTabLabel(key)}>
            {renderTabLabel(key)}
          </button>
        ))}
      </nav>

      <PanelControls
        view={view}
        onChange={next => setViews(v => ({ ...v, [activeTab]: { ...v[activeTab], ...next } }))}
        showCompletedToggle={activeTab !== 'Completed'}
      />

      <div className="mt-4">
        {activeTab === 'Projects' && (
          <ProjectsManager teams={teams} projects={projects} setProjects={setProjects} legend={legend} />
        )}
        {activeTab === 'Teams' && (
          <TeamsManager teams={teams} setTeams={setTeams} executive={view.executiveMode} />
        )}
        {(activeTab === 'Unified' || activeTab === 'Completed' || (activeTab !== 'Teams' && activeTab !== 'Projects')) && (
          <TimelineView
            key={'tl-' + activeTab}
            tabKey={activeTab}
            teams={teams}
            projects={projects}
            legend={legend}
            view={view}
            setView={() => {}}
            executive={view.executiveMode}
            openLegend={() => setShowLegend(true)}
          />
        )}
      </div>

      {showLegend && <LegendModal legend={legend} setLegend={setLegend} onClose={() => setShowLegend(false)} />}
    </div>
  )
}

function PanelControls({
  view, onChange, showCompletedToggle
}: { view: ViewState, onChange: (partial: Partial<ViewState>) => void, showCompletedToggle: boolean }) {
  return (
    <div className="rounded-xl border bg-white p-3 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="flex items-center gap-2">
          <label className="badge">Granularity</label>
          <select value={view.granularity} onChange={e => onChange({ granularity: e.target.value as Granularity })}>
            <option value="weeks">Weeks</option>
            <option value="months">Months</option>
            <option value="quarters">Quarters</option>
            <option value="years">Years</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="badge">Auto Range</label>
          <input type="checkbox" checked={view.autoRange} onChange={e => onChange({ autoRange: e.target.checked })} />
          <span className="text-sm text-slate-500">Start/End follow project dates</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="badge">Executive Mode</label>
          <input type="checkbox" checked={view.executiveMode} onChange={e => onChange({ executiveMode: e.target.checked })} />
          <span className="text-sm text-slate-500">Hide names</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="flex items-center gap-2">
          <label className="badge">Start</label>
          <input type="date" value={view.startDate} onChange={e => onChange({ startDate: e.target.value, autoRange: false })} />
        </div>
        <div className="flex items-center gap-2">
          <label className="badge">End</label>
          <input type="date" value={view.endDate} onChange={e => onChange({ endDate: e.target.value, autoRange: false })} />
        </div>
        <div className="flex items-center gap-2">
          <label className="badge">Today</label>
          <input type="checkbox" checked={view.useSystemToday} onChange={e => onChange({ useSystemToday: e.target.checked })} />
          <span className="text-sm">Use system date</span>
          {!view.useSystemToday && (
            <input type="date" className="ml-2" value={view.manualToday} onChange={e => onChange({ manualToday: e.target.value })} />
          )}
        </div>
      </div>

      {showCompletedToggle && (
        <div className="mt-3">
          <label className="badge mr-2">Show completed</label>
          <input
            type="checkbox"
            checked={view.includeCompleted}
            onChange={e => onChange({ includeCompleted: e.target.checked })}
          />
          <span className="ml-2 text-sm text-slate-500">Off = hide completed; On = show all</span>
        </div>
      )}
    </div>
  )
}

function LegendModal({ legend, setLegend, onClose }:
  { legend: LegendSettings, setLegend: (l: LegendSettings) => void, onClose: () => void }) {
  const update = (k: MilestoneType, field: 'color' | 'shape' | 'size', value: string) => {
    setLegend({
      ...legend,
      milestone: {
        ...legend.milestone,
        [k]: { ...legend.milestone[k], [field]: field === 'size' ? Math.max(6, Math.min(24, parseInt(value || '10', 10))) : value }
      }
    })
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-2xl rounded-xl border bg-white p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Legend Settings</h2>
          <button className="pm-outline" onClick={onClose}>Close</button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Project Bar Color</label>
          <input type="color" value={legend.barColor} onChange={e => setLegend({ ...legend, barColor: e.target.value })} className="h-10 w-16" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ALL_TYPES.map((t) => (
            <div key={t} className="rounded-lg border p-3">
              <div className="font-medium capitalize mb-2">{t}</div>
              <div className="flex items-center gap-3">
                <label className="text-sm">Color</label>
                <input type="color" value={legend.milestone[t].color} onChange={e => update(t, 'color', e.target.value)} />
                <label className="text-sm">Shape</label>
                <select value={legend.milestone[t].shape} onChange={e => update(t, 'shape', e.target.value)}>
                  <option value="circle">Circle</option>
                  <option value="diamond">Diamond</option>
                  <option value="square">Square</option>
                  <option value="triangle">Triangle</option>
                </select>
                <label className="text-sm">Size</label>
                <input type="number" min={6} max={24} value={legend.milestone[t].size} onChange={e => update(t, 'size', e.target.value)} className="w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TeamsManager({ teams, setTeams, executive }:
  { teams: Team[], setTeams: React.Dispatch<React.SetStateAction<Team[]>>, executive: boolean }) {
  const addTeam = () => { const name = prompt('Team name?'); if (name) setTeams(ts => [...ts, { id: uid(), name, members: [] }]) }
  const renameTeam = (id: string) => {
    const t = teams.find(t => t.id === id); if (!t) return
    const name = prompt('New team name', t.name); if (name) setTeams(ts => ts.map(x => x.id === id ? { ...x, name } : x))
  }
  const addMember = (teamId: string) => {
    const name = prompt('Member name?'); if (!name) return
    setTeams(ts => ts.map(t => t.id === teamId ? { ...t, members: [...t.members, { id: uid(), name, teamId }] } : t))
  }
  const renameMember = (teamId: string, memberId: string) => {
    const team = teams.find(t => t.id === teamId); const m = team?.members.find(m => m.id === memberId); if (!m) return
    const name = prompt('New member name', m.name); if (name)
      setTeams(ts => ts.map(t => t.id === teamId ? { ...t, members: t.members.map(mm => mm.id === memberId ? { ...mm, name } : mm) } : t))
  }
  const removeMember = (teamId: string, memberId: string) =>
    setTeams(ts => ts.map(t => t.id === teamId ? { ...t, members: t.members.filter(mm => mm.id !== memberId) } : t))
  const removeTeam = (id: string) => { if (confirm('Delete team (and its members)?')) setTeams(ts => ts.filter(t => t.id !== id)) }

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Teams</h2>
        <button className="pm" onClick={addTeam}>Add Team</button>
      </div>
      <div className="grid gap-4">
        {teams.map((t) => (
          <div key={t.id} className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="font-medium">
                {t.name} <span className="text-xs text-slate-500">(Members: {t.members.length})</span>
              </div>
              <div className="flex gap-2">
                <button className="pm-outline" onClick={() => renameTeam(t.id)}>✏️ Rename</button>
                <button className="pm-outline" onClick={() => addMember(t.id)}>＋ Add Member</button>
                <button className="pm-outline" onClick={() => removeTeam(t.id)}>🗑 Delete</button>
              </div>
            </div>
            <ul className="space-y-1">
              {t.members.map((m, i) => (
                <li key={m.id} className="flex items-center justify-between">
                  <span>{executive ? `Resource ${i + 1}` : m.name}</span>
                  <span className="flex gap-2">
                    <button className="pm-outline" onClick={() => renameMember(t.id, m.id)}>✏️</button>
                    <button className="pm-outline" onClick={() => removeMember(t.id, m.id)}>🗑</button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProjectsManager({ teams, projects, setProjects, legend }:
  { teams: Team[], projects: Project[], setProjects: React.Dispatch<React.SetStateAction<Project[]>>, legend: LegendSettings }) {
  const allMembers = teams.flatMap(t => t.members)
  const addProject = () => setProjects(ps => [...ps, {
    id: uid(), name: 'New Project', priority: (ps[ps.length - 1]?.priority ?? 0) + 1,
    teamMemberIds: [], startDates: '', dueDates: '', stabilizationDates: '', completeDates: '', completed: false
  }])
  const update = (id: string, patch: Partial<Project>) => setProjects(ps => ps.map(p => p.id === id ? { ...p, ...patch } : p))
  const remove = (id: string) => { if (confirm('Delete this project?')) setProjects(ps => ps.filter(p => p.id !== id)) }

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Projects</h2>
        <button className="pm-outline" onClick={addProject}>＋ Add Project</button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1000px] w-full border text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="border px-2 py-1 text-left">Project</th>
              <th className="border px-2 py-1 text-left">Priority</th>
              <th className="border px-2 py-1 text-left">Completed?</th>
              <th className="border px-2 py-1 text-left">Team Members</th>
              <th className="border px-2 py-1 text-left">Start Dates</th>
              <th className="border px-2 py-1 text-left">Due Dates</th>
              <th className="border px-2 py-1 text-left">Stabilization</th>
              <th className="border px-2 py-1 text-left">Complete</th>
              <th className="border px-2 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="odd:bg-white even:bg-slate-50">
                <td className="border px-2 py-1"><input type="text" value={p.name} onChange={e => update(p.id, { name: e.target.value })} /></td>
                <td className="border px-2 py-1 w-24"><input type="number" value={p.priority} onChange={e => update(p.id, { priority: parseInt(e.target.value || '0', 10) })} /></td>
                <td className="border px-2 py-1 w-24">
                  <input type="checkbox" checked={p.completed} onChange={e => update(p.id, { completed: e.target.checked })} />
                </td>
                <td className="border px-2 py-1 min-w-[240px]">
                  <SelectMany
                    options={allMembers.map(m => ({ id: m.id, label: `${teams.find(t => t.id === m.teamId)?.name ?? ''} - ${m.name}` }))}
                    value={p.teamMemberIds}
                    onChange={(ids) => update(p.id, { teamMemberIds: ids })}
                  />
                </td>
                <td className="border px-2 py-1">
                  <input type="text" placeholder="yyyy-mm-dd, yyyy-mm-dd" value={p.startDates} onChange={e => update(p.id, { startDates: e.target.value })} className="w-56" />
                </td>
                <td className="border px-2 py-1">
                  <input type="text" placeholder="yyyy-mm-dd, yyyy-mm-dd" value={p.dueDates} onChange={e => update(p.id, { dueDates: e.target.value })} className="w-56" />
                </td>
                <td className="border px-2 py-1">
                  <input type="text" placeholder="yyyy-mm-dd, yyyy-mm-dd" value={p.stabilizationDates} onChange={e => update(p.id, { stabilizationDates: e.target.value })} className="w-56" />
                </td>
                <td className="border px-2 py-1">
                  <input type="text" placeholder="yyyy-mm-dd, yyyy-mm-dd" value={p.completeDates} onChange={e => update(p.id, { completeDates: e.target.value })} className="w-56" />
                </td>
                <td className="border px-2 py-1 text-right">
                  <button className="pm-outline" onClick={() => remove(p.id)}>🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-sm text-slate-500">
        Tip: Enter comma-separated dates (e.g., <code>2025-01-10, 2025-02-15</code>). Invalid entries are ignored.
      </div>

      <div className="mt-4 rounded-lg border p-3">
        <div className="mb-2 font-medium">Legend (applies everywhere)</div>
        <LegendInline legend={legend} />
      </div>
    </div>
  )
}

function SelectMany({ options, value, onChange }:
  { options: { id: string; label: string }[], value: string[], onChange: (ids: string[]) => void }) {
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id])
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <label key={opt.id} className={"badge cursor-pointer " + (value.includes(opt.id) ? "bg-sky-100 border-sky-300" : "")}>
          <input type="checkbox" className="mr-1" checked={value.includes(opt.id)} onChange={() => toggle(opt.id)} />
          {opt.label}
        </label>
      ))}
    </div>
  )
}

function TimelineView({
  tabKey, teams, projects, legend, view, setView, executive, openLegend
}: {
  tabKey: string
  teams: Team[]
  projects: Project[]
  legend: LegendSettings
  view: ViewState
  setView: (partial: Partial<ViewState>) => void
  executive: boolean
  openLegend: () => void
}) {
  let list = projects
  if (tabKey === 'Completed') {
    list = list.filter(p => p.completed)
  } else if (tabKey !== 'Unified' && tabKey !== 'Teams' && tabKey !== 'Projects') {
    const teamId = tabKey
    const memberIds = teams.find(t => t.id === teamId)?.members.map(m => m.id) ?? []
    list = list.filter(p => p.teamMemberIds.some(id => memberIds.includes(id)))
    if (!view.includeCompleted) list = list.filter(p => !p.completed)
  } else {
    if (!view.includeCompleted) list = list.filter(p => !p.completed)
  }

  const start = parseDate(view.startDate) ?? new Date()
  const end = parseDate(view.endDate) ?? addDays(start, 90)
  const spanMs = Math.max(1, end.getTime() - start.getTime())
  const today = view.useSystemToday ? new Date() : (parseDate(view.manualToday) ?? new Date())

  const ticks = Array.from(tickGenerator(start, end, view.granularity))
  const pos = (d: Date) => clamp(((d.getTime() - start.getTime()) / spanMs) * 100)

  const rows = list
    .map(p => {
      const datesByType: Record<MilestoneType, Date[]> = {
        start: parseCommaDates(p.startDates),
        due: parseCommaDates(p.dueDates),
        stabilization: parseCommaDates(p.stabilizationDates),
        complete: parseCommaDates(p.completeDates),
      }
      const span = getProjectSpan(p)
      return { project: p, datesByType, span }
    })
    .filter(r => r.span.start && r.span.end)

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Range: <span className="font-medium">{fmt(start)}</span> → <span className="font-medium">{fmt(end)}</span> •{' '}
          Granularity: <span className="font-medium capitalize">{view.granularity}</span>
        </div>
        <button className="pm-outline" onClick={openLegend}>Legend</button>
      </div>

      <div className="relative overflow-hidden rounded-lg border">
        <div className="relative h-10 bg-slate-100">
          {ticks.map((t, i) => (
            <div key={i} className="absolute top-0 h-full border-l border-slate-300 text-[10px] text-slate-700" style={{ left: pos(t) + '%' }}>
              <div className="absolute -top-1 -translate-x-1/2 whitespace-nowrap px-1">
                {labelForTick(t, view.granularity)}
              </div>
            </div>
          ))}
          <div className="absolute inset-y-0 w-px bg-rose-500" style={{ left: pos(today) + '%' }} title={"Today: " + fmt(today)}></div>
        </div>

        <div className="divide-y">
          {rows.map((r, idx) => (
            <div key={r.project.id} className="relative h-16">
              <div
                className="absolute top-1/2 -translate-y-1/2 h-3 rounded-full"
                style={{
                  left: pos(r.span.start!) + '%',
                  width: (pos(r.span.end!) - pos(r.span.start!)) + '%',
                  background: legend.barColor
                }}
                title={`${r.project.name}: ${fmt(r.span.start!)} → ${fmt(r.span.end!)}`}
              />
              {ALL_TYPES.map((mt) =>
                r.datesByType[mt].map((d, i) => (
                  <Milestone key={mt + i + d.toISOString()} x={pos(d)} type={mt} legend={legend} date={d} />
                ))
              )}
              <div className="absolute left-2 top-1 text-sm font-medium">
                {executive ? `Project ${idx + 1}` : `${r.project.priority}. ${r.project.name}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {rows.length === 0 && (
        <div className="mt-4 text-sm text-slate-500">No projects in range. Add dates in the Projects tab or adjust the range.</div>
      )}
    </div>
  )
}

function labelForTick(d: Date, g: Granularity) {
  if (g === 'weeks') { const wk = Math.ceil(d.getDate() / 7); return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')} W${wk}` }
  if (g === 'months') return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}`
  if (g === 'quarters') return `Q${Math.floor(d.getMonth()/3)+1} ${d.getFullYear()}`
  return `${d.getFullYear()}`
}

function Milestone({ x, type, legend, date }:
  { x: number, type: MilestoneType, legend: LegendSettings, date: Date }) {
  const style: React.CSSProperties = {
    position: 'absolute', left: x + '%', top: '50%',
    transform: 'translate(-50%, -50%)', color: legend.milestone[type].color
  }
  const sz = legend.milestone[type].size
  const fill = legend.milestone[type].color
  const title = `${type.toUpperCase()} • ${date.toISOString().slice(0,10)}`
  const shape = legend.milestone[type].shape

  return (
    <div style={style} title={title}>
      {shape === 'circle'   && <div style={{ width: sz, height: sz, borderRadius: '9999px', background: fill }} />}
      {shape === 'square'   && <div style={{ width: sz, height: sz, background: fill }} />}
      {shape === 'diamond'  && (
        <svg width={sz} height={sz} viewBox="0 0 100 100" aria-hidden>
          <polygon points="50,0 100,50 50,100 0,50" fill={fill} />
        </svg>
      )}
      {shape === 'triangle' && (
        <svg width={sz} height={sz} viewBox="0 0 100 100" aria-hidden>
          <polygon points="50,0 100,100 0,100" fill={fill} />
        </svg>
      )}
    </div>
  )
}

function LegendInline({ legend }: { legend: LegendSettings }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm">
      <div className="flex items-center gap-2">
        <span className="w-10 h-2 rounded-full" style={{ background: legend.barColor }}></span>
        <span>Project bar</span>
      </div>
      {ALL_TYPES.map(mt => (
        <div key={mt} className="flex items-center gap-2">
          <Milestone x={0} type={mt} legend={legend} date={new Date()} />
          <span className="capitalize">{mt}</span>
        </div>
      ))}
    </div>
  )
}
