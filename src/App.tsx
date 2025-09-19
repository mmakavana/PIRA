import { useMemo, useState } from "react";
import ProjectManagementApp from "./ProjectManagementApp";

type TabKey = "unified" | "teams" | "projects" | "reports" | string; // team ids added dynamically

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("unified");

  return (
    <div className="min-h-full">
      {/* Top header */}
      <header className="pira-header">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-extrabold tracking-tight">PIRA</h1>
              <p className="text-white/80 mt-1 text-lg">
                Project IT Resource Availability
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs band */}
      <nav className="pira-band">
        <div className="mx-auto max-w-7xl px-4">
          <ProjectManagementApp.Nav
            active={activeTab}
            onChange={setActiveTab}
          />
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        <ProjectManagementApp.Content activeTab={activeTab} />
      </main>
    </div>
  );
}
