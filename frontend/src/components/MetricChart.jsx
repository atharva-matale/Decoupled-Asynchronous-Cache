import "../styles/chart.css";

function MetricChart({ title, value, unit, delta, values, color, startLabel }) {
  if (!values?.length) return <article className="chart-card chart-empty"><p>{title}</p><strong>{value ?? "—"}<span>{unit}</span></strong><div>No chart data received.</div></article>;
  const width = 500, height = 128, pad = 5;
  const max = Math.max(...values), min = Math.min(...values);
  const points = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - pad - ((v - min) / (max - min || 1)) * (height - 20)}`).join(" ");
  const area = `0,${height} ${points} ${width},${height}`;
  return <article className="chart-card"><div className="chart-heading"><div><p>{title}</p><strong>{value}<span>{unit}</span></strong></div><span className={delta.startsWith("+") ? "positive" : "neutral"}>{delta}</span></div><svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-label={`${title} line chart`}><defs><linearGradient id={`fill-${title}`} x1="0" x2="0" y1="0" y2="1"><stop stopColor={color} stopOpacity=".24"/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient></defs><path d={`M ${area} Z`} fill={`url(#fill-${title})`} /><polyline points={points} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" /></svg><div className="chart-axis"><span>{startLabel || "Start"}</span><span>Now</span></div></article>;
}

export default MetricChart;
