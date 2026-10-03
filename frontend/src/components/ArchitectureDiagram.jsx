import "../styles/architecture.css";

function ArchitectureDiagram({ status }) {
  const isActive = status?.worker_running;
  const klVersion = status?.kill_list_version ?? 0;
  const refreshes = status?.worker_refreshes ?? 0;

  return (
    <section className="arch-panel">
      <div className="panel-heading">
        <div>
          <h2>Live Architecture Pipeline</h2>
          <p>Visual proof that ML inference is decoupled from the request path</p>
        </div>
      </div>

      <div className="arch-container">
        {/* Critical Path (left side) */}
        <div className="arch-path arch-critical">
          <div className="arch-path-label">CRITICAL PATH <span className="arch-fast">⚡ &lt;0.01ms</span></div>
          <div className="arch-nodes">
            <div className="arch-node arch-node-req">
              <span className="arch-icon">📥</span>
              <span>REQUEST</span>
            </div>
            <div className="arch-arrow">↓</div>
            <div className="arch-node arch-node-cache">
              <span className="arch-icon">🗃️</span>
              <span>CACHE LOOKUP</span>
              <small>O(1) hash map</small>
            </div>
            <div className="arch-arrow">↓</div>
            <div className="arch-node arch-node-kl">
              <span className="arch-icon">📋</span>
              <span>KILL LIST</span>
              <small>Precomputed victims</small>
            </div>
            <div className="arch-arrow">↓</div>
            <div className="arch-node arch-node-resp">
              <span className="arch-icon">📤</span>
              <span>RESPONSE</span>
            </div>
          </div>
          <div className="arch-no-wait">
            <span className="arch-x">✕</span>
            <span>NO WAIT FOR ML</span>
          </div>
        </div>

        {/* Divider */}
        <div className="arch-divider">
          <div className="arch-divider-line"></div>
          <span className="arch-divider-label">ASYNC</span>
          <div className="arch-divider-line"></div>
        </div>

        {/* Background Path (right side) */}
        <div className="arch-path arch-background">
          <div className="arch-path-label">BACKGROUND WORKER <span className={`arch-status ${isActive ? "arch-active" : ""}`}>{isActive ? "● RUNNING" : "○ IDLE"}</span></div>
          <div className="arch-nodes">
            <div className="arch-node arch-node-log">
              <span className="arch-icon">📝</span>
              <span>ACCESS LOG</span>
              <small>Ring buffer</small>
            </div>
            <div className="arch-arrow arch-arrow-async">↓</div>
            <div className="arch-node arch-node-feat">
              <span className="arch-icon">🧮</span>
              <span>FEATURE EXTRACT</span>
              <small>10 features/key</small>
            </div>
            <div className="arch-arrow arch-arrow-async">↓</div>
            <div className={`arch-node arch-node-ml ${isActive ? "arch-pulse" : ""}`}>
              <span className="arch-icon">🧠</span>
              <span>ML PREDICTOR</span>
              <small>{status?.model || "Loading..."}</small>
            </div>
            <div className="arch-arrow arch-arrow-async">↓</div>
            <div className="arch-node arch-node-update">
              <span className="arch-icon">🔄</span>
              <span>KILL LIST UPDATE</span>
              <small>v{klVersion} · {refreshes} refreshes</small>
            </div>
          </div>
          <div className="arch-loop">
            <span>↺ CACHE</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ArchitectureDiagram;
