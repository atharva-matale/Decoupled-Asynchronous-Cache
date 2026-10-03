import { Bell, Menu, Search } from "lucide-react";
import "../styles/navbar.css";

function Navbar({ onMenuClick, running }) {
  return <header className="navbar">
    <button className="icon-button menu-button" onClick={onMenuClick} aria-label="Toggle navigation"><Menu size={20} /></button>
    <div className="mobile-brand">cacheflow</div>
    <div className="nav-actions">
      <button className="icon-button search-button" aria-label="Search"><Search size={19} /></button>
      <button className="icon-button notification-button" aria-label="Notifications"><Bell size={19} /><span /></button>
      <div className="run-status"><i className={running ? "active" : ""} />{running ? "Simulation running" : "Simulation paused"}</div>
      <div className="avatar">IK</div>
    </div>
  </header>;
}
export default Navbar;
