import { Play, RotateCcw, Pause } from "lucide-react";
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
    <section className="control-strip-card">
      {/* 1. Operating Mode */}
      <div className="control-field">
        <label className="control-label">
          Operating Mode <span className="control-label-dot">●</span>
        </label>
        <div className="control-select-wrapper">
          <select 
            value={mode} 
            onChange={(e) => onModeChange && onModeChange(e.target.value)} 
            disabled={running}
            className="control-select"
          >
            <option value="smart">Smart Cache (Decoupled AI)</option>
            <option value="traditional">Traditional Baselines (LRU · MRU · LFU)</option>
          </select>
        </div>
      </div>

      {/* 2. Workload Trace */}
      <div className="control-field">
        <label className="control-label">Workload Trace</label>
        <div className="control-select-wrapper">
          <select 
            value={workload} 
            onChange={(e) => onWorkloadChange(e.target.value)} 
            disabled={running}
            className="control-select"
          >
            <option value="cyclic.log">cyclic.log</option>
            <option value="zipfian.log">zipfian.log</option>
            <option value="recency.log">recency.log</option>
            <option value="gcc.trace">gcc.trace</option>
            <option value="swim.trace">swim.trace</option>
          </select>
          <span className="control-chevron">⌵</span>
        </div>
      </div>

      {/* 3. Cache Capacity */}
      <div className="control-field">
        <label className="control-label">Cache Capacity (Items)</label>
        <div className="control-input-wrapper">
          <input 
            type="number" 
            min="64" 
            max="4096" 
            step="64" 
            value={cacheSize} 
            onChange={(e) => onCacheSizeChange(e.target.value)} 
            disabled={running}
            className="control-input"
          />
          <span className="control-input-suffix">slots</span>
        </div>
      </div>

      {/* 4. Refresh Frequency */}
      <div className="control-field">
        <label className="control-label">Refresh Frequency</label>
        <div className="control-input-wrapper">
          <input 
            type="number" 
            min="10" 
            max="1000" 
            step="10" 
            value={refreshInterval} 
            onChange={(e) => onRefreshIntervalChange(e.target.value)} 
            disabled={running}
            className="control-input"
          />
          <span className="control-input-suffix">reqs</span>
        </div>
      </div>

      {/* Actions */}
      <div className="control-actions">
        <button 
          className="control-btn-start" 
          onClick={onStart}
          disabled={running}
        >
          <Play size={13} fill="currentColor" />
          <span>Start run</span>
        </button>

        <button 
          className="control-btn-outline" 
          onClick={onStop}
          disabled={!running}
        >
          <Pause size={13} />
          <span>Stop</span>
        </button>

        <button 
          className="control-btn-outline" 
          onClick={onReset}
        >
          <RotateCcw size={13} />
          <span>Reset</span>
        </button>
      </div>
    </section>
  );
}

export default ControlPanel;

