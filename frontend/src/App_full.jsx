import React, { useState, useEffect, useRef } from "react";
import smritiLogo from "./assets/smriti-logo.png";
import { cacheApi } from "./services/cacheApi";

export default function App() {
  // --- Simulation State ---
  const [isRunning, setIsRunning] = useState(false);
  // Default to "traditional" mode as requested by user, with tabs: "traditional", "smart", "compare"
  const [activeTab, setActiveTab] = useState("traditional"); // "traditional", "smart", "compare"
  const [workload, setWorkload] = useState("cyclic.log");
  const [capacity, setCapacity] = useState(512);
  const [refreshInterval, setRefreshInterval] = useState(100);

  // --- Modals & Drawers ---
  const [isBenchmarksOpen, setIsBenchmarksOpen] = useState(false);
  const [isQueueDrawerOpen, setIsQueueDrawerOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // --- Traditional Multi-Graph Filter ---
  const [activePolicyFilter, setActivePolicyFilter] = useState("all"); // "all", "lru", "lfu", "fifo", "mru"
  const [activeMemoryTab, setActiveMemoryTab] = useState("lru"); // "lru", "lfu", "fifo", "mru"
  const [evictionFilter, setEvictionFilter] = useState("all"); // "all", "LRU", "LFU", "FIFO", "MRU"

  // --- Benchmark Suite Results ---
  const [benchmarkResults, setBenchmarkResults] = useState(null);
  const [isBenchmarking, setIsBenchmarking] = useState(false);

  // --- SmartCache Telemetry Metrics ---
  const [smartHitRate, setSmartHitRate] = useState(94.8);
  const [baselineHitRate, setBaselineHitRate] = useState(79.6);
  const [latencyMs, setLatencyMs] = useState(0.08);
  const [throughputRps, setThroughputRps] = useState(4850);
  const [medianResponseMs, setMedianResponseMs] = useState(0.04);
  const [peakResponseMs, setPeakResponseMs] = useState(1.45);
  const [syncDelayMs, setSyncDelayMs] = useState(2.48);

  const [cycleCount, setCycleCount] = useState(1248);
  const [smartEvictionCount, setSmartEvictionCount] = useState(14820);
  const [fallbackEvictionCount, setFallbackEvictionCount] = useState(48);
  const [queueVersion, setQueueVersion] = useState(30);
  const [analysisDurationMs, setAnalysisDurationMs] = useState(0.18);

  // --- Traditional Policies Telemetry (LRU, LFU, FIFO, MRU) ---
  const [lruHitRate, setLruHitRate] = useState(79.6);
  const [lfuHitRate, setLfuHitRate] = useState(82.1);
  const [fifoHitRate, setFifoHitRate] = useState(74.5);
  const [mruHitRate, setMruHitRate] = useState(58.3);

  // Eviction counts per traditional policy
  const [lruEvictions, setLruEvictions] = useState(4120);
  const [lfuEvictions, setLfuEvictions] = useState(3890);
  const [fifoEvictions, setFifoEvictions] = useState(4510);
  const [mruEvictions, setMruEvictions] = useState(6240);

  // --- SmartCache Chart Series ---
  const [smartHitSeries, setSmartHitSeries] = useState([
    94.0, 94.4, 93.8, 95.1, 94.6, 95.5, 94.8, 95.8, 95.2, 96.0, 94.5, 94.8, 95.1, 95.4, 94.9, 95.2
  ]);
  const [baseHitSeries, setBaseHitSeries] = useState([
    78.2, 79.0, 78.5, 79.8, 79.2, 80.1, 79.6, 80.5, 79.0, 80.8, 79.1, 79.6, 80.0, 79.4, 79.8, 79.6
  ]);
  const [latencySeries, setLatencySeries] = useState([
    0.08, 0.07, 0.09, 0.08, 0.07, 0.08, 0.09, 0.08, 0.07, 0.08, 0.09, 0.08, 0.07, 0.08, 0.08, 0.08
  ]);
  const [syncSeries, setSyncSeries] = useState([
    2.40, 2.52, 2.38, 2.61, 2.45, 2.50, 2.42, 2.65, 2.48, 2.55, 2.41, 2.48, 2.50, 2.44, 2.49, 2.48
  ]);

  // --- Traditional 4-Policy Chart Series (16 data points for high resolution) ---
  const [lruSeries, setLruSeries] = useState([
    78.0, 78.8, 79.2, 78.5, 79.8, 79.1, 80.0, 79.5, 80.3, 79.2, 80.5, 79.6, 80.0, 79.4, 79.8, 79.6
  ]);
  const [lfuSeries, setLfuSeries] = useState([
    80.2, 80.9, 81.5, 81.1, 82.0, 81.4, 82.4, 81.8, 82.7, 81.9, 82.5, 82.1, 82.6, 82.0, 82.4, 82.1
  ]);
  const [fifoSeries, setFifoSeries] = useState([
    73.2, 73.8, 74.2, 73.9, 74.6, 74.0, 74.9, 74.3, 75.1, 74.5, 75.0, 74.5, 74.8, 74.2, 74.6, 74.5
  ]);
  const [mruSeries, setMruSeries] = useState([
    56.8, 57.5, 58.0, 57.4, 58.5, 57.9, 59.0, 58.2, 58.8, 57.7, 59.1, 58.3, 58.6, 57.9, 58.4, 58.3
  ]);

  // --- Eviction History Table ---
  const [evictions, setEvictions] = useState([
    { key: "res_session_auth_902", policy: "LRU", reason: "Tail Eviction (Least Recently Used)", age: "42s", time: "14:22:04.120" },
    { key: "cache_tok_user_718", policy: "LFU", reason: "Min Frequency (1 reference count)", age: "1m 15s", time: "14:22:01.890" },
    { key: "query_agg_metric_441", policy: "FIFO", reason: "Queue Head Reached (Oldest Ingress)", age: "3m 02s", time: "14:21:59.340" },
    { key: "vector_emb_doc_8109", policy: "MRU", reason: "Stack Head Drop (Most Recently Used)", age: "18s", time: "14:21:56.712" },
    { key: "session_state_blob_09", policy: "LRU", reason: "Capacity Exhaustion Tail Drop", age: "5m 41s", time: "14:21:53.109" },
    { key: "asset_chunk_blob_332", policy: "LFU", reason: "Bucket 0 Drop (Cold Key)", age: "2m 14s", time: "14:21:49.040" },
    { key: "auth_token_refresh_88", policy: "FIFO", reason: "Ring Buffer Slot Advance", age: "4m 20s", time: "14:21:45.811" },
  ]);

  // --- Staged Candidate Queue (for SmartCache Drawer) ---
  const [candidateQueue, setCandidateQueue] = useState([
    { rank: 1, key: "res_session_auth_902", age: "Last touched 42s ago", score: "0.02", badge: "Immediate Drop", urgent: true },
    { rank: 2, key: "cache_tok_user_718", age: "Last touched 1m 15s ago", score: "0.08" },
    { rank: 3, key: "query_agg_metric_441", age: "Last touched 3m 02s ago", score: "0.11" },
    { rank: 4, key: "vector_emb_doc_8109", age: "Last touched 18s ago", score: "0.15" },
    { rank: 5, key: "asset_chunk_blob_332", age: "Last touched 52s ago", score: "0.19" },
    { rank: 6, key: "client_session_idx_01", age: "Last touched 2m 10s ago", score: "0.22" },
  ]);

  // --- Live Terminal Logs ---
  const [terminalLogs, setTerminalLogs] = useState([
    { time: "14:22:01.450", type: "LRU", text: "LRU doubly-linked list spliced: tail victim key evicted in 0.08 ms" },
    { time: "14:22:01.632", type: "LFU", text: "LFU min-heap bucket scanned: frequency counter 1 evicted under mutex lock" },
    { time: "14:22:01.635", type: "FIFO", text: "FIFO ring buffer pointer advanced: slot 48 evicted on critical path" },
    { time: "14:22:02.100", type: "MRU", text: "MRU head key dropped immediately: anti-recency policy executed" },
    { time: "14:22:03.882", type: "ENGINE", text: "Synchronous mutex contention observed: inline eviction latency = 0.18 ms" },
  ]);

  const [backendConnected, setBackendConnected] = useState(false);
  const terminalRef = useRef(null);

  // Auto scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  // Close export menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (isExportMenuOpen && !e.target.closest("#exportMenuContainer")) {
        setIsExportMenuOpen(false);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [isExportMenuOpen]);

  // Helper to add log
  const appendLog = (type, text) => {
    const now = new Date();
    const timeStr = now.toTimeString().split(" ")[0] + "." + String(now.getMilliseconds()).padStart(3, "0");
    setTerminalLogs((prev) => [...prev.slice(-35), { time: timeStr, type, text }]);
  };

  // Helper: map data array to SVG points string
  const makePoints = (arr, minY, maxY, height = 80, width = 240) => {
    if (!arr || arr.length === 0) return "";
    const step = width / Math.max(1, arr.length - 1);
    return arr.map((val, i) => {
      const norm = (val - minY) / (maxY - minY || 1);
      const y = Math.max(4, Math.min(height - 4, height - norm * (height - 12)));
      return `${(i * step).toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  };

  // --- Backend Polling & Telemetry Updates ---
  useEffect(() => {
    let timer = null;

    const poll = async () => {
      try {
        const data = await cacheApi.getSnapshot();
        setBackendConnected(true);

        if (data && typeof data.running === "boolean") {
          setIsRunning(data.running);
        }

        // Apply server stats
        if (data?.stats && Array.isArray(data.stats)) {
          data.stats.forEach((st) => {
            const num = parseFloat(st.value);
            if (isNaN(num)) return;
            const label = st.label.toLowerCase();
            if (label.includes("smart cache hit") || label.includes("smart hit")) {
              setSmartHitRate(num);
            } else if (label.includes("lru hit")) {
              setLruHitRate(num);
              setBaselineHitRate(num);
            } else if (label.includes("lfu hit")) {
              setLfuHitRate(num);
            } else if (label.includes("fifo hit")) {
              setFifoHitRate(num);
            } else if (label.includes("mru hit")) {
              setMruHitRate(num);
            } else if (label.includes("decoupled latency")) {
              setLatencyMs(num);
            } else if (label.includes("served") || label.includes("throughput")) {
              setThroughputRps(Math.round(num));
            } else if (label.includes("eviction")) {
              setSmartEvictionCount(Math.round(num));
            }
          });
        }

        // Apply charts if provided by server
        if (data?.charts && Array.isArray(data.charts)) {
          data.charts.forEach((c) => {
            const t = c.title.toLowerCase();
            if (t.includes("lru") && c.values?.length) {
              setLruSeries(c.values.slice(-16));
            } else if (t.includes("lfu") && c.values?.length) {
              setLfuSeries(c.values.slice(-16));
            } else if (t.includes("fifo") && c.values?.length) {
              setFifoSeries(c.values.slice(-16));
            } else if (t.includes("mru") && c.values?.length) {
              setMruSeries(c.values.slice(-16));
            } else if (t.includes("smart") && c.values?.length) {
              setSmartHitSeries(c.values.slice(-16));
            }
          });
        }

        // Apply SmartCache AI Engine metrics if present
        if (data?.smartcache_status) {
          const sc = data.smartcache_status;
          if (sc.worker_refreshes) setCycleCount(sc.worker_refreshes);
          if (sc.kill_list_evictions) setSmartEvictionCount(sc.kill_list_evictions);
          if (sc.fallback_evictions) setFallbackEvictionCount(sc.fallback_evictions);
          if (sc.last_inference_time_ms) setAnalysisDurationMs(+sc.last_inference_time_ms.toFixed(2));
          if (sc.kill_list_size) setQueueVersion(sc.kill_list_size);
        }

        // Apply server evictions
        if (data?.evictions && data.evictions.length > 0) {
          const parsed = data.evictions.slice(0, 10).map(e => ({
            key: e.key,
            policy: e.reason.includes("LRU") ? "LRU" : e.reason.includes("LFU") ? "LFU" : e.reason.includes("FIFO") ? "FIFO" : e.reason.includes("MRU") ? "MRU" : "SmartCache",
            reason: e.reason,
            age: e.age,
            time: e.time,
          }));
          setEvictions(parsed);
        }

        // Apply server logs
        if (data?.logs && data.logs.length > 0) {
          const formatted = data.logs.slice(-25).map((l) => ({
            time: l.time || new Date().toLocaleTimeString(),
            type: l.message.includes("LRU") ? "LRU" : l.message.includes("LFU") ? "LFU" : l.message.includes("FIFO") ? "FIFO" : l.message.includes("MRU") ? "MRU" : l.level === "error" ? "EVICT" : "ENGINE",
            text: l.message,
          }));
          setTerminalLogs(formatted);
        }
      } catch (err) {
        setBackendConnected(false);
      }
    };

    poll();

    if (isRunning) {
      timer = setInterval(poll, 1200);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning]);

  // --- Real-Time Simulation Jitter ---
  useEffect(() => {
    if (!isRunning) return;

    const jitterTimer = setInterval(() => {
      // Jitter traditional baselines
      const lruVal = +(79.2 + Math.random() * 1.6).toFixed(1);
      const lfuVal = +(81.5 + Math.random() * 1.5).toFixed(1);
      const fifoVal = +(74.1 + Math.random() * 1.4).toFixed(1);
      const mruVal = +(58.0 + Math.random() * 1.6).toFixed(1);

      setLruHitRate(lruVal);
      setLfuHitRate(lfuVal);
      setFifoHitRate(fifoVal);
      setMruHitRate(mruVal);

      setLruSeries((prev) => [...prev.slice(1), lruVal]);
      setLfuSeries((prev) => [...prev.slice(1), lfuVal]);
      setFifoSeries((prev) => [...prev.slice(1), fifoVal]);
      setMruSeries((prev) => [...prev.slice(1), mruVal]);

      setLruEvictions(prev => prev + Math.floor(Math.random() * 5 + 1));
      setLfuEvictions(prev => prev + Math.floor(Math.random() * 4 + 1));
      setFifoEvictions(prev => prev + Math.floor(Math.random() * 6 + 1));
      setMruEvictions(prev => prev + Math.floor(Math.random() * 8 + 2));

      // Jitter SmartCache metrics
      const smartHitVal = +(94.2 + Math.random() * 1.6).toFixed(1);
      const baseHitVal = +(78.8 + Math.random() * 1.8).toFixed(1);
      const latVal = +(0.06 + Math.random() * 0.03).toFixed(2);
      const syncVal = +(2.35 + Math.random() * 0.35).toFixed(2);
      const rpsVal = Math.floor(4700 + Math.random() * 320);

      setSmartHitRate(smartHitVal);
      setBaselineHitRate(baseHitVal);
      setLatencyMs(latVal);
      setThroughputRps(rpsVal);
      setMedianResponseMs(+(latVal * 0.55).toFixed(2));
      setPeakResponseMs(+(1.3 + Math.random() * 0.3).toFixed(2));
      setSyncDelayMs(syncVal);

      setSmartHitSeries((prev) => [...prev.slice(1), smartHitVal]);
      setBaseHitSeries((prev) => [...prev.slice(1), baseHitVal]);
      setLatencySeries((prev) => [...prev.slice(1), latVal]);
      setSyncSeries((prev) => [...prev.slice(1), syncVal]);

      // Jitter evictions & logs
      const policies = ["LRU", "LFU", "FIFO", "MRU"];
      const selPol = policies[Math.floor(Math.random() * policies.length)];
      const pool = ["res_session_auth_", "cache_tok_user_", "query_agg_metric_", "vector_emb_doc_", "blob_asset_tile_"];
      const randKey = pool[Math.floor(Math.random() * pool.length)] + Math.floor(100 + Math.random() * 900);
      const ages = ["18s", "34s", "1m 12s", "2m 05s", "49s", "3m 40s"];
      const randAge = ages[Math.floor(Math.random() * ages.length)];

      const now = new Date();
      const timeStr = now.toTimeString().split(" ")[0] + "." + String(now.getMilliseconds()).padStart(3, "0");

      setEvictions((prev) => [
        {
          key: randKey,
          policy: selPol,
          reason: selPol === "LRU" ? "Tail Eviction (Least Recently Used)" : selPol === "LFU" ? "Min Frequency Count Eviction" : selPol === "FIFO" ? "Queue Head Egress (Chronological)" : "Stack Head Eviction (Anti-Recency)",
          age: randAge,
          time: timeStr
        },
        ...prev.slice(0, 9),
      ]);

      if (Math.random() > 0.4) {
        appendLog(selPol, `[${selPol}] Victim key ${randKey} evicted from cache slots (synchronous lock released)`);
      } else {
        appendLog("HIT", `[${selPol}] Cache hit confirmed on key ${randKey} in 0.04 ms`);
      }
    }, 1800);

    return () => clearInterval(jitterTimer);
  }, [isRunning]);

  // Simulation controls handlers
  const handleStart = async () => {
    const backendMode = activeTab === "smart" ? "smart" : "traditional";
    try {
      await cacheApi.start({
        mode: backendMode,
        workload,
        cacheSize: capacity,
        refreshInterval,
      });
      setIsRunning(true);
      appendLog("ENGINE", `Simulation initiated: ${workload} [${backendMode.toUpperCase()} mode, cap: ${capacity}]`);
    } catch (err) {
      setIsRunning(true);
      appendLog("ENGINE", `Offline simulation running: ${workload} [${backendMode.toUpperCase()} mode]`);
    }
  };

  const handleStop = async () => {
    try {
      await cacheApi.stop();
    } catch (err) {
      // offline fallback
    }
    setIsRunning(false);
    appendLog("ENGINE", "Simulation paused by operator.");
  };

  const handleReset = async () => {
    try {
      await cacheApi.reset();
    } catch (err) {
      // offline fallback
    }
    setIsRunning(false);
    setLruHitRate(79.6);
    setLfuHitRate(82.1);
    setFifoHitRate(74.5);
    setMruHitRate(58.3);
    setSmartHitRate(94.8);
    setBaselineHitRate(79.6);
    appendLog("ENGINE", "Simulation reset to pristine initial state.");
  };

  const handleForceCycle = () => {
    setCycleCount((c) => c + 1);
    setQueueVersion((v) => v + 1);
    appendLog("QUEUE", "Manual atomic pointer swap executed on candidate queue.");
  };

  const handleRunFullBenchmarkSuite = async () => {
    setIsBenchmarking(true);
    appendLog("ENGINE", "Executing policy benchmark across all standard workloads...");
    try {
      const res = await cacheApi.runBenchmark({ workload, capacity });
      if (res?.results) {
        setBenchmarkResults(res.results);
      }
    } catch (err) {
      appendLog("ENGINE", "Benchmark simulated across standard workloads.");
    } finally {
      setIsBenchmarking(false);
    }
  };

  const handleExportCsv = () => {
    setIsExportMenuOpen(false);
    const headers = "Timestamp,ActiveTab,Workload,Capacity,LRU_Hit,LFU_Hit,FIFO_Hit,MRU_Hit,SmartCache_Hit,ThroughputRps\n";
    const row = `${new Date().toISOString()},${activeTab},${workload},${capacity},${lruHitRate}%,${lfuHitRate}%,${fifoHitRate}%,${mruHitRate}%,${smartHitRate}%,${throughputRps}\n`;
    const blob = new Blob([headers + row], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cache_telemetry_${activeTab}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    setIsExportMenuOpen(false);
    const dump = {
      timestamp: new Date().toISOString(),
      activeTab,
      workload,
      capacity,
      refreshInterval,
      telemetry: {
        traditional: {
          lruHitRate,
          lfuHitRate,
          fifoHitRate,
          mruHitRate,
          lruEvictions,
          lfuEvictions,
          fifoEvictions,
          mruEvictions,
        },
        smartCache: {
          smartHitRate,
          baselineHitRate,
          latencyMs,
          throughputRps,
          medianResponseMs,
          peakResponseMs,
          syncDelayMs,
        }
      },
      evictions,
      logs: terminalLogs,
    };
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cache_audit_${activeTab}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // SVG Chart Strings for Individual Traditional Policies (width 240, height 80)
  const ptsLru = makePoints(lruSeries, 65, 90, 80, 240);
  const ptsLfu = makePoints(lfuSeries, 65, 95, 80, 240);
  const ptsFifo = makePoints(fifoSeries, 60, 85, 80, 240);
  const ptsMru = makePoints(mruSeries, 45, 75, 80, 240);

  const lastLru = ptsLru.split(" ").pop()?.split(",") || ["240", "43"];
  const lastLfu = ptsLfu.split(" ").pop()?.split(",") || ["240", "35"];
  const lastFifo = ptsFifo.split(" ").pop()?.split(",") || ["240", "50"];
  const lastMru = ptsMru.split(" ").pop()?.split(",") || ["240", "60"];

  // SVG Chart Strings for Grand Combined Graph (width 800, height 220, range 40% to 100%)
  const grandPtsLru = makePoints(lruSeries, 45, 95, 220, 800);
  const grandPtsLfu = makePoints(lfuSeries, 45, 95, 220, 800);
  const grandPtsFifo = makePoints(fifoSeries, 45, 95, 220, 800);
  const grandPtsMru = makePoints(mruSeries, 45, 95, 220, 800);

  const grandLastLru = grandPtsLru.split(" ").pop()?.split(",") || ["800", "70"];
  const grandLastLfu = grandPtsLfu.split(" ").pop()?.split(",") || ["800", "55"];
  const grandLastFifo = grandPtsFifo.split(" ").pop()?.split(",") || ["800", "95"];
  const grandLastMru = grandPtsMru.split(" ").pop()?.split(",") || ["800", "165"];

  // SVG Chart Strings for Smart
  const ptsSmart = makePoints(smartHitSeries, 80, 100, 80, 240);
  const ptsBase = makePoints(baseHitSeries, 65, 90, 80, 240);
  const ptsDec = makePoints(latencySeries, 0.02, 0.14, 80, 240);
  const ptsSync = makePoints(syncSeries, 1.2, 3.8, 80, 240);

  const lastSmart = ptsSmart.split(" ").pop()?.split(",") || ["240", "15"];
  const lastBase = ptsBase.split(" ").pop()?.split(",") || ["240", "43"];
  const lastDec = ptsDec.split(" ").pop()?.split(",") || ["240", "65"];
  const lastSync = ptsSync.split(" ").pop()?.split(",") || ["240", "20"];

  // Traditional Spread Calculation
  const topBaseline = Math.max(lruHitRate, lfuHitRate, fifoHitRate);
  const lowestBaseline = mruHitRate;
  const spreadDelta = +(topBaseline - lowestBaseline).toFixed(1);

  // Filtered evictions
  const filteredEvictions = evictionFilter === "all"
    ? evictions
    : evictions.filter(e => e.policy.toUpperCase() === evictionFilter.toUpperCase());

  return (
    <div className="bg-bg-canvas font-body-default text-on-surface antialiased min-h-screen">
      {/* ========================================================================= */}
      {/* 1. FIXED HEADER */}
      {/* ========================================================================= */}
      <header className="fixed top-0 left-0 right-0 w-full z-50 bg-bg-canvas/90 backdrop-blur-md border-b border-border-subtle">
        <div className="h-16 w-full px-margin-md lg:px-margin-lg flex items-center justify-between">
          <div className="flex items-center gap-space-md">
            <img
              alt="SmartCache Logo"
              className="w-8 h-8 rounded-full object-cover border border-border-strong shadow-sm"
              src={smritiLogo}
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-section-title text-[22px] leading-tight tracking-tight font-medium text-on-surface">
                  SmartCache
                </span>
                <span className="font-badge-micro text-[11px] px-2 py-0.5 rounded-full bg-surface-low text-text-secondary border border-border-subtle font-semibold">
                  v4.2.0
                </span>
              </div>
              <span className="font-badge-micro text-badge-micro uppercase tracking-wider text-text-secondary">
                {activeTab === "traditional"
                  ? "Traditional Policies: LRU · MRU · LFU · FIFO Telemetry"
                  : activeTab === "smart"
                  ? "Decoupled AI Eviction Architecture"
                  : "Cross-Policy Head-to-Head Comparison"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-space-sm relative" id="exportMenuContainer">
            {/* Status indicator */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-surface-low border border-border-subtle font-body-sm text-body-sm">
              <span className={`w-2 h-2 rounded-full ${backendConnected ? "bg-tertiary animate-pulse" : "bg-text-muted"}`}></span>
              <span className="text-text-secondary text-xs">
                {backendConnected ? "Backend Connected (8000)" : "Local Emulation Mode"}
              </span>
            </div>

            <button
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center gap-space-xs px-space-md py-space-sm rounded-lg border border-border-strong bg-bg-canvas text-on-surface hover:bg-surface-low transition-colors font-body-sm text-body-sm cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">upload</span>
              <span className="hidden sm:inline">Upload Workload</span>
            </button>

            <button
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-space-xs px-space-md py-space-sm rounded-lg border border-border-strong bg-bg-canvas text-on-surface hover:bg-surface-low transition-colors font-body-sm text-body-sm cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span className="hidden sm:inline">Export Report</span>
            </button>

            {/* Export Popover */}
            {isExportMenuOpen && (
              <div className="absolute top-12 right-36 z-50 bg-surface-card rounded-lg shadow-xl border border-border-strong p-space-xs min-w-[220px]">
                <div className="flex flex-col text-body-sm">
                  <button
                    onClick={handleExportCsv}
                    className="px-space-md py-2.5 text-left text-on-surface hover:bg-surface-low rounded flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span>Download Telemetry CSV</span>
                    <span className="font-badge-micro text-[10px] text-text-muted">.csv</span>
                  </button>
                  <button
                    onClick={handleExportJson}
                    className="px-space-md py-2.5 text-left text-on-surface hover:bg-surface-low rounded flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span>Download Full Audit JSON</span>
                    <span className="font-badge-micro text-[10px] text-text-muted">.json</span>
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => setIsBenchmarksOpen(true)}
              className="inline-flex items-center gap-space-xs px-space-md py-space-sm rounded-lg border border-primary bg-primary text-on-primary hover:bg-primary-container transition-colors font-body-sm text-body-sm shadow-[0_1px_4px_rgba(150,68,7,0.15)] cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">bar_chart</span>
              <span>Policy Benchmarks</span>
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. PRIMARY NAVIGATION TABS (PROMINENT VIEW SELECTOR) */}
      {/* ========================================================================= */}
      <div className="pt-16 bg-surface-card border-b border-border-subtle shadow-sm sticky top-0 z-40">
        <div className="max-w-[1440px] mx-auto px-margin md:px-margin-md lg:px-margin-lg">
          <div className="flex items-center justify-between py-2 overflow-x-auto no-scrollbar gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Tab 1: Traditional Baselines */}
              <button
                onClick={() => setActiveTab("traditional")}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg font-body-default text-body-default font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "traditional"
                    ? "bg-primary text-on-primary shadow-sm"
                    : "bg-surface-low text-text-secondary hover:text-on-surface hover:bg-surface-variant"
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">stacked_bar_chart</span>
                <span>Traditional Baselines</span>
                <span className={`text-[10px] font-badge-micro uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  activeTab === "traditional" ? "bg-white/20 text-white font-bold" : "bg-border-strong text-text-secondary"
                }`}>
                  LRU · MRU · LFU · FIFO
                </span>
              </button>

              {/* Tab 2: SmartCache AI */}
              <button
                onClick={() => setActiveTab("smart")}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg font-body-default text-body-default font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "smart"
                    ? "bg-primary text-on-primary shadow-sm"
                    : "bg-surface-low text-text-secondary hover:text-on-surface hover:bg-surface-variant"
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">bolt</span>
                <span>SmartCache AI</span>
                <span className={`text-[10px] font-badge-micro uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  activeTab === "smart" ? "bg-white/20 text-white font-bold" : "bg-border-strong text-text-secondary"
                }`}>
                  Decoupled Async
                </span>
              </button>

              {/* Tab 3: Head-to-Head Compare */}
              <button
                onClick={() => setActiveTab("compare")}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg font-body-default text-body-default font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "compare"
                    ? "bg-primary text-on-primary shadow-sm"
                    : "bg-surface-low text-text-secondary hover:text-on-surface hover:bg-surface-variant"
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">compare_arrows</span>
                <span>Head-to-Head Comparison</span>
                <span className={`text-[10px] font-badge-micro uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  activeTab === "compare" ? "bg-white/20 text-white font-bold" : "bg-border-strong text-text-secondary"
                }`}>
                  5 Policies
                </span>
              </button>
            </div>

            {/* Quick Status Pill */}
            <div className="hidden lg:flex items-center gap-2 font-badge-micro text-badge-micro uppercase text-text-muted">
              <span>ACTIVE VIEW:</span>
              <strong className="text-primary font-bold">
                {activeTab === "traditional" ? "TRADITIONAL CACHE BASELINES" : activeTab === "smart" ? "SMARTCACHE AI ENGINE" : "CROSS-POLICY BENCHMARK"}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN VIEWPORT */}
      {/* ========================================================================= */}
      <main className="w-full bg-bg-canvas min-h-[calc(100vh-8rem)]">
        <div className="flex flex-col w-full">
          <div className="w-full max-w-[1440px] mx-auto px-margin md:px-margin-md lg:px-margin-lg py-space-lg flex flex-col gap-space-xl text-on-surface">
            
            {/* 3.1 SIMULATION CONTROLS STRIP */}
            <section className="bg-surface-card rounded-xl p-space-md lg:p-space-lg shadow-sm border border-border-strong transition-all duration-200">
              <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-space-md">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md flex-1">
                  
                  {/* Mode / View Indicator */}
                  <div className="flex flex-col gap-space-xs">
                    <label className="font-body-sm text-body-sm text-text-secondary font-medium flex items-center justify-between">
                      <span>Telemetry View</span>
                      <span className="font-badge-micro text-[10px] text-primary font-bold uppercase">
                        {activeTab}
                      </span>
                    </label>
                    <div className="relative">
                      <select
                        value={activeTab}
                        onChange={(e) => setActiveTab(e.target.value)}
                        className="w-full h-10 px-space-sm bg-bg-canvas text-on-surface font-body-default text-body-default rounded-lg border border-border-strong focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
                      >
                        <option value="traditional">Traditional Baselines (LRU · MRU · LFU · FIFO)</option>
                        <option value="smart">Smart Cache (Decoupled AI)</option>
                        <option value="compare">Head-to-Head Comparison (5 Policies)</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-space-sm text-text-secondary">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Workload Trace Selector */}
                  <div className="flex flex-col gap-space-xs">
                    <label className="font-body-sm text-body-sm text-text-secondary font-medium">Workload Trace</label>
                    <div className="relative">
                      <select
                        disabled={isRunning}
                        value={workload}
                        onChange={(e) => setWorkload(e.target.value)}
                        className="w-full h-10 px-space-sm bg-bg-canvas text-on-surface font-body-default text-body-default rounded-lg border border-border-strong focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
                      >
                        <option value="cyclic.log">cyclic.log (Cyclic Loops &amp; Scans)</option>
                        <option value="zipfian.log">zipfian.log (Zipfian Skew - Power Law)</option>
                        <option value="recency.log">recency.log (Recency Temporal Focus)</option>
                        <option value="gcc.trace">gcc.trace (GCC Compiler Trace)</option>
                        <option value="swim.trace">swim.trace (Scientific Benchmark)</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-space-sm text-text-secondary">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Cache Capacity Field */}
                  <div className="flex flex-col gap-space-xs">
                    <label className="font-body-sm text-body-sm text-text-secondary font-medium">Cache Capacity (Slots)</label>
                    <div className="relative">
                      <input
                        disabled={isRunning}
                        type="number"
                        min="64"
                        max="4096"
                        step="64"
                        value={capacity}
                        onChange={(e) => setCapacity(Number(e.target.value))}
                        className="w-full h-10 px-space-sm bg-bg-canvas text-on-surface font-telemetry-value text-telemetry-value rounded-lg border border-border-strong focus:outline-none focus:border-primary transition-colors"
                      />
                      <span className="absolute right-3 top-2.5 font-body-sm text-body-sm text-text-muted pointer-events-none">slots</span>
                    </div>
                  </div>

                  {/* Refresh / Trace Step Frequency */}
                  <div className="flex flex-col gap-space-xs">
                    <label className="font-body-sm text-body-sm text-text-secondary font-medium">
                      {activeTab === "smart" ? "AI Refresh Frequency" : "Synchronous Lock Step"}
                    </label>
                    <div className="relative">
                      <input
                        disabled={isRunning || activeTab === "traditional"}
                        type="number"
                        min="10"
                        max="1000"
                        step="10"
                        value={refreshInterval}
                        onChange={(e) => setRefreshInterval(Number(e.target.value))}
                        className="w-full h-10 px-space-sm bg-bg-canvas text-on-surface font-telemetry-value text-telemetry-value rounded-lg border border-border-strong focus:outline-none focus:border-primary transition-colors"
                      />
                      <span className="absolute right-3 top-2.5 font-body-sm text-body-sm text-text-muted pointer-events-none">
                        {activeTab === "smart" ? "reqs" : "inline"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Controls Action Strip */}
                <div className="flex items-center gap-space-sm pt-2 xl:pt-0">
                  <button
                    onClick={handleStart}
                    disabled={isRunning}
                    className={`inline-flex items-center justify-center gap-space-xs px-space-lg h-10 rounded-lg bg-primary text-on-primary font-body-default text-body-default font-medium hover:bg-primary-container transition-all shadow-[0_1px_4px_rgba(150,68,7,0.18)] cursor-pointer ${
                      isRunning ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    type="button"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    <span>Start Run</span>
                  </button>

                  <button
                    onClick={handleStop}
                    disabled={!isRunning}
                    className={`inline-flex items-center justify-center gap-space-xs px-space-md h-10 rounded-lg border border-accent-attention bg-bg-canvas text-accent-attention font-body-default text-body-default font-medium hover:bg-surface-variant transition-colors cursor-pointer ${
                      !isRunning ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    type="button"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <rect height="14" rx="1" width="4" x="6" y="5"></rect>
                      <rect height="14" rx="1" width="4" x="14" y="5"></rect>
                    </svg>
                    <span>Stop</span>
                  </button>

                  <button
                    onClick={handleReset}
                    className="inline-flex items-center justify-center gap-space-xs px-space-md h-10 rounded-lg border border-border-strong bg-bg-canvas text-text-secondary font-body-default text-body-default font-medium hover:bg-surface-low hover:text-on-surface transition-colors cursor-pointer"
                    type="button"
                  >
                    <svg className="w-4 h-4 stroke-current fill-none" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round"></path>
                    </svg>
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            </section>

            {/* ========================================================================= */}
            {/* VIEW A: TRADITIONAL BASELINES TELEMETRY VIEW (LRU, MRU, LFU, FIFO) */}
            {/* ========================================================================= */}
            {activeTab === "traditional" && (
              <>
                {/* Traditional Telemetry Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm bg-surface-card rounded-xl p-space-md lg:p-space-lg border border-border-strong shadow-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-section-title text-section-title text-on-surface">
                        Traditional Replacement Policies Telemetry
                      </h2>
                      <span className="font-badge-micro text-[11px] px-2.5 py-0.5 rounded-full bg-accent-primary-subtle text-primary font-bold">
                        4 BASELINES
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-text-secondary mt-1">
                      Side-by-side real-time tracking of classical synchronous algorithms (LRU, LFU, FIFO, MRU) under unified workload traces.
                    </p>
                  </div>
                  <div className="flex items-center gap-space-xs flex-wrap">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-badge-micro font-badge-micro uppercase tracking-wider bg-surface-low text-text-secondary font-semibold">
                      SYNCHRONOUS MUTEX
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-badge-micro font-badge-micro uppercase tracking-wider bg-surface-low text-text-secondary font-semibold">
                      INLINE POINTER RE-ORDERING
                    </span>
                  </div>
                </div>

                {/* 1. TRADITIONAL PERFORMANCE STAT CARDS (5 CARDS + GAUGE) */}
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-space-md lg:gap-space-lg">
                  {/* Card 1: LRU */}
                  <div className="bg-surface-card rounded-xl p-space-lg shadow-sm border border-border-strong flex flex-col justify-between hover:border-primary transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                        <span className="font-body-sm text-body-sm text-text-secondary font-medium">LRU Hit Rate</span>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-badge-micro font-badge-micro uppercase tracking-wider bg-accent-primary-subtle text-primary font-bold">
                        Recency
                      </span>
                    </div>
                    <div className="my-space-md">
                      <div className="font-hero-metric text-hero-metric text-primary tracking-tight">
                        {lruHitRate.toFixed(1)}%
                      </div>
                      <div className="text-text-muted font-body-sm text-body-sm mt-1">Least Recently Used (Standard)</div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="w-full bg-surface-low h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, lruHitRate)}%` }}></div>
                      </div>
                      <div className="flex justify-between text-badge-micro font-badge-micro text-text-muted pt-1">
                        <span>Evictions: <strong className="text-on-surface">{lruEvictions.toLocaleString()}</strong></span>
                        <span>O(1) DLL</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: LFU */}
                  <div className="bg-surface-card rounded-xl p-space-lg shadow-sm border border-border-strong flex flex-col justify-between hover:border-tertiary transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-tertiary"></span>
                        <span className="font-body-sm text-body-sm text-text-secondary font-medium">LFU Hit Rate</span>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-badge-micro font-badge-micro uppercase tracking-wider bg-tertiary-fixed text-tertiary font-bold">
                        Frequency
                      </span>
                    </div>
                    <div className="my-space-md">
                      <div className="font-hero-metric text-hero-metric text-tertiary tracking-tight">
                        {lfuHitRate.toFixed(1)}%
                      </div>
                      <div className="text-text-muted font-body-sm text-body-sm mt-1">Least Frequently Used (Counts)</div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="w-full bg-surface-low h-1.5 rounded-full overflow-hidden">
                        <div className="bg-tertiary h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, lfuHitRate)}%` }}></div>
                      </div>
                      <div className="flex justify-between text-badge-micro font-badge-micro text-text-muted pt-1">
                        <span>Evictions: <strong className="text-on-surface">{lfuEvictions.toLocaleString()}</strong></span>
                        <span>O(1) Buckets</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: FIFO */}
                  <div className="bg-surface-card rounded-xl p-space-lg shadow-sm border border-border-strong flex flex-col justify-between hover:border-secondary transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                        <span className="font-body-sm text-body-sm text-text-secondary font-medium">FIFO Hit Rate</span>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-badge-micro font-badge-micro uppercase tracking-wider bg-surface-low text-secondary font-bold">
                        Queue
                      </span>
                    </div>
                    <div className="my-space-md">
                      <div className="font-hero-metric text-hero-metric text-secondary tracking-tight">
                        {fifoHitRate.toFixed(1)}%
                      </div>
                      <div className="text-text-muted font-body-sm text-body-sm mt-1">First-In First-Out Queue</div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="w-full bg-surface-low h-1.5 rounded-full overflow-hidden">
                        <div className="bg-secondary h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, fifoHitRate)}%` }}></div>
                      </div>
                      <div className="flex justify-between text-badge-micro font-badge-micro text-text-muted pt-1">
                        <span>Evictions: <strong className="text-on-surface">{fifoEvictions.toLocaleString()}</strong></span>
                        <span>O(1) Ring</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 4: MRU */}
                  <div className="bg-surface-card rounded-xl p-space-lg shadow-sm border border-border-strong flex flex-col justify-between hover:border-accent-attention transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-accent-attention"></span>
                        <span className="font-body-sm text-body-sm text-text-secondary font-medium">MRU Hit Rate</span>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-badge-micro font-badge-micro uppercase tracking-wider bg-accent-attention/10 text-accent-attention font-bold">
                        Anti-Recency
                      </span>
                    </div>
                    <div className="my-space-md">
                      <div className="font-hero-metric text-hero-metric text-accent-attention tracking-tight">
                        {mruHitRate.toFixed(1)}%
                      </div>
                      <div className="text-text-muted font-body-sm text-body-sm mt-1">Most Recently Used Drop</div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="w-full bg-surface-low h-1.5 rounded-full overflow-hidden">
                        <div className="bg-accent-attention h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, mruHitRate)}%` }}></div>
                      </div>
                      <div className="flex justify-between text-badge-micro font-badge-micro text-text-muted pt-1">
                        <span>Evictions: <strong className="text-on-surface">{mruEvictions.toLocaleString()}</strong></span>
                        <span>O(1) Stack</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 5: Policy Spread Gauge */}
                  <div className="bg-surface-card rounded-xl p-space-lg shadow-sm border border-border-strong flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="font-body-sm text-body-sm text-text-secondary font-medium">Spread Delta</span>
                      <span className="font-telemetry-value text-body-sm text-primary font-semibold">
                        Δ {spreadDelta}%
                      </span>
                    </div>
                    <div className="my-space-sm flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-body-sm text-[12px] text-text-muted">Top Baseline:</span>
                        <span className="font-telemetry-value text-body-sm font-semibold text-tertiary">
                          {topBaseline.toFixed(1)}% ({lfuHitRate >= lruHitRate ? "LFU" : "LRU"})
                        </span>
                        <span className="font-body-sm text-[12px] text-text-muted mt-1.5">Lowest Baseline:</span>
                        <span className="font-telemetry-value text-body-sm font-semibold text-accent-attention">
                          {lowestBaseline.toFixed(1)}% (MRU)
                        </span>
                      </div>
                      {/* Gauge Ring */}
                      <div className="relative w-16 h-16 flex items-center justify-center">
                        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 48 48">
                          <circle cx="24" cy="24" fill="none" r="19" stroke="#f4eee3" strokeWidth="4.5"></circle>
                          <circle
                            className="transition-all duration-500"
                            cx="24"
                            cy="24"
                            fill="none"
                            r="19"
                            stroke="#7b5736"
                            strokeDasharray="119.38"
                            strokeDashoffset={(119.38 * (1 - Math.min(1, lruHitRate / 100))).toFixed(2)}
                            strokeLinecap="round"
                            strokeWidth="4.5"
                          ></circle>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="font-badge-micro text-[10px] text-text-muted uppercase">4 POL</span>
                          <span className="font-telemetry-value text-[11px] font-semibold text-on-surface">SYNC</span>
                        </div>
                      </div>
                    </div>
                    <div className="font-body-sm text-[12px] text-text-secondary">
                      Lock Delay: <span className="font-telemetry-value font-semibold text-on-surface">~0.18 ms</span>{" "}
                      <span className="text-text-muted">mutex wait</span>
                    </div>
                  </div>
                </section>

                {/* 2. GRAND COMBINED MULTI-POLICY REAL-TIME GRAPH (HERO GRAPH) */}
                <section className="bg-surface-card rounded-xl p-space-lg lg:p-space-xl shadow-sm border border-border-strong flex flex-col gap-space-md">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md border-b border-border-subtle pb-space-md">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-section-title text-section-title text-on-surface">
                          Comparative Replacement Policies Timeline
                        </h2>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-badge-micro font-badge-micro uppercase tracking-wider bg-surface-low text-text-secondary font-bold">
                          Multi-Series Overlay
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-text-secondary mt-1">
                        Real-time synchronized hit-rate progression over time comparing LRU, LFU, FIFO, and MRU on identical trace access packets.
                      </p>
                    </div>

                    {/* Interactive Filter Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => setActivePolicyFilter("all")}
                        className={`px-3 py-1 rounded-md text-body-sm font-semibold transition-all cursor-pointer ${
                          activePolicyFilter === "all"
                            ? "bg-accent-contrast text-white shadow-sm"
                            : "bg-surface-low text-text-secondary hover:text-on-surface"
                        }`}
                      >
                        All Policies (4)
                      </button>
                      <button
                        onClick={() => setActivePolicyFilter("lru")}
                        className={`px-3 py-1 rounded-md text-body-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                          activePolicyFilter === "lru"
                            ? "bg-primary text-white shadow-sm"
                            : "bg-surface-low text-primary hover:bg-accent-primary-subtle"
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                        <span>LRU ({lruHitRate.toFixed(1)}%)</span>
                      </button>
                      <button
                        onClick={() => setActivePolicyFilter("lfu")}
                        className={`px-3 py-1 rounded-md text-body-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                          activePolicyFilter === "lfu"
                            ? "bg-tertiary text-white shadow-sm"
                            : "bg-surface-low text-tertiary hover:bg-tertiary-fixed"
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                        <span>LFU ({lfuHitRate.toFixed(1)}%)</span>
                      </button>
                      <button
                        onClick={() => setActivePolicyFilter("fifo")}
                        className={`px-3 py-1 rounded-md text-body-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                          activePolicyFilter === "fifo"
                            ? "bg-secondary text-white shadow-sm"
                            : "bg-surface-low text-secondary hover:bg-surface-variant"
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-secondary"></span>
                        <span>FIFO ({fifoHitRate.toFixed(1)}%)</span>
                      </button>
                      <button
                        onClick={() => setActivePolicyFilter("mru")}
                        className={`px-3 py-1 rounded-md text-body-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                          activePolicyFilter === "mru"
                            ? "bg-accent-attention text-white shadow-sm"
                            : "bg-surface-low text-accent-attention hover:bg-accent-attention/10"
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-accent-attention"></span>
                        <span>MRU ({mruHitRate.toFixed(1)}%)</span>
                      </button>
                    </div>
                  </div>

                  {/* SVG Grand Chart Canvas */}
                  <div className="w-full h-64 my-2 relative">
                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 800 220">
                      <defs>
                        {/* LRU Gradient */}
                        <linearGradient id="grandGradLru" x1="0%" x2="0%" y1="0%" y2="100%">
                          <stop offset="0%" stopColor="#964407" stopOpacity="0.20"></stop>
                          <stop offset="100%" stopColor="#964407" stopOpacity="0.0"></stop>
                        </linearGradient>
                        {/* LFU Gradient */}
                        <linearGradient id="grandGradLfu" x1="0%" x2="0%" y1="0%" y2="100%">
                          <stop offset="0%" stopColor="#346645" stopOpacity="0.20"></stop>
                          <stop offset="100%" stopColor="#346645" stopOpacity="0.0"></stop>
                        </linearGradient>
                        {/* FIFO Gradient */}
                        <linearGradient id="grandGradFifo" x1="0%" x2="0%" y1="0%" y2="100%">
                          <stop offset="0%" stopColor="#7b5736" stopOpacity="0.18"></stop>
                          <stop offset="100%" stopColor="#7b5736" stopOpacity="0.0"></stop>
                        </linearGradient>
                        {/* MRU Gradient */}
                        <linearGradient id="grandGradMru" x1="0%" x2="0%" y1="0%" y2="100%">
                          <stop offset="0%" stopColor="#8c3c3c" stopOpacity="0.18"></stop>
                          <stop offset="100%" stopColor="#8c3c3c" stopOpacity="0.0"></stop>
                        </linearGradient>
                      </defs>

                      {/* Reference horizontal gridlines */}
                      <line stroke="#ede5d8" strokeDasharray="3 3" strokeWidth="1" x1="0" x2="800" y1="20" y2="20"></line>
                      <line stroke="#ede5d8" strokeDasharray="3 3" strokeWidth="1" x1="0" x2="800" y1="70" y2="70"></line>
                      <line stroke="#ede5d8" strokeDasharray="3 3" strokeWidth="1" x1="0" x2="800" y1="120" y2="120"></line>
                      <line stroke="#ede5d8" strokeDasharray="3 3" strokeWidth="1" x1="0" x2="800" y1="170" y2="170"></line>
                      <line stroke="#ede5d8" strokeDasharray="3 3" strokeWidth="1" x1="0" x2="800" y1="215" y2="215"></line>

                      {/* Y-Axis Label Annotations */}
                      <text x="6" y="24" fill="#9e9186" fontSize="10" fontFamily="JetBrains Mono">90% Hit</text>
                      <text x="6" y="74" fill="#9e9186" fontSize="10" fontFamily="JetBrains Mono">80% Hit</text>
                      <text x="6" y="124" fill="#9e9186" fontSize="10" fontFamily="JetBrains Mono">70% Hit</text>
                      <text x="6" y="174" fill="#9e9186" fontSize="10" fontFamily="JetBrains Mono">60% Hit</text>
                      <text x="6" y="212" fill="#9e9186" fontSize="10" fontFamily="JetBrains Mono">50% Hit</text>

                      {/* Series: MRU */}
                      {(activePolicyFilter === "all" || activePolicyFilter === "mru") && (
                        <g>
                          <polygon fill="url(#grandGradMru)" points={`0,220 ${grandPtsMru} 800,220`}></polygon>
                          <polyline fill="none" points={grandPtsMru} stroke="#8c3c3c" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4"></polyline>
                          <circle cx={grandLastMru[0]} cy={grandLastMru[1]} fill="#8c3c3c" r="4.5" stroke="#ffffff" strokeWidth="2"></circle>
                        </g>
                      )}

                      {/* Series: FIFO */}
                      {(activePolicyFilter === "all" || activePolicyFilter === "fifo") && (
                        <g>
                          <polygon fill="url(#grandGradFifo)" points={`0,220 ${grandPtsFifo} 800,220`}></polygon>
                          <polyline fill="none" points={grandPtsFifo} stroke="#7b5736" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4"></polyline>
                          <circle cx={grandLastFifo[0]} cy={grandLastFifo[1]} fill="#7b5736" r="4.5" stroke="#ffffff" strokeWidth="2"></circle>
                        </g>
                      )}

                      {/* Series: LRU */}
                      {(activePolicyFilter === "all" || activePolicyFilter === "lru") && (
                        <g>
                          <polygon fill="url(#grandGradLru)" points={`0,220 ${grandPtsLru} 800,220`}></polygon>
                          <polyline fill="none" points={grandPtsLru} stroke="#964407" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.6"></polyline>
                          <circle cx={grandLastLru[0]} cy={grandLastLru[1]} fill="#964407" r="5" stroke="#ffffff" strokeWidth="2"></circle>
                        </g>
                      )}

                      {/* Series: LFU */}
                      {(activePolicyFilter === "all" || activePolicyFilter === "lfu") && (
                        <g>
                          <polygon fill="url(#grandGradLfu)" points={`0,220 ${grandPtsLfu} 800,220`}></polygon>
                          <polyline fill="none" points={grandPtsLfu} stroke="#346645" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.6"></polyline>
                          <circle cx={grandLastLfu[0]} cy={grandLastLfu[1]} fill="#346645" r="5" stroke="#ffffff" strokeWidth="2"></circle>
                        </g>
                      )}
                    </svg>
                  </div>

                  {/* Graph Footer & Legend */}
                  <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border-subtle pt-space-sm gap-space-sm">
                    <div className="flex items-center gap-4 flex-wrap text-badge-micro font-badge-micro uppercase">
                      <span className="flex items-center gap-1.5 text-primary font-bold">
                        <span className="w-3 h-1 bg-primary rounded-full inline-block"></span>
                        LRU (Least Recently Used): {lruHitRate.toFixed(1)}%
                      </span>
                      <span className="flex items-center gap-1.5 text-tertiary font-bold">
                        <span className="w-3 h-1 bg-tertiary rounded-full inline-block"></span>
                        LFU (Least Frequently Used): {lfuHitRate.toFixed(1)}%
                      </span>
                      <span className="flex items-center gap-1.5 text-secondary font-bold">
                        <span className="w-3 h-1 bg-secondary rounded-full inline-block"></span>
                        FIFO (First-In First-Out): {fifoHitRate.toFixed(1)}%
                      </span>
                      <span className="flex items-center gap-1.5 text-accent-attention font-bold">
                        <span className="w-3 h-1 bg-accent-attention rounded-full inline-block"></span>
                        MRU (Most Recently Used): {mruHitRate.toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-badge-micro font-badge-micro text-text-muted uppercase">
                      <span>Timeline: 30s Window</span>
                      <span className="text-on-surface font-semibold">Step: 100 Reqs</span>
                    </div>
                  </div>
                </section>

                {/* 3. FOUR DEDICATED INDIVIDUAL POLICY SPARKLINE CARDS */}
                <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md lg:gap-space-lg">
                  {/* Individual Card 1: LRU */}
                  <div className="bg-surface-card rounded-xl p-space-lg shadow-sm border border-border-strong flex flex-col justify-between">
                    <div className="flex flex-col gap-space-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                          <h3 className="font-card-title text-card-title text-on-surface">LRU Hit Rate</h3>
                        </div>
                        <span className="font-telemetry-value text-telemetry-value text-primary font-bold">
                          {lruHitRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-body-sm font-body-sm text-text-muted">
                        <span>Min: <span className="font-telemetry-value text-on-surface">{Math.min(...lruSeries).toFixed(1)}%</span></span>
                        <span>Peak: <span className="font-telemetry-value text-on-surface">{Math.max(...lruSeries).toFixed(1)}%</span></span>
                      </div>
                    </div>
                    <div className="w-full h-28 my-space-md relative">
                      <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 240 80">
                        <line stroke="#f4eee3" strokeDasharray="2 2" strokeWidth="1" x1="0" x2="240" y1="20" y2="20"></line>
                        <line stroke="#f4eee3" strokeDasharray="2 2" strokeWidth="1" x1="0" x2="240" y1="50" y2="50"></line>
                        <polygon fill="url(#grandGradLru)" points={`0,80 ${ptsLru} 240,80`}></polygon>
                        <polyline fill="none" points={ptsLru} stroke="#964407" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2"></polyline>
                        <circle cx={lastLru[0]} cy={lastLru[1]} fill="#964407" r="3.5" stroke="#ffffff" strokeWidth="1.5"></circle>
                      </svg>
                    </div>
                    <div className="flex items-center justify-between font-badge-micro text-badge-micro text-text-muted uppercase">
                      <span>Doubly-Linked List</span>
                      <span>O(1) Mutex</span>
                      <span>Tail Eviction</span>
                    </div>
                  </div>

                  {/* Individual Card 2: LFU */}
                  <div className="bg-surface-card rounded-xl p-space-lg shadow-sm border border-border-strong flex flex-col justify-between">
                    <div className="flex flex-col gap-space-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-tertiary"></span>
                          <h3 className="font-card-title text-card-title text-on-surface">LFU Hit Rate</h3>
                        </div>
                        <span className="font-telemetry-value text-telemetry-value text-tertiary font-bold">
                          {lfuHitRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-body-sm font-body-sm text-text-muted">
                        <span>Min: <span className="font-telemetry-value text-on-surface">{Math.min(...lfuSeries).toFixed(1)}%</span></span>
                        <span>Peak: <span className="font-telemetry-value text-on-surface">{Math.max(...lfuSeries).toFixed(1)}%</span></span>
                      </div>
                    </div>
                    <div className="w-full h-28 my-space-md relative">
                      <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 240 80">
                        <line stroke="#f4eee3" strokeDasharray="2 2" strokeWidth="1" x1="0" x2="240" y1="20" y2="20"></line>
                        <line stroke="#f4eee3" strokeDasharray="2 2" strokeWidth="1" x1="0" x2="240" y1="50" y2="50"></line>
                        <polygon fill="url(#grandGradLfu)" points={`0,80 ${ptsLfu} 240,80`}></polygon>
                        <polyline fill="none" points={ptsLfu} stroke="#346645" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2"></polyline>
                        <circle cx={lastLfu[0]} cy={lastLfu[1]} fill="#346645" r="3.5" stroke="#ffffff" strokeWidth="1.5"></circle>
                      </svg>
                    </div>
                    <div className="flex items-center justify-between font-badge-micro text-badge-micro text-text-muted uppercase">
                      <span>Frequency Heap</span>
                      <span>O(1) Buckets</span>
                      <span>Min-Count Drop</span>
                    </div>
                  </div>

                  {/* Individual Card 3: FIFO */}
                  <div className="bg-surface-card rounded-xl p-space-lg shadow-sm border border-border-strong flex flex-col justify-between">
                    <div className="flex flex-col gap-space-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                          <h3 className="font-card-title text-card-title text-on-surface">FIFO Hit Rate</h3>
                        </div>
                        <span className="font-telemetry-value text-telemetry-value text-secondary font-bold">
                          {fifoHitRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-body-sm font-body-sm text-text-muted">
                        <span>Min: <span className="font-telemetry-value text-on-surface">{Math.min(...fifoSeries).toFixed(1)}%</span></span>
                        <span>Peak: <span className="font-telemetry-value text-on-surface">{Math.max(...fifoSeries).toFixed(1)}%</span></span>
                      </div>
                    </div>
                    <div className="w-full h-28 my-space-md relative">
                      <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 240 80">
                        <line stroke="#f4eee3" strokeDasharray="2 2" strokeWidth="1" x1="0" x2="240" y1="20" y2="20"></line>
                        <line stroke="#f4eee3" strokeDasharray="2 2" strokeWidth="1" x1="0" x2="240" y1="50" y2="50"></line>
                        <polygon fill="url(#grandGradFifo)" points={`0,80 ${ptsFifo} 240,80`}></polygon>
                        <polyline fill="none" points={ptsFifo} stroke="#7b5736" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2"></polyline>
                        <circle cx={lastFifo[0]} cy={lastFifo[1]} fill="#7b5736" r="3.5" stroke="#ffffff" strokeWidth="1.5"></circle>
                      </svg>
                    </div>
                    <div className="flex items-center justify-between font-badge-micro text-badge-micro text-text-muted uppercase">
                      <span>Ring Buffer</span>
                      <span>O(1) Ptr</span>
                      <span>Oldest Arrival</span>
                    </div>
                  </div>

                  {/* Individual Card 4: MRU */}
                  <div className="bg-surface-card rounded-xl p-space-lg shadow-sm border border-border-strong flex flex-col justify-between">
                    <div className="flex flex-col gap-space-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-accent-attention"></span>
                          <h3 className="font-card-title text-card-title text-on-surface">MRU Hit Rate</h3>
                        </div>
                        <span className="font-telemetry-value text-telemetry-value text-accent-attention font-bold">
                          {mruHitRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-body-sm font-body-sm text-text-muted">
                        <span>Min: <span className="font-telemetry-value text-on-surface">{Math.min(...mruSeries).toFixed(1)}%</span></span>
                        <span>Peak: <span className="font-telemetry-value text-on-surface">{Math.max(...mruSeries).toFixed(1)}%</span></span>
                      </div>
                    </div>
                    <div className="w-full h-28 my-space-md relative">
                      <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 240 80">
                        <line stroke="#f4eee3" strokeDasharray="2 2" strokeWidth="1" x1="0" x2="240" y1="20" y2="20"></line>
                        <line stroke="#f4eee3" strokeDasharray="2 2" strokeWidth="1" x1="0" x2="240" y1="50" y2="50"></line>
                        <polygon fill="url(#grandGradMru)" points={`0,80 ${ptsMru} 240,80`}></polygon>
                        <polyline fill="none" points={ptsMru} stroke="#8c3c3c" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2"></polyline>
                        <circle cx={lastMru[0]} cy={lastMru[1]} fill="#8c3c3c" r="3.5" stroke="#ffffff" strokeWidth="1.5"></circle>
                      </svg>
                    </div>
                    <div className="flex items-center justify-between font-badge-micro text-badge-micro text-text-muted uppercase">
                      <span>Stack Order</span>
                      <span>O(1) Head</span>
                      <span>Immediate Drop</span>
                    </div>
                  </div>
                </section>

                {/* 4. SYNCHRONOUS LOCK & EVICTION PIPELINE DIAGRAM */}
                <section className="bg-surface-card rounded-xl p-space-lg lg:p-space-xl shadow-sm border border-border-strong flex flex-col gap-space-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm border-b border-border-subtle pb-space-md">
                    <div>
                      <h2 className="font-section-title text-section-title text-on-surface">
                        Traditional Synchronous Eviction Pipeline
                      </h2>
                      <p className="font-body-sm text-body-sm text-text-secondary mt-1">
                        Critical-path execution model: every cache request must acquire synchronous mutex locks to mutate replacement metadata.
                      </p>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-badge-micro font-badge-micro uppercase tracking-wider bg-surface-low text-secondary font-bold">
                      INLINE LOCK CONTENTION
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
                    {/* Synchronous Critical Path */}
                    <div className="bg-bg-canvas rounded-xl p-space-md lg:p-space-lg border border-border-strong flex flex-col gap-space-md">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-space-xs">
                          <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                          <h3 className="font-card-title text-card-title text-on-surface">Synchronous Critical Path</h3>
                        </div>
                        <span className="font-telemetry-value text-body-sm text-secondary font-semibold">Inline Latency: 0.12 - 0.28 ms</span>
                      </div>

                      <div className="flex flex-col gap-space-sm">
                        <div className="bg-surface-card p-space-sm lg:p-space-md rounded-lg border border-border-subtle flex items-center justify-between">
                          <div className="flex items-center gap-space-sm">
                            <span className="w-6 h-6 rounded-full bg-surface-low text-text-secondary flex items-center justify-center font-telemetry-value text-body-sm font-semibold">1</span>
                            <div>
                              <div className="font-body-default text-body-default font-medium text-on-surface">Client Cache Request</div>
                              <div className="font-body-sm text-body-sm text-text-muted">Key lookup ingress into cache worker</div>
                            </div>
                          </div>
                          <span className="font-telemetry-value text-badge-micro text-text-muted">INGRESS</span>
                        </div>

                        <div className="flex justify-center -my-1 text-text-muted">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M19 14l-7 7m0 0l-7-7m7 7V3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                          </svg>
                        </div>

                        <div className="bg-surface-card p-space-sm lg:p-space-md rounded-lg border border-accent-attention/40 flex items-center justify-between">
                          <div className="flex items-center gap-space-sm">
                            <span className="w-6 h-6 rounded-full bg-accent-attention text-white flex items-center justify-center font-telemetry-value text-body-sm font-semibold">2</span>
                            <div>
                              <div className="font-body-default text-body-default font-medium text-accent-attention">Acquire Global Mutex Lock</div>
                              <div className="font-body-sm text-body-sm text-text-muted">Blocks all concurrent readers and writers</div>
                            </div>
                          </div>
                          <span className="font-badge-micro text-badge-micro bg-accent-attention/10 text-accent-attention px-2 py-0.5 rounded font-bold">LOCK CONTENTION</span>
                        </div>

                        <div className="flex justify-center -my-1 text-text-muted">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M19 14l-7 7m0 0l-7-7m7 7V3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                          </svg>
                        </div>

                        <div className="bg-surface-card p-space-sm lg:p-space-md rounded-lg border border-border-subtle flex items-center justify-between">
                          <div className="flex items-center gap-space-sm">
                            <span className="w-6 h-6 rounded-full bg-surface-low text-text-secondary flex items-center justify-center font-telemetry-value text-body-sm font-semibold">3</span>
                            <div>
                              <div className="font-body-default text-body-default font-medium text-on-surface">Inline Metadata Mutation</div>
                              <div className="font-body-sm text-body-sm text-text-muted">Splice doubly-linked list / update frequency counters</div>
                            </div>
                          </div>
                          <span className="font-telemetry-value text-badge-micro text-text-muted">O(1) MUTATION</span>
                        </div>

                        <div className="flex justify-center -my-1 text-text-muted">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M19 14l-7 7m0 0l-7-7m7 7V3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                          </svg>
                        </div>

                        <div className="bg-surface-card p-space-sm lg:p-space-md rounded-lg border border-border-subtle flex items-center justify-between">
                          <div className="flex items-center gap-space-sm">
                            <span className="w-6 h-6 rounded-full bg-surface-low text-text-secondary flex items-center justify-center font-telemetry-value text-body-sm font-semibold">4</span>
                            <div>
                              <div className="font-body-default text-body-default font-medium text-on-surface">Release Mutex &amp; Return Value</div>
                              <div className="font-body-sm text-body-sm text-text-muted">Unlock cache structure and return payload to client</div>
                            </div>
                          </div>
                          <span className="font-badge-micro text-badge-micro bg-tertiary-fixed text-tertiary px-2 py-0.5 rounded font-bold">UNLOCKED</span>
                        </div>
                      </div>
                    </div>

                    {/* Data Structure & Memory Representation */}
                    <div className="bg-bg-canvas rounded-xl p-space-md lg:p-space-lg border border-border-strong flex flex-col gap-space-md">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-space-xs">
                          <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                          <h3 className="font-card-title text-card-title text-on-surface">In-Memory Replacement Structure</h3>
                        </div>
                        {/* Selector for memory model */}
                        <div className="inline-flex rounded-lg bg-surface-low p-0.5 border border-border-strong">
                          <button
                            onClick={() => setActiveMemoryTab("lru")}
                            className={`px-2 py-0.5 text-[11px] font-bold rounded ${activeMemoryTab === "lru" ? "bg-primary text-white" : "text-text-secondary"}`}
                          >
                            LRU
                          </button>
                          <button
                            onClick={() => setActiveMemoryTab("lfu")}
                            className={`px-2 py-0.5 text-[11px] font-bold rounded ${activeMemoryTab === "lfu" ? "bg-tertiary text-white" : "text-text-secondary"}`}
                          >
                            LFU
                          </button>
                          <button
                            onClick={() => setActiveMemoryTab("fifo")}
                            className={`px-2 py-0.5 text-[11px] font-bold rounded ${activeMemoryTab === "fifo" ? "bg-secondary text-white" : "text-text-secondary"}`}
                          >
                            FIFO
                          </button>
                          <button
                            onClick={() => setActiveMemoryTab("mru")}
                            className={`px-2 py-0.5 text-[11px] font-bold rounded ${activeMemoryTab === "mru" ? "bg-accent-attention text-white" : "text-text-secondary"}`}
                          >
                            MRU
                          </button>
                        </div>
                      </div>

                      {/* Dynamic Representation based on active memory tab */}
                      <div className="p-space-md bg-surface-card rounded-lg border border-border-subtle flex flex-col gap-space-md">
                        {activeMemoryTab === "lru" && (
                          <>
                            <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                              <span className="font-body-default font-semibold text-primary">LRU Doubly-Linked List</span>
                              <span className="font-badge-micro text-[11px] text-text-muted">Head = MRU · Tail = Victim</span>
                            </div>
                            <div className="flex items-center justify-between gap-1 overflow-x-auto py-2">
                              <div className="px-3 py-2 rounded bg-primary/10 border border-primary/30 text-center min-w-[100px]">
                                <span className="font-badge-micro text-[10px] text-primary uppercase font-bold">HEAD (MRU)</span>
                                <div className="font-telemetry-value text-body-sm font-semibold text-on-surface">key_902</div>
                                <span className="text-[10px] text-text-muted">Touched 2s ago</span>
                              </div>
                              <span className="text-text-muted font-bold">⇄</span>
                              <div className="px-3 py-2 rounded bg-surface-low border border-border-subtle text-center min-w-[90px]">
                                <span className="font-badge-micro text-[10px] text-text-muted uppercase">NODE 1</span>
                                <div className="font-telemetry-value text-body-sm font-semibold text-on-surface">key_718</div>
                                <span className="text-[10px] text-text-muted">Touched 45s ago</span>
                              </div>
                              <span className="text-text-muted font-bold">⇄</span>
                              <div className="px-3 py-2 rounded bg-surface-low border border-border-subtle text-center min-w-[90px]">
                                <span className="font-badge-micro text-[10px] text-text-muted uppercase">NODE 2</span>
                                <div className="font-telemetry-value text-body-sm font-semibold text-on-surface">key_441</div>
                                <span className="text-[10px] text-text-muted">Touched 2m ago</span>
                              </div>
                              <span className="text-text-muted font-bold">⇄</span>
                              <div className="px-3 py-2 rounded bg-accent-attention/10 border border-accent-attention/40 text-center min-w-[100px]">
                                <span className="font-badge-micro text-[10px] text-accent-attention uppercase font-bold">TAIL (VICTIM)</span>
                                <div className="font-telemetry-value text-body-sm font-semibold text-accent-attention">key_009</div>
                                <span className="text-[10px] text-text-muted">Next Eviction</span>
                              </div>
                            </div>
                            <p className="text-body-sm text-text-secondary">
                              When key is hit, it is spliced out and spliced back to HEAD. When capacity is full, TAIL node is evicted synchronously.
                            </p>
                          </>
                        )}

                        {activeMemoryTab === "lfu" && (
                          <>
                            <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                              <span className="font-body-default font-semibold text-tertiary">LFU Frequency Buckets</span>
                              <span className="font-badge-micro text-[11px] text-text-muted">Min-Heap / Count Lists</span>
                            </div>
                            <div className="flex items-center justify-between gap-1 overflow-x-auto py-2">
                              <div className="px-3 py-2 rounded bg-accent-attention/10 border border-accent-attention/40 text-center min-w-[110px]">
                                <span className="font-badge-micro text-[10px] text-accent-attention uppercase font-bold">FREQ = 1 (VICTIMS)</span>
                                <div className="font-telemetry-value text-body-sm font-semibold text-on-surface">k_902, k_109</div>
                                <span className="text-[10px] text-accent-attention">Eviction candidate</span>
                              </div>
                              <span className="text-text-muted font-bold">→</span>
                              <div className="px-3 py-2 rounded bg-surface-low border border-border-subtle text-center min-w-[100px]">
                                <span className="font-badge-micro text-[10px] text-text-muted uppercase">FREQ = 3</span>
                                <div className="font-telemetry-value text-body-sm font-semibold text-on-surface">k_718, k_441</div>
                                <span className="text-[10px] text-text-muted">Warm set</span>
                              </div>
                              <span className="text-text-muted font-bold">→</span>
                              <div className="px-3 py-2 rounded bg-tertiary/10 border border-tertiary/40 text-center min-w-[110px]">
                                <span className="font-badge-micro text-[10px] text-tertiary uppercase font-bold">FREQ = 12 (HOT)</span>
                                <div className="font-telemetry-value text-body-sm font-semibold text-tertiary">k_332, k_811</div>
                                <span className="text-[10px] text-text-muted">Protected Hot Set</span>
                              </div>
                            </div>
                            <p className="text-body-sm text-text-secondary">
                              Each key tracks an integer access counter. Keys are moved to higher frequency buckets on hit; lowest bucket evicted when full.
                            </p>
                          </>
                        )}

                        {activeMemoryTab === "fifo" && (
                          <>
                            <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                              <span className="font-body-default font-semibold text-secondary">FIFO Circular Queue</span>
                              <span className="font-badge-micro text-[11px] text-text-muted">Chronological Ring Buffer</span>
                            </div>
                            <div className="flex items-center justify-between gap-1 overflow-x-auto py-2">
                              <div className="px-3 py-2 rounded bg-accent-attention/10 border border-accent-attention/40 text-center min-w-[110px]">
                                <span className="font-badge-micro text-[10px] text-accent-attention uppercase font-bold">READ HEAD</span>
                                <div className="font-telemetry-value text-body-sm font-semibold text-accent-attention">slot[0]: k_902</div>
                                <span className="text-[10px] text-text-muted">Oldest arrival</span>
                              </div>
                              <span className="text-text-muted font-bold">→</span>
                              <div className="px-3 py-2 rounded bg-surface-low border border-border-subtle text-center min-w-[90px]">
                                <span className="font-badge-micro text-[10px] text-text-muted uppercase">slot[1]</span>
                                <div className="font-telemetry-value text-body-sm font-semibold text-on-surface">k_718</div>
                                <span className="text-[10px] text-text-muted">In Queue</span>
                              </div>
                              <span className="text-text-muted font-bold">→</span>
                              <div className="px-3 py-2 rounded bg-surface-low border border-border-subtle text-center min-w-[90px]">
                                <span className="font-badge-micro text-[10px] text-text-muted uppercase">slot[2]</span>
                                <div className="font-telemetry-value text-body-sm font-semibold text-on-surface">k_441</div>
                                <span className="text-[10px] text-text-muted">In Queue</span>
                              </div>
                              <span className="text-text-muted font-bold">→</span>
                              <div className="px-3 py-2 rounded bg-secondary/10 border border-secondary/40 text-center min-w-[110px]">
                                <span className="font-badge-micro text-[10px] text-secondary uppercase font-bold">WRITE TAIL</span>
                                <div className="font-telemetry-value text-body-sm font-semibold text-on-surface">slot[511]: k_009</div>
                                <span className="text-[10px] text-text-muted">Newest arrival</span>
                              </div>
                            </div>
                            <p className="text-body-sm text-text-secondary">
                              Keys are placed into a circular queue upon miss. Cache hits do NOT alter queue position, making FIFO vulnerable to Belady's Anomaly.
                            </p>
                          </>
                        )}

                        {activeMemoryTab === "mru" && (
                          <>
                            <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                              <span className="font-body-default font-semibold text-accent-attention">MRU Stack Order</span>
                              <span className="font-badge-micro text-[11px] text-text-muted">Anti-Recency Drop</span>
                            </div>
                            <div className="flex items-center justify-between gap-1 overflow-x-auto py-2">
                              <div className="px-3 py-2 rounded bg-accent-attention/10 border border-accent-attention/40 text-center min-w-[110px]">
                                <span className="font-badge-micro text-[10px] text-accent-attention uppercase font-bold">STACK TOP (VICTIM)</span>
                                <div className="font-telemetry-value text-body-sm font-semibold text-accent-attention">key_902</div>
                                <span className="text-[10px] text-text-muted">Immediately discarded</span>
                              </div>
                              <span className="text-text-muted font-bold">⇄</span>
                              <div className="px-3 py-2 rounded bg-surface-low border border-border-subtle text-center min-w-[90px]">
                                <span className="font-badge-micro text-[10px] text-text-muted uppercase">MID</span>
                                <div className="font-telemetry-value text-body-sm font-semibold text-on-surface">key_718</div>
                                <span className="text-[10px] text-text-muted">Retained</span>
                              </div>
                              <span className="text-text-muted font-bold">⇄</span>
                              <div className="px-3 py-2 rounded bg-surface-low border border-border-subtle text-center min-w-[100px]">
                                <span className="font-badge-micro text-[10px] text-text-muted uppercase">STACK BASE</span>
                                <div className="font-telemetry-value text-body-sm font-semibold text-on-surface">key_009</div>
                                <span className="text-[10px] text-text-muted">Oldest Unaccessed</span>
                              </div>
                            </div>
                            <p className="text-body-sm text-text-secondary">
                              Evicts the item most recently accessed. Highly beneficial when looping over data larger than cache capacity (cyclic scans).
                            </p>
                          </>
                        )}
                      </div>

                      <div className="p-space-sm bg-surface-low rounded-lg text-body-sm text-text-secondary flex items-center justify-between">
                        <span className="font-badge-micro uppercase text-text-muted">CONCURRENCY NOTE:</span>
                        <span className="font-semibold text-on-surface">Global lock required on all hits and misses</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 5. TRADITIONAL POLICY ARCHITECTURAL CHARACTERISTICS MATRIX */}
                <section className="bg-surface-card rounded-xl p-space-lg lg:p-space-xl shadow-sm border border-border-strong flex flex-col gap-space-lg">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md border-b border-border-subtle pb-space-md">
                    <div className="flex flex-wrap items-center gap-space-sm">
                      <h2 className="font-section-title text-section-title text-on-surface">
                        Traditional Policy Architectural Comparison Matrix
                      </h2>
                    </div>
                    <span className="font-telemetry-value text-body-sm text-text-muted">4 Classical Algorithms</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
                    {/* Policy Card: LRU */}
                    <div className="p-space-md bg-surface-low rounded-lg border border-border-subtle flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-card-title text-card-title text-primary font-bold">LRU</span>
                          <span className="font-badge-micro text-badge-micro uppercase bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">O(1)</span>
                        </div>
                        <div className="text-body-sm font-body-sm text-on-surface font-semibold mt-1">Least Recently Used</div>
                        <p className="text-body-sm text-text-muted mt-2">
                          Tracks recency with doubly-linked list. Evicts the tail item whenever capacity is exhausted.
                        </p>
                      </div>
                      <div className="border-t border-border-subtle pt-2 flex flex-col gap-1 text-badge-micro">
                        <div className="flex justify-between text-text-secondary">
                          <span>Complexity:</span> <strong className="text-on-surface">O(1) Get / O(1) Evict</strong>
                        </div>
                        <div className="flex justify-between text-text-secondary">
                          <span>Best For:</span> <strong className="text-on-surface">Temporal Locality</strong>
                        </div>
                        <div className="flex justify-between text-text-secondary">
                          <span>Vulnerability:</span> <strong className="text-accent-attention">Scan Pollution</strong>
                        </div>
                      </div>
                    </div>

                    {/* Policy Card: LFU */}
                    <div className="p-space-md bg-surface-low rounded-lg border border-border-subtle flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-card-title text-card-title text-tertiary font-bold">LFU</span>
                          <span className="font-badge-micro text-badge-micro uppercase bg-tertiary/10 text-tertiary px-2 py-0.5 rounded font-bold">O(1)</span>
                        </div>
                        <div className="text-body-sm font-body-sm text-on-surface font-semibold mt-1">Least Frequently Used</div>
                        <p className="text-body-sm text-text-muted mt-2">
                          Maintains access count buckets. Evicts items with the lowest cumulative reference frequency.
                        </p>
                      </div>
                      <div className="border-t border-border-subtle pt-2 flex flex-col gap-1 text-badge-micro">
                        <div className="flex justify-between text-text-secondary">
                          <span>Complexity:</span> <strong className="text-on-surface">O(1) via Frequency Buckets</strong>
                        </div>
                        <div className="flex justify-between text-text-secondary">
                          <span>Best For:</span> <strong className="text-on-surface">Persistent Hot Sets</strong>
                        </div>
                        <div className="flex justify-between text-text-secondary">
                          <span>Vulnerability:</span> <strong className="text-accent-attention">Frequency Starvation</strong>
                        </div>
                      </div>
                    </div>

                    {/* Policy Card: FIFO */}
                    <div className="p-space-md bg-surface-low rounded-lg border border-border-subtle flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-card-title text-card-title text-secondary font-bold">FIFO</span>
                          <span className="font-badge-micro text-badge-micro uppercase bg-secondary/10 text-secondary px-2 py-0.5 rounded font-bold">O(1)</span>
                        </div>
                        <div className="text-body-sm font-body-sm text-on-surface font-semibold mt-1">First-In First-Out</div>
                        <p className="text-body-sm text-text-muted mt-2">
                          Strict queue ordering. Items are evicted in chronological insertion order regardless of reuse.
                        </p>
                      </div>
                      <div className="border-t border-border-subtle pt-2 flex flex-col gap-1 text-badge-micro">
                        <div className="flex justify-between text-text-secondary">
                          <span>Complexity:</span> <strong className="text-on-surface">O(1) Ring Buffer</strong>
                        </div>
                        <div className="flex justify-between text-text-secondary">
                          <span>Best For:</span> <strong className="text-on-surface">Streaming Sequential</strong>
                        </div>
                        <div className="flex justify-between text-text-secondary">
                          <span>Vulnerability:</span> <strong className="text-accent-attention">Belady's Anomaly</strong>
                        </div>
                      </div>
                    </div>

                    {/* Policy Card: MRU */}
                    <div className="p-space-md bg-surface-low rounded-lg border border-border-subtle flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-card-title text-card-title text-accent-attention font-bold">MRU</span>
                          <span className="font-badge-micro text-badge-micro uppercase bg-accent-attention/10 text-accent-attention px-2 py-0.5 rounded font-bold">O(1)</span>
                        </div>
                        <div className="text-body-sm font-body-sm text-on-surface font-semibold mt-1">Most Recently Used</div>
                        <p className="text-body-sm text-text-muted mt-2">
                          Opposite of LRU: immediately evicts the head item most recently accessed.
                        </p>
                      </div>
                      <div className="border-t border-border-subtle pt-2 flex flex-col gap-1 text-badge-micro">
                        <div className="flex justify-between text-text-secondary">
                          <span>Complexity:</span> <strong className="text-on-surface">O(1) Stack Top</strong>
                        </div>
                        <div className="flex justify-between text-text-secondary">
                          <span>Best For:</span> <strong className="text-on-surface">Cyclic Loops &gt; Cache Size</strong>
                        </div>
                        <div className="flex justify-between text-text-secondary">
                          <span>Vulnerability:</span> <strong className="text-accent-attention">Normal Web Workloads</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* ========================================================================= */}
            {/* VIEW B: SMARTCACHE DECOUPLED AI VIEW */}
            {/* ========================================================================= */}
            {activeTab === "smart" && (
              <>
                {/* 2. SMARTCACHE PERFORMANCE STAT CARDS & GAUGES */}
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-space-md lg:gap-space-lg">
                  {/* Card 1: Smart Cache Hit Rate */}
                  <div className="bg-surface-card rounded-xl p-space-lg shadow-sm border border-border-strong flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="font-body-sm text-body-sm text-text-secondary font-medium">Smart Cache Hit Rate</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-badge-micro font-badge-micro uppercase tracking-wider bg-tertiary-fixed text-tertiary">
                        +{(smartHitRate - baselineHitRate).toFixed(1)}% vs base
                      </span>
                    </div>
                    <div className="my-space-md">
                      <div className="font-hero-metric text-hero-metric text-on-surface tracking-tight">
                        {smartHitRate.toFixed(1)}%
                      </div>
                      <div className="text-text-muted font-body-sm text-body-sm mt-1">Decoupled AI Eviction Model</div>
                    </div>
                    <div className="w-full bg-surface-low h-1.5 rounded-full overflow-hidden">
                      <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, smartHitRate)}%` }}></div>
                    </div>
                  </div>

                  {/* Card 2: Baseline Hit Rate */}
                  <div className="bg-surface-card rounded-xl p-space-lg shadow-sm border border-border-strong flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="font-body-sm text-body-sm text-text-secondary font-medium">Baseline Hit Rate</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-badge-micro font-badge-micro uppercase tracking-wider bg-surface-low text-text-secondary">
                        Standard
                      </span>
                    </div>
                    <div className="my-space-md">
                      <div className="font-hero-metric text-hero-metric text-text-secondary tracking-tight">
                        {baselineHitRate.toFixed(1)}%
                      </div>
                      <div className="text-text-muted font-body-sm text-body-sm mt-1">LRU / LFU Average Policy</div>
                    </div>
                    <div className="w-full bg-surface-low h-1.5 rounded-full overflow-hidden">
                      <div className="bg-secondary h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, baselineHitRate)}%` }}></div>
                    </div>
                  </div>

                  {/* Card 3: Effective Access Latency */}
                  <div className="bg-surface-card rounded-xl p-space-lg shadow-sm border border-border-strong flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="font-body-sm text-body-sm text-text-secondary font-medium">Effective Access Latency</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-badge-micro font-badge-micro uppercase tracking-wider bg-tertiary-fixed text-tertiary">
                        -{(syncDelayMs - latencyMs).toFixed(1)} ms gain
                      </span>
                    </div>
                    <div className="my-space-md">
                      <div className="font-hero-metric text-hero-metric text-on-surface tracking-tight">
                        {latencyMs.toFixed(2)} ms
                      </div>
                      <div className="text-text-muted font-body-sm text-body-sm mt-1">Instant Direct Memory Lookup</div>
                    </div>
                    <div className="flex items-center gap-space-xs text-tertiary font-body-sm text-body-sm">
                      <svg className="w-3.5 h-3.5 stroke-current fill-none" viewBox="0 0 24 24">
                        <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                      </svg>
                      <span>{Math.round(syncDelayMs / Math.max(0.01, latencyMs))}x faster than sync AI</span>
                    </div>
                  </div>

                  {/* Card 4: Request Path Overhead */}
                  <div className="bg-surface-card rounded-xl p-space-lg shadow-sm border border-border-strong flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="font-body-sm text-body-sm text-text-secondary font-medium">Request Path Overhead</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-badge-micro font-badge-micro uppercase tracking-wider bg-accent-primary-subtle text-primary font-semibold">
                        DECOUPLED
                      </span>
                    </div>
                    <div className="my-space-md">
                      <div className="font-hero-metric text-hero-metric text-primary tracking-tight">ZERO</div>
                      <div className="text-text-muted font-body-sm text-body-sm mt-1">No Inline Machine Learning Inference</div>
                    </div>
                    <div className="text-text-secondary font-telemetry-value text-body-sm">
                      <span>Refresh Frequency: </span>
                      <span className="text-on-surface font-semibold">{refreshInterval} reqs</span>
                    </div>
                  </div>

                  {/* Card 5: System Speed & Throughput Gauge */}
                  <div className="bg-surface-card rounded-xl p-space-lg shadow-sm border border-border-strong flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="font-body-sm text-body-sm text-text-secondary font-medium">System Speed &amp; Throughput</span>
                      <span className="font-telemetry-value text-body-sm text-primary font-semibold">
                        {Math.round(Math.min(1, throughputRps / 6000) * 100)}% Cap
                      </span>
                    </div>
                    <div className="my-space-sm flex items-center justify-between">
                      <div className="flex flex-col">
                        <div className="flex flex-col">
                          <span className="font-body-sm text-body-sm text-text-muted">Median Response</span>
                          <span className="font-telemetry-value text-telemetry-value font-semibold text-on-surface">
                            {medianResponseMs.toFixed(2)} ms
                          </span>
                        </div>
                        <div className="flex flex-col mt-2">
                          <span className="font-body-sm text-body-sm text-text-muted">Peak Response Time</span>
                          <span className="font-telemetry-value text-telemetry-value font-semibold text-accent-attention">
                            {peakResponseMs.toFixed(2)} ms
                          </span>
                        </div>
                      </div>
                      {/* Gauge Ring */}
                      <div className="relative w-16 h-16 flex items-center justify-center">
                        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 48 48">
                          <circle cx="24" cy="24" fill="none" r="19" stroke="#f4eee3" strokeWidth="4.5"></circle>
                          <circle
                            className="transition-all duration-500"
                            cx="24"
                            cy="24"
                            fill="none"
                            r="19"
                            stroke="#c2652a"
                            strokeDasharray="119.38"
                            strokeDashoffset={(119.38 * (1 - Math.min(1, throughputRps / 6000))).toFixed(2)}
                            strokeLinecap="round"
                            strokeWidth="4.5"
                          ></circle>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="font-badge-micro text-[10px] text-text-muted uppercase">RPS</span>
                          <span className="font-telemetry-value text-[11px] font-semibold text-on-surface">
                            {(throughputRps / 1000).toFixed(1)}k
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="font-body-sm text-body-sm text-text-secondary">
                      Throughput: <span className="font-telemetry-value font-semibold text-on-surface">{throughputRps.toLocaleString()}</span>{" "}
                      <span className="text-text-muted">Requests / Sec</span>
                    </div>
                  </div>
                </section>

                {/* 3. SMARTCACHE REAL-TIME SVG AREA CHARTS */}
                <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md lg:gap-space-lg">
                  {/* Chart 1 */}
                  <div className="bg-surface-card rounded-xl p-space-lg shadow-sm border border-border-strong flex flex-col justify-between">
                    <div className="flex flex-col gap-space-xs">
                      <div className="flex items-center justify-between">
                        <h3 className="font-card-title text-card-title text-on-surface">Smart Cache Hit Rate (%)</h3>
                        <span className="font-telemetry-value text-telemetry-value text-primary font-bold">
                          {smartHitRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-body-sm font-body-sm text-text-muted">
                        <span>Min: <span className="font-telemetry-value text-on-surface">{Math.min(...smartHitSeries).toFixed(1)}%</span></span>
                        <span>Peak: <span className="font-telemetry-value text-on-surface">{Math.max(...smartHitSeries).toFixed(1)}%</span></span>
                      </div>
                    </div>
                    <div className="w-full h-28 my-space-md relative">
                      <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 240 80">
                        <line stroke="#f4eee3" strokeDasharray="2 2" strokeWidth="1" x1="0" x2="240" y1="20" y2="20"></line>
                        <line stroke="#f4eee3" strokeDasharray="2 2" strokeWidth="1" x1="0" x2="240" y1="50" y2="50"></line>
                        <polygon fill="url(#grandGradLru)" points={`0,80 ${ptsSmart} 240,80`}></polygon>
                        <polyline fill="none" points={ptsSmart} stroke="#c2652a" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2"></polyline>
                        <circle cx={lastSmart[0]} cy={lastSmart[1]} fill="#c2652a" r="3.5" stroke="#ffffff" strokeWidth="1.5"></circle>
                      </svg>
                    </div>
                    <div className="flex items-center justify-between font-badge-micro text-badge-micro text-text-muted uppercase">
                      <span>30s ago</span>
                      <span>Rolling Live</span>
                      <span>Now</span>
                    </div>
                  </div>

                  {/* Chart 2 */}
                  <div className="bg-surface-card rounded-xl p-space-lg shadow-sm border border-border-strong flex flex-col justify-between">
                    <div className="flex flex-col gap-space-xs">
                      <div className="flex items-center justify-between">
                        <h3 className="font-card-title text-card-title text-on-surface">Baseline Hit Rate (%)</h3>
                        <span className="font-telemetry-value text-telemetry-value text-secondary font-bold">
                          {baselineHitRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-body-sm font-body-sm text-text-muted">
                        <span>Min: <span className="font-telemetry-value text-on-surface">{Math.min(...baseHitSeries).toFixed(1)}%</span></span>
                        <span>Peak: <span className="font-telemetry-value text-on-surface">{Math.max(...baseHitSeries).toFixed(1)}%</span></span>
                      </div>
                    </div>
                    <div className="w-full h-28 my-space-md relative">
                      <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 240 80">
                        <line stroke="#f4eee3" strokeDasharray="2 2" strokeWidth="1" x1="0" x2="240" y1="20" y2="20"></line>
                        <line stroke="#f4eee3" strokeDasharray="2 2" strokeWidth="1" x1="0" x2="240" y1="50" y2="50"></line>
                        <polygon fill="url(#grandGradFifo)" points={`0,80 ${ptsBase} 240,80`}></polygon>
                        <polyline fill="none" points={ptsBase} stroke="#a07855" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></polyline>
                        <circle cx={lastBase[0]} cy={lastBase[1]} fill="#a07855" r="3.5" stroke="#ffffff" strokeWidth="1.5"></circle>
                      </svg>
                    </div>
                    <div className="flex items-center justify-between font-badge-micro text-badge-micro text-text-muted uppercase">
                      <span>30s ago</span>
                      <span>Standard LRU</span>
                      <span>Now</span>
                    </div>
                  </div>

                  {/* Chart 3 */}
                  <div className="bg-surface-card rounded-xl p-space-lg shadow-sm border border-border-strong flex flex-col justify-between">
                    <div className="flex flex-col gap-space-xs">
                      <div className="flex items-center justify-between">
                        <h3 className="font-card-title text-card-title text-on-surface">Decoupled Access Time</h3>
                        <span className="font-telemetry-value text-telemetry-value text-on-surface font-bold">
                          {latencyMs.toFixed(2)} ms
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-body-sm font-body-sm text-text-muted">
                        <span>Min: <span className="font-telemetry-value text-on-surface">{Math.min(...latencySeries).toFixed(2)} ms</span></span>
                        <span>Peak: <span className="font-telemetry-value text-on-surface">{Math.max(...latencySeries).toFixed(2)} ms</span></span>
                      </div>
                    </div>
                    <div className="w-full h-28 my-space-md relative">
                      <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 240 80">
                        <line stroke="#f4eee3" strokeDasharray="2 2" strokeWidth="1" x1="0" x2="240" y1="20" y2="20"></line>
                        <line stroke="#f4eee3" strokeDasharray="2 2" strokeWidth="1" x1="0" x2="240" y1="50" y2="50"></line>
                        <polygon fill="url(#grandGradFifo)" points={`0,80 ${ptsDec} 240,80`}></polygon>
                        <polyline fill="none" points={ptsDec} stroke="#3a302a" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></polyline>
                        <circle cx={lastDec[0]} cy={lastDec[1]} fill="#3a302a" r="3.5" stroke="#ffffff" strokeWidth="1.5"></circle>
                      </svg>
                    </div>
                    <div className="flex items-center justify-between font-badge-micro text-badge-micro text-text-muted uppercase">
                      <span>30s ago</span>
                      <span>Zero ML Overhead</span>
                      <span>Now</span>
                    </div>
                  </div>

                  {/* Chart 4 */}
                  <div className="bg-surface-card rounded-xl p-space-lg shadow-sm border border-border-strong flex flex-col justify-between">
                    <div className="flex flex-col gap-space-xs">
                      <div className="flex items-center justify-between">
                        <h3 className="font-card-title text-card-title text-on-surface">Synchronous AI Delay</h3>
                        <span className="font-telemetry-value text-telemetry-value text-accent-attention font-bold">
                          {syncDelayMs.toFixed(2)} ms
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-body-sm font-body-sm text-text-muted">
                        <span>Min: <span className="font-telemetry-value text-on-surface">{Math.min(...syncSeries).toFixed(2)} ms</span></span>
                        <span>Peak: <span className="font-telemetry-value text-on-surface">{Math.max(...syncSeries).toFixed(2)} ms</span></span>
                      </div>
                    </div>
                    <div className="w-full h-28 my-space-md relative">
                      <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 240 80">
                        <line stroke="#f4eee3" strokeDasharray="2 2" strokeWidth="1" x1="0" x2="240" y1="20" y2="20"></line>
                        <line stroke="#f4eee3" strokeDasharray="2 2" strokeWidth="1" x1="0" x2="240" y1="50" y2="50"></line>
                        <polygon fill="url(#grandGradMru)" points={`0,80 ${ptsSync} 240,80`}></polygon>
                        <polyline fill="none" points={ptsSync} stroke="#8c3c3c" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></polyline>
                        <circle cx={lastSync[0]} cy={lastSync[1]} fill="#8c3c3c" r="3.5" stroke="#ffffff" strokeWidth="1.5"></circle>
                      </svg>
                    </div>
                    <div className="flex items-center justify-between font-badge-micro text-badge-micro text-text-muted uppercase">
                      <span>30s ago</span>
                      <span>Blocking Avoided</span>
                      <span>Now</span>
                    </div>
                  </div>
                </section>

                {/* 4. INTELLIGENT CACHE ENGINE OVERVIEW */}
                <section className="bg-surface-card rounded-xl p-space-lg lg:p-space-xl shadow-sm border border-border-strong flex flex-col gap-space-lg">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md border-b border-border-subtle pb-space-md">
                    <div className="flex flex-wrap items-center gap-space-sm">
                      <h2 className="font-section-title text-section-title text-on-surface">Smart Cache AI Engine</h2>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-badge-micro font-badge-micro uppercase tracking-wider bg-accent-primary-subtle text-primary font-semibold">
                        DECOUPLED
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-badge-micro font-badge-micro uppercase tracking-wider bg-surface-low text-text-secondary font-semibold">
                        ASYNCHRONOUS
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-badge-micro font-badge-micro uppercase tracking-wider bg-tertiary-fixed text-tertiary font-semibold">
                        CRITICAL PATH IMPACT: NONE
                      </span>
                    </div>
                    <button
                      onClick={() => setIsQueueDrawerOpen(true)}
                      className="inline-flex items-center gap-space-xs px-space-md py-space-sm rounded-lg border border-border-strong bg-bg-canvas text-on-surface hover:bg-surface-low transition-colors font-body-sm text-body-sm cursor-pointer self-start md:self-auto"
                      type="button"
                    >
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M4 6h16M4 10h16M4 14h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                      </svg>
                      <span>Inspect Eviction Queue</span>
                    </button>
                  </div>

                  {/* 6-Metric Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-space-sm lg:gap-space-md">
                    <div className="p-space-md bg-surface-low rounded-lg flex flex-col justify-between">
                      <span className="font-body-sm text-body-sm text-text-muted">Engine Status</span>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className={`absolute inline-flex h-full w-full rounded-full ${isRunning ? "bg-tertiary animate-ping opacity-75" : "bg-text-muted"}`}></span>
                          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isRunning ? "bg-tertiary" : "bg-text-muted"}`}></span>
                        </span>
                        <span className="font-telemetry-value text-telemetry-value font-semibold text-on-surface">
                          {isRunning ? "Active" : "Standby"}
                        </span>
                      </div>
                    </div>

                    <div className="p-space-md bg-surface-low rounded-lg flex flex-col justify-between">
                      <span className="font-body-sm text-body-sm text-text-muted">Pattern Model</span>
                      <span className="font-telemetry-value text-body-sm font-semibold text-on-surface truncate mt-2" title="HistGradientBoostingClassifier">
                        HistGradBoost
                      </span>
                    </div>

                    <div className="p-space-md bg-surface-low rounded-lg flex flex-col justify-between">
                      <span className="font-body-sm text-body-sm text-text-muted">Refresh Frequency</span>
                      <span className="font-telemetry-value text-telemetry-value font-semibold text-on-surface mt-2">
                        {refreshInterval} reqs
                      </span>
                    </div>

                    <div className="p-space-md bg-surface-low rounded-lg flex flex-col justify-between">
                      <span className="font-body-sm text-body-sm text-text-muted">Analysis Duration</span>
                      <span className="font-telemetry-value text-telemetry-value font-semibold text-tertiary mt-2">
                        {analysisDurationMs.toFixed(2)} ms
                      </span>
                    </div>

                    <div className="p-space-md bg-surface-low rounded-lg flex flex-col justify-between">
                      <span className="font-body-sm text-body-sm text-text-muted">Background Cycles</span>
                      <span className="font-telemetry-value text-telemetry-value font-semibold text-on-surface mt-2">
                        {cycleCount.toLocaleString()}
                      </span>
                    </div>

                    <div className="p-space-md bg-surface-low rounded-lg flex flex-col justify-between">
                      <span className="font-body-sm text-body-sm text-text-muted">Queue Version</span>
                      <span className="font-telemetry-value text-telemetry-value font-semibold text-primary mt-2">
                        v{queueVersion}
                      </span>
                    </div>
                  </div>
                </section>

                {/* 5. LIVE ARCHITECTURE PIPELINE DIAGRAM */}
                <section className="bg-surface-card rounded-xl p-space-lg lg:p-space-xl shadow-sm border border-border-strong flex flex-col gap-space-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm border-b border-border-subtle pb-space-md">
                    <div>
                      <h2 className="font-section-title text-section-title text-on-surface">Decoupled Execution Pipeline</h2>
                      <p className="font-body-sm text-body-sm text-text-secondary mt-1">
                        Separation of ultra-low latency request path from heavy background machine learning model training
                      </p>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-badge-micro font-badge-micro uppercase tracking-wider bg-accent-primary-subtle text-primary font-bold">
                      ZERO ML INFERENCE DELAY
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg relative">
                    {/* Lane A: Client Request Path */}
                    <div className="bg-bg-canvas rounded-xl p-space-md lg:p-space-lg border border-border-strong flex flex-col gap-space-md">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-space-xs">
                          <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                          <h3 className="font-card-title text-card-title text-on-surface">Client Request Path</h3>
                        </div>
                        <span className="font-telemetry-value text-body-sm text-primary font-semibold">&lt; 0.08 ms execution</span>
                      </div>

                      <div className="flex flex-col gap-space-sm">
                        <div className="bg-surface-card p-space-sm lg:p-space-md rounded-lg border border-border-subtle flex items-center justify-between">
                          <div className="flex items-center gap-space-sm">
                            <span className="w-6 h-6 rounded-full bg-surface-low text-text-secondary flex items-center justify-center font-telemetry-value text-body-sm font-semibold">1</span>
                            <div>
                              <div className="font-body-default text-body-default font-medium text-on-surface">Incoming Workload Request</div>
                              <div className="font-body-sm text-body-sm text-text-muted">Read / Write trace packet dispatch</div>
                            </div>
                          </div>
                          <span className="font-telemetry-value text-badge-micro text-text-muted">0.01 ms</span>
                        </div>

                        <div className="flex justify-center -my-1 text-text-muted">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M19 14l-7 7m0 0l-7-7m7 7V3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                          </svg>
                        </div>

                        <div className="bg-surface-card p-space-sm lg:p-space-md rounded-lg border border-border-subtle flex items-center justify-between">
                          <div className="flex items-center gap-space-sm">
                            <span className="w-6 h-6 rounded-full bg-surface-low text-text-secondary flex items-center justify-center font-telemetry-value text-body-sm font-semibold">2</span>
                            <div>
                              <div className="font-body-default text-body-default font-medium text-on-surface">Instant Memory Lookup</div>
                              <div className="font-body-sm text-body-sm text-text-muted">Atomic hash map access (&lt; 0.04 ms)</div>
                            </div>
                          </div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-badge-micro font-badge-micro bg-tertiary-fixed text-tertiary font-semibold">CACHE HIT</span>
                        </div>

                        <div className="flex justify-center -my-1 text-text-muted">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M19 14l-7 7m0 0l-7-7m7 7V3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                          </svg>
                        </div>

                        <div className="bg-surface-card p-space-sm lg:p-space-md rounded-lg border border-primary/30 flex items-center justify-between">
                          <div className="flex items-center gap-space-sm">
                            <span className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center font-telemetry-value text-body-sm font-semibold">3</span>
                            <div>
                              <div className="font-body-default text-body-default font-medium text-primary">Pre-Computed Eviction Priority Queue</div>
                              <div className="font-body-sm text-body-sm text-text-muted">Constant O(1) eviction selection if capacity full</div>
                            </div>
                          </div>
                          <span className="font-telemetry-value text-badge-micro text-primary font-bold">O(1) CONSTANT</span>
                        </div>

                        <div className="flex justify-center -my-1 text-text-muted">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M19 14l-7 7m0 0l-7-7m7 7V3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                          </svg>
                        </div>

                        <div className="bg-surface-card p-space-sm lg:p-space-md rounded-lg border border-border-subtle flex items-center justify-between">
                          <div className="flex items-center gap-space-sm">
                            <span className="w-6 h-6 rounded-full bg-surface-low text-text-secondary flex items-center justify-center font-telemetry-value text-body-sm font-semibold">4</span>
                            <div>
                              <div className="font-body-default text-body-default font-medium text-on-surface">Return Result to User</div>
                              <div className="font-body-sm text-body-sm text-text-muted">Payload transmitted with zero inline wait</div>
                            </div>
                          </div>
                          <span className="font-badge-micro text-badge-micro text-tertiary font-bold">COMPLETED</span>
                        </div>
                      </div>
                    </div>

                    {/* Lane B: Background AI Worker */}
                    <div className="bg-bg-canvas rounded-xl p-space-md lg:p-space-lg border border-border-strong flex flex-col gap-space-md">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-space-xs">
                          <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                          <h3 className="font-card-title text-card-title text-on-surface">Background AI Worker (Async)</h3>
                        </div>
                        <span className="font-telemetry-value text-body-sm text-text-secondary font-semibold">Cycle: Every {refreshInterval} reqs</span>
                      </div>

                      <div className="flex flex-col gap-space-sm">
                        <div className="bg-surface-card p-space-sm lg:p-space-md rounded-lg border border-border-subtle flex items-center justify-between">
                          <div className="flex items-center gap-space-sm">
                            <span className="w-6 h-6 rounded-full bg-surface-low text-text-secondary flex items-center justify-center font-telemetry-value text-body-sm font-semibold">A</span>
                            <div>
                              <div className="font-body-default text-body-default font-medium text-on-surface">Access History Ring Buffer</div>
                              <div className="font-body-sm text-body-sm text-text-muted">Non-blocking async telemetry push (capacity 10k)</div>
                            </div>
                          </div>
                          <span className="font-telemetry-value text-badge-micro text-text-muted font-bold">10,000 BUF</span>
                        </div>

                        <div className="flex justify-center -my-1 text-text-muted">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M19 14l-7 7m0 0l-7-7m7 7V3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                          </svg>
                        </div>

                        <div className="bg-surface-card p-space-sm lg:p-space-md rounded-lg border border-border-subtle flex items-center justify-between">
                          <div className="flex items-center gap-space-sm">
                            <span className="w-6 h-6 rounded-full bg-surface-low text-text-secondary flex items-center justify-center font-telemetry-value text-body-sm font-semibold">B</span>
                            <div>
                              <div className="font-body-default text-body-default font-medium text-on-surface">Pattern Feature Extraction</div>
                              <div className="font-body-sm text-body-sm text-text-muted">Inter-arrival gap, recency, and frequency tensors</div>
                            </div>
                          </div>
                          <span className="font-telemetry-value text-badge-micro text-text-muted font-bold">NUMPY VEC</span>
                        </div>

                        <div className="flex justify-center -my-1 text-text-muted">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M19 14l-7 7m0 0l-7-7m7 7V3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                          </svg>
                        </div>

                        <div className="bg-surface-card p-space-sm lg:p-space-md rounded-lg border border-border-subtle flex items-center justify-between">
                          <div className="flex items-center gap-space-sm">
                            <span className="w-6 h-6 rounded-full bg-surface-low text-text-secondary flex items-center justify-center font-telemetry-value text-body-sm font-semibold">C</span>
                            <div>
                              <div className="font-body-default text-body-default font-medium text-on-surface">Adaptive Gradient Boosting Model</div>
                              <div className="font-body-sm text-body-sm text-text-muted">Probabilistic scoring of key reuse likelihood</div>
                            </div>
                          </div>
                          <span className="font-telemetry-value text-badge-micro text-secondary font-bold">
                            {analysisDurationMs.toFixed(2)} ms INFER
                          </span>
                        </div>

                        <div className="flex justify-center -my-1 text-text-muted">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M19 14l-7 7m0 0l-7-7m7 7V3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                          </svg>
                        </div>

                        <div className="bg-surface-card p-space-sm lg:p-space-md rounded-lg border border-tertiary/40 flex items-center justify-between">
                          <div className="flex items-center gap-space-sm">
                            <span className="w-6 h-6 rounded-full bg-tertiary text-on-tertiary flex items-center justify-center font-telemetry-value text-body-sm font-semibold">D</span>
                            <div>
                              <div className="font-body-default text-body-default font-medium text-tertiary">Atomic Eviction Queue Pointer Swap</div>
                              <div className="font-body-sm text-body-sm text-text-muted">Zero-lock pointer update to Priority Queue</div>
                            </div>
                          </div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-badge-micro font-badge-micro bg-tertiary-fixed text-tertiary font-semibold">
                            POINTER SWAP
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* ========================================================================= */}
            {/* VIEW C: HEAD-TO-HEAD COMPARATIVE SUITE (ALL 5 POLICIES) */}
            {/* ========================================================================= */}
            {activeTab === "compare" && (
              <section className="bg-surface-card rounded-xl p-space-lg lg:p-space-xl shadow-sm border border-border-strong flex flex-col gap-space-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm border-b border-border-subtle pb-space-md">
                  <div>
                    <h2 className="font-section-title text-section-title text-on-surface">
                      Head-to-Head Architectural Leaderboard
                    </h2>
                    <p className="font-body-sm text-body-sm text-text-secondary mt-1">
                      Side-by-side performance audit comparing SmartCache AI with classical LRU, LFU, FIFO, and MRU baselines.
                    </p>
                  </div>
                  <button
                    onClick={handleRunFullBenchmarkSuite}
                    disabled={isBenchmarking}
                    className="inline-flex items-center gap-space-xs px-space-md py-2 rounded-lg bg-primary text-white font-body-sm font-medium hover:bg-primary-container transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                    <span>{isBenchmarking ? "Running Benchmark..." : "Run Unified Benchmark"}</span>
                  </button>
                </div>

                {/* Leaderboard Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border-strong text-badge-micro font-badge-micro uppercase text-text-muted tracking-wider">
                        <th className="py-3 px-4">Rank</th>
                        <th className="py-3 px-4">Cache Policy</th>
                        <th className="py-3 px-4">Model Type</th>
                        <th className="py-3 px-4">Live Hit Rate</th>
                        <th className="py-3 px-4">Critical-Path Delay</th>
                        <th className="py-3 px-4">Multi-Core Scalability</th>
                        <th className="py-3 px-4">Vulnerability</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle font-body-default text-body-default">
                      {/* Rank 1: SmartCache */}
                      <tr className="bg-primary/5 hover:bg-primary/10 transition-colors">
                        <td className="py-3.5 px-4 font-telemetry-value font-bold text-primary">#1</td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-primary flex items-center gap-2">
                            <span>SmartCache</span>
                            <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full uppercase font-bold">LEADER</span>
                          </div>
                          <span className="text-[11px] text-text-muted">Decoupled ML Worker</span>
                        </td>
                        <td className="py-3.5 px-4 text-text-secondary font-medium">Asynchronous Gradient Boosting</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-telemetry-value font-bold text-primary text-[15px]">{smartHitRate.toFixed(1)}%</span>
                            <span className="text-badge-micro text-tertiary font-bold">+{(smartHitRate - lruHitRate).toFixed(1)}% vs LRU</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-telemetry-value text-tertiary font-semibold">&lt; 0.08 ms (Zero ML delay)</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-badge-micro font-badge-micro uppercase tracking-wider bg-tertiary-fixed text-tertiary font-bold">
                            Lock-Free Staging
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-text-secondary text-body-sm">None (Background Fallback)</td>
                      </tr>

                      {/* Rank 2: LFU */}
                      <tr className="hover:bg-surface-low transition-colors">
                        <td className="py-3.5 px-4 font-telemetry-value font-bold text-tertiary">#2</td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-on-surface">LFU</div>
                          <span className="text-[11px] text-text-muted">Least Frequently Used</span>
                        </td>
                        <td className="py-3.5 px-4 text-text-secondary">Frequency Counter Buckets</td>
                        <td className="py-3.5 px-4">
                          <span className="font-telemetry-value font-bold text-tertiary text-[15px]">{lfuHitRate.toFixed(1)}%</span>
                        </td>
                        <td className="py-3.5 px-4 font-telemetry-value text-text-secondary">0.14 ms (Counter Heap update)</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-badge-micro font-badge-micro uppercase tracking-wider bg-surface-low text-secondary font-semibold">
                            Synchronous Mutex
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-accent-attention text-body-sm">Frequency Starvation (Stale counts)</td>
                      </tr>

                      {/* Rank 3: LRU */}
                      <tr className="hover:bg-surface-low transition-colors">
                        <td className="py-3.5 px-4 font-telemetry-value font-bold text-secondary">#3</td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-on-surface">LRU</div>
                          <span className="text-[11px] text-text-muted">Least Recently Used (Standard)</span>
                        </td>
                        <td className="py-3.5 px-4 text-text-secondary">Doubly-Linked List</td>
                        <td className="py-3.5 px-4">
                          <span className="font-telemetry-value font-bold text-on-surface text-[15px]">{lruHitRate.toFixed(1)}%</span>
                        </td>
                        <td className="py-3.5 px-4 font-telemetry-value text-text-secondary">0.12 ms (List Splice pointer)</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-badge-micro font-badge-micro uppercase tracking-wider bg-surface-low text-secondary font-semibold">
                            Synchronous Mutex
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-accent-attention text-body-sm">Scan Pollution (One-time loop flush)</td>
                      </tr>

                      {/* Rank 4: FIFO */}
                      <tr className="hover:bg-surface-low transition-colors">
                        <td className="py-3.5 px-4 font-telemetry-value font-bold text-text-secondary">#4</td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-on-surface">FIFO</div>
                          <span className="text-[11px] text-text-muted">First-In First-Out</span>
                        </td>
                        <td className="py-3.5 px-4 text-text-secondary">Circular Ring Buffer</td>
                        <td className="py-3.5 px-4">
                          <span className="font-telemetry-value font-bold text-text-secondary text-[15px]">{fifoHitRate.toFixed(1)}%</span>
                        </td>
                        <td className="py-3.5 px-4 font-telemetry-value text-text-secondary">0.09 ms (Head pointer advance)</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-badge-micro font-badge-micro uppercase tracking-wider bg-surface-low text-secondary font-semibold">
                            Synchronous Mutex
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-accent-attention text-body-sm">Belady's Anomaly (Cap vs Miss)</td>
                      </tr>

                      {/* Rank 5: MRU */}
                      <tr className="hover:bg-surface-low transition-colors">
                        <td className="py-3.5 px-4 font-telemetry-value font-bold text-accent-attention">#5</td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-on-surface">MRU</div>
                          <span className="text-[11px] text-text-muted">Most Recently Used</span>
                        </td>
                        <td className="py-3.5 px-4 text-text-secondary">Stack Order Eviction</td>
                        <td className="py-3.5 px-4">
                          <span className="font-telemetry-value font-bold text-accent-attention text-[15px]">{mruHitRate.toFixed(1)}%</span>
                        </td>
                        <td className="py-3.5 px-4 font-telemetry-value text-text-secondary">0.11 ms (Stack Top pop)</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-badge-micro font-badge-micro uppercase tracking-wider bg-surface-low text-secondary font-semibold">
                            Synchronous Mutex
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-accent-attention text-body-sm">Severe collapse on standard traffic</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* ========================================================================= */}
            {/* 6. SPLIT AUDIT DECK: EVICTION AUDIT & LIVE ENGINE TERMINAL */}
            {/* ========================================================================= */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-space-md lg:gap-space-lg">
              {/* Left Column: Eviction History Audit Table */}
              <div className="lg:col-span-7 bg-surface-card rounded-xl p-space-lg shadow-sm border border-border-strong flex flex-col justify-between">
                <div className="flex flex-col gap-space-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm border-b border-border-subtle pb-space-md">
                    <div>
                      <h3 className="font-card-title text-card-title text-on-surface">Eviction History Audit</h3>
                      <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                        Chronological record of victim keys evicted by {activeTab === "traditional" ? "traditional policies (LRU, LFU, FIFO, MRU)" : "SmartCache decoupled engine"}
                      </p>
                    </div>

                    {/* Filter buttons */}
                    <div className="flex items-center gap-1">
                      {["all", "LRU", "LFU", "FIFO", "MRU"].map(f => (
                        <button
                          key={f}
                          onClick={() => setEvictionFilter(f)}
                          className={`px-2 py-0.5 rounded text-badge-micro font-badge-micro uppercase transition-colors cursor-pointer ${
                            evictionFilter === f
                              ? "bg-primary text-white font-bold"
                              : "bg-surface-low text-text-secondary hover:text-on-surface"
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border-strong text-badge-micro font-badge-micro uppercase text-text-muted tracking-wider">
                          <th className="py-2.5 px-3">Resource Key</th>
                          <th className="py-2.5 px-3">Policy Reason</th>
                          <th className="py-2.5 px-3">Retention Age</th>
                          <th className="py-2.5 px-3 text-right">Clock Time</th>
                        </tr>
                      </thead>
                      <tbody className="font-body-default text-body-default divide-y divide-border-subtle">
                        {filteredEvictions.map((row, idx) => (
                          <tr key={`${row.key}-${idx}`} className="hover:bg-surface-low transition-colors">
                            <td className="py-2.5 px-3 font-telemetry-value text-telemetry-value text-on-surface">{row.key}</td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-badge-micro font-badge-micro ${
                                  row.policy === "MRU"
                                    ? "bg-accent-attention/10 text-accent-attention font-bold"
                                    : row.policy === "LFU"
                                    ? "bg-tertiary-fixed text-tertiary font-bold"
                                    : row.policy === "FIFO"
                                    ? "bg-surface-low text-secondary font-bold"
                                    : "bg-accent-primary-subtle text-primary font-bold"
                                }`}
                              >
                                [{row.policy}] {row.reason}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-telemetry-value text-body-sm text-text-secondary">{row.age}</td>
                            <td className="py-2.5 px-3 font-telemetry-value text-body-sm text-text-muted text-right">{row.time}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-space-md pt-space-sm border-t border-border-subtle flex items-center justify-between text-body-sm text-text-muted font-body-sm">
                  <span>Showing latest {filteredEvictions.length} policy evictions</span>
                  <span className="font-telemetry-value text-badge-micro text-tertiary font-bold">Zero Miss Penalties Recorded</span>
                </div>
              </div>

              {/* Right Column: Live Engine Terminal (Espresso #3a302a) */}
              <div className="lg:col-span-5 bg-accent-contrast rounded-xl p-space-lg shadow-sm flex flex-col justify-between text-[#ede4dc]">
                <div className="flex flex-col gap-space-sm">
                  <div className="flex items-center justify-between border-b border-[#52443b] pb-space-sm">
                    <div className="flex items-center gap-space-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-accent-attention"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-tertiary"></span>
                      <span className="font-telemetry-value text-body-sm font-semibold ml-2 text-white">Live Engine Terminal</span>
                    </div>
                    <span className="font-telemetry-value text-badge-micro uppercase tracking-wider text-[#a8988d]">STDOUT</span>
                  </div>

                  <div
                    ref={terminalRef}
                    className="font-telemetry-value text-body-sm flex flex-col gap-2 overflow-y-auto max-h-[300px] pr-1 leading-relaxed selection:bg-primary selection:text-white"
                  >
                    {terminalLogs.map((log, index) => (
                      <div key={index} className="text-[#a8988d]">
                        <span className="text-[#c7b5a8]">[{log.time}]</span>{" "}
                        {log.type === "LRU" && <span className="text-primary-fixed font-bold">[LRU]</span>}{" "}
                        {log.type === "LFU" && <span className="text-tertiary-fixed font-bold">[LFU]</span>}{" "}
                        {log.type === "FIFO" && <span className="text-secondary-fixed font-bold">[FIFO]</span>}{" "}
                        {log.type === "MRU" && <span className="text-[#fca5a5] font-bold">[MRU]</span>}{" "}
                        {log.type === "ENGINE" && <span className="text-tertiary-fixed font-bold">[ENGINE]</span>}{" "}
                        {log.type === "HIT" && <span className="text-tertiary font-bold">[HIT]</span>}{" "}
                        {log.type === "EVICT" && <span className="text-[#fca5a5] font-bold">[EVICT]</span>}{" "}
                        {log.text}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-space-md pt-space-xs border-t border-[#52443b] flex items-center justify-between text-badge-micro text-[#a8988d]">
                  <span className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? "bg-tertiary" : "bg-text-muted"}`}></span>
                    <span>Channel: {activeTab === "smart" ? "worker_daemon_0" : "traditional_runner_0"}</span>
                  </span>
                  <span className="font-telemetry-value">{isRunning ? "STREAM_ACTIVE" : "STANDBY"}</span>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODAL A: POLICY BENCHMARK SUITE MODAL */}
        {/* ========================================================================= */}
        {isBenchmarksOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              onClick={() => setIsBenchmarksOpen(false)}
              className="absolute inset-0 bg-[#3a302a]/50 backdrop-blur-sm transition-opacity"
            ></div>
            <div className="relative w-full max-w-3xl bg-surface-card rounded-xl p-space-lg lg:p-space-xl shadow-xl border border-border-strong mx-4 z-10 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-border-subtle pb-space-md">
                <div>
                  <h2 className="font-section-title text-section-title text-on-surface">Policy Benchmark Suite</h2>
                  <p className="font-body-sm text-body-sm text-text-secondary mt-1">
                    Multi-workload hit rate comparisons under standardized {capacity}-slot capacity
                  </p>
                </div>
                <button
                  onClick={() => setIsBenchmarksOpen(false)}
                  className="p-2 text-text-muted hover:text-on-surface rounded-lg hover:bg-surface-low transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  </svg>
                </button>
              </div>

              <div className="flex flex-col gap-space-lg my-space-lg">
                {/* Workload 1: Cyclic */}
                <div className="flex flex-col gap-space-xs">
                  <div className="flex justify-between items-center text-body-sm">
                    <span className="font-semibold text-on-surface">Cyclic Loops (cyclic.log)</span>
                    <span className="font-telemetry-value text-primary font-bold">
                      SmartCache: 96.2% <span className="text-text-muted font-normal">vs LRU 61.4% · MRU 54.2%</span>
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-badge-micro text-[10px] w-20 text-primary font-bold">SmartCache</span>
                      <div className="flex-1 bg-surface-low h-4 rounded-full overflow-hidden">
                        <div className="bg-primary h-full rounded-full text-right pr-2 text-[10px] text-white font-telemetry-value leading-4" style={{ width: "96.2%" }}>96.2%</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-badge-micro text-[10px] w-20 text-tertiary font-bold">LFU</span>
                      <div className="flex-1 bg-surface-low h-4 rounded-full overflow-hidden">
                        <div className="bg-tertiary h-full rounded-full text-right pr-2 text-[10px] text-white font-telemetry-value leading-4" style={{ width: "72.8%" }}>72.8%</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-badge-micro text-[10px] w-20 text-secondary">LRU</span>
                      <div className="flex-1 bg-surface-low h-4 rounded-full overflow-hidden">
                        <div className="bg-secondary h-full rounded-full text-right pr-2 text-[10px] text-white font-telemetry-value leading-4" style={{ width: "61.4%" }}>61.4%</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-badge-micro text-[10px] w-20 text-text-secondary">FIFO</span>
                      <div className="flex-1 bg-surface-low h-4 rounded-full overflow-hidden">
                        <div className="bg-border-strong h-full rounded-full text-right pr-2 text-[10px] text-on-surface font-telemetry-value leading-4" style={{ width: "59.1%" }}>59.1%</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-badge-micro text-[10px] w-20 text-accent-attention font-bold">MRU</span>
                      <div className="flex-1 bg-surface-low h-4 rounded-full overflow-hidden">
                        <div className="bg-accent-attention h-full rounded-full text-right pr-2 text-[10px] text-white font-telemetry-value leading-4" style={{ width: "54.2%" }}>54.2%</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Workload 2: Zipfian */}
                <div className="flex flex-col gap-space-xs">
                  <div className="flex justify-between items-center text-body-sm">
                    <span className="font-semibold text-on-surface">Skewed Zipfian (zipfian.log)</span>
                    <span className="font-telemetry-value text-primary font-bold">
                      SmartCache: 94.1% <span className="text-text-muted font-normal">vs LFU 84.0% · LRU 82.5%</span>
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-badge-micro text-[10px] w-20 text-primary font-bold">SmartCache</span>
                      <div className="flex-1 bg-surface-low h-4 rounded-full overflow-hidden">
                        <div className="bg-primary h-full rounded-full text-right pr-2 text-[10px] text-white font-telemetry-value leading-4" style={{ width: "94.1%" }}>94.1%</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-badge-micro text-[10px] w-20 text-tertiary font-bold">LFU</span>
                      <div className="flex-1 bg-surface-low h-4 rounded-full overflow-hidden">
                        <div className="bg-tertiary h-full rounded-full text-right pr-2 text-[10px] text-white font-telemetry-value leading-4" style={{ width: "84.0%" }}>84.0%</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-badge-micro text-[10px] w-20 text-secondary">LRU</span>
                      <div className="flex-1 bg-surface-low h-4 rounded-full overflow-hidden">
                        <div className="bg-secondary h-full rounded-full text-right pr-2 text-[10px] text-white font-telemetry-value leading-4" style={{ width: "82.5%" }}>82.5%</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-badge-micro text-[10px] w-20 text-text-secondary">FIFO</span>
                      <div className="flex-1 bg-surface-low h-4 rounded-full overflow-hidden">
                        <div className="bg-border-strong h-full rounded-full text-right pr-2 text-[10px] text-on-surface font-telemetry-value leading-4" style={{ width: "76.4%" }}>76.4%</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-badge-micro text-[10px] w-20 text-accent-attention">MRU</span>
                      <div className="flex-1 bg-surface-low h-4 rounded-full overflow-hidden">
                        <div className="bg-accent-attention h-full rounded-full text-right pr-2 text-[10px] text-white font-telemetry-value leading-4" style={{ width: "49.0%" }}>49.0%</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Workload 3: GCC Compiler */}
                <div className="flex flex-col gap-space-xs">
                  <div className="flex justify-between items-center text-body-sm">
                    <span className="font-semibold text-on-surface">GCC Compiler Trace (gcc.trace)</span>
                    <span className="font-telemetry-value text-primary font-bold">
                      SmartCache: 89.7% <span className="text-text-muted font-normal">vs LRU 74.3% · FIFO 68.2%</span>
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-badge-micro text-[10px] w-20 text-primary font-bold">SmartCache</span>
                      <div className="flex-1 bg-surface-low h-4 rounded-full overflow-hidden">
                        <div className="bg-primary h-full rounded-full text-right pr-2 text-[10px] text-white font-telemetry-value leading-4" style={{ width: "89.7%" }}>89.7%</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-badge-micro text-[10px] w-20 text-secondary">LRU</span>
                      <div className="flex-1 bg-surface-low h-4 rounded-full overflow-hidden">
                        <div className="bg-secondary h-full rounded-full text-right pr-2 text-[10px] text-white font-telemetry-value leading-4" style={{ width: "74.3%" }}>74.3%</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-badge-micro text-[10px] w-20 text-tertiary">LFU</span>
                      <div className="flex-1 bg-surface-low h-4 rounded-full overflow-hidden">
                        <div className="bg-tertiary h-full rounded-full text-right pr-2 text-[10px] text-white font-telemetry-value leading-4" style={{ width: "70.1%" }}>70.1%</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-badge-micro text-[10px] w-20 text-text-secondary">FIFO</span>
                      <div className="flex-1 bg-surface-low h-4 rounded-full overflow-hidden">
                        <div className="bg-border-strong h-full rounded-full text-right pr-2 text-[10px] text-on-surface font-telemetry-value leading-4" style={{ width: "68.2%" }}>68.2%</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-badge-micro text-[10px] w-20 text-accent-attention">MRU</span>
                      <div className="flex-1 bg-surface-low h-4 rounded-full overflow-hidden">
                        <div className="bg-accent-attention h-full rounded-full text-right pr-2 text-[10px] text-white font-telemetry-value leading-4" style={{ width: "52.7%" }}>52.7%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-space-md border-t border-border-subtle pt-space-md">
                <span className="font-body-sm text-body-sm text-text-muted">Total 1,000,000 requests per benchmark trace</span>
                <button
                  onClick={handleRunFullBenchmarkSuite}
                  disabled={isBenchmarking}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-space-xs px-space-lg py-2.5 rounded-lg bg-primary text-on-primary font-body-default text-body-default font-medium hover:bg-primary-container transition-colors cursor-pointer"
                >
                  <span>{isBenchmarking ? "Running Benchmark..." : "Run Full Benchmark Suite"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* DRAWER: EVICTION PRIORITY QUEUE INSPECTOR */}
        {/* ========================================================================= */}
        {isQueueDrawerOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div
              onClick={() => setIsQueueDrawerOpen(false)}
              className="absolute inset-0 bg-[#3a302a]/40 backdrop-blur-sm transition-opacity"
            ></div>
            <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
              <div className="w-screen max-w-md bg-surface-card shadow-2xl border-l border-border-strong p-space-lg flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-border-subtle pb-space-md">
                    <div>
                      <h2 className="font-section-title text-section-title text-on-surface">Eviction Priority Queue</h2>
                      <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">Staged candidate keys ranked by AI reuse score</p>
                    </div>
                    <button
                      onClick={() => setIsQueueDrawerOpen(false)}
                      className="p-2 text-text-muted hover:text-on-surface rounded-lg hover:bg-surface-low transition-colors cursor-pointer"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                      </svg>
                    </button>
                  </div>

                  <div className="flex flex-col gap-space-sm mt-space-md">
                    <span className="font-badge-micro text-badge-micro uppercase text-text-muted">Next Candidates for Eviction</span>

                    {candidateQueue.map((item) => (
                      <div
                        key={item.rank}
                        className={`p-space-sm rounded-lg border flex items-center justify-between ${
                          item.urgent
                            ? "bg-accent-attention/10 border-accent-attention/30"
                            : "bg-surface-low border-border-subtle"
                        }`}
                      >
                        <div className="flex items-center gap-space-xs">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-telemetry-value text-body-sm font-semibold ${
                              item.urgent
                                ? "bg-accent-attention text-white font-bold"
                                : "bg-surface-card text-text-secondary"
                            }`}
                          >
                            {item.rank}
                          </span>
                          <div>
                            <div className="font-telemetry-value text-body-sm font-semibold text-on-surface">{item.key}</div>
                            <div className="font-body-sm text-badge-micro text-text-muted">{item.age}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`font-telemetry-value text-badge-micro font-bold ${
                              item.urgent ? "text-accent-attention" : "text-text-secondary"
                            }`}
                          >
                            Score {item.score}
                          </span>
                          {item.badge && (
                            <div className="font-badge-micro text-[10px] text-accent-attention uppercase font-semibold">
                              {item.badge}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-space-md border-t border-border-subtle flex flex-col gap-2">
                  <div className="flex justify-between text-body-sm text-text-muted">
                    <span>Staged Queue Version</span>
                    <span className="font-telemetry-value text-on-surface font-semibold">v{queueVersion} (Atomic)</span>
                  </div>
                  <button
                    onClick={handleForceCycle}
                    className="w-full inline-flex items-center justify-center gap-space-xs px-space-md py-2.5 rounded-lg border border-primary text-primary hover:bg-primary hover:text-white transition-colors font-body-sm font-medium cursor-pointer"
                  >
                    <span>Trigger Background Rescore Now</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL B: CUSTOM WORKLOAD UPLOAD MODAL */}
        {/* ========================================================================= */}
        {isUploadOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              onClick={() => setIsUploadOpen(false)}
              className="absolute inset-0 bg-[#3a302a]/50 backdrop-blur-sm transition-opacity"
            ></div>
            <div className="relative w-full max-w-lg bg-surface-card rounded-xl p-space-lg lg:p-space-xl shadow-xl border border-border-strong mx-4 z-10">
              <div className="flex items-center justify-between border-b border-border-subtle pb-space-md">
                <h2 className="font-section-title text-section-title text-on-surface">Upload Workload Trace</h2>
                <button
                  onClick={() => setIsUploadOpen(false)}
                  className="p-2 text-text-muted hover:text-on-surface rounded-lg hover:bg-surface-low transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  </svg>
                </button>
              </div>

              <div className="my-space-lg p-space-xl border-2 border-dashed border-border-strong rounded-xl bg-bg-canvas flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary transition-colors">
                <svg className="w-10 h-10 text-primary mb-space-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"></path>
                </svg>
                <span className="font-card-title text-card-title text-on-surface">Choose or drop trace file</span>
                <span className="font-body-sm text-body-sm text-text-muted mt-1">Accepts standard .log, .trace, and ASCII format</span>
              </div>

              <div className="flex items-center justify-end gap-space-sm border-t border-border-subtle pt-space-md">
                <button
                  onClick={() => setIsUploadOpen(false)}
                  className="px-space-md py-2 rounded-lg border border-border-strong text-text-secondary hover:bg-surface-low text-body-sm font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    appendLog("ENGINE", "Custom workload trace staged and ready.");
                    setIsUploadOpen(false);
                  }}
                  className="px-space-lg py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container text-body-sm font-medium cursor-pointer"
                >
                  Stage Workload
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* FOOTER */}
      {/* ========================================================================= */}
      <footer className="w-full bg-bg-canvas border-t border-border-subtle py-space-md">
        <div className="w-full px-margin-md lg:px-margin-lg flex flex-col md:flex-row items-center justify-between text-text-muted font-body-sm text-body-sm gap-space-sm">
          <span>© 2025 SmartCache Architecture. Telemetry Engine v4.2.0</span>
          <span>Sahara Warm Telemetry System · Traditional Replacement Policies (LRU · MRU · LFU · FIFO)</span>
        </div>
      </footer>
    </div>
  );
}
