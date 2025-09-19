import React, { useMemo, useState } from "react";
import {
  MS_PER_DAY,
  toEpochUTCNoon,
  toInputYYYYMMDD,
  xFromDate,
  widthFromDates,
  weeklyTicks,
  monthlyTicks,
  todayUTCNoon,
} from "./utils/dateMath";

/** ========== Types ========== */
type ID = string;

type Member = { id: ID; name: string; teamId: ID; active?: boolean };
type Team = { id: ID; name: string };
type Status = "In Progress" | "Stabilization" | "On Hold" | "Complete";

type MilestoneType = {
  id: ID;
  name: string;
  shape: "diamond" | "circle" | "triangle" | "square";
  color: string;
  size: "small" | "medium" | "large";
};
type Milestone = {
  id: ID;
  typeId: ID;
  dateMs: number; // UTC noon ms
  label?: string;
};
type Project = {
  id: ID;
  name: string;
  description?: string;
  priority: number;
  status: Status;
  startMs: number;
  dueMs: number;
  barColor?: string;
  milestoneIds: ID[];
  assigneeIds: ID[];
  history?: any[];
};
type Settings = {
  defaultBarColor: string;
  showToday: boolean;
  executiveMode: boolean; // masks names
  weekendShading: boolean;
  pxPerDay: number; // fixed width per day (keeps scale consistent)
  timeScale: "Days" | "Weeks" | "Months" | "Quarter" | "Year";
};

type Store = {
  teams: Team[];
  members: Member[];
  projects: Project[];
  milestoneTypes: MilestoneType[];
  milestones: Record<ID, Milestone>;
  settings: Settings;
};

/** ========== Seed data ========== */
const uid = () => Math.random().toString(36).slice(2, 10);

const SEED: Store = {
  teams: [
    { id: "t-app", name: "AppDev" },
    { id: "t-bi", name: "BI" },
    { id: "t-qa", name: "QA" },
    { id: "t-devops", name: "DevOps" },
  ],
  members: [
    { id: "m-jon", name: "Jonathan", teamId: "t-app" },
    { id: "m-yur", name: "Yuriy", teamId: "t-app" },
    { id: "m-eli", name: "Elizabeth", teamId: "t-app" },
    { id: "m-jrg", name: "Jorge", teamId: "t-app" },
    { id: "m-har", name: "Harald", teamId: "t-app" },
    { id: "m-ang", name: "Angel", teamId: "t-app" },
  ],
  projects: [],
  milestoneTypes: [
    { id: "mt-start", name: "Start Date", shape: "diamond", color: "#B04BEA", size: "small" },
    { id: "mt-due", name: "Due Date", shape: "diamond", color: "#111827", size: "small" },
    { id: "mt-stab", name: "Stabilization", shape: "diamond", color: "#4F7BFF", size: "medium" },
    { id: "mt-comp", name: "Complete", shape: "diamond", color: "#19B47E", size: "medium" },
  ],
  milestones: {},
  settings: {
    defaultBarColor: "#5863F8",
    showToday: true,
    executiveMode: false,
    weekendShading: true,
    pxPerDay: 16, // fixed, matches CSS var
    timeScale: "Weeks",
  },
};

/** Persist in localStorage for simplicity */
const KEY = "pira-store-v2";
function useStore(): [Store, (s: Store) => void] {
  const [state, setState] = useState<Store>(() => {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : SEED;
  });
  const update = (next: Store) => {
    setState(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  };
  return [state, update];
}

/** ========== NAV ========== */
function Nav({
  active,
  onChange,
}: {
  active: string;
  onChange: (k: string) => void;
}) {
  const [store] = useStore();

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <button
        className={`pira-tab ${active === "unified" ? "active" : ""}`}
        onClick={() => onChange("unified")}
        title="Unified View"
      >
        <span>📅</span> Unified View
      </button>

      {/* Dynamic Team tabs */}
      {store.teams.map((t) => (
        <button
          key={t.id}
          className={`pira-tab ${active === t.id ? "active" : ""}`}
          onClick={() => onChange(t.id)}
          title={`${t.name} Team`}
        >
          <span>👥</span> {t.name}
        </button>
      ))}

      <button
        className={`pira-tab ${active === "teams" ? "active" : ""}`}
        onClick={() => onChange("teams")}
      >
        <span>⚙️</span> Teams
      </button>

      <button
        className={`pira-tab ${active === "projects" ? "active" : ""}`}
        onClick={() => onChange("projects")}
      >
        <span>➕</span> Projects
      </button>

      <button
        className={`pira-tab ${active === "reports" ? "active" : ""}`}
        onClick={() => onChange("reports")}
      >
        <span>📊</span> Reports
      </button>
    </div>
  );
}

