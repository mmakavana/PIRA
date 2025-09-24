import React, { useEffect, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

type Granularity = 'weeks' | 'months' | 'quarters' | 'years'
type MilestoneType = 'start' | 'due' | 'stabilization' | 'complete'
type Shape = 'circle' | 'diamond' | 'square' | 'triangle'

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
  zoom: number  // 0.5 - 2.0
}
type ViewsMap = Record<string, ViewState>

const uid = () => Math.random().toString(36).slice(2, 10)
const dayMs = 24 * 60 * 60 * 1000
const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
const fmtISO = (d: Date) => d.toISOString().slice(0, 10)
const fmtShort = (d: Date) => `${d.getMonth()+1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`
const addDays = (d: Date, days: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days)

const parseDate = (s: string): Date | null => {
  const t = (s ?? '').trim(); if (!t) return null
  const d = new Date(t); if (isNaN(d.getTime())) return null
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
const parseCommaDates = (value: string): Date[] =>
  (value || '')
    .split(',')
    .map(s => parseDate(s || ''))
    .filter((d): d is Date => !!d)
    .sort((a, b) => a.getTime() - b.getTime())

const startOfWeekSunday = (d: Date) => addDays(d, -d.getDay()) // 0=Sun

function* tickGenerator(start: Date, end: Date, g: Granularity): Generator<Date, void, unknown> {
  let cur = new Date(start)
  if (g === 'weeks') cur = startOfWeekSunday(cur)
  if (g === 'months') cur = new Date(cur.getFullYear(), cur.getMonth(), 1)
  if (g === 'quarters') cur = new Date(cur.getFullYear(), Math.floor(cur.getMonth() / 3) * 3, 1)
  if (g === 'years') cur = new Date(cur.getFullYear(), 0, 1)

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
  barColor: '#9CA3AF',
  milestone: {
    start:         { color: '#10b981', shape: 'circle',   size: 12 },
    due:           { color: '#ef4444', shape: 'diamond',  size: 12 },
    stabilization: { color: '#3b82f6', shape: 'square',   size: 12 },
    complete:      { color: '#111827', shape: 'triangle', size: 14 },
  },
}
const todayISO = () => new Date().toISOString().slice(0, 10)
const defaultView = (): ViewState => ({
  startDate: fmtISO(addDays(new Date(), -30)),
  endDate: fmtISO(addDays(new Date(), 120)),
  autoRange: true,
  granularity: 'weeks',
  executiveMode: false,
  useSystemToday: true,
  manualToday: todayISO(),
  includeCompleted: true,
  zoom: 1,
})

function load<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback } catch { return fallback }
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
  // theme
  const [theme, setTheme] = useState<string>(() => load('pm_theme', 'aurora'))
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('theme-earth')
    if (theme === 'earth') root.classList.add('theme-earth')
    save('pm_theme', theme)
  }, [theme])

  // data
  const [teams, setTeams] = useState<Team[]>(() =>
    load<Team[]>('pm_teams', [
      { id: uid(), name: 'Development',  members: [{ id: uid(), name: 'Ava',     teamId: 'TBD' }] },
      { id: uid(), name: 'QA',           members: [{ id: uid(), name: 'Diana',   teamId: 'TBD' }] },
      { id: uid(), name: 'Infrastructure', members: [{ id: uid(), name: 'Noah',  teamId: 'TBD' }] },
    ].map(t => ({ ...t, members: t.members.map(m => ({ ...m, teamId: t.id })) })))
  )

  const [projects, setProjects] = useState<Project[]>(() =>
    load<Project[]>('pm_projects', [{
      id: uid(), name: 'B3', priority: 1, teamMemberIds: [],
      startDates: '2025-05-01', dueDates: '2025-08-01, 2025-08-15',
      stabilizationDates: '', completeDates: '',
      completed: false
    }])
  )

  const [legend, setLegend] = useState<LegendSettings>(() => load('pm_legend', defaultLegend))
  const [views, setViews] = useState<ViewsMap>(() => load('pm_views', {}))
  const [activeTab, setActiveTab] = useState<string>('Projects Overview')
  const [showLegend, setShowLegend] = useState(false)

  const ensureView = (key: string) => { if (!views[key]) setViews(v => ({ ...v, [key]: defaultView() })) }
  useEffect(() => { ensureView('Projects Overview') }, [])
  useEffect(() => { save('pm_teams', teams) }, [teams])
  useEffect(() => { save('pm_projects', projects) }, [projects])
  useEffect(() => { save('pm_legend', legend) }, [legend])
  useEffect(() => { save('pm_views', views) }, [views])
  useEffect(() => { ensureView(activeTab) }, [activeTab])

  // tabs: Projects Overview (formerly Unified), Completed, each team, Teams Management, Projects Management
  const tabs = useMemo(
    () => ['Projects Overview', 'Completed', ...teams.map(t => t.id), 'Teams Management', 'Projects Management'],
    [teams]
  )

  const view = views[activeTab] ?? defaultView()

  // auto-range respects filter + tab
  useEffect(() => {
    const v = views[activeTab]
    if (!v?.autoRange) return
    let relevant = projects
    if (activeTab === 'Completed') relevant = relevant.filter(p => p.completed)
    else if (activeTab !== 'Projects Overview' && activeTab !== 'Teams Management' && activeTab !== 'Projects Management') {
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
    setViews(vs => ({ ...vs, [activeTab]: { ...vs[activeTab], startDate: fmtISO(start), endDate: fmtISO(end) } }))
  }, [projects, teams, activeTab, view.includeCompleted])

  const renderTabLabel = (key: string) => {
    if (key === 'Projects Overview' || key === 'Completed' || key === 'Teams Management' || key === 'Projects Management') return key
    return teams.find(t => t.id === key)?.name ?? key
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      {/* Banner */}
      <div className="banner px-6 py-6">
        <h1>PIRA</h1>
        <p>Project IT Resource Availability</p>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex flex-wrap gap-3 px-4">
        {tabs.map(key => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={activeTab === key ? 'tab-active' : 'tab'}
            title={renderTabLabel(key)}>
            {renderTabLabel(key)}
          </button>
        ))}
      </div>

      {/* Controls row */}
      <div className="mt-4 flex flex-wrap items-center gap-3 px-4">
        <button className="pm-outline" onClick={() => setShowLegend(true)}>Legend Settings</button>
        <button className="pm-outline" onClick={() => setTheme(t => t === 'earth' ? 'aurora' : 'earth')}>
          Theme: {theme === 'earth' ? 'Earthy Pastel' : 'Blue/Purple'}
        </button>
      </div>

      <div className="px-4 mt-4">
        <PanelControls
          view={view}
          onChange={next => setViews(v => ({ ...v, [activeTab]: { ...v[activeTab], ...next } }))}
          showCompletedToggle={activeTab !== 'Completed'}
        />
      </div>

      <div className="mt-4 px-4 pb-6">
        {activeTab === 'Projects Management' && (
          <ProjectsManager teams={teams} projects={projects} setProjects={setProjects} />
        )}
        {activeTab === 'Teams Management' && (
          <TeamsManager teams={teams} setTeams={setTeams} executive={view.executiveMode} />
        )}
        {(activeTab === 'Projects Overview' || activeTab === 'Completed' ||
          (activeTab !== 'Teams Management' && activeTab !== 'Projects Management')) && (
          <TimelineAndRoster
            key={'tl-' + activeTab}
            tabKey={activeTab}
            teams={teams}
            projects={projects}
            legend={legend}
            view={view}
            setView={(p)=>setViews(v=>({...v,[activeTab]:{...v[activeTab],...p}}))}
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
        </div>
        <div className="flex items-center gap-2">
          <label className="badge">Executive Mode</label>
          <input type="checkbox" checked={view.executiveMode} onChange={e => onChange({ executiveMode: e.target.checked })} />
          <span className="text-sm text-slate-500">Hide names on team tabs</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="badge">Zoom</label>
          <input type="range" min={0.5} max={2} step={0.1} value={view.zoom}
                 onChange={e => onChange({ zoom: parseFloat(e.target.value) })}/>
          <span className="text-sm w-12 text-right">{Math.round(view.zoom * 100)}%</span>
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
          <input type="checkbox" checked={view.includeCompleted}
                 onChange={e => onChange({ includeCompleted: e.target.checked })}/>
          <span className="ml-2 text-sm text-slate-500">Off = hide completed; On = show all</span>
        </div>
      )}
    </div>
  )
}

