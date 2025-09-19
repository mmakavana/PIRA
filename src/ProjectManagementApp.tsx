import React from 'react'
import { CalendarDays, Users, UserCog, PlusCircle, Settings, BarChart3 } from 'lucide-react'

/* ========== Types ========== */

type UUID = string

type MilestoneType = {
  id: UUID
  name: string
  shape: 'diamond' | 'circle' | 'triangle' | 'square'
  color: string
  size: 'small' | 'medium' | 'large'
}

type Milestone = {
  id: UUID
  typeId: UUID
  date: string // ISO date (yyyy-mm-dd)
  label?: string
}

type Project = {
  id: UUID
  name: string
  description?: string
  priority: number // 1 highest
  status: string
  start: string
  due: string
  milestones: Milestone[]
  assigneeIds: string[] // teamId:memberName IDs
  barColor?: string
  history?: { ts: string; field: string; oldVal: string; newVal: string }[]
}

type Team = {
  id: UUID
  name: string
  members: string[] // names only; id will be teamId:name
}

type SettingsState = {
  defaultBarColor: string
  weekStartsOnSunday: boolean
  todayLine: boolean
  weekendShading: boolean
  snapToGrid: boolean
  executiveMode: boolean
  timeScale: 'days' | 'weeks' | 'months' | 'quarters' | 'years'
}

/* ========== Utilities ========== */

const ONE_DAY = 24 * 60 * 60 * 1000
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)

const toISO = (d: Date) => {
  const dt = new Date(d)
  dt.setHours(0, 0, 0, 0)
  return dt.toISOString().slice(0, 10)
}

const fromISO = (s: string) => {
  const d = new Date(s)
  d.setHours(0, 0, 0, 0)
  return d
}

const clamp = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x))

function formatMMDD(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
}

/* ========== Persistence (localStorage for MVP) ========== */

const STORAGE_KEY = 'pira-data-v1'
type DataShape = {
  teams: Team[]
  projects: Project[]
  milestoneTypes: MilestoneType[]
  settings: SettingsState
}

function loadData(): DataShape {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      return JSON.parse(raw)
    } catch {}
  }
  // Seed with starter
  return {
    teams: [
      { id: uid(), name: 'Development', members: ['John', 'Sarah', 'Mike'] },
      { id: uid(), name: 'QA', members: ['Priya', 'Tom'] },
      { id: uid(), name: 'DevOps', members: ['Alex'] },
    ],
    projects: [],
    milestoneTypes: [
      { id: uid(), name: 'Start Date', shape: 'diamond', color: '#10B981', size: 'small' },
      { id: uid(), name: 'Due Date', shape: 'diamond', color: '#EF4444', size: 'small' },
      { id: uid(), name: 'Stabilization', shape: 'diamond', color: '#3B82F6', size: 'medium' },
      { id: uid(), name: 'Complete', shape: 'diamond', color: '#10B981', size: 'medium' },
    ],
    settings: {
      defaultBarColor: '#5B6BFF',
      weekStartsOnSunday: true,
      todayLine: true,
      weekendShading: true,
      snapToGrid: true,
      executiveMode: false,
      timeScale: 'weeks',
    },
  }
}

function saveData(data: DataShape) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

/* ========== SVG Shapes ========== */

function Shape({ shape, color, size }: { shape: MilestoneType['shape']; color: string; size: MilestoneType['size'] }) {
  const px = size === 'small' ? 8 : size === 'medium' ? 12 : 16
  const half = px / 2
  const common = { fill: color, stroke: 'rgba(0,0,0,0.3)', strokeWidth: 1 }
  if (shape === 'circle') return <circle cx={half} cy={half} r={half - 1} {...common} />
  if (shape === 'square') return <rect x="1" y="1" width={px - 2} height={px - 2} rx="2" {...common} />
  if (shape === 'triangle') return <polygon points={`${half},1 ${px - 1},${px - 1} 1,${px - 1}`} {...common} />
  // diamond
  return <polygon points={`${half},1 ${px - 1},${half} ${half},${px - 1} 1,${half}`} {...common} />
}

function ShapeIcon(props: React.ComponentProps<typeof Shape>) {
  const px = props.size === 'small' ? 8 : props.size === 'medium' ? 12 : 16
  return (
    <svg width={px} height={px} className="inline-block align-middle">
      <Shape {...props} />
    </svg>
  )
}

/* ========== Header & Tabs ========== */

type Tab = 'unified' | 'teams' | 'projects' | 'reports'

