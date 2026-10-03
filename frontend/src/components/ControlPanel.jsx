import { Play, RotateCcw, Square } from "lucide-react";
import "../styles/control-panel.css";

function ControlPanel({ 
  running, 
  mode, 
  onModeChange, 
  workload, 
  cacheSize, 
  refreshInterval,
  onWorkloadChange, 
  onCacheSizeChange, 
  onRefreshIntervalChange,
  onStart, 
  onStop, 
  onReset 
}) {
  return (
    <section className="control-panel">
      <div className="control-intro">
        <span className="panel-kicker">SIMULATION CONTROLS</span>
        <span className="algorithm">
          {mode === "smart" ? (
            <>Smart Cache <em>· Decoupled AI</em></>
          ) : (
            <>Traditional <em>· Side-by-Side baselines</em></>
          )}
        </span>
      </div>

      <label>
        Simulation Mode
        <select value={mode} onChange={(e) => onModeChange && onModeChange(e.target.value)} disabled={running}>
          <option value="smart">Smart Cache (AI Decoupled)</option>
          <option value="traditional">Traditional (Baselines comparison)</option>
        </select>
      </label>

      <label>
        Workload Trace
        <select value={workload} onChange={(e) => onWorkloadChange(e.target.value)} disabled={running}>
          <option>cyclic.log</option>
          <option>zipfian.log</option>
          <option>recency.log</option>
          <option>gcc.trace</option>
          <option>swim.trace</option>
        </select>
      </label>

      <label>
        Cache Capacity (Slots)
        <div className="input-suffix">
          <input 
            type="number" 
            min="64" 
            max="4096" 
            step="64" 
            value={cacheSize} 
            onChange={(e) => onCacheSizeChange(e.target.value)} 
            disabled={running}
          />
          <span>items</span>
        </div>
      </label>

      {mode === "smart" && (
        <label>
          BG Worker Interval (T_refresh)
          <div className="input-suffix">
            <input 
              type="number" 
              min="10" 
              max="1000" 
              step="50" 
              value={refreshInterval} 
              onChange={(e) => onRefreshIntervalChange(e.target.value)} 
              disabled={running}
            />
            <span>requests</span>
          </div>
        </label>
      )}

      <div className="control-buttons">
        {running ? (
          <button className="button button-stop" onClick={onStop}>
            <Square size={14} fill="currentColor" /> Stop
          </button>
        ) : (
          <button className="button button-primary" onClick={onStart}>
            <Play size={14} fill="currentColor" /> Start run
          </button>
        )}
        <button className="button button-quiet" onClick={onReset}>
          <RotateCcw size={15} /> Reset
        </button>
      </div>
    </section>
  );
}

export default ControlPanel;
