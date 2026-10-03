const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  return response.status === 204 ? null : response.json();
}

export const cacheApi = {
  getSnapshot: () => request("/dashboard"),
  start: ({ mode, workload, cacheSize, refreshInterval }) => request("/simulation/start", {
    method: "POST",
    body: JSON.stringify({
      mode,
      workload,
      cacheSize: Number(cacheSize),
      refreshInterval: Number(refreshInterval)
    }),
  }),
  stop: () => request("/simulation/stop", { method: "POST" }),
  reset: () => request("/simulation/reset", { method: "POST" }),
};