function Header({ active, setActive }: { active: Tab; setActive: (t: Tab) => void }) {
  const tab = (id: Tab, label: string, Icon: any) => (
    <button
      onClick={() => setActive(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition
        ${active === id ? 'bg-white text-pira-purple border-white shadow'
        : 'bg-[#31297A] text-white/90 border-transparent hover:bg-[#3B338F]'}`}
    >
      <Icon size={18} />
      <span className="font-semibold">{label}</span>
    </button>
  )

  return (
    <div className="shadow">
      <div className="bg-pira-purple text-white">
        <div className="max-w-6xl mx-auto px-4 py-5">
          <h1 className="text-3xl font-bold tracking-wide">PIRA</h1>
          <p className="text-white/90 -mt-1">Project IT Resource Availability</p>
        </div>
      </div>
      <div className="bg-[#2A246F]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto">
          {tab('unified', 'Unified View', CalendarDays)}
          {tab('teams', 'Teams', Users)}
          {tab('projects', 'Projects', PlusCircle)}
          {tab('reports', 'Reports', BarChart3)}
        </div>
      </div>
    </div>
  )
}

/* ========== Legend Manager ========== */

function LegendManager({
  milestoneTypes,
  setMilestoneTypes,
  settings,
  setSettings
}: {
  milestoneTypes: MilestoneType[]
  setMilestoneTypes: (f: (prev: MilestoneType[]) => MilestoneType[]) => void
  settings: SettingsState
  setSettings: (s: SettingsState) => void
}) {
  const updateType = (id: UUID, patch: Partial<MilestoneType>) => {
    setMilestoneTypes(prev => prev.map(mt => mt.id === id ? { ...mt, ...patch } : mt))
  }
  const removeType = (id: UUID) => setMilestoneTypes(prev => prev.filter(mt => mt.id !== id))
  const addType = () => setMilestoneTypes(prev => [...prev, { id: uid(), name: 'New Type', shape: 'diamond', color: '#6366F1', size: 'small' }])

  return (
    <div className="bg-white rounded-xl shadow p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Legend: Milestone Types</h3>
        <button className="px-3 py-1 bg-pira-accent text-white rounded" onClick={addType}>+ Add Type</button>
      </div>

      <div className="space-y-3">
        {milestoneTypes.map(mt => (
          <div key={mt.id} className="grid md:grid-cols-6 grid-cols-2 items-center gap-2 border rounded-lg p-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-500">Name</label>
              <input className="w-full border rounded px-2 py-1" value={mt.name}
                onChange={e => updateType(mt.id, { name: e.target.value })} />
            </div>

            <div>
              <label className="text-xs text-gray-500">Shape</label>
              <select className="w-full border rounded px-2 py-1" value={mt.shape}
                onChange={e => updateType(mt.id, { shape: e.target.value as any })}>
                <option value="diamond">diamond</option>
                <option value="circle">circle</option>
                <option value="triangle">triangle</option>
                <option value="square">square</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500">Size</label>
              <select className="w-full border rounded px-2 py-1" value={mt.size}
                onChange={e => updateType(mt.id, { size: e.target.value as any })}>
                <option value="small">small</option>
                <option value="medium">medium</option>
                <option value="large">large</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500">Color</label>
              <input className="w-full border rounded h-9" type="color" value={mt.color}
                onChange={e => updateType(mt.id, { color: e.target.value })} />
            </div>

            <div className="flex items-center gap-2">
              <ShapeIcon shape={mt.shape} color={mt.color} size={mt.size} />
              <button className="text-red-600 text-sm" onClick={() => removeType(mt.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-4 sm:grid-cols-2 gap-3 pt-3 border-t">
        <div>
          <label className="text-xs text-gray-500">Default Project Bar Color</label>
          <input type="color" className="w-full h-10 border rounded" value={settings.defaultBarColor}
            onChange={e => setSettings({ ...settings, defaultBarColor: e.target.value })} />
        </div>

        <Toggle label="Executive Mode" value={settings.executiveMode}
          onChange={v => setSettings({ ...settings, executiveMode: v })} />
        <Toggle label="Show Today Line" value={settings.todayLine}
          onChange={v => setSettings({ ...settings, todayLine: v })} />
        <Toggle label="Weekend Shading" value={settings.weekendShading}
          onChange={v => setSettings({ ...settings, weekendShading: v })} />
        <Toggle label="Snap to Grid" value={settings.snapToGrid}
          onChange={v => setSettings({ ...settings, snapToGrid: v })} />
      </div>
    </div>
  )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm select-none">
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

/* ========== Project Forms ========== */

function ProjectForm({
  teams, milestoneTypes, settings, onSave, initial
}: {
  teams: Team[]
  milestoneTypes: MilestoneType[]
  settings: SettingsState
  onSave: (p: Project) => void
  initial?: Project
}) {
  const [name, setName] = React.useState(initial?.name || '')
  const [priority, setPriority] = React.useState(initial?.priority ?? 3)
  const [status, setStatus] = React.useState(initial?.status || 'In Progress')
  const [start, setStart] = React.useState(initial?.start || toISO(new Date()))
  const [due, setDue] = React.useState(initial?.due || toISO(new Date(Date.now() + 14 * ONE_DAY)))
  const [assignees, setAssignees] = React.useState<string[]>(initial?.assigneeIds || [])
  const [barColor, setBarColor] = React.useState<string>(initial?.barColor || '')
  const [milestones, setMilestones] = React.useState<Milestone[]>(initial?.milestones || [])

  const allMembers = React.useMemo(() =>
    teams.flatMap(t => t.members.map(m => ({ id: `${t.id}:${m}`, teamName: t.name, name: m }))), [teams])

  const addMilestone = () => setMilestones(prev => [...prev, {
    id: uid(), typeId: milestoneTypes[0]?.id || uid(), date: toISO(new Date())
  }])

  const updateMilestone = (id: string, patch: Partial<Milestone>) =>
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m))

  const removeMilestone = (id: string) => setMilestones(prev => prev.filter(m => m.id !== id))

  const submit = () => {
    if (new Date(due) < new Date(start)) {
      alert('Warning: Due date is earlier than Start date.')
    }
    const p: Project = {
      id: initial?.id || uid(),
      name,
      priority,
      status,
      start, due,
      assigneeIds: assignees,
      barColor: barColor || undefined,
      milestones,
      history: initial?.history || []
    }
    if (initial && initial.due !== due) {
      p.history = [...(p.history || []), { ts: new Date().toISOString(), field: 'due', oldVal: initial.due, newVal: due }]
    }
    onSave(p)
  }

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-500">Name</label>
          <input className="w-full border rounded px-2 py-1" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-500">Priority (1 highest)</label>
          <input type="number" min={1} max={99} className="w-full border rounded px-2 py-1" value={priority}
            onChange={e => setPriority(parseInt(e.target.value || '1'))} />
        </div>
        <div>
          <label className="text-xs text-gray-500">Status</label>
          <select className="w-full border rounded px-2 py-1" value={status} onChange={e => setStatus(e.target.value)}>
            <option>In Progress</option><option>Stabilization</option><option>On Hold</option><option>Complete</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">Start</label>
          <input type="date" className="w-full border rounded px-2 py-1" value={start} onChange={e => setStart(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-500">Due</label>
          <input type="date" className="w-full border rounded px-2 py-1" value={due} onChange={e => setDue(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-500">Bar Color (override)</label>
          <input type="color" className="w-full h-9 border rounded" value={barColor || settings.defaultBarColor}
            onChange={e => setBarColor(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500">Assigned Members</label>
        <select multiple className="w-full border rounded px-2 py-2 h-28"
          value={assignees} onChange={e => {
            const options = Array.from(e.target.selectedOptions).map(o => o.value)
            setAssignees(options)
          }}>
          {allMembers.map(m => (
            <option key={m.id} value={m.id}>{m.name} ({m.teamName})</option>
          ))}
        </select>
      </div>

      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">Milestones</h4>
          <button className="px-3 py-1 bg-pira-accent text-white rounded" onClick={addMilestone}>+ Add Milestone</button>
        </div>
        {milestones.length === 0 && <p className="text-sm text-gray-500">No milestones yet.</p>}
        {milestones.map(m => (
          <div key={m.id} className="grid md:grid-cols-4 gap-2 items-end">
            <div>
              <label className="text-xs text-gray-500">Type</label>
              <select className="w-full border rounded px-2 py-1" value={m.typeId}
                onChange={e => updateMilestone(m.id, { typeId: e.target.value })}>
                {milestoneTypes.map(mt => <option key={mt.id} value={mt.id}>{mt.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Date</label>
              <input type="date" className="w-full border rounded px-2 py-1" value={m.date}
                onChange={e => updateMilestone(m.id, { date: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Label (optional)</label>
              <input className="w-full border rounded px-2 py-1" value={m.label || ''}
                onChange={e => updateMilestone(m.id, { label: e.target.value })} />
            </div>
            <div className="flex items-center gap-3">
              <PreviewMilestone milestone={m} types={milestoneTypes} />
              <button className="text-red-600 text-sm" onClick={() => removeMilestone(m.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3">
        <button className="px-4 py-2 rounded bg-gray-200">Cancel</button>
        <button className="px-4 py-2 rounded bg-pira-accent text-white" onClick={submit}>
          {initial ? 'Save Changes' : 'Create Project'}
        </button>
      </div>
    </div>
  )
}

function PreviewMilestone({ milestone, types }: { milestone: Milestone; types: MilestoneType[] }) {
  const mt = types.find(t => t.id === milestone.typeId)
  if (!mt) return null
  return <ShapeIcon shape={mt.shape} color={mt.color} size={mt.size} />
}

/* ========== Timeline rendering helpers ========== */

type Col = { start: Date; end: Date; label: string; width: number }

function buildColumns(scale: SettingsState['timeScale'], start: Date, end: Date): Col[] {
  const cols: Col[] = []
  const s = new Date(start); s.setHours(0,0,0,0)
  const e = new Date(end);   e.setHours(0,0,0,0)

  if (scale === 'days') {
    for (let d = new Date(s); d <= e; d = new Date(d.getTime() + ONE_DAY)) {
      const sd = new Date(d)
      const ed = new Date(d.getTime() + ONE_DAY)
      cols.push({ start: sd, end: ed, label: formatMMDD(sd), width: 30 })
    }
  } else if (scale === 'weeks') {
    const startOfWeek = new Date(s.getTime() - (s.getDay()) * ONE_DAY) // Sunday
    for (let d = startOfWeek; d <= e; d = new Date(d.getTime() + 7 * ONE_DAY)) {
      const sd = new Date(d)
      const ed = new Date(d.getTime() + 7 * ONE_DAY)
      cols.push({ start: sd, end: ed, label: formatMMDD(sd), width: 80 })
    }
  } else if (scale === 'months') {
    for (let d = new Date(s.getFullYear(), s.getMonth(), 1); d <= e; d.setMonth(d.getMonth() + 1)) {
      const sd = new Date(d)
      const ed = new Date(sd.getFullYear(), sd.getMonth() + 1, 1)
      cols.push({ start: sd, end: ed, label: sd.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), width: 120 })
    }
  } else if (scale === 'quarters') {
    const startQ = Math.floor(s.getMonth() / 3)
    for (let y = s.getFullYear(); y <= e.getFullYear(); y++) {
      for (let q = (y === s.getFullYear() ? startQ : 0); q < 4; q++) {
        const sd = new Date(y, q * 3, 1)
        if (sd > e) break
        const ed = new Date(y, q * 3 + 3, 1)
        cols.push({ start: sd, end: ed, label: `Q${q + 1} ${String(y).slice(2)}`, width: 160 })
      }
    }
  } else { // years
    for (let y = s.getFullYear(); y <= e.getFullYear(); y++) {
      const sd = new Date(y, 0, 1)
      const ed = new Date(y + 1, 0, 1)
      cols.push({ start: sd, end: ed, label: `${y}`, width: 200 })
    }
  }
  return cols
}

function projectPosition(p: Project, cols: Col[]) {
  const winStart = cols[0]?.start ?? fromISO(p.start)
  const winEnd = cols[cols.length - 1]?.end ?? new Date(fromISO(p.due).getTime() + ONE_DAY)

  const s = fromISO(p.start)
  const d = fromISO(p.due)
  const dur = (d.getTime() + ONE_DAY) - s.getTime() // inclusive end
  const total = winEnd.getTime() - winStart.getTime()

  const left = clamp(((s.getTime() - winStart.getTime()) / total) * 100, 0, 100)
  const width = clamp((dur / total) * 100, 0, 100 - left)
  return { left: `${left}%`, width: `${Math.max(width, 1)}%` }
}

/* ========== Unified View (Team -> Member) ========== */

function UnifiedView({
  teams, projects, milestoneTypes, settings, setSettings
}: {
  teams: Team[]
  projects: Project[]
  milestoneTypes: MilestoneType[]
  settings: SettingsState
  setSettings: (s: SettingsState) => void
}) {
  const [range, setRange] = React.useState<{ start: string; end: string }>(() => {
    const start = toISO(new Date(Date.now() - 30 * ONE_DAY))
    const end = toISO(new Date(Date.now() + 120 * ONE_DAY))
    return { start, end }
  })

  const cols = React.useMemo(() => buildColumns(settings.timeScale, fromISO(range.start), fromISO(range.end)),
    [settings.timeScale, range])

  const todayPct = React.useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0)
    const s = cols[0]?.start, e = cols[cols.length - 1]?.end
    if (!s || !e || today < s || today > e) return -1
    return ((today.getTime() - s.getTime()) / (e.getTime() - s.getTime())) * 100
  }, [cols])

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <div className="bg-white rounded-xl shadow p-3 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-gray-500">Time Scale</label>
          <select className="border rounded px-2 py-1" value={settings.timeScale}
            onChange={e => setSettings({ ...settings, timeScale: e.target.value as any })}>
            <option value="days">Days</option>
            <option value="weeks">Weeks</option>
            <option value="months">Months</option>
            <option value="quarters">Quarters</option>
            <option value="years">Years</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">Start</label>
          <input type="date" className="border rounded px-2 py-1" value={range.start}
            onChange={e => setRange(r => ({ ...r, start: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-gray-500">End</label>
          <input type="date" className="border rounded px-2 py-1" value={range.end}
            onChange={e => setRange(r => ({ ...r, end: e.target.value }))} />
        </div>
        <Toggle label="Executive Mode" value={settings.executiveMode}
          onChange={v => setSettings({ ...settings, executiveMode: v })} />
        <Toggle label="Weekend Shading" value={settings.weekendShading}
          onChange={v => setSettings({ ...settings, weekendShading: v })} />
        <Toggle label="Snap to Grid" value={settings.snapToGrid}
          onChange={v => setSettings({ ...settings, snapToGrid: v })} />
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {/* Header scale */}
        <div className="border-b bg-gray-50 p-3">
          <div className="flex">
            <div className="w-64 font-medium">Team / Members</div>
            <div className="flex-1 relative">
              <div className="flex border-l">
                {cols.map((c, i) => (
                  <div key={i} className="border-r border-gray-200 text-center text-xs font-medium py-2"
                    style={{ minWidth: `${c.width}px` }}>{c.label}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div>
          {teams.map(team => {
            const teamMembers = team.members
            return (
              <div key={team.id} className="border-b">
                <div className="bg-indigo-50 px-4 py-2 font-semibold text-indigo-700">{team.name}</div>

                {teamMembers.length === 0 && (
                  <div className="flex">
                    <div className="w-64 p-3 text-gray-500">No members</div>
                    <div className="flex-1 p-3 border-l">No projects</div>
                  </div>
                )}

                {teamMembers.map((member, idx) => {
                  const memberIdPrefix = `${team.id}:${member}`
                  const memberProjects = projects.filter(p => p.assigneeIds.some(id => id === memberIdPrefix))
                  const nameText = settings.executiveMode ? `Resource ${idx + 1}` : member

                  return (
                    <div key={member} className="flex border-t">
                      <div className="w-64 p-3">
                        <div className="font-medium">{nameText}</div>
                        <div className="text-xs text-gray-500">{memberProjects.length} project{memberProjects.length === 1 ? '' : 's'}</div>
                      </div>
                      <div className="flex-1 relative h-12 border-l overflow-hidden">
                        {/* grid & weekend shading */}
                        {cols.map((c, i) => (
                          <div key={i} className={`absolute top-0 bottom-0 border-r border-gray-200`}
                            style={{ left: `${(i / cols.length) * 100}%`, width: `${100 / cols.length}%`,
                              background: settings.weekendShading && (c.start.getDay() === 0 || c.start.getDay() === 6) && settings.timeScale==='days'
                                ? 'rgba(0,0,0,0.03)' : undefined }} />
                        ))}
                        {/* Today line */}
                        {settings.todayLine && todayPct >= 0 && (
                          <div className="absolute top-0 bottom-0 w-0.5 bg-black/70" style={{ left: `${todayPct}%` }} />
                        )}

                        {/* Project bars for this member */}
                        {memberProjects.map(p => {
                          const pos = projectPosition(p, cols)
                          return (
                            <Bar key={p.id} project={p} pos={pos} cols={cols} milestoneTypes={milestoneTypes} settings={settings} />
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ========== Draggable/Resizable Bar ========== */

function Bar({
  project, pos, cols, milestoneTypes, settings
}: {
  project: Project
  pos: { left: string; width: string }
  cols: Col[]
  milestoneTypes: MilestoneType[]
  settings: SettingsState
}) {
  const [drag, setDrag] = React.useState<null | { startX: number; origStart: Date; origDue: Date; mode: 'move' | 'left' | 'right' }>(null)

  const barColor = project.barColor || '#5B6BFF'

  const onMouseDown = (mode: 'move' | 'left' | 'right') => (e: React.MouseEvent) => {
    e.preventDefault()
    setDrag({ startX: e.clientX, origStart: fromISO(project.start), origDue: fromISO(project.due), mode })
  }

  React.useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!drag) return
      const container = (e.target as HTMLElement).closest('.timeline-row') as HTMLElement | null
      const row = container ?? document.body
      const rect = (row as HTMLElement).getBoundingClientRect ? (row as HTMLElement).getBoundingClientRect() : { width: window.innerWidth, left: 0 }
      const totalMs = cols[cols.length - 1].end.getTime() - cols[0].start.getTime()
      const pxPerMs = rect.width / totalMs
      const deltaMs = (e.clientX - drag.startX) / pxPerMs

      let newStart = new Date(drag.origStart.getTime())
      let newDue = new Date(drag.origDue.getTime())

      if (drag.mode === 'move') {
        newStart = new Date(drag.origStart.getTime() + deltaMs)
        newDue = new Date(drag.origDue.getTime() + deltaMs)
      } else if (drag.mode === 'left') {
        newStart = new Date(drag.origStart.getTime() + deltaMs)
      } else {
        newDue = new Date(drag.origDue.getTime() + deltaMs)
      }

      if (settings.snapToGrid) {
        const snap = (d: Date) => new Date(toISO(d))
        newStart = snap(newStart)
        newDue = snap(newDue)
      }

      // write back to storage live (auto-save feel)
      const raw = loadData()
      const idx = raw.projects.findIndex(pp => pp.id === project.id)
      if (idx >= 0) {
        raw.projects[idx].start = toISO(newStart)
        raw.projects[idx].due = toISO(newDue)
        saveData(raw)
      }
    }
    function onUp() { setDrag(null) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [drag, cols, project.id, settings.snapToGrid])

  // resolve milestone visuals from legend
  const mType = (name: string) => milestoneTypes.find(mt => mt.name.toLowerCase() === name.toLowerCase())
  const startType = mType('Start Date') || milestoneTypes[0]
  const dueType = mType('Due Date') || milestoneTypes[0]

  const inRow = "absolute top-1/2 -translate-y-1/2 h-4 rounded px-2 flex items-center justify-between text-white timeline-row"

  return (
    <div className={inRow} style={{ left: pos.left, width: pos.width, backgroundColor: barColor, minWidth: '20px' }}>
      {/* left handle */}
      <div className="w-2 cursor-ew-resize" onMouseDown={onMouseDown('left')} />
      <div className="flex items-center gap-1 text-[10px] whitespace-nowrap">
        <span className="font-semibold">{project.name}</span>
        <span>• P{project.priority}</span>
      </div>
      {/* start / due markers */}
      <div className="absolute left-0 -translate-x-1/2">
        <ShapeIcon shape={startType.shape} color={startType.color} size={startType.size} />
      </div>
      <div className="absolute right-0 translate-x-1/2">
        <ShapeIcon shape={dueType.shape} color={dueType.color} size={dueType.size} />
      </div>
      {/* right handle */}
      <div className="w-2 cursor-ew-resize" onMouseDown={onMouseDown('right')} />
      {/* move area */}
      <div className="absolute inset-0 cursor-grab" onMouseDown={onMouseDown('move')} />
    </div>
  )
}

/* ========== Teams Tab (simple manager) ========== */

function TeamsManager({ teams, setTeams }: { teams: Team[]; setTeams: (f: (prev: Team[]) => Team[]) => void }) {
  const [newTeam, setNewTeam] = React.useState('')
  const addTeam = () => { if (!newTeam.trim()) return; setTeams(prev => [...prev, { id: uid(), name: newTeam.trim(), members: [] }]); setNewTeam('') }
  const addMember = (teamId: string, name: string) => {
    if (!name.trim()) return
    setTeams(prev => prev.map(t => t.id === teamId ? { ...t, members: [...t.members, name.trim()] } : t))
  }
  const removeMember = (teamId: string, name: string) =>
    setTeams(prev => prev.map(t => t.id === teamId ? { ...t, members: t.members.filter(m => m !== name) } : t))
  const renameTeam = (teamId: string, name: string) =>
    setTeams(prev => prev.map(t => t.id === teamId ? { ...t, name } : t))
  const deleteTeam = (teamId: string) =>
    setTeams(prev => prev.filter(t => t.id !== teamId))

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <div className="bg-white rounded-xl shadow p-3">
        <div className="flex gap-2">
          <input className="border rounded px-2 py-1 flex-1" placeholder="Team name" value={newTeam} onChange={e => setNewTeam(e.target.value)} />
          <button className="px-3 py-1 bg-pira-accent text-white rounded" onClick={addTeam}>Add Team</button>
        </div>
      </div>

      {teams.map(team => (
        <div key={team.id} className="bg-white rounded-xl shadow p-4 space-y-3">
          <div className="flex items-center gap-3">
            <input className="text-xl font-semibold flex-1 border rounded px-2 py-1" value={team.name}
              onChange={e => renameTeam(team.id, e.target.value)} />
            <button className="text-red-600" onClick={() => deleteTeam(team.id)}>Delete</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {team.members.map((m, idx) => (
              <span key={m} className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                {m}
                <button className="ml-2 text-blue-800/70" onClick={() => removeMember(team.id, m)}>x</button>
              </span>
            ))}
          </div>
          <AddMemberRow onAdd={(name) => addMember(team.id, name)} />
        </div>
      ))}
    </div>
  )
}

function AddMemberRow({ onAdd }: { onAdd: (name: string) => void }) {
  const [name, setName] = React.useState('')
  return (
    <div className="flex gap-2">
      <input className="border rounded px-2 py-1 flex-1" placeholder="New member name" value={name} onChange={e => setName(e.target.value)} />
      <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={() => { onAdd(name); setName('') }}>Add Member</button>
    </div>
  )
}

/* ========== Projects Tab (list + modal-lite inline form) ========== */

function ProjectsTab({ teams, projects, setProjects, milestoneTypes, settings }:
  { teams: Team[]; projects: Project[]; setProjects: (f: (prev: Project[]) => Project[]) => void; milestoneTypes: MilestoneType[]; settings: SettingsState }) {
  const [editing, setEditing] = React.useState<Project | null>(null)

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Project Management</h2>
        <button className="px-4 py-2 bg-pira-accent text-white rounded-xl" onClick={() => setEditing({} as any)}>+ Add Project</button>
      </div>

      {editing && (
        <div className="bg-white rounded-xl shadow p-4">
          <ProjectForm
            teams={teams} milestoneTypes={milestoneTypes} settings={settings} initial={editing.id ? editing : undefined}
            onSave={p => { setProjects(prev => {
                const exists = prev.some(x => x.id === p.id)
                return exists ? prev.map(x => x.id === p.id ? p : x) : [...prev, p]
              }); setEditing(null) }}
          />
        </div>
      )}

      <div className="bg-white rounded-xl shadow">
        <div className="p-4 border-b font-semibold">All Projects</div>
        <div className="divide-y">
          {projects.length === 0 && <div className="p-6 text-center text-gray-500">No projects yet. Click “Add Project”.</div>}
          {projects.map(p => (
            <div key={p.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold">{p.name} <span className="text-sm text-gray-500">Priority {p.priority}</span></div>
                <div className="text-sm text-gray-600">Start: {p.start} • Due: {p.due}</div>
              </div>
              <div className="flex gap-3">
                <button className="text-blue-700" onClick={() => setEditing(p)}>Edit</button>
                <button className="text-red-600" onClick={() => setProjects(prev => prev.filter(x => x.id !== p.id))}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <LegendSection />
      </div>
    </div>
  )

  function LegendSection() {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Legend (Global Settings)</h3>
        <p className="text-sm text-gray-600">Manage milestone types and default project bar color in <strong>Unified View</strong> tab’s Legend section.</p>
      </div>
    )
  }
}

/* ========== Reports (MVP) ========== */

function ReportsTab({ teams, projects }: { teams: Team[]; projects: Project[] }) {
  const today = toISO(new Date())

  const overdue = projects.filter(p => p.due < today && p.status !== 'Complete')

  // Conflicts: same member on overlapping active projects
  type Conflict = { memberId: string; memberName: string; teamName: string; a: string; b: string; overlap: string }
  const conflicts: Conflict[] = []

  const memberName = (id: string) => {
    const [teamId, name] = id.split(':')
    const team = teams.find(t => t.id === teamId)
    return { name, teamName: team?.name || '' }
  }

  // Build per member project list
  const byMember: Record<string, Project[]> = {}
  projects.forEach(p => {
    p.assigneeIds.forEach(id => {
      byMember[id] = byMember[id] || []
      byMember[id].push(p)
    })
  })

  Object.entries(byMember).forEach(([id, list]) => {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const A = list[i], B = list[j]
        const aS = fromISO(A.start), aE = fromISO(A.due)
        const bS = fromISO(B.start), bE = fromISO(B.due)
        if (aS <= bE && bS <= aE) {
          const overStart = new Date(Math.max(aS.getTime(), bS.getTime()))
          const overEnd = new Date(Math.min(aE.getTime(), bE.getTime()))
          const { name, teamName } = memberName(id)
          conflicts.push({ memberId: id, memberName: name, teamName, a: A.name, b: B.name, overlap: `${toISO(overStart)} → ${toISO(overEnd)}` })
        }
      }
    }
  })

  const statusCounts = projects.reduce<Record<string, number>>((acc, p) => (acc[p.status] = (acc[p.status] || 0) + 1, acc), {})

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="text-lg font-semibold mb-2">Overdue Projects</h3>
        {overdue.length === 0 ? <p className="text-gray-500 text-sm">None 🎉</p> : (
          <ul className="list-disc pl-6">{overdue.map(p => <li key={p.id}>{p.name} (Due {p.due})</li>)}</ul>
        )}
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="text-lg font-semibold mb-2">Status Dashboard</h3>
        <div className="flex gap-4">
          {Object.entries(statusCounts).map(([s, n]) => (
            <div key={s} className="px-4 py-3 bg-gray-50 rounded border">
              <div className="text-sm text-gray-600">{s}</div>
              <div className="text-2xl font-bold">{n}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="text-lg font-semibold mb-2">Resource Conflicts (Overlapping)</h3>
        {conflicts.length === 0 ? <p className="text-gray-500 text-sm">None</p> : (
          <table className="w-full text-sm">
            <thead><tr className="text-left"><th>Member</th><th>Team</th><th>Project A</th><th>Project B</th><th>Overlap</th></tr></thead>
            <tbody>{conflicts.map((c, i) => <tr key={i}><td>{c.memberName}</td><td>{c.teamName}</td><td>{c.a}</td><td>{c.b}</td><td>{c.overlap}</td></tr>)}</tbody>
          </table>
        )}
      </div>
    </div>
  )
}

/* ========== Root App ========== */

export default function ProjectManagementApp() {
  const [data, setData] = React.useState<DataShape>(loadData)
  const [active, setActive] = React.useState<Tab>('unified')

  // autosave
  React.useEffect(() => { saveData(data) }, [data])

  const setTeams = (f: (prev: Team[]) => Team[]) => setData(prev => ({ ...prev, teams: f(prev.teams) }))
  const setProjects = (f: (prev: Project[]) => Project[]) => setData(prev => ({ ...prev, projects: f(prev.projects) }))
  const setMilestoneTypes = (f: (prev: MilestoneType[]) => MilestoneType[]) => setData(prev => ({ ...prev, milestoneTypes: f(prev.milestoneTypes) }))
  const setSettings = (s: SettingsState) => setData(prev => ({ ...prev, settings: s }))

  // export/import JSON
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `pira-backup-${Date.now()}.json`; a.click()
    URL.revokeObjectURL(url)
  }
  const importJSON = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try { setData(JSON.parse(String(reader.result))); } catch { alert('Invalid JSON') }
    }
    reader.readAsText(file)
  }

  return (
    <div className="min-h-screen font-sans">
      <Header active={active} setActive={setActive} />

      <div className="max-w-6xl mx-auto px-4 pt-4 pb-20 space-y-4">
        <div className="flex gap-2 no-print">
          <button className="px-3 py-1 rounded bg-gray-200" onClick={exportJSON}>Export JSON</button>
          <label className="px-3 py-1 rounded bg-gray-200 cursor-pointer">
            Import JSON
            <input type="file" accept="application/json" className="hidden" onChange={e => {
              const f = e.target.files?.[0]; if (f) importJSON(f)
            }} />
          </label>
          <button className="px-3 py-1 rounded bg-gray-200" onClick={() => window.print()}>Print / Save PDF</button>
        </div>

        {active === 'unified' && (
          <>
            <LegendManager
              milestoneTypes={data.milestoneTypes}
              setMilestoneTypes={setMilestoneTypes}
              settings={data.settings}
              setSettings={setSettings}
            />
            <UnifiedView
              teams={data.teams}
              projects={data.projects}
              milestoneTypes={data.milestoneTypes}
              settings={data.settings}
              setSettings={setSettings}
            />
          </>
        )}

        {active === 'teams' && (
          <TeamsManager teams={data.teams} setTeams={setTeams} />
        )}

        {active === 'projects' && (
          <ProjectsTab
            teams={data.teams}
            projects={data.projects}
            setProjects={setProjects}
            milestoneTypes={data.milestoneTypes}
            settings={data.settings}
          />
        )}

        {active === 'reports' && (
          <ReportsTab teams={data.teams} projects={data.projects} />
        )}
      </div>
    </div>
  )
}
