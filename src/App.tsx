import React, { useMemo, useState } from "react";
import ProjectManagementApp from "./ProjectManagementApp";

type TabKey = "unified" | "projects" | "reports" | "team-AppDev" | "team-BI" | "team-QA" | "team-DevOps";

const TABS: { key: TabKey; label: string }[] = [
  { key: "unified", label: "Unified View" },
  { key: "team-AppDev", label: "AppDev" },
  { key: "team-BI", label: "BI" },
  { key: "team-QA", label: "QA" },
  { key: "team-DevOps", label: "DevOps" },
  { key: "projects", label: "Projects" },
  { key: "reports", label: "Reports" }
];

export default function App() {
  const [active, setActive] = useState<TabKey>("projects");

  const centeredTabs = useMemo(
    () =>
      TABS.map((t) => (
        <button
          key={t.key}
          className={`pira-tab ${active === t.key ? "active" : ""}`}
          onClick={() => setActive(t.key)}
        >
          {t.label}
        </button>
      )),
    [active]
  );

  return (
    <div className="min-h-full flex flex-col">
      {/* Brand header centered */}
      <header className="pira-header">
        <div className="max-w-screen-2xl mx-auto flex flex-col items-center gap-4 py-6">
          <div className="text-white text-4xl font-extrabold tracking-wide">PIRA</div>
          <div className="text-white/90 -mt-2">Project IT Resource Availability</div>
          <nav className="flex items-center gap-3">{centeredTabs}</nav>
        </div>
      </header>

      <main className="flex-1 max-w-screen-2xl mx-auto w-full p-6">
        <ProjectManagementApp activeTab={active} />
      </main>
    </div>
  );
}
