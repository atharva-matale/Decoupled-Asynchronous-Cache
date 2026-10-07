import "../styles/architecture.css";

function ArchitectureDiagram({ status }) {
  const klVersion = status?.kill_list_version ?? 0;
  const analysisDuration = status?.worker_analysis_duration_ms ?? 0.18;

  return (
    <section className="arch-card">
      {/* Header */}
      <div className="arch-header">
        <div>
          <h2 className="arch-title">Decoupled Execution Pipeline</h2>
          <p className="arch-subtitle">
            Separation of ultra-low latency request path from heavy background machine learning model training
          </p>
        </div>
        <span className="arch-pill-tag">
          ZERO ML INFERENCE DELAY
        </span>
      </div>

      {/* 2 Columns */}
      <div className="arch-columns">
        {/* Lane A: Client Request Path */}
        <div className="arch-lane">
          <div className="arch-lane-header">
            <div className="arch-lane-title-group">
              <span className="arch-dot arch-dot-primary" />
              <h3 className="arch-lane-title">Client Request Path</h3>
            </div>
            <span className="arch-lane-metric">&lt; 0.08 ms execution</span>
          </div>

          <div className="arch-step-list">
            {/* Step 1 */}
            <div className="arch-step-card">
              <div className="arch-step-left">
                <span className="arch-step-num">1</span>
                <div className="arch-step-texts">
                  <div className="arch-step-name">Incoming Workload Request</div>
                  <div className="arch-step-desc">Read / Write trace packet dispatch</div>
                </div>
              </div>
              <span className="arch-step-arrow-right">&gt;</span>
            </div>

            <div className="arch-flow-arrow">↓</div>

            {/* Step 2 */}
            <div className="arch-step-card">
              <div className="arch-step-left">
                <span className="arch-step-num">2</span>
                <div className="arch-step-texts">
                  <div className="arch-step-name">Instant Memory Lookup</div>
                  <div className="arch-step-desc">Atomic hash map access (&lt; 0.04 ms)</div>
                </div>
              </div>
              <span className="arch-badge-hit">CACHE HIT</span>
            </div>

            <div className="arch-flow-arrow">↓</div>

            {/* Step 3 (Highlighted) */}
            <div className="arch-step-card arch-step-highlight">
              <div className="arch-step-left">
                <span className="arch-step-num arch-step-num-active">3</span>
                <div className="arch-step-texts">
                  <div className="arch-step-name arch-step-name-highlight">Pre-Computed Eviction Priority Queue</div>
                  <div className="arch-step-desc">Constant O(1) eviction selection if capacity full</div>
                </div>
              </div>
              <span className="arch-badge-constant">O(1) CONSTANT</span>
            </div>

            <div className="arch-flow-arrow">↓</div>

            {/* Step 4 */}
            <div className="arch-step-card">
              <div className="arch-step-left">
                <span className="arch-step-num">4</span>
                <div className="arch-step-texts">
                  <div className="arch-step-name">Return Result to User</div>
                  <div className="arch-step-desc">Payload transmitted with zero inline wait</div>
                </div>
              </div>
              <span className="arch-badge-check">✓</span>
            </div>
          </div>
        </div>

        {/* Lane B: Background AI Worker (Async) */}
        <div className="arch-lane">
          <div className="arch-lane-header">
            <div className="arch-lane-title-group">
              <span className="arch-dot arch-dot-dark" />
              <h3 className="arch-lane-title">Background AI Worker (Async)</h3>
            </div>
            <span className="arch-lane-metric arch-lane-metric-muted">Cycle: Every 100 reqs</span>
          </div>

          <div className="arch-step-list">
            {/* Step A */}
            <div className="arch-step-card">
              <div className="arch-step-left">
                <span className="arch-step-num">A</span>
                <div className="arch-step-texts">
                  <div className="arch-step-name">Access History Ring Buffer</div>
                  <div className="arch-step-desc">Non-blocking async telemetry push (capacity 10k)</div>
                </div>
              </div>
              <span className="arch-step-meta">10,000 BUF</span>
            </div>

            <div className="arch-flow-arrow">↓</div>

            {/* Step B */}
            <div className="arch-step-card">
              <div className="arch-step-left">
                <span className="arch-step-num">B</span>
                <div className="arch-step-texts">
                  <div className="arch-step-name">Pattern Feature Extraction</div>
                  <div className="arch-step-desc">Inter-arrival gap, recency, and frequency tensors</div>
                </div>
              </div>
              <span className="arch-step-meta">NUMPY VEC</span>
            </div>

            <div className="arch-flow-arrow">↓</div>

            {/* Step C */}
            <div className="arch-step-card">
              <div className="arch-step-left">
                <span className="arch-step-num">C</span>
                <div className="arch-step-texts">
                  <div className="arch-step-name">Adaptive Gradient Boosting Model</div>
                  <div className="arch-step-desc">Probabilistic scoring of key reuse likelihood</div>
                </div>
              </div>
              <span className="arch-step-meta">{analysisDuration} ms INFER</span>
            </div>

            <div className="arch-flow-arrow">↓</div>

            {/* Step D (Green Border Highlight) */}
            <div className="arch-step-card arch-step-pointer">
              <div className="arch-step-left">
                <span className="arch-step-num arch-step-num-green">D</span>
                <div className="arch-step-texts">
                  <div className="arch-step-name arch-step-name-green">Atomic Eviction Queue Pointer Swap</div>
                  <div className="arch-step-desc">Zero-lock pointer update to Priority Queue</div>
                </div>
              </div>
              <span className="arch-badge-pointer">POINTER SWAP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Banner */}
      <div className="arch-footer-banner">
        <div className="arch-footer-left">
          <span className="arch-footer-info-icon">ⓘ</span>
          <span>Traffic never waits on ML analysis. If a burst occurs before an update cycle, the queue uses fallback deterministic LRU pointers safely.</span>
        </div>
        <span className="arch-footer-tag">LOCK-FREE REPLENISHMENT</span>
      </div>
    </section>
  );
}

export default ArchitectureDiagram;

