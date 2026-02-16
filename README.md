# OpenOA Wind Energy Analytics Platform

A full-stack web application wrapping NREL's [OpenOA](https://github.com/NREL/OpenOA) library for operational analysis of wind energy plants.

![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)
![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react)
![Docker](https://img.shields.io/badge/Deploy-Docker-2496ED?logo=docker)
![OpenOA](https://img.shields.io/badge/Engine-OpenOA_v3.2-green)

🔗 **Live Demo**: [openoa-wind-platform-production.up.railway.app](https://openoa-wind-platform-production.up.railway.app)
📖 **API Docs**: [/api/docs](https://openoa-wind-platform-production.up.railway.app/api/docs) (Swagger UI)

---

##  Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Nginx (port 80)                                         │
│  ┌──────────────┐       ┌─────────────────────────────┐  │
│  │  React SPA   │──────▶│  FastAPI Backend (port 8000) │  │
│  │  (static)    │ /api  │  + OpenOA v3.2 Engine        │  │
│  └──────────────┘       └─────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

- **Frontend**: React 19 + Vite + Tailwind CSS v4 + Recharts
- **Backend**: FastAPI + OpenOA v3.2 + Matplotlib
- **Deployment**: Docker + Nginx reverse proxy (single container via supervisord)

##  Features

| Feature | Description |
|---------|-------------|
| **Dashboard** | Plant overview with turbine map, capacity, and data summary |
| **Data Upload** | Upload custom CSVs or use built-in La Haute Borne demo data |
| **Data Explorer** | Interactive SCADA data table with column statistics |
| **AEP Analysis** | Monte Carlo AEP with P50/P90, capacity factor & executive summary |
| **Electrical Losses** | Electrical loss quantification via monthly resampling |
| **Turbine Energy** | Long-term gross energy estimation per turbine |
| **Wake Losses** | Wake loss calculation using SCADA + reanalysis data |
| **Gap Analysis** | EYA vs OA gap waterfall |
| **Yaw Misalignment** | Static yaw misalignment detection per turbine |
| **Download** | Export results as JSON or CSV |
| **Result Persistence** | Results stay when switching tabs (localStorage) |
| **Timeout Recovery** | Polls backend if frontend times out on long analyses |

##  Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### Run with Docker Compose

```bash
# Clone the repo
git clone <repo-url>
cd openoa-app

# Build and start both services
docker compose up -d

# Open in browser
open http://localhost
```

The app starts on **http://localhost** (port 80). The backend loads the La Haute Borne demo dataset (~4 turbines, 8.2 MW) on startup — this takes ~20s.

### Development Mode (without Docker)

```bash
# Backend
cd backend
pip install -r requirements.txt
pip install -e ../../OpenOA  # Install OpenOA locally
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Frontend dev server at http://localhost:5173 proxies `/api` to the backend.

##  Demo Dataset

**La Haute Borne Wind Farm** (ENGIE open data):
- 4 × Senvion MM82 turbines (2.05 MW each = 8.2 MW total)
- Location: 48.45°N, 5.59°E (France)
- ~417,000 SCADA records at 10-minute resolution
- ERA5 + MERRA2 reanalysis data included

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check + plant load status |
| GET | `/api/plant/summary` | Plant metadata, turbines, date range |
| GET | `/api/plant/scada-preview` | Sample SCADA rows + column stats |
| POST | `/api/data/upload/{type}` | Upload custom CSV data |
| GET | `/api/data/status` | Current data source & analysis readiness |
| POST | `/api/data/reset` | Reset to demo data |
| POST | `/api/analysis/aep` | Run Monte Carlo AEP analysis |
| POST | `/api/analysis/electrical-losses` | Run electrical losses analysis |
| POST | `/api/analysis/turbine-energy` | Run turbine ideal energy analysis |
| POST | `/api/analysis/wake-losses` | Run wake losses analysis |
| POST | `/api/analysis/gap-analysis` | Run EYA gap analysis |
| POST | `/api/analysis/yaw-misalignment` | Run yaw misalignment analysis |
| GET | `/api/analysis/status` | Check if analysis is running |
| GET | `/api/analysis/last-result` | Fetch cached last result |
| GET | `/api/docs` | Interactive Swagger API docs |

##  Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Single container** (supervisord) | Railway free tier has 1 service; supervisord runs nginx + uvicorn together |
| **1 uvicorn worker** | OpenOA analyses are memory-intensive (~500 MB each); 1 worker prevents OOM |
| **asyncio.Lock concurrency guard** | Only one analysis at a time — returns HTTP 429 if busy |
| **Backend result caching** | If frontend times out (15 min), it polls `/api/analysis/status` and fetches cached result |
| **localStorage persistence** | Analysis results survive tab switches without re-running |
| **Non-blocking CSV parsing** | `run_in_executor` prevents event loop blocking during large file uploads |
| **Forced dark theme** | CSS `color-scheme: dark` ensures consistent dark UI regardless of browser settings |
| **Monte Carlo defaults** | `num_sim=1000` for AEP, `num_sim=5` for TIE — balances accuracy vs. memory |

## ⚡ Performance & Trade-offs

| Aspect | Detail |
|--------|--------|
| **AEP (linear, monthly)** | ~30–60s, reliable |
| **AEP (GBM, daily + temp)** | 5–12 min, may hit timeout → recovered via polling |
| **Max upload size** | 100 MB (nginx `client_max_body_size`) |
| **Frontend timeout** | 15 min (axios); backend keeps running if exceeded |
| **Memory ceiling** | ~1 GB on Railway; large analyses with many simulations may OOM |
| **Plot generation** | Matplotlib figures converted to base64 PNG — stripped from downloads |

##  Project Structure

```
openoa-app/
├── Dockerfile                  # Single-container build
├── docker-compose.yml          # Local development
├── supervisord.conf            # Manages nginx + uvicorn
├── nginx/nginx.conf            # Reverse proxy config
├── backend/
│   ├── main.py                 # FastAPI app + Swagger at /api/docs
│   ├── requirements.txt
│   ├── api/routes/
│   │   ├── plant.py            # Plant summary + data preview
│   │   ├── analysis.py         # 6 analysis endpoints + concurrency guard
│   │   └── upload.py           # CSV upload, status, reset
│   ├── core/
│   │   ├── config.py           # Paths & defaults
│   │   └── plant_manager.py    # PlantData lifecycle
│   └── services/
│       ├── data_loader.py      # Demo data ETL pipeline
│       └── analysis_runner.py  # OpenOA analysis wrappers
└── frontend/
    ├── src/
    │   ├── App.jsx             # Router (9 pages)
    │   ├── index.css           # Forced dark theme + animations
    │   ├── api/client.js       # Axios API client
    │   ├── hooks/
    │   │   ├── useAnalysisRunner.js  # Timeout recovery + polling
    │   │   ├── usePersistedResult.js # localStorage + download utils
    │   │   └── useDataStatus.js      # Analysis readiness check
    │   ├── components/
    │   │   ├── Layout.jsx      # Sidebar + header shell
    │   │   └── UI.jsx          # StatCard, PlotImage, DownloadButton, etc.
    │   └── pages/
    │       ├── Dashboard.jsx
    │       ├── DataUpload.jsx
    │       ├── DataExplorer.jsx
    │       ├── AEPAnalysis.jsx       # Executive summary + P50/P90
    │       ├── ElectricalLosses.jsx
    │       ├── TurbineEnergy.jsx
    │       ├── WakeLosses.jsx
    │       ├── GapAnalysis.jsx
    │       └── YawMisalignment.jsx
    └── vite.config.js
```

##  Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, Tailwind CSS 4, Recharts 3, Lucide Icons |
| Backend | Python 3.11, FastAPI 0.115, Uvicorn |
| Analysis Engine | OpenOA 3.2 (NREL), Pandas, NumPy, SciPy, Matplotlib |
| Infrastructure | Docker, Nginx 1.27, supervisord |
| Deployment | Railway (single container) |

##  License

This project uses [OpenOA](https://github.com/NREL/OpenOA) (BSD-3-Clause License) by NREL.
