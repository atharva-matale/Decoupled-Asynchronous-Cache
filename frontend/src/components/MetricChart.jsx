import "../styles/chart.css";

function MetricChart({ title, value, unit, delta = "0.0%", values, color = "#8b7cff", startLabel }) {
  if (!values?.length) {
    return (
      <article className="chart-card chart-empty">
        <div>
          <p>{title}</p>
          <strong>
            {value ?? "—"}
            <span>{unit}</span>
          </strong>
        </div>
        <svg className="chart-placeholder" viewBox="0 0 300 76" preserveAspectRatio="none" aria-hidden="true">
          <path className="placeholder-area" d="M0 65 L32 54 L64 58 L96 37 L128 49 L160 26 L192 40 L224 20 L258 29 L300 8 L300 76 L0 76 Z" />
          <path className="placeholder-line" d="M0 65 L32 54 L64 58 L96 37 L128 49 L160 26 L192 40 L224 20 L258 29 L300 8" />
        </svg>
        <div>Awaiting time-series data</div>
      </article>
    );
  }

  const width = 500, height = 128, pad = 5;
  const max = Math.max(...values), min = Math.min(...values);
  const points = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - pad - ((v - min) / (max - min || 1)) * (height - 20)}`).join(" ");
  const area = `0,${height} ${points} ${width},${height}`;
  const gradId = `fill-${title.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  return (
    <article className="chart-card">
      <div className="chart-heading">
        <div>
          <p>{title}</p>
          <strong>{value}<span>{unit}</span></strong>
        </div>
        <span className={delta?.startsWith("+") ? "positive" : "neutral"}>{delta}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-label={`${title} line chart`}>
        <defs>
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#${gradId})`} />
        <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="chart-axis">
        <span>{startLabel || "Start"}</span>
        <span>Now</span>
      </div>
    </article>
  );
}

export default MetricChart;
