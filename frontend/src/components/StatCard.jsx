import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import "../styles/stat-card.css";
function StatCard({ label, value, unit, change, direction, note }) {
  return <article className="stat-card"><p>{label}</p><div className="stat-value">{value}<span>{unit}</span></div><div className="stat-foot"><span className={`trend ${direction}`} >{direction === "up" ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{change}</span><small>{note}</small></div></article>;
}
export default StatCard;
