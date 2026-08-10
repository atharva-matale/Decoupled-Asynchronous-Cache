import { useEffect, useState } from "react";
import ControlPanel from "./components/ControlPanel";
import StatCard from "./components/StatCard";
import MetricChart from "./components/MetricChart";
import EvictionHistory from "./components/EvictionHistory";
import LiveLogs from "./components/LiveLogs";
import { cacheApi } from "./services/cacheApi";
import "./styles/dashboard.css";

const menuItems = ["Traditional Baselines", "Smart Cache View", "Analytics", "Event log", "Settings"];

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedMenuItem, setSelectedMenuItem] = useState(0);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState("traditional");
  const [workload, setWorkload] = useState("cyclic.log");
  const [cacheSize, setCacheSize] = useState(512);
  const [refreshInterval, setRefreshInterval] = useState(100);
  const [snapshot, setSnapshot] = useState({ stats: [], charts: [], evictions: [], logs: [], updatedAt: null });
  const [connectionError, setConnectionError] = useState("");

  async function loadSnapshot() {
    try {
      const data = await cacheApi.getSnapshot();
      setSnapshot({ stats: [], charts: [], evictions: [], logs: [], ...data });
      setRunning(Boolean(data.running));
      if (data.mode) {
        setMode(data.mode);
        setSelectedMenuItem(data.mode === "smart" ? 1 : 0);
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
    setSelectedMenuItem(newMode === "smart" ? 1 : 0);
  };

  const handleSidebarSelect = (index) => {
    setSelectedMenuItem(index);
    if (index === 0) {
      setMode("traditional");
    } else if (index === 1) {
      setMode("smart");
    }
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

          {mode === "smart" ? (
            <div className="wip-container" style={{ padding: "60px 40px", background: "rgba(19, 26, 42, .76)", border: "1px solid #273148", borderRadius: "13px", textAlign: "center", margin: "20px 0" }}>
              <h2 style={{ fontSize: "22px", marginBottom: "15px", color: "#cbd2df", fontWeight: "600" }}>Smart Cache (Decoupled Asynchronous AI)</h2>
              <p style={{ color: "#a5adbd", fontSize: "14px", maxWidth: "600px", margin: "0 auto 25px", lineHeight: "1.6" }}>
                The decoupled background AI worker, LSTM pattern sequence-prediction engine, and the shared-memory Kill List structure are currently under development. Traditional cache simulations are fully functional.
              </p>
              <span className="reason-tag" style={{ background: "rgba(169, 154, 248, 0.15)", color: "#a99af8", padding: "8px 16px", borderRadius: "20px", fontWeight: "800", fontSize: "11px", letterSpacing: "0.08em" }}>
                WORK IN PROGRESS
              </span>
            </div>
          ) : (
            <>
              <section className="stats-grid" aria-label="Current performance statistics">
                {snapshot.stats.length ? snapshot.stats.map((stat) => <StatCard key={stat.label} {...stat} />) : <div className="empty-dashboard-state">No performance metrics received yet. Start the simulation above.</div>}
              </section>

              <section className="chart-grid">
                {snapshot.charts.map((chart) => <MetricChart key={chart.title} {...chart} />)}
              </section>

              <section className="lower-grid">
                <EvictionHistory rows={snapshot.evictions} />
                <LiveLogs logs={snapshot.logs} running={running} />
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
