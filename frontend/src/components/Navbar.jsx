import { Upload, Download, BarChart2 } from "lucide-react";
import smritiLogo from "../assets/smriti-logo.png";
import "../styles/navbar.css";

function Navbar({ onOpenBenchmarks, onUpload, onExport }) {
  return (
    <header className="smartcache-navbar">
      <div className="navbar-container">
        {/* Brand Left */}
        <div className="navbar-brand">
          <img src={smritiLogo} alt="SmartCache Logo" className="navbar-brand-logo" />
          <div className="navbar-brand-text">
            <span className="navbar-brand-title">SMRITI</span>
            <span className="navbar-brand-sub">Smart Memory Replacement with Independent Threaded Inference</span>
          </div>
        </div>

        {/* Actions Right */}
        <div className="navbar-actions">
          <button
            type="button"
            className="navbar-btn-outline"
            onClick={onUpload}
          >
            <Upload size={14} />
            <span>Upload Workload</span>
          </button>

          <button
            type="button"
            className="navbar-btn-outline"
            onClick={onExport}
          >
            <Download size={14} />
            <span>Export Report</span>
          </button>

          <button
            type="button"
            className="navbar-btn-primary"
            onClick={onOpenBenchmarks}
          >
            <BarChart2 size={14} />
            <span>Policy Benchmarks</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;

