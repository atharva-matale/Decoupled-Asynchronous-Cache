import { Radio } from "lucide-react";
import "../styles/logs.css";
function LiveLogs({ logs, running }) { return <section className="data-panel logs-panel"><div className="panel-heading"><div><h2>Live logs</h2><p><Radio size={13} className={running ? "live" : ""} /> {running ? "Streaming events" : "Waiting for simulation"}</p></div></div><div className="log-list">{logs.length ? logs.map((log, index) => <div className="log-row" key={`${log.time}-${index}`}><time>{log.time}</time><span className={`log-level ${log.level}`}>{log.level}</span><span>{log.message}</span></div>) : <p className="empty-logs">No log events received.</p>}</div></section>; }
export default LiveLogs;
