import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import "../styles/stat-card.css";

function StatCard({ label, value, unit, change, direction, note }) {
  const hasData = value !== undefined && value !== null;
  return (
    <article className={`stat-card ${hasData ? "" : "stat-pending"}`}>
      <p>{label}</p>
      <div className="stat-value">
        {hasData ? value : "—"}
        <span>{unit}</span>
      </div>
      <div className="stat-foot">
        {hasData ? (
          <>
            <span className={`trend ${direction || "up"}`}>
              {direction === "down" ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
              {change}
            </span>
            <small>{note}</small>
          </>
        ) : (
          <small>Awaiting live data</small>
        )}
      </div>
    </article>
  );
}

export default StatCard;
