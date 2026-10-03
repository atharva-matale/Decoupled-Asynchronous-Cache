import { useEffect, useState } from "react";
import ControlPanel from "./components/ControlPanel";
import StatCard from "./components/StatCard";
import MetricChart from "./components/MetricChart";
import EvictionHistory from "./components/EvictionHistory";
import LiveLogs from "./components/LiveLogs";
import SmartCachePanel from "./components/SmartCachePanel";
import ArchitectureDiagram from "./components/ArchitectureDiagram";
import { cacheApi } from "./services/cacheApi";
import "./styles/dashboard.css";

function App() {
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState("smart");
  const [workload, setWorkload] = useState("cyclic.log");
  const [cacheSize, setCacheSize] = useState(512);
  const [refreshInterval, setRefreshInterval] = useState(100);
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
        <main className="dashboard-content">

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

          {/* Stat cards — always shown regardless of mode */}
          <section className="stats-grid" aria-label="Current performance statistics">
            {snapshot.stats.length ? snapshot.stats.map((stat) => <StatCard key={stat.label} {...stat} />) : <div className="empty-dashboard-state">No performance metrics received yet. Start the simulation above.</div>}
          </section>

          {/* Charts — always shown */}
          <section className="chart-grid">
            {snapshot.charts.map((chart) => <MetricChart key={chart.title} {...chart} />)}
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
    </div>
  );
}

export default App;
