import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import ControlPanel from "./components/ControlPanel";
import StatCard from "./components/StatCard";
import MetricChart from "./components/MetricChart";
import EvictionHistory from "./components/EvictionHistory";
import LiveLogs from "./components/LiveLogs";
import SmartCachePanel from "./components/SmartCachePanel";
import ArchitectureDiagram from "./components/ArchitectureDiagram";
import BenchmarkModal from "./components/BenchmarkModal";
import { cacheApi } from "./services/cacheApi";
import "./styles/dashboard.css";

const emptyStats = ["Hit rate", "Average latency", "Requests served", "Evictions", "Memory use", "Policy confidence"];
const emptyCharts = [
  { title: "Hit rate", unit: "%" },
  { title: "Latency", unit: "ms" },
  { title: "Throughput", unit: "req/s" },
  { title: "Memory usage", unit: "%" },
];

function App() {
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState("smart");
  const [workload, setWorkload] = useState("cyclic.log");
  const [cacheSize, setCacheSize] = useState(512);
  const [refreshInterval, setRefreshInterval] = useState(100);
  const [isBenchmarksOpen, setIsBenchmarksOpen] = useState(false);
  const [snapshot, setSnapshot] = useState({ stats: [], charts: [], evictions: [], logs: [], updatedAt: null, smartcache_status: null });
  const [connectionError, setConnectionError] = useState("");

  async function loadSnapshot() {
    try {
      const data = await cacheApi.getSnapshot();
      setSnapshot({ stats: [], charts: [], evictions: [], logs: [], smartcache_status: null, ...data });
      setRunning(Boolean(data.running));
      if (data.mode) {
        setMode(data.mode);
      }
      setConnectionError("");
    } catch (error) {
      setConnectionError("Backend unavailable. Start your API server to display live data.");
    }
  }

  useEffect(() => { loadSnapshot(); }, []);

  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(loadSnapshot, 1500);
    return () => window.clearInterval(timer);
  }, [running]);

  async function start() {
    try {
      await cacheApi.start({ mode, workload, cacheSize, refreshInterval });
      setRunning(true);
      await loadSnapshot();
    } catch (error) { setConnectionError("Could not start the simulation. Check the API server."); }
  }

  async function stop() {
    try {
      await cacheApi.stop();
      setRunning(false);
      await loadSnapshot();
    } catch (error) { setConnectionError("Could not stop the simulation. Check the API server."); }
  }

  async function reset() {
    try {
      await cacheApi.reset();
      setRunning(false);
      await loadSnapshot();
    } catch (error) { setConnectionError("Could not reset the simulation. Check the API server."); }
  }

  const handleModeChange = (newMode) => {
    setMode(newMode);
  };

  return (
    <div className="app-shell">
      <div className="app-main">
        <Navbar 
          onOpenBenchmarks={() => setIsBenchmarksOpen(true)}
          onUpload={() => alert("Upload trace file: Choose .log or .trace workload.")}
          onExport={() => alert("Export report: Downloading telemetry summary.")}
        />
        <main className="dashboard-content">
          <section className="page-heading">
            <div>
              <p className="eyebrow">SMRITI / OPERATIONS</p>
              <h1>Smart memory, clearly observed.</h1>
              <p className="subtitle">Monitor replacement decisions and tune cache workloads from one focused operational view.</p>
            </div>
            <div className="heading-meta">
              <span className={`service-indicator ${connectionError ? "offline" : ""}`}>
                <i />
                {connectionError ? "API offline" : "API connected"}
              </span>
              <div className="last-updated">
                Last refresh <strong>{snapshot.updatedAt ?? "—"}</strong>
              </div>
            </div>
          </section>

          <ControlPanel
            running={running}
            mode={mode}
            onModeChange={handleModeChange}
            workload={workload}
            cacheSize={cacheSize}
            refreshInterval={refreshInterval}
            onWorkloadChange={setWorkload}
            onCacheSizeChange={setCacheSize}
            onRefreshIntervalChange={setRefreshInterval}
            onStart={start}
            onStop={stop}
            onReset={reset}
          />

          {connectionError && <p className="connection-notice">{connectionError}</p>}

          {/* Stat cards — shows live metrics or awaiting placeholders */}
          <section className="stats-grid" aria-label="Current performance statistics">
            {snapshot.stats.length
              ? snapshot.stats.map((stat) => <StatCard key={stat.label} {...stat} />)
              : emptyStats.map((label) => <StatCard key={label} label={label} />)}
          </section>

          {/* Charts — shows live charts or SVG placeholder cards */}
          <section className="chart-grid">
            {(snapshot.charts.length ? snapshot.charts : emptyCharts).map((chart) => (
              <MetricChart key={chart.title} {...chart} />
            ))}
          </section>

          {/* SmartCache AI Engine Panel — shown only in smart mode */}
          {mode === "smart" && (
            <SmartCachePanel status={snapshot.smartcache_status} running={running} />
          )}

          {/* Architecture Diagram — shown in smart mode */}
          {mode === "smart" && (
            <ArchitectureDiagram status={snapshot.smartcache_status} />
          )}

          {/* Lower grid — eviction history + live logs */}
          <section className="lower-grid">
            <EvictionHistory rows={snapshot.evictions} />
            <LiveLogs logs={snapshot.logs} running={running} />
          </section>
        </main>
      </div>

      <BenchmarkModal 
        isOpen={isBenchmarksOpen} 
        onClose={() => setIsBenchmarksOpen(false)} 
      />
    </div>
  );
}

export default App;

