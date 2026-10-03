import "../styles/table.css";

function EvictionHistory({ rows }) { 
  return (
    <section className="data-panel eviction-panel">
      <div className="panel-heading">
        <div>
          <h2>Eviction history</h2>
          <p>Latest decisions from the policy engine</p>
        </div>
      </div>
      <div className="table-wrap" style={{ maxHeight: "310px", overflowY: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>KEY</th>
              <th>REASON</th>
              <th>AGE</th>
              <th>TIME</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row, idx) => (
              <tr key={`${row.key}-${idx}`}>
                <td><code>{row.key}</code></td>
                <td><span className="reason-tag">{row.reason}</span></td>
                <td>{row.age}</td>
                <td>{row.time}</td>
              </tr>
            )) : (
              <tr>
                <td className="empty-table" colSpan="4">No eviction events received.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  ); 
}

export default EvictionHistory;
