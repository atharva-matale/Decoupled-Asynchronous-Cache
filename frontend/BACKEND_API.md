# Backend contract

Set `VITE_API_BASE_URL` in a local `.env` file to point to your backend. The frontend calls these endpoints:

- `GET /dashboard` — returns the current dashboard data.
- `POST /simulation/start` — body: `{ "workload": "...", "cacheSize": 512 }`.
- `POST /simulation/stop`
- `POST /simulation/reset`

`GET /dashboard` should return this shape:

```json
{
  "running": true,
  "updatedAt": "2026-08-09T10:24:38Z",
  "stats": [{ "label": "Cache hit rate", "value": "86.4", "unit": "%", "change": "+2.8%", "direction": "up", "note": "vs. previous hour" }],
  "charts": [{ "title": "Hit rate", "value": "86.4", "unit": "%", "delta": "+2.8%", "color": "#67e8b6", "values": [82, 84, 86] }],
  "evictions": [{ "key": "product:87421", "reason": "Low reuse score", "age": "18m 42s", "time": "10:24:38" }],
  "logs": [{ "time": "10:24:38", "level": "info", "message": "Cache decision received" }]
}
```