/* Modal editor for legend */
function LegendModal({ legend, setLegend, onClose }:
  { legend: LegendSettings, setLegend: (l: LegendSettings) => void, onClose: () => void }) {
  const update = (k: MilestoneType, field: 'color' | 'shape' | 'size', value: string) => {
    setLegend({
      ...legend,
      milestone: {
        ...legend.milestone,
        [k]: { ...legend.milestone[k], [field]: field === 'size' ? Math.max(6, Math.min(24, parseInt(value || '12', 10))) : value }
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

/** Projects editor table */
function ProjectsManager({ teams, projects, setProjects }:
  { teams: Team[], projects: Project[], setProjects: React.Dispatch<React.SetStateAction<Project[]>> }) {
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
        <h2 className="text-lg font-semibold">Projects Management</h2>
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
                <td className="border px-2 py-1 min-w-[260px]">
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

/** Read-only legend strip */
function Glyph({ color, shape, size }:{ color:string, shape:Shape, size:number }) {
  const sz = size
  if (shape === 'circle') return <div style={{ width: sz, height: sz, borderRadius: 9999, background: color }} />
  if (shape === 'square') return <div style={{ width: sz, height: sz, background: color }} />
  if (shape === 'diamond') return (
    <svg width={sz} height={sz} viewBox="0 0 100 100" aria-hidden>
      <polygon points="50,0 100,50 50,100 0,50" fill={color} />
    </svg>
  )
  return (
    <svg width={sz} height={sz} viewBox="0 0 100 100" aria-hidden>
      <polygon points="50,0 100,100 0,100" fill={color} />
    </svg>
  )
}
function LegendReadOnly({ legend }: { legend: LegendSettings }) {
  return (
    <div className="flex flex-wrap items-center gap-4 py-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="w-10 h-2 rounded-full" style={{ background: legend.barColor }}></span>
        <span>Project bar</span>
      </div>
      {ALL_TYPES.map(mt => (
        <div key={mt} className="flex items-center gap-2">
          <Glyph color={legend.milestone[mt].color} shape={legend.milestone[mt].shape} size={legend.milestone[mt].size} />
          <span className="capitalize">{mt}</span>
        </div>
      ))}
    </div>
  )
}

/** Roster + Timeline + PDF + Zoom */
function TimelineAndRoster({
  tabKey, teams, projects, legend, view, setView
}: {
  tabKey: string
  teams: Team[]
  projects: Project[]
  legend: LegendSettings
  view: ViewState
  setView: (partial: Partial<ViewState>) => void
}) {
  // filter by tab
  let list = projects
  const teamMode = (tabKey !== 'Projects Overview' && tabKey !== 'Teams Management' && tabKey !== 'Projects Management' && tabKey !== 'Completed')
  if (tabKey === 'Completed') list = list.filter(p => p.completed)
  else if (teamMode) {
    const teamId = tabKey
    const memberIds = teams.find(t => t.id === teamId)?.members.map(m => m.id) ?? []
    list = list.filter(p => p.teamMemberIds.some(id => memberIds.includes(id)))
    if (!view.includeCompleted) list = list.filter(p => !p.completed)
  } else {
    if (!view.includeCompleted) list = list.filter(p => !p.completed)
  }

  // roster for team tabs
  const roster = useMemo(() => {
    if (!teamMode) return []
    const t = teams.find(tt => tt.id === tabKey)
    const mems = t?.members ?? []
    return mems.map((m, i) => {
      const assigned = list.filter(p => p.teamMemberIds.includes(m.id)).map(p => p.name)
      return { member: m, label: view.executiveMode ? `Resource ${i+1}` : m.name, projects: assigned }
    })
  }, [teamMode, teams, tabKey, list, view.executiveMode])

  // timeline geometry
  const start = parseDate(view.startDate) ?? new Date()
  const end = parseDate(view.endDate) ?? addDays(start, 120)
  const daysTotal = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / dayMs))
  const PX_PER_DAY_BASE = 10
  const PX_PER_DAY = PX_PER_DAY_BASE * view.zoom
  const contentWidth = Math.max(600, Math.ceil(daysTotal * PX_PER_DAY))
  const today = view.useSystemToday ? new Date() : (parseDate(view.manualToday) ?? new Date())

  const xPx = (d: Date) => clamp01((d.getTime() - start.getTime()) / (daysTotal * dayMs)) * contentWidth
  const ticks = Array.from(tickGenerator(start, end, view.granularity))

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

  const NAME_COL_WIDTH = 260

  // PDF export
  const gridRef = useRef<HTMLDivElement>(null)
  const handleExportPDF = async () => {
    if (!gridRef.current) return
    const node = gridRef.current
    const canvas = await html2canvas(node, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
    const imgData = canvas.toDataURL('image/png')

    // Letter Landscape in points (pt): 792h x 612w, but jsPDF expects [w,h]
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    const imgWidth = pageWidth
    const imgHeight = canvas.height * (imgWidth / canvas.width)

    let y = 0
    while (y < imgHeight) {
      pdf.addImage(imgData, 'PNG', 0, -y, imgWidth, imgHeight)
      y += pageHeight
      if (y < imgHeight) pdf.addPage()
    }
    pdf.save('timeline.pdf')
  }

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Range: <span className="font-medium">{fmtShort(start)}</span> → <span className="font-medium">{fmtShort(end)}</span> •{' '}
          Granularity: <span className="font-medium capitalize">{view.granularity}</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="pm-outline" onClick={handleExportPDF}>Download PDF</button>
        </div>
      </div>

      <LegendReadOnly legend={legend} />

      {/* Team roster (only on team tabs) */}
      {teamMode && (
        <div className="mb-4 rounded-lg border p-3">
          <div className="font-medium mb-2">Assignments</div>
          <div className="overflow-x-auto">
            <table className="min-w-[600px] text-sm w-full">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border px-2 py-1 text-left w-56">Member</th>
                  <th className="border px-2 py-1 text-left">Projects</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((r) => (
                  <tr key={r.member.id} className="odd:bg-white even:bg-slate-50">
                    <td className="border px-2 py-1">{r.label}</td>
                    <td className="border px-2 py-1">{r.projects.join(', ') || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div ref={gridRef} className="grid" style={{ gridTemplateColumns: `${NAME_COL_WIDTH}px 1fr` }}>
        {/* Names */}
        <div className="sticky left-0 z-10 bg-white border-r border-slate-200">
          <div className="h-10 border-b border-slate-200 bg-slate-100" />
          {rows.map((r, idx) => (
            <div key={'name-' + r.project.id} className="tl-name-cell">
              {`${r.project.priority}. ${r.project.name}`}
            </div>
          ))}
        </div>

        {/* Scrollable time pane */}
        <div className="tl-scroll">
          {/* scale */}
          <div className="tl-scale" style={{ width: contentWidth }}>
            {ticks.map((t, i) => (
              <div key={i}
                   className="absolute top-0 h-full border-l border-slate-300 text-[10px] text-slate-700"
                   style={{ left: xPx(t) }}>
                <div className="absolute -top-1 -translate-x-1/2 whitespace-nowrap px-1">
                  {view.granularity === 'weeks' ? fmtShort(t) : fmtShort(t)}
                </div>
              </div>
            ))}
            {/* today */}
            <div className="absolute inset-y-0 w-px bg-rose-500" style={{ left: xPx(view.useSystemToday ? new Date() : (parseDate(view.manualToday) ?? new Date())) }} title={"Today"} />
          </div>

          {/* rows */}
          <div className="relative" style={{ width: contentWidth, paddingBottom: 6 }}>
            {rows.map((r) => (
              <div key={r.project.id} className="tl-row">
                {/* bar */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-2.5 rounded-full"
                  style={{
                    left: Math.min(xPx(r.span.start!), xPx(r.span.end!)),
                    width: Math.abs(xPx(r.span.end!) - xPx(r.span.start!)),
                    background: legend.barColor,
                    zIndex: 1
                  }}
                  title={`${r.project.name}: ${fmtShort(r.span.start!)} → ${fmtShort(r.span.end!)}`}
                />
                {/* milestones with small offsets if same x */}
                {ALL_TYPES.map((mt) => {
                  const arr = r.datesByType[mt]
                  return arr.map((d, i) => {
                    const base = xPx(d)
                    const offset = i * (legend.milestone[mt].size + 2) * 0.6
                    return (
                      <Milestone key={r.project.id + mt + i + d.toISOString()}
                                 x={base + offset} type={mt} legend={legend} date={d} />
                    )
                  })
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {rows.length === 0 && (
        <div className="mt-4 text-sm text-slate-500">No projects in range. Add dates in the Projects tab or adjust the range.</div>
      )}
    </div>
  )
}

function Milestone({ x, type, legend, date }:
  { x: number, type: MilestoneType, legend: LegendSettings, date: Date }) {
  const sz = legend.milestone[type].size
  const fill = legend.milestone[type].color
  const shape = legend.milestone[type].shape
  const title = `${type.toUpperCase()} • ${fmtShort(date)}`
  const style: React.CSSProperties = {
    position: 'absolute', left: x, top: '50%', transform: 'translate(-50%, -50%)',
    zIndex: 2
  }
  return (
    <div style={style} title={title} aria-label={title}>
      {shape === 'circle'   && <div style={{ width: sz, height: sz, borderRadius: 9999, background: fill }} />}
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
