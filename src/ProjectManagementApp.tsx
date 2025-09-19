import React from "react";

/** ---------- Types ---------- */
type Shape = "diamond" | "circle" | "triangle" | "square";
type Size = "small" | "medium" | "large";
type Status = "In Progress" | "Stabilization" | "On Hold" | "Complete";

type LegendType = {
  id: string;
  name: string;          // e.g., Start Date, Due Date, Stabilization, Complete
  shape: Shape;
  color: string;         // hex
  size: Size;
};

type Milestone = {
  id: string;
  typeId: string;        // links to LegendType
  date: string;          // ISO date
  label?: string;
};

type Project = {
  id: string;
  name: string;
  description?: string;
  priority: number;      // 1 highest
  status: Status;
  startDate: string;     // ISO
  dueDate: string;       // ISO
  milestones: Milestone[];
  assignedMembers: string[]; // member ids "teamId:memberName"
  projectColor?: string; // override bar color
  history?: any[];
};

type Team = {
  id: string;
  name: string;
  members: string[]; // names only, ids are `${team.id}:${name}`
};

type Settings = {
  defaultBarColor: string;
  showGhostDue: boolean;
  executiveMode: boolean; // global
  weekendShading: boolean;
  snapToGrid: boolean;
  startOfWeekSunday: boolean;
  timeScale: "days" | "weeks" | "months" | "quarters" | "years";
};

/** ---------- Helpers ---------- */
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const ONE_DAY = 24 * 60 * 60 * 1000;

const fmt = (d: Date) =>
  new Intl.DateTimeFormat("en-US", { month: "numeric", day: "numeric" }).format(
    d
  );

const toISO = (d: Date) => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c.toISOString().slice(0, 10);
};

const addDays = (d: Date, n: number) => new Date(d.getTime() + n * ONE_DAY);

/** ---------- Persistence ---------- */
const STORAGE_KEY = "pira-data-v1";

type StoreShape = {
  teams: Team[];
  projects: Project[];
  legend: LegendType[];
  settings: Settings;
};

const defaultLegend: LegendType[] = [
  { id: "start", name: "Start Date", shape: "diamond", color: "#10B981", size: "small" },
  { id: "due", name: "Due Date", shape: "diamond", color: "#EF4444", size: "small" },
  { id: "stabilization", name: "Stabilization", shape: "diamond", color: "#3B82F6", size: "medium" },
  { id: "complete", name: "Complete", shape: "diamond", color: "#10B981", size: "medium" }
];

const defaultSettings: Settings = {
  defaultBarColor: "#4B6BFB", // blue-ish
  showGhostDue: false,
  executiveMode: false,
  weekendShading: true,
  snapToGrid: true,
  startOfWeekSunday: true,
  timeScale: "weeks",
};

function loadStore(): StoreShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("empty");
    return JSON.parse(raw);
  } catch {
    return {
      teams: [
        { id: "appdev", name: "Development", members: ["Johnathan", "yuriy", "jorge"] },
        { id: "bi", name: "BI", members: ["mike", "sumitra"] },
        { id: "qa", name: "QA", members: [] },
        { id: "devops", name: "DevOps", members: [] }
      ],
      projects: [],
      legend: defaultLegend,
      settings: defaultSettings,
    };
  }
}
function saveStore(s: StoreShape) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

/** ---------- Shapes ---------- */
const ShapeIcon: React.FC<{shape: Shape, color: string, size: number}> = ({shape, color, size}) => {
  const half = size/2;
  if (shape === "circle") return <span style={{display:"inline-block",width:size,height:size,background:color,borderRadius:"50%"}} />;
  if (shape === "square") return <span style={{display:"inline-block",width:size,height:size,background:color}} />;
  if (shape === "triangle") return (
    <span style={{
      display:"inline-block",
      width:0, height:0,
      borderLeft: `${half}px solid transparent`,
      borderRight: `${half}px solid transparent`,
      borderBottom: `${size}px solid ${color}`
    }} />
  );
  // diamond
  return <span style={{
    display:"inline-block",
    width:size, height:size, background:color,
    transform:"rotate(45deg)"
  }} />;
};