/** ========== LEGEND READ-ONLY ========== */
function LegendStrip({ store }: { store: Store }) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {store.milestoneTypes.map((t) => (
        <span key={t.id} className="legend-chip" title={t.name}>
          <span
            className={`inline-block ${shapeClass(t.shape)} ${sizeClass(t.size)}`}
            style={{ backgroundColor: t.shape === "triangle" ? "transparent" : t.color, color: t.color }}
          />
          <span className="text-sm">{t.name}</span>
        </span>
      ))}
      <span className="legend-chip">
        <span className="w-4 h-2 rounded-sm" style={{ backgroundColor: store.settings.defaultBarColor }} />
        Default Bar
      </span>
    </div>
  );
}
const shapeClass = (s: MilestoneType["shape"]) =>
  s === "diamond" ? "shape-diamond" : s === "circle" ? "shape-circle" : s === "triangle" ? "shape-triangle" : "shape-square";
const sizeClass = (s: MilestoneType["size"]) =>
  s === "small" ? "m-small" : s === "large" ? "m-large" : "m-medium";

/** ========== TIMELINE ========== */
type TimelineProps = {
  store: Store;
  filterTeamId?: ID;
  onSettingsChange?: (s: Partial<Settings>) => void;
};

function Timeline({ store, filterTeamId, onSettingsChange }: TimelineProps) {
  const { settings } = store;
  const pxPerDay = settings.pxPerDay;

  // Window controls (date inputs stored as UTC-noon ms)
  const [winStart, setWinStart] = useState<number>(() => {
    // Default to ~5 months span
    const today = todayUTCNoon();
    return today - 14 * 7 * MS_PER_DAY;
  });
  const [winEnd, setWinEnd] = useState<number>(() => {
    const today = todayUTCNoon();
    return today + 20 * 7 * MS_PER_DAY;
  });

  const teams = filterTeamId
    ? store.teams.filter((t) => t.id === filterTeamId)
    : store.teams;

  const membersByTeam = useMemo(() => {
    const map: Record<ID, Member[]> = {};
    for (const t of teams) map[t.id] = [];
    for (const m of store.members) {
      if (map[m.teamId]) map[m.teamId].push(m);
    }
    for (const t of teams) map[t.id].sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [teams, store.members]);

  const milestones = store.milestones;
  const mTypeById = useMemo(() => {
    const r: Record<ID, MilestoneType> = {};
    store.milestoneTypes.forEach((mt) => (r[mt.id] = mt));
    return r;
  }, [store.milestoneTypes]);

  // Pre-compute project bars per member
  const projectsPerMember: Record<ID, Project[]> = useMemo(() => {
    const byMember: Record<ID, Project[]> = {};
    store.members.forEach((m) => (byMember[m.id] = []));
    for (const p of store.projects) {
      for (const mid of p.assigneeIds) {
        if (byMember[mid]) byMember[mid].push(p);
      }
    }
    // stable order by start date
    Object.values(byMember).forEach((arr) =>
      arr.sort((a, b) => a.startMs - b.startMs)
    );
    return byMember;
  }, [store.projects, store.members]);

  // Ticks
  const weekTicks = weeklyTicks(winStart, winEnd);
  const monthTicks = monthlyTicks(winStart, winEnd);

  // Export full range to a printable window (vector SVG)
  const exportPDF = () => {
    const w = Math.ceil(((winEnd - winStart) / MS_PER_DAY + 1) * pxPerDay) + 400; // extra gutter for labels
    const h =
      120 + // header
      teams.reduce((acc, t) => acc + 48 + (membersByTeam[t.id].length || 1) * 80, 0);

    const printWin = window.open("", "_blank");
    if (!printWin) return;

    const svgStart = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="font-family: Candara, Segoe UI, Inter, system-ui, -apple-system, sans-serif">
        <style>
          .lbl{font-size:12px;fill:#111827}
          .tick{stroke:#CBD5E1;stroke-width:1}
          .today{stroke:#111827;stroke-width:2}
          .bar{rx:6;ry:6}
        </style>
    `;
    const svgParts: string[] = [svgStart];

    // Header
    svgParts.push(
      `<text x="${w / 2}" y="32" text-anchor="middle" class="lbl" style="font-size:20px;font-weight:700">PIRA • Timeline Export (${formatInput(winStart)} → ${formatInput(winEnd)})</text>`
    );

    let y = 60;

    // Draw each team section
    for (const t of teams) {
      // Team label
      svgParts.push(
        `<rect x="0" y="${y}" width="${w}" height="32" fill="#EEF2FF"/>`,
        `<text x="16" y="${y + 22}" class="lbl" style="font-weight:600">${t.name}</text>`
      );
      y += 32;

      const members = membersByTeam[t.id];
      if (members.length === 0) {
        svgParts.push(
          `<text x="16" y="${y + 40}" class="lbl" fill="#64748B">No members</text>`
        );
        y += 80;
        continue;
      }

      for (const member of members) {
        // name or masked
        const name = store.settings.executiveMode
          ? maskedName(member, members)
          : member.name;

        // row background
        svgParts.push(
          `<rect x="0" y="${y}" width="${w}" height="80" fill="${(members.indexOf(member) % 2 === 0) ? '#FFFFFF' : '#FAFAFF'}"/>`,
          `<text x="16" y="${y + 28}" class="lbl" style="font-weight:600">${name}</text>`
        );

        // grid weekly ticks
        for (const t of weekTicks) {
          const x = xFromDate(t, winStart, pxPerDay) + 240;
          svgParts.push(`<line x1="${x}" y1="${y}" x2="${x}" y2="${y + 80}" class="tick"/>`);
        }

        // weekend shading (approximate by shading Sat+Sun areas; omitted for brevity in SVG)

        // bars for this member
        const projs = projectsPerMember[member.id] || [];
        for (const p of projs) {
          const x = xFromDate(p.startMs, winStart, pxPerDay) + 240;
          const wBar = widthFromDates(p.startMs, p.dueMs, pxPerDay);
          const color = p.barColor || store.settings.defaultBarColor;

          svgParts.push(
            `<rect x="${x}" y="${y + 40}" width="${wBar}" height="16" fill="${color}" class="bar"/>`,
            `<text x="${x + 6}" y="${y + 52}" class="lbl" fill="#ffffff">${p.name} • P${p.priority}</text>`
          );

          // milestones
          for (const mid of p.milestoneIds) {
            const m = store.milestones[mid];
            if (!m) continue;
            const mt = mTypeById[m.typeId];
            const mx = xFromDate(m.dateMs, winStart, pxPerDay) + 240;

            const mark =
              mt.shape === "triangle"
                ? `<polygon points="${mx},${y + 38} ${mx - 6},${y + 52} ${mx + 6},${y + 52}" fill="${mt.color}" />`
                : `<rect x="${mx - 4}" y="${y + 40 - 4}" width="8" height="8" fill="${mt.color}" transform="rotate(45 ${mx} ${y + 40})"/>`;

            svgParts.push(mark);
          }
        }

        y += 80;
      }
    }

    // month labels row
    const monthY = 52;
    for (const t of monthTicks) {
      const x = xFromDate(t, winStart, pxPerDay) + 240;
      const d = new Date(t);
      svgParts.push(
        `<text x="${x + 4}" y="${monthY}" class="lbl" fill="#475569">${d.toLocaleString('en', { month: 'numeric', day: 'numeric' })}</text>`
      );
    }

    // today line
    if (store.settings.showToday) {
      const tx = xFromDate(todayUTCNoon(), winStart, pxPerDay) + 240;
      svgParts.push(`<line x1="${tx}" y1="60" x2="${tx}" y2="${y}" class="today" />`);
    }

    svgParts.push("</svg>");

    printWin.document.write(svgParts.join(""));
    printWin.document.close();
    // The user can use the browser's Print dialog and "Save as PDF"
  };

  // UI controls row
  const Controls = (
    <div className="flex flex-wrap items-center gap-4 rounded-card bg-white shadow-soft px-4 py-3 mb-4">
      <div className="flex items-center gap-2">
        <label className="text-sm">Time Scale</label>
        <select
          className="rounded-md border px-2 h-9"
          value={settings.timeScale}
          onChange={(e) => onSettingsChange?.({ timeScale: e.target.value as Settings["timeScale"] })}
        >
          <option>Days</option>
          <option>Weeks</option>
          <option>Months</option>
          <option>Quarter</option>
          <option>Year</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm">Start</span>
        <input
          type="date"
          className="rounded-md border px-2 h-9"
          value={formatInput(winStart)}
          onChange={(e) => setWinStart(toEpochUTCNoon(e.target.value))}
        />
        <span className="text-sm">End</span>
        <input
          type="date"
          className="rounded-md border px-2 h-9"
          value={formatInput(winEnd)}
          onChange={(e) => setWinEnd(toEpochUTCNoon(e.target.value))}
        />
      </div>

      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={settings.executiveMode}
          onChange={(e) => onSettingsChange?.({ executiveMode: e.target.checked })}
        />
        Executive Mode
      </label>
      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={settings.weekendShading}
          onChange={(e) => onSettingsChange?.({ weekendShading: e.target.checked })}
        />
        Weekend Shading
      </label>
      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={true}
          readOnly
        />
        Snap to Grid
      </label>

      <div className="ml-auto">
        <button
          onClick={exportPDF}
          className="px-4 h-9 rounded-md bg-pira.chip text-white hover:opacity-90"
        >
          Export PDF (Full Range)
        </button>
      </div>
    </div>
  );

  // Timeline rows (HTML/SVG hybrid with absolute elements; fixed day width; horizontal scroll)
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <LegendStrip store={store} />
      </div>

      {Controls}

      <div className="timeline-shell relative">
        {/* Sticky left column width (names) */}
        <div className="relative">
          {teams.map((team) => (
            <TeamSection
              key={team.id}
              team={team}
              members={membersByTeam[team.id]}
              projectsPerMember={projectsPerMember}
              settings={settings}
              mTypeById={mTypeById}
              milestones={milestones}
              winStart={winStart}
              winEnd={winEnd}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TeamSection(props: {
  team: Team;
  members: Member[];
  projectsPerMember: Record<ID, Project[]>;
  settings: Settings;
  mTypeById: Record<ID, MilestoneType>;
  milestones: Record<ID, Milestone>;
  winStart: number;
  winEnd: number;
}) {
  const {
    team,
    members,
    projectsPerMember,
    settings,
    mTypeById,
    milestones,
    winStart,
    winEnd,
  } = props;

  const pxPerDay = settings.pxPerDay;
  const widthPx = Math.ceil(((winEnd - winStart) / MS_PER_DAY + 1) * pxPerDay);
  const leftGutter = 240; // sticky name column width

  const weekTicksArr = weeklyTicks(winStart, winEnd);
  const todayX = xFromDate(todayUTCNoon(), winStart, pxPerDay);

  return (
    <div className="border-b border-slate-200">
      {/* Team header row */}
      <div className="bg-indigo-50 text-indigo-900 font-semibold px-4 py-2 rounded-t-card">
        {team.name}
      </div>

      {/* Rows */}
      <div
        className="relative"
        style={{
          width: "100%",
        }}
      >
        {/* Horizontal scroll area for the grid+bars */}
        <div
          className="relative"
          style={{
            marginLeft: leftGutter,
            overflowX: "auto",
            position: "relative",
          }}
        >
          <div className="relative" style={{ width: widthPx }}>
            {/* Month labels */}
            <MonthLabels winStart={winStart} winEnd={winEnd} pxPerDay={pxPerDay} />

            {/* Today line */}
            {settings.showToday && (
              <div
                className="vline"
                style={{ left: todayX, top: 0, bottom: 0 }}
              />
            )}

            {/* Rows with ticks and bars */}
            {members.map((m, idx) => {
              const projs = projectsPerMember[m.id] || [];
              const rowTop = 38 + idx * 96;

              return (
                <div key={m.id} className="relative h-24">
                  {/* Weekly ticks */}
                  {weekTicksArr.map((t) => {
                    const x = xFromDate(t, winStart, pxPerDay);
                    return (
                      <div
                        key={t}
                        className="absolute top-0 bottom-0 border-l border-pira-grid/80"
                        style={{ left: x }}
                      />
                    );
                  })}

                  {/* Bars */}
                  {projs.map((p) => {
                    const x = xFromDate(p.startMs, winStart, pxPerDay);
                    const w = widthFromDates(p.startMs, p.dueMs, pxPerDay);
                    const color = p.barColor || settings.defaultBarColor;

                    return (
                      <div
                        key={p.id}
                        className="absolute"
                        style={{ left: x, top: rowTop, width: w }}
                      >
                        <div
                          className="h-4 rounded-full"
                          style={{ backgroundColor: color }}
                          title={`${p.name} (P${p.priority})`}
                        />
                        <div className="text-xs mt-1 text-slate-600">
                          {p.name} • P{p.priority}
                        </div>

                        {/* Milestones */}
                        {p.milestoneIds.map((mid) => {
                          const m = milestones[mid];
                          if (!m) return null;
                          const mt = mTypeById[m.typeId];
                          const mx = xFromDate(m.dateMs, winStart, pxPerDay);

                          return (
                            <span
                              key={mid}
                              className={`absolute ${shapeClass(mt.shape)} ${sizeClass(mt.size)}`}
                              style={{
                                left: mx - x - 6, // local offset inside bar container
                                top: -6,
                                backgroundColor: mt.shape === "triangle" ? "transparent" : mt.color,
                                color: mt.color,
                              }}
                              title={`${mt.name} • ${formatInput(m.dateMs)}${m.label ? " • " + m.label : ""}`}
                            />
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sticky name column (left) */}
        <div
          className="timeline-sticky"
          style={{
            width: leftGutter,
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
          }}
        >
          {/* Column header */}
          <div className="h-10 flex items-center pl-4 text-slate-600">
            Team / Members
          </div>
          {/* Member labels */}
          {members.map((m, idx) => (
            <div key={m.id} className="h-24 flex items-center pl-4">
              <div className="leading-tight">
                <div className="font-semibold">
                  {props.settings.executiveMode
                    ? maskedName(m, members)
                    : m.name}
                </div>
                <div className="text-xs text-slate-500">
                  {(props.projectsPerMember[m.id]?.length || 0)} project
                  {((props.projectsPerMember[m.id]?.length || 0) === 1) ? "" : "s"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MonthLabels({
  winStart,
  winEnd,
  pxPerDay,
}: {
  winStart: number;
  winEnd: number;
  pxPerDay: number;
}) {
  const ticks = monthlyTicks(winStart, winEnd);
  return (
    <div className="relative h-10">
      {ticks.map((t) => {
        const x = xFromDate(t, winStart, pxPerDay);
        const d = new Date(t);
        const txt = `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
        return (
          <div key={t} className="absolute top-2 text-xs text-slate-600" style={{ left: x + 4 }}>
            {txt}
          </div>
        );
      })}
    </div>
  );
}

/** Masked names for Executive Mode (stable order per team) */
function maskedName(member: Member, teamMembers: Member[]) {
  const idx = teamMembers.findIndex((m) => m.id === member.id);
  return `Resource ${idx + 1}`;
}

function formatInput(epochMs: number) {
  const d = new Date(epochMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** ========== PROJECTS (Editor + Legend Manager only here) ========== */

function ProjectsPage({
  store,
  setStore,
}: {
  store: Store;
  setStore: (s: Store) => void;
}) {
  const [editing, setEditing] = useState<Project | null>(null);

  function upsertProject(p: Project) {
    const exists = store.projects.some((x) => x.id === p.id);
    const next = {
      ...store,
      projects: exists
        ? store.projects.map((x) => (x.id === p.id ? p : x))
        : [...store.projects, p],
    };
    setStore(next);
    setEditing(null);
  }

  return (
    <div className="space-y-6">
      {/* Legend Manager */}
      <div className="bg-white rounded-card shadow-soft p-4">
        <h3 className="font-semibold text-lg mb-3">Legend: Milestone Types</h3>

        {store.milestoneTypes.map((mt) => (
          <div key={mt.id} className="grid grid-cols-12 items-center gap-3 py-2">
            <div className="col-span-4">
              <input
                className="w-full rounded-md border px-2 h-9"
                value={mt.name}
                onChange={(e) => {
                  const next = {
                    ...store,
                    milestoneTypes: store.milestoneTypes.map((x) =>
                      x.id === mt.id ? { ...x, name: e.target.value } : x
                    ),
                  };
                  setStore(next);
                }}
              />
            </div>
            <div className="col-span-2">
              <select
                className="w-full rounded-md border px-2 h-9"
                value={mt.shape}
                onChange={(e) => {
                  const next = {
                    ...store,
                    milestoneTypes: store.milestoneTypes.map((x) =>
                      x.id === mt.id ? { ...x, shape: e.target.value as any } : x
                    ),
                  };
                  setStore(next);
                }}
              >
                <option>diamond</option>
                <option>circle</option>
                <option>triangle</option>
                <option>square</option>
              </select>
            </div>
            <div className="col-span-2">
              <select
                className="w-full rounded-md border px-2 h-9"
                value={mt.size}
                onChange={(e) => {
                  const next = {
                    ...store,
                    milestoneTypes: store.milestoneTypes.map((x) =>
                      x.id === mt.id ? { ...x, size: e.target.value as any } : x
                    ),
                  };
                  setStore(next);
                }}
              >
                <option>small</option>
                <option>medium</option>
                <option>large</option>
              </select>
            </div>
            <div className="col-span-3">
              <input
                type="color"
                className="w-full h-9 rounded-md border"
                value={mt.color}
                onChange={(e) => {
                  const next = {
                    ...store,
                    milestoneTypes: store.milestoneTypes.map((x) =>
                      x.id === mt.id ? { ...x, color: e.target.value } : x
                    ),
                  };
                  setStore(next);
                }}
              />
            </div>
