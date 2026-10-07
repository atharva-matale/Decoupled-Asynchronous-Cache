import "../styles/smartcache-panel.css";

function SmartCachePanel({ status, running }) {
  if (!status && !running) {
    return (
      <section className="sc-panel sc-panel-idle">
        <div className="sc-panel-header">
          <div className="sc-engine-badge">
            <span className="sc-dot sc-dot-idle"></span>
            SMART CACHE AI ENGINE
          </div>
        </div>
        <p className="sc-idle-text">Start a Smart Cache simulation to see real-time AI engine telemetry.</p>
      </section>
    );
  }

  const s = status || {};
  const isActive = s.worker_running;
  const model = s.model || "HeuristicPredictor";
  const refreshMs = s.refresh_interval_ms ?? 0;
  const lastInf = s.inference_latency_ms ?? 0;
  const klSize = s.kill_list_size ?? 0;
  const klVersion = s.kill_list_version ?? 0;
  const histSize = s.history_size ?? 0;
  const fallback = s.fallback_evictions ?? 0;
  const klEvictions = s.kill_list_evictions ?? 0;
  const refreshes = s.worker_refreshes ?? 0;
  const failures = s.worker_failures ?? 0;
  const dropped = s.logger_events_dropped ?? 0;

  return (
    <section className="sc-panel">
      <div className="sc-panel-header">
        <div className="sc-engine-badge">
          <span className={`sc-dot ${isActive ? "sc-dot-active" : "sc-dot-idle"}`}></span>
          SMART CACHE AI ENGINE
        </div>
        <div className="sc-arch-badges">
          <span className="sc-badge sc-badge-arch">DECOUPLED</span>
          <span className="sc-badge sc-badge-async">ASYNCHRONOUS</span>
          <span className="sc-badge sc-badge-safe">AI CRITICAL PATH: <strong>NO</strong></span>
        </div>
      </div>

      <div className="sc-metrics-grid">
        <div className="sc-metric">
          <span className="sc-metric-label">Status</span>
          <span className={`sc-metric-value ${isActive ? "sc-active" : "sc-inactive"}`}>
            {isActive ? "● ACTIVE" : "○ IDLE"}
          </span>
        </div>
        <div className="sc-metric">
          <span className="sc-metric-label">Model</span>
          <span className="sc-metric-value sc-model">{model}</span>
        </div>
        <div className="sc-metric">
          <span className="sc-metric-label">Refresh Interval</span>
          <span className="sc-metric-value">{refreshMs.toFixed(0)}<small>ms</small></span>
        </div>
        <div className="sc-metric">
          <span className="sc-metric-label">Last Inference</span>
          <span className="sc-metric-value">{lastInf.toFixed(2)}<small>ms</small></span>
        </div>
        <div className="sc-metric">
          <span className="sc-metric-label">Kill List Size</span>
          <span className="sc-metric-value">{klSize} <small>v{klVersion}</small></span>
        </div>
        <div className="sc-metric">
          <span className="sc-metric-label">History Buffer</span>
          <span className="sc-metric-value">{histSize.toLocaleString()}</span>
        </div>
        <div className="sc-metric">
          <span className="sc-metric-label">Kill List Evictions</span>
          <span className="sc-metric-value sc-highlight">{klEvictions.toLocaleString()}</span>
        </div>
        <div className="sc-metric">
          <span className="sc-metric-label">Fallback Evictions</span>
          <span className="sc-metric-value">{fallback.toLocaleString()}</span>
        </div>
        <div className="sc-metric">
          <span className="sc-metric-label">Worker Refreshes</span>
          <span className="sc-metric-value">{refreshes}</span>
        </div>
        <div className="sc-metric">
          <span className="sc-metric-label">Worker Failures</span>
          <span className="sc-metric-value">{failures}</span>
        </div>
        <div className="sc-metric">
          <span className="sc-metric-label">Events Dropped</span>
          <span className="sc-metric-value">{dropped}</span>
        </div>
      </div>
    </section>
  );
}

export default SmartCachePanel;