const sizePx = (s: Size) => s === "large" ? 14 : s === "medium" ? 10 : 8;

/** ---------- App ---------- */
export default function ProjectManagementApp() {
  const [store, setStore] = React.useState<StoreShape>(() => loadStore());
  const [activeTab, setActiveTab] = React.useState<"unified"|"teams"|"projects"|"kanban"|"calendar"|"list"|"reports">("unified");

  React.useEffect(() => { saveStore(store); }, [store]);

  // --- convenience getters ---
  const { teams, projects, legend, settings } = store;

  /** --------------- Header --------------- */
  const Header = (
    <header className="no-print" style={{background:"#2d2671", color:"white"}}>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold tracking-wide text-white">PIRA</h1>
        <div className="text-white/90 -mt-1">Project IT Resource Availability</div>

        <nav className="mt-6 flex flex-wrap gap-2">
          {[
            ["unified","Unified View"],
            ...teams.map(t => [`team:${t.id}`, t.name] as const),
            ["teams","Teams"],
            ["projects","+ Projects"],
            ["reports","Reports"]
          ].map(([key,label]) => {
            const isTeam = (key as string).startsWith("team:");
            const isActive = activeTab === key || (isTeam && activeTab === key);
            return (
              <button
                key={key}
                onClick={() => setActiveTab((key as any))}
                className={`pira-tab ${isActive ? 'pira-tab-active' : 'text-white/90'}`}
                style={{border:"1px solid rgba(255,255,255,0.25)"}}
              >
                {label}
              </button>
            )
          })}

          {/* view toggles */}
          <div className="ml-auto flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox"
                checked={settings.executiveMode}
                onChange={e => setStore(s => ({...s, settings:{...s.settings, executiveMode: e.target.checked}}))}
              />
              Executive Mode
            </label>
            <button className="pira-btn" onClick={()=>window.print()}>Print / Save PDF</button>
          </div>
        </nav>
      </div>
    </header>
  );

  /** --------------- Legend Manager --------------- */
  const [newType, setNewType] = React.useState<LegendType>({id:"", name:"", shape:"diamond", color:"#10B981", size:"small"});
  const updateLegend = (id: string, patch: Partial<LegendType>) =>
    setStore(s => ({...s, legend: s.legend.map(t => t.id===id? {...t, ...patch}: t)}));
  const addLegend = () => {
    if (!newType.name.trim()) return;
    setStore(s => ({...s, legend: [...s.legend, {...newType, id: uid()}]}));
    setNewType({id:"", name:"", shape:"diamond", color:"#10B981", size:"small"});
  };
  const deleteLegend = (id:string) => setStore(s => ({...s, legend: s.legend.filter(t=>t.id!==id)}));

  const LegendManager = (
    <section className="p-4 pira-card mt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Legend: Milestone Types</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">Default Bar Color</span>
            <input type="color" value={settings.defaultBarColor}
                   onChange={e => setStore(s => ({...s, settings:{...s.settings, defaultBarColor: e.target.value}}))}/>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={settings.weekendShading}
                   onChange={e => setStore(s => ({...s, settings:{...s.settings, weekendShading: e.target.checked}}))}/>
            Weekend shading
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={settings.snapToGrid}
                   onChange={e => setStore(s => ({...s, settings:{...s.settings, snapToGrid: e.target.checked}}))}/>
            Snap to grid
          </label>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {legend.map(t => (
          <div key={t.id} className="flex items-center gap-3">
            <input className="pira-input w-56" value={t.name} onChange={e=>updateLegend(t.id,{name:e.target.value})}/>
            <select className="pira-input" value={t.shape} onChange={e=>updateLegend(t.id,{shape:e.target.value as Shape})}>
              <option>diamond</option><option>circle</option><option>triangle</option><option>square</option>
            </select>
            <select className="pira-input" value={t.size} onChange={e=>updateLegend(t.id,{size:e.target.value as Size})}>
              <option>small</option><option>medium</option><option>large</option>
            </select>
            <input type="color" value={t.color} onChange={e=>updateLegend(t.id,{color:e.target.value})}/>
            <ShapeIcon shape={t.shape} color={t.color} size={sizePx(t.size)} />
            <button className="px-3 py-2 rounded-xl border text-red-600" onClick={()=>deleteLegend(t.id)}>Delete</button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <input className="pira-input w-56" placeholder="New type name" value={newType.name} onChange={e=>setNewType({...newType, name:e.target.value})}/>
        <select className="pira-input" value={newType.shape} onChange={e=>setNewType({...newType, shape:e.target.value as Shape})}>
          <option>diamond</option><option>circle</option><option>triangle</option><option>square</option>
        </select>
        <select className="pira-input" value={newType.size} onChange={e=>setNewType({...newType, size:e.target.value as Size})}>
          <option>small</option><option>medium</option><option>large</option>
        </select>
        <input type="color" value={newType.color} onChange={e=>setNewType({...newType, color:e.target.value})}/>
        <button className="pira-btn" onClick={addLegend}>+ Add Type</button>
      </div>
    </section>
  );

  /** --------------- Members & IDs --------------- */
  const allMembers = React.useMemo(() =>
    teams.flatMap(t => t.members.map(m => ({ id:`${t.id}:${m}`, name:m, teamId:t.id, teamName:t.name }))),
    [teams]
  );

  /** --------------- Projects CRUD --------------- */
  const [editing, setEditing] = React.useState<Project | null>(null);

  const saveProject = (p: Project) => {
    setStore(s => {
      const exists = s.projects.some(x=>x.id===p.id);
      const next = exists ? s.projects.map(x => x.id===p.id ? p : x) : [...s.projects, p];
      return {...s, projects: next};
    });
    setEditing(null);
  };

  /** --------------- Timeline math --------------- */
  type Col = { date: Date; endDate: Date; label: string; width: number };

  const makeColumns = (rangeStart: string, rangeEnd: string, scale: Settings["timeScale"]): Col[] => {
    const start = new Date(rangeStart), end = new Date(rangeEnd);
    const cols: Col[] = [];
    if (scale === "days") {
      for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
        const sd = new Date(d), ed = addDays(sd, 1);
        cols.push({date: sd, endDate: ed, label: fmt(sd), width: 28});
      }
    } else if (scale === "weeks") {
      const s = new Date(start); s.setDate(s.getDate() - s.getDay()); // Sun
      for (let d = new Date(s); d <= end; d = addDays(d, 7)) {
        const sd = new Date(d), ed = addDays(sd, 7);
        cols.push({date: sd, endDate: ed, label: fmt(sd), width: 80});
      }
    } else if (scale === "months") {
      const s = new Date(start.getFullYear(), start.getMonth(), 1);
      for (let d = new Date(s); d <= end; d = new Date(d.getFullYear(), d.getMonth()+1, 1)) {
        const sd = new Date(d), ed = new Date(d.getFullYear(), d.getMonth()+1, 1);
        cols.push({date: sd, endDate: ed, label: sd.toLocaleDateString('en-US',{month:'short', year:'2-digit'}), width: 120});
      }
    } else if (scale === "quarters") {
      const s = new Date(start.getFullYear(), Math.floor(start.getMonth()/3)*3, 1);
      for (let d = new Date(s); d <= end; d = new Date(d.getFullYear(), d.getMonth()+3, 1)) {
        const sd = new Date(d), ed = new Date(d.getFullYear(), d.getMonth()+3, 1);
        cols.push({date: sd, endDate: ed, label: `Q${Math.floor(sd.getMonth()/3)+1} '${String(sd.getFullYear()).slice(2)}`, width: 160});
      }
    } else { // years
      for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
        const sd = new Date(y,0,1), ed = new Date(y+1,0,1);
        cols.push({date: sd, endDate: ed, label: String(y), width: 180});
      }
    }
    return cols;
  };

  const positionFor = (proj: Project, cols: Col[]) => {
    const start = new Date(proj.startDate);
    const due = new Date(new Date(proj.dueDate).getTime() + ONE_DAY); // inclusive end
    const winStart = cols[0].date;
    const winEnd = cols[cols.length-1].endDate;
    const total = winEnd.getTime() - winStart.getTime();
    const left = Math.max(0, Math.min(100, ((start.getTime() - winStart.getTime()) / total) * 100));
    const width = Math.max(2, Math.min(100 - left, ((due.getTime() - start.getTime()) / total) * 100));
    return {left:`${left}%`, width:`${width}%`};
  };

  /** --------------- Filters --------------- */
  const [filterTeam, setFilterTeam] = React.useState<string>("all");
  const [filterStatus, setFilterStatus] = React.useState<Status | "all">("all");
  const [filterText, setFilterText] = React.useState("");

  const filteredProjects = projects.filter(p => {
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (filterTeam !== "all") {
      if (!p.assignedMembers.some(id => id.startsWith(`${filterTeam}:`))) return false;
    }
    if (filterText.trim()) {
      const t = filterText.toLowerCase();
      if (!(`${p.name} ${p.description||""}`.toLowerCase().includes(t))) return false;
    }
    return true;
  });

  /** --------------- Unified View --------------- */
  const todayISO = toISO(new Date());
  const [rangeStart, setRangeStart] = React.useState<string>(toISO(addDays(new Date(), -60)));
  const [rangeEnd, setRangeEnd] = React.useState<string>(toISO(addDays(new Date(), 120)));
  const cols = makeColumns(rangeStart, rangeEnd, settings.timeScale);

  const Unified = (
    <section className="max-w-6xl mx-auto px-4 my-6">
      <div className="pira-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="font-semibold text-lg">Unified Project View</div>
          <div className="flex items-center gap-2">
            <label className="text-sm">Scale</label>
            <select className="pira-input" value={settings.timeScale}
              onChange={e=>setStore(s=>({...s, settings:{...s.settings, timeScale: e.target.value as Settings["timeScale"]}}))}
            >
              <option>days</option><option>weeks</option><option>months</option><option>quarters</option><option>years</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm">Start</label>
            <input className="pira-input" type="date" value={rangeStart} onChange={e=>setRangeStart(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm">End</label>
            <input className="pira-input" type="date" value={rangeEnd} onChange={e=>setRangeEnd(e.target.value)} />
          </div>
          <div className="flex-1"></div>
          <div className="flex items-center gap-2">
            <select className="pira-input" value={filterTeam} onChange={e=>setFilterTeam(e.target.value)}>
              <option value="all">All Teams</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select className="pira-input" value={filterStatus} onChange={e=>setFilterStatus(e.target.value as any)}>
              <option value="all">All Status</option>
              <option>In Progress</option><option>Stabilization</option><option>On Hold</option><option>Complete</option>
            </select>
            <input className="pira-input" placeholder="Search name/desc" value={filterText} onChange={e=>setFilterText(e.target.value)} />
          </div>
        </div>

        {/* header scale */}
        <div className="mt-4">
          <div className="flex">
            <div className="w-56 px-3 py-2 text-sm font-semibold">Team / Members</div>
            <div className="flex-1">
              <div className="flex">
                {cols.map((c,i)=>(
                  <div key={i} className="text-xs text-gray-600 border-r border-gray-200 text-center py-2" style={{minWidth:c.width}}>{c.label}</div>
                ))}
              </div>
            </div>
          </div>

          {/* rows grouped by team → member */}
          <div className="border-t">
            {teams.filter(t => filterTeam==="all" || t.id===filterTeam).map(team => (
              <div key={team.id} className="border-b">
                <div className="bg-pira-purple100 px-3 py-2 font-semibold text-pira-purple">{team.name}</div>
                {team.members.length === 0 && (
                  <div className="flex">
                    <div className="w-56 px-3 py-3 text-gray-500 italic">No members</div>
                    <div className="flex-1 border-l px-3 py-3 text-gray-500">No current projects</div>
                  </div>
                )}
                {team.members.map((member, idx) => {
                  const memberId = `${team.id}:${member}`;
                  const mProjects = filteredProjects.filter(p => p.assignedMembers.includes(memberId));
                  const displayName = settings.executiveMode ? `Resource ${idx+1}` : member;
                  return (
                    <div key={memberId} className="flex items-stretch">
                      <div className="w-56 px-3 py-3">
                        <div className="font-medium">{displayName}</div>
                        <div className="text-xs text-gray-500">{mProjects.length} project{mProjects.length!==1?"s":""}</div>
                      </div>
                      <div className="flex-1 relative h-14 border-l overflow-hidden" style={{background:"white"}}>
                        {/* grid + weekend shading */}
                        {cols.map((c,i)=>(
                          <div key={i} className="absolute top-0 bottom-0 border-r border-gray-200"
                               style={{left:`${(i/cols.length)*100}%`, width:`${(1/cols.length)*100}%`,
                               background: (settings.weekendShading && c.date.getDay()===0) ? "rgba(76,70,163,0.06)" : "transparent"}} />
                        ))}
                        {/* Today line */}
                        {(() => {
                          const t = new Date(todayISO);
                          const winStart = cols[0].date, winEnd = cols[cols.length-1].endDate;
                          if (t>=winStart && t<=winEnd) {
                            const pct = ((t.getTime() - winStart.getTime())/(winEnd.getTime()-winStart.getTime()))*100;
                            return <div className="absolute top-0 bottom-0 w-0.5 bg-black/70" style={{left:`${pct}%`}} />
                          }
                          return null;
                        })()}
                        {/* bars */}
                        {mProjects.map(p => {
                          const pos = positionFor(p, cols);
                          const barColor = p.projectColor || settings.defaultBarColor;
                          return (
                            <div key={p.id}
                                 className="absolute top-1/2 -translate-y-1/2 h-5 rounded-xl px-2 text-white text-xs whitespace-nowrap flex items-center gap-2"
                                 style={{left:pos.left, width:pos.width, background:barColor, minWidth: "24px"}}
                                 title={`${p.name} • Priority ${p.priority}`}
                            >
                              <span>{p.name} • {p.priority}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {LegendManager}
    </section>
  );

  /** --------------- Teams management --------------- */
  const TeamsTab = (
    <section className="max-w-6xl mx-auto px-4 my-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Team Management</h2>
        <button className="pira-btn" onClick={() => {
          const name = prompt("Team name?");
          if (!name) return;
          setStore(s => ({...s, teams:[...s.teams, {id: uid(), name, members:[]}]}));
        }}>+ Add Team</button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {teams.map((t, ti) => (
          <div key={t.id} className="pira-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-semibold">{t.name}</div>
              <div className="flex gap-2">
                <button className="px-3 py-1 rounded-xl border" onClick={()=>{
                  const name = prompt("Rename team", t.name) || t.name;
                  setStore(s => ({...s, teams: s.teams.map(x=>x.id===t.id? {...x, name}: x)}));
                }}>Rename</button>
                <button className="px-3 py-1 rounded-xl border text-red-600" onClick={()=>{
                  if (!confirm("Delete team?")) return;
                  setStore(s => ({...s, teams: s.teams.filter(x=>x.id!==t.id)}));
                }}>Delete</button>
              </div>
            </div>

            <div className="space-y-2">
              {t.members.length===0 && <div className="text-gray-500 italic">No members</div>}
              {t.members.map((m, mi) => (
                <div key={mi} className="flex items-center justify-between">
                  <div>{settings.executiveMode ? `Resource ${mi+1}` : m}</div>
                  <div className="flex gap-2">
                    <button className="px-2 py-1 rounded-xl border" onClick={()=>{
                      const name = prompt("Rename member", m) || m;
                      setStore(s => ({...s, teams: s.teams.map(x=>x.id===t.id? {...x, members: x.members.map(n=>n===m?name:n)}:x)}));
                    }}>Rename</button>
                    <button className="px-2 py-1 rounded-xl border text-red-600" onClick={()=>{
                      setStore(s => ({...s, teams: s.teams.map(x=>x.id===t.id? {...x, members: x.members.filter(n=>n!==m)}:x)}));
                    }}>Remove</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3">
              <button className="pira-btn" onClick={()=>{
                const name = prompt("New member name?");
                if (!name) return;
                setStore(s => ({...s, teams: s.teams.map(x=>x.id===t.id? {...x, members:[...x.members, name]}:x)}));
              }}>+ Add Member</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  /** --------------- Projects Management --------------- */
  const emptyProject = (): Project => ({
    id: uid(),
    name: "",
    description: "",
    priority: 5,
    status: "In Progress",
    startDate: toISO(new Date()),
    dueDate: toISO(addDays(new Date(), 30)),
    milestones: [],
    assignedMembers: [],
  });

  const ProjectsTab = (
    <section className="max-w-6xl mx-auto px-4 my-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Project Management</h2>
        <button className="pira-btn" onClick={()=>setEditing(emptyProject())}>+ Add Project</button>
      </div>

      {/* list */}
      <div className="pira-card">
        <div className="px-6 py-10 text-center text-gray-500" hidden={projects.length>0}>
          No projects created yet. <button className="text-blue-600 underline" onClick={()=>setEditing(emptyProject())}>Create your first project</button>
        </div>
        {projects.length>0 && (
          <div className="divide-y">
            {projects.map(p => (
              <div key={p.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">{p.name} <span className="pira-chip ml-2">Priority: {p.priority}</span></div>
                  <div className="text-sm text-gray-600">Start: {p.startDate} • Due: {p.dueDate}</div>
                  <div className="text-sm text-gray-600">Assigned: {p.assignedMembers.map(id=>{
                    const m = allMembers.find(x=>x.id===id);
                    return m ? `${settings.executiveMode? "Resource": m.name} (${m?.teamName})` : id;
                  }).join(", ") || "—"}</div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 rounded-xl border" onClick={()=>setEditing(p)}>Edit</button>
                  <button className="px-3 py-1 rounded-xl border text-red-600" onClick={()=>{
                    if(!confirm("Delete project?")) return;
                    setStore(s=>({...s, projects:s.projects.filter(x=>x.id!==p.id)}));
                  }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* editor modal-ish */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow max-w-3xl w-full p-6">
            <h3 className="text-xl font-semibold mb-4">{editing.name || "New Project"}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm">Name</label>
                <input className="pira-input w-full" value={editing.name} onChange={e=>setEditing({...editing, name:e.target.value})}/>
              </div>
              <div>
                <label className="text-sm">Priority (1 highest)</label>
                <input type="number" className="pira-input w-full" value={editing.priority}
                       onChange={e=>setEditing({...editing, priority: Number(e.target.value)})}/>
              </div>
              <div>
                <label className="text-sm">Start</label>
                <input type="date" className="pira-input w-full" value={editing.startDate}
                       onChange={e=>setEditing({...editing, startDate:e.target.value})}/>
              </div>
              <div>
                <label className="text-sm">Due</label>
                <input type="date" className="pira-input w-full" value={editing.dueDate}
                       onChange={e=>setEditing({...editing, dueDate:e.target.value})}/>
              </div>
              <div>
                <label className="text-sm">Status</label>
                <select className="pira-input w-full" value={editing.status}
                        onChange={e=>setEditing({...editing, status: e.target.value as Status})}>
                  <option>In Progress</option><option>Stabilization</option><option>On Hold</option><option>Complete</option>
                </select>
              </div>
              <div>
                <label className="text-sm">Bar Color (override)</label>
                <input type="color" className="pira-input w-full" value={editing.projectColor || settings.defaultBarColor}
                       onChange={e=>setEditing({...editing, projectColor: e.target.value})}/>
              </div>
              <div className="col-span-2">
                <label className="text-sm">Assignees</label>
                <select className="pira-input w-full" multiple
                  value={editing.assignedMembers}
                  onChange={e=>{
                    const arr = Array.from(e.target.selectedOptions).map(o=>o.value);
                    setEditing({...editing, assignedMembers: arr});
                  }}>
                  {teams.map(t=>(
                    <optgroup key={t.id} label={t.name}>
                      {t.members.map(m=>{
                        const id = `${t.id}:${m}`;
                        return <option key={id} value={id}>{m} ({t.name})</option>;
                      })}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <h4 className="font-semibold mb-2">Milestones</h4>
                {(editing.milestones||[]).map(ms=>{
                  const t = legend.find(x=>x.id===ms.typeId);
                  return (
                    <div key={ms.id} className="flex items-center gap-3 mb-2">
                      <select className="pira-input" value={ms.typeId} onChange={e=>setEditing({
                        ...editing,
                        milestones: editing.milestones.map(x=>x.id===ms.id? {...x, typeId:e.target.value}:x)
                      })}>
                        {legend.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                      <input type="date" className="pira-input" value={ms.date}
                             onChange={e=>setEditing({...editing, milestones: editing.milestones.map(x=>x.id===ms.id? {...x, date:e.target.value}:x)})}/>
                      <input className="pira-input" placeholder="Label (optional)" value={ms.label||""}
                             onChange={e=>setEditing({...editing, milestones: editing.milestones.map(x=>x.id===ms.id? {...x, label:e.target.value}:x)})}/>
                      <ShapeIcon shape={(t?.shape||"diamond")} color={(t?.color||"#000")} size={sizePx(t?.size||"small")} />
                      <button className="px-3 py-1 rounded-xl border text-red-600" onClick={()=>{
                        setEditing({...editing, milestones: editing.milestones.filter(x=>x.id!==ms.id)});
                      }}>Delete</button>
                    </div>
                  )
                })}
                <button className="pira-btn" onClick={()=>{
                  setEditing({...editing, milestones:[...(editing.milestones||[]), {id:uid(), typeId: legend[0].id, date: toISO(new Date())}]})
                }}>+ Add Milestone</button>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-500">Dates must be valid; you’ll be warned if Due &lt; Start.</div>
              <div className="flex gap-2">
                <button className="px-3 py-2 rounded-xl border" onClick={()=>setEditing(null)}>Cancel</button>
                <button className="pira-btn" onClick={()=>{
                  if (new Date(editing.dueDate) < new Date(editing.startDate)) {
                    alert("Warning: Due Date is earlier than Start Date.");
                  }
                  saveProject(editing);
                }}>Save Project</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );

  /** --------------- Reports (Overdue/Status/Conflicts) --------------- */
  const toCSV = (rows: string[][]) => {
    const csv = rows.map(r=>r.map(v=>`"${(v||"").replaceAll('"','""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "report.csv";
    a.click();
  };

  const ReportsTab = (
    <section className="max-w-6xl mx-auto px-4 my-6">
      <h2 className="text-2xl font-bold mb-4">Reports & Analytics</h2>

      {/* Overdue */}
      <div className="pira-card p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-lg font-semibold">Overdue Projects</div>
          <button className="px-3 py-1 rounded-xl border" onClick={()=>{
            const rows = [["Project","Due","Status"]];
            const today = new Date(todayISO);
            projects.filter(p=> new Date(p.dueDate) < today && p.status!=="Complete")
              .forEach(p=>rows.push([p.name,p.dueDate,p.status]));
            toCSV(rows);
          }}>Export CSV</button>
        </div>
        <ul
