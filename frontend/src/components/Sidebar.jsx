import { Activity, BarChart3, ChevronDown, LayoutDashboard, Settings, TerminalSquare } from "lucide-react";
import "../styles/sidebar.css";
const icons = [LayoutDashboard, Activity, BarChart3, TerminalSquare, Settings];

function Sidebar({ open, items, selectedIndex, onSelect }) {
  return <aside className={`sidebar ${open ? "open" : ""}`}>
    <div className="brand"><span className="brand-mark">⚡</span><span className="brand-name">cacheflow</span></div>
    <nav className="side-nav">
      <p className="nav-label">WORKSPACE</p>
      {items.map((item, index) => {
        const Icon = icons[index] || LayoutDashboard;
        return (
          <button 
            className={`nav-item ${index === selectedIndex ? "selected" : ""}`} 
            key={item}
            onClick={() => onSelect && onSelect(index)}
          >
            <Icon size={18} />
            <span>{item}</span>
          </button>
        );
      })}
    </nav>
  </aside>;
}
export default Sidebar;
