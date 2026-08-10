# SmartCache (AI-Assisted Cache Eviction)

A decoupled, zero-latency machine learning framework that replaces classical cache replacement policies (FIFO, LRU, LFU, MRU) with dynamic pattern prediction. 

This repository connects a high-performance Python simulation engine (supporting trace-driven workloads) with a React/Vite visualization dashboard to demonstrate the improvements of adaptive eviction algorithms over traditional baselines.

---

## 📂 Repository Structure

- `backend/`: Core cache simulator algorithms (`src/`), trace datasets (`traces/`), and Flask controller thread (`server.py`).
- `frontend/`: Single-page React dashboard built with Vite, CSS Grid, and custom SVG charting components.

---

## 🚀 Getting Started

### 1. Start the Backend API
The backend runs a Flask server that parses workloads and manages active simulation states.

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install Python dependencies:
   ```bash
   pip install flask flask-cors
   ```
3. Run the server:
   ```bash
   python server.py
   ```
   *The server will start listening at `http://localhost:8000`.*

---

### 2. Start the Frontend Dashboard
The frontend is a single-page React app that coordinates with the Flask simulation endpoints.

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install Node packages:
   ```bash
   npm install
   ```
3. Launch the development server:
   ```bash
   npm run dev
   ```
   *Open **[http://localhost:5173](http://localhost:5173)** in your browser.*

---

## 📊 Workload Benchmarks

You can run simulations against the following included traces:
- `cyclic.log` (reveals LRU's 0% hit-rate limitation)
- `zipfian.log` (frequency-heavy access patterns)
- `recency.log` (recent-history biased access patterns)
- `gcc.trace` & `swim.trace` (real-world compiler and system memory traces)
