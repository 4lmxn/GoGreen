# GoGreen: eco-routing and emissions accounting for small fleets

GoGreen plans delivery trips and multi-stop rounds that cut both travel time and CO₂, and tracks them.

**What it does:**
- **Predicts fuel and CO₂** for each road option with a physics model. Inputs come from live public APIs: OSRM for roads, and Open-Meteo for weather and terrain.
- **Learns each vehicle's real consumption** from completed trips.

**Two portals:**
- **Drivers:** plan a trip, pick a route, track by GPS, report fuel.
- **Admins:**
  - approve drivers and manage vehicles
  - optimise multi-stop rounds and inspect the model in the Model Lab
  - watch the live fleet and export reports

How the model works, with equations and sources: [`docs/MODEL.md`](docs/MODEL.md).

## Architecture

```
frontend/  React 19 + Vite + Leaflet + Tailwind     (driver and admin portals)
backend/   Flask REST API + SQLAlchemy (SQLite)
  app/ml/physics.py            road-load fuel/CO₂ model
  app/services/routing.py      OSRM routes + per-segment speed + turns + terrain
  app/services/rounds.py       exact multi-stop order optimiser (Held-Karp)
  app/services/calibration.py  per-vehicle learning loop
  app/services/decision_policy.py  when to recommend a greener route
```

## Run it

Backend (Python 3.12):

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # Windows: copy .env.example .env  (then set the secrets)
python -m scripts.run_demo        # demo data on http://127.0.0.1:5002, admin@demo.local / driver@demo.local, DemoPass123!
```

Frontend:

```bash
cd frontend
npm install
VITE_API_BASE_URL=http://127.0.0.1:5002/api/v1 npm run dev     # Windows PowerShell: $env:VITE_API_BASE_URL="http://127.0.0.1:5002/api/v1"; npm run dev
```

Run the demo backend with `CORS_ORIGINS` set to the frontend address (e.g. `http://localhost:5173`).

Tests: `cd backend && python -m pytest -q` (89 tests, no network needed).

Route planning needs internet access: OSRM and Open-Meteo are free public APIs that need no key. If either is down, the app says so instead of inventing values.
# GoGreen
