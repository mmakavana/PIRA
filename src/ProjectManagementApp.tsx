import React, { useState } from "react";
import {
  MS_PER_DAY,
  PX_PER_DAY,
  toEpochUTCNoon,
  toInputYYYYMMDD,
  xFromDate,
  wFromDates,
  weeklyTicks,
  isWeekendUTC
} from "./utils/dateMath";

// Types
interface Member {
  id: string;
  name: string;
  teamId: string;
}

interface Milestone {
  id: string;
  typeId: string;
  date: number;
  label?: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  priority: number;
  status: string;
  start: number;
  due: number;
  milestones: Milestone[];
  assigneeIds: string[];
  barColor?: string;
}

interface MilestoneType {
  id: string;
  name: string;
  shape: "diamond" | "circle" | "square" | "triangle";
  color: string;
  size: "small" | "medium" | "large";
}

// Demo legend seed
const seedLegend: MilestoneType[] = [
  { id: "start", name: "Start Date", shape: "diamond", color: "purple", size: "small" },
  { id: "due", name: "Due Date", shape: "diamond", color: "black", size: "small" },
  { id: "stab", name: "Stabilization", shape: "diamond", color: "blue", size: "medium" },
  { id: "comp", name: "Complete", shape: "diamond", color: "green", size: "medium" },
];

export default function ProjectManagementApp() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [legend, setLegend] = useState<MilestoneType[]>(seedLegend);

  // Example state for date range
  const [range, setRange] = useState({
    start: toEpochUTCNoon("2025-05-01"),
    end: toEpochUTCNoon("2025-12-31"),
  });

  const today = toEpochUTCNoon(
    new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  );

  // Calculate ticks
  const ticks = weeklyTicks(range.start, range.end);

  // Rendering helpers
  const renderMilestones = (p: Project) => {
    return p.milestones.map((m) => {
      const type = legend.find((l) => l.id === m.typeId);
      if (!type) return null;
      const x = xFromDate(m.date, range.start);
      const style: React.CSSProperties = {
        left: `${x}px`,
        backgroundColor: type.color,
        width: type.size === "small" ? 8 : type.size === "medium" ? 12 : 16,
        height: type.size === "small" ? 8 : type.size === "medium" ? 12 : 16,
      };
      return <div key={m.id} className="absolute rounded-full" style={style} title={m.label || type.name}></div>;
    });
  };

  const renderProjectBar = (p: Project) => {
    const x = xFromDate(p.start, range.start);
    const w = wFromDates(p.start, p.due, PX_PER_DAY);
    return (
      <div key={p.id} className="absolute h-6 rounded bg-blue-500 text-white text-xs flex items-center px-1"
        style={{ left: `${x}px`, width: `${w}px`, backgroundColor: p.barColor || "#6366F1" }}
      >
        {p.name} • P{p.priority}
        {renderMilestones(p)}
      </div>
    );
  };

  return (
    <div className="p-4">
      {/* Title + Tabs */}
      <header className="bg-[#1e1b4b] text-white py-4">
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-bold">PIRA</h1>
          <p className="text-sm">Project IT Resource Availability</p>
          <nav className="flex gap-4 mt-3">
            <button className="px-4 py-2 rounded-md bg-white text-[#1e1b4b]">Unified View</button>
            <button className="px-4 py-2 rounded-md bg-white text-[#1e1b4b]">AppDev</button>
            <button className="px-4 py-2 rounded-md bg-white text-[#1e1b4b]">BI</button>
            <button className="px-4 py-2 rounded-md bg-white text-[#1e1b4b]">QA</button>
            <button className="px-4 py-2 rounded-md bg-white text-[#1e1b4b]">DevOps</button>
            <button className="px-4 py-2 rounded-md bg-white text-[#1e1b4b]">Projects</button>
            <button className="px-4 py-2 rounded-md bg-white text-[#1e1b4b]">Reports</button>
          </nav>
        </div>
      </header>

      {/* Legend (read-only in Unified/Teams) */}
      <div className="flex gap-6 my-4 justify-end">
        {legend.map((l) => (
          <div key={l.id} className="flex items-center gap-1 text-sm">
            <div
              className="inline-block"
              style={{
                backgroundColor: l.color,
                width: l.size === "small" ? 8 : l.size === "medium" ? 12 : 16,
                height: l.size === "small" ? 8 : l.size === "medium" ? 12 : 16,
              }}
            ></div>
            {l.name}
          </div>
        ))}
      </div>

      {/* Timeline container */}
      <div className="overflow-x-auto border rounded bg-white">
        <div className="relative" style={{ width: (range.end - range.start) / MS_PER_DAY * PX_PER_DAY }}>
          {/* Grid */}
          {ticks.map((t) => {
            const x = xFromDate(t, range.start);
            return (
              <div key={t} className="absolute top-0 bottom-0 border-l border-gray-300" style={{ left: `${x}px` }} />
            );
          })}
          {/* Weekend shading */}
          {Array.from({ length: (range.end - range.start) / MS_PER_DAY + 1 }).map((_, i) => {
            const d = range.start + i * MS_PER_DAY;
            if (!isWeekendUTC(d)) return null;
            const x = xFromDate(d, range.start);
            return (
              <div
                key={d}
                className="absolute top-0 bottom-0 bg-gray-100"
                style={{ left: `${x}px`, width: `${PX_PER_DAY}px` }}
              />
            );
          })}
          {/* Today line */}
          {today >= range.start && today <= range.end && (
            <div
              className="absolute top-0 bottom-0 border-l-2 border-black"
              style={{ left: `${xFromDate(today, range.start)}px` }}
            />
          )}
          {/* Example: render all projects */}
          {projects.map(renderProjectBar)}
        </div>
      </div>
    </div>
  );
}
