import { useState } from "react";
import { X, Play, CheckCircle } from "lucide-react";

const benchmarkData = [
  {
    name: "Cyclic Loops (cyclic.log)",
    smart: 96.2,
    lru: 61.4,
    lfu: 72.8,
    gain: "+34.8%"
  },
  {
    name: "Skewed Zipfian (zipfian.log)",
    smart: 94.1,
    lru: 82.5,
    lfu: 84.0,
    gain: "+10.1%"
  },
  {
    name: "GCC Compiler Trace (gcc.trace)",
    smart: 89.7,
    lru: 74.3,
    lfu: 70.1,
    gain: "+15.4%"
  },
  {
    name: "SWIM Web Search Trace (swim.trace)",
    smart: 92.4,
    lru: 78.1,
    lfu: 76.5,
    gain: "+14.3%"
  }
];

function BenchmarkModal({ isOpen, onClose }) {
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);

  if (!isOpen) return null;

  const handleRun = () => {
    setRunning(true);
    setTimeout(() => {
      setRunning(false);
      setCompleted(true);
      setTimeout(() => setCompleted(false), 3000);
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-accent-contrast/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-surface-card rounded-2xl shadow-2xl border border-border-strong overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-border-subtle flex items-start justify-between bg-surface-low/30">
          <div>
            <h3 className="font-section-title text-xl sm:text-2xl font-medium text-on-surface">
              Policy Benchmark Suite
            </h3>
            <p className="font-body-sm text-xs sm:text-sm text-text-secondary mt-1">
              Multi-workload hit rate comparisons under standardized 512-slot capacity.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-low text-text-secondary hover:text-on-surface transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-badge-micro uppercase font-semibold text-text-secondary pb-2 border-b border-border-subtle">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-primary" />
              <span>SmartCache (Decoupled AI)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-secondary" />
              <span>LRU Baseline</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-border-strong" />
              <span>LFU Policy</span>
            </div>
          </div>

          {/* Comparative Data Distribution Bar Meters */}
          <div className="space-y-5">
            {benchmarkData.map((trace) => (
              <div key={trace.name} className="space-y-2">
                <div className="flex items-center justify-between text-xs font-body-sm">
                  <span className="font-semibold text-on-surface">{trace.name}</span>
                  <span className="font-badge-micro font-bold text-tertiary bg-tertiary-fixed px-2 py-0.5 rounded">
                    {trace.gain} vs LRU
                  </span>
                </div>

                <div className="space-y-1.5 bg-surface-low p-3 rounded-xl border border-border-subtle">
                  {/* SmartCache Bar */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-20 font-telemetry-value text-text-secondary shrink-0 text-[11px]">SmartCache</span>
                    <div className="flex-1 bg-surface-card h-4 rounded overflow-hidden">
                      <div
                        className="bg-primary h-full rounded transition-all duration-700"
                        style={{ width: `${trace.smart}%` }}
                      />
                    </div>
                    <span className="w-12 text-right font-telemetry-value font-bold text-primary text-[11px]">
                      {trace.smart}%
                    </span>
                  </div>

                  {/* LRU Bar */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-20 font-telemetry-value text-text-secondary shrink-0 text-[11px]">LRU</span>
                    <div className="flex-1 bg-surface-card h-3.5 rounded overflow-hidden">
                      <div
                        className="bg-secondary h-full rounded transition-all duration-700"
                        style={{ width: `${trace.lru}%` }}
                      />
                    </div>
                    <span className="w-12 text-right font-telemetry-value text-secondary text-[11px]">
                      {trace.lru}%
                    </span>
                  </div>

                  {/* LFU Bar */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-20 font-telemetry-value text-text-secondary shrink-0 text-[11px]">LFU</span>
                    <div className="flex-1 bg-surface-card h-3.5 rounded overflow-hidden">
                      <div
                        className="bg-border-strong h-full rounded transition-all duration-700"
                        style={{ width: `${trace.lfu}%` }}
                      />
                    </div>
                    <span className="w-12 text-right font-telemetry-value text-text-secondary text-[11px]">
                      {trace.lfu}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 sm:p-6 border-t border-border-subtle bg-surface-low/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-telemetry-value text-xs text-text-secondary">
            Total 1,000,000 requests per benchmark pass
          </span>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-border-strong text-text-secondary hover:bg-surface-low font-body-sm text-xs font-semibold transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleRun}
              disabled={running}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-body-sm text-xs font-semibold shadow-sm transition-colors disabled:opacity-75"
            >
              {completed ? <CheckCircle size={14} /> : <Play size={14} fill="currentColor" />}
              <span>
                {running
                  ? "Executing trace passes..."
                  : completed
                  ? "Benchmarks complete"
                  : "Run Full Benchmark Suite"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BenchmarkModal;
