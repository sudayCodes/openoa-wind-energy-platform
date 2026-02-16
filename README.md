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

# OpenOA Wind Energy Analytics Platform

This repository contains a production-grade, full-stack web platform for operational analysis of wind energy plants, built on top of NREL's [OpenOA](https://github.com/NREL/OpenOA) library. The application provides a robust, extensible, and user-friendly interface for plant data upload, exploration, and advanced analytics, with a focus on reliability, transparency, and reproducibility.

**Live Demo:** https://openoa-wind-platform-production.up.railway.app
**API Documentation:** https://openoa-wind-platform-production.up.railway.app/api/docs

---

## System Architecture

**Frontend:** React 19, Vite, Tailwind CSS 4, Recharts 3

**Backend:** FastAPI (Python 3.11), OpenOA 3.2, Matplotlib, Pandas, Numpy

**Deployment:** Docker (single container), Nginx reverse proxy, supervisord

**Data Model:**
- Demo and user-uploaded datasets are managed in-memory (no persistent DB)
- All analyses are performed on a fresh, validated PlantData object

**Key Features:**
- Plant dashboard with turbine map, capacity, and data summary
- Data upload (SCADA, meter, reanalysis, curtailment, asset)
- Data explorer with column statistics and sample rows
- Monte Carlo AEP, electrical losses, turbine energy, wake losses, gap, and yaw misalignment analyses
- Downloadable results (JSON/CSV)
- Result persistence (localStorage)
- Robust timeout and concurrency handling

---

## Codebase Structure and Implementation

### Backend Modules

#### `backend/main.py`

#### `backend/api/routes/plant.py`

#### `backend/api/routes/analysis.py`
# Backend
cd backend
pip install -r requirements.txt
pip install -e ../../OpenOA  # Install OpenOA locally
uvicorn main:app --reload --port 8000

cd frontend
npm install
npm run dev
```


#### `backend/api/routes/upload.py`

#### `backend/api/schemas.py`
- ERA5 + MERRA2 reanalysis data included


#### `backend/core/plant_manager.py`
|--------|----------|-------------|

#### `backend/core/config.py`

#### `backend/services/data_loader.py`

#### `backend/services/analysis_runner.py`
| POST | `/api/analysis/turbine-energy` | Run turbine ideal energy analysis |

#### `backend/services/validators.py`
| GET | `/api/analysis/last-result` | Fetch cached last result |

---

### Frontend Modules

#### `frontend/src/App.jsx`

#### `frontend/src/api/client.js`

#### `frontend/src/hooks/useAnalysisRunner.js`

#### `frontend/src/hooks/usePersistedResult.js`

#### `frontend/src/hooks/useDataStatus.js`

#### `frontend/src/components/Layout.jsx`

#### `frontend/src/components/UI.jsx`
| Aspect | Detail |

#### `frontend/src/pages/*`
| **AEP (GBM, daily + temp)** | 5–12 min, may hit timeout → recovered via polling |
| **Max upload size** | 100 MB (nginx `client_max_body_size`) |
| **Frontend timeout** | 15 min (axios); backend keeps running if exceeded |
| **Memory ceiling** | ~1 GB on Railway; large analyses with many simulations may OOM |
| **Plot generation** | Matplotlib figures converted to base64 PNG — stripped from downloads |

##  Project Structure

```

#### `frontend/src/index.css`

#### `frontend/vite.config.js`

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check and dataset readiness |
| GET | `/api/plant/summary` | Plant metadata, turbines, date range, stats |
| GET | `/api/plant/scada-preview` | SCADA sample rows and column stats |
| POST | `/api/data/upload/{type}` | Upload CSV for a dataset |
| GET | `/api/data/status` | Loaded dataset status and analysis readiness |
| POST | `/api/data/reset` | Reset all data to demo |
| GET | `/api/data/templates` | Required columns for each dataset |
| POST | `/api/analysis/aep` | Monte Carlo AEP analysis |
| POST | `/api/analysis/electrical-losses` | Electrical losses analysis |
| POST | `/api/analysis/turbine-energy` | Turbine gross energy analysis |
| POST | `/api/analysis/wake-losses` | Wake loss analysis |
| POST | `/api/analysis/gap-analysis` | EYA gap analysis |
| POST | `/api/analysis/yaw-misalignment` | Yaw misalignment analysis |
| GET | `/api/analysis/status` | Analysis lock status and result availability |
| GET | `/api/analysis/last-result` | Cached result from last analysis |
| GET | `/api/docs` | Interactive API documentation (Swagger) |

---

## Data Flow and Analysis Pipeline

1. **Data Upload:**
     - User uploads CSVs for SCADA, meter, reanalysis, curtailment, and/or asset
     - Each file is validated for required columns and time format
     - Data is stored in-memory and replaces any previous upload

2. **Plant Summary and Data Explorer:**
     - Dashboard and Data Explorer read directly from user-uploaded data (never fallback to demo in custom mode)
     - All statistics and tables are computed on the fly

3. **Analysis Execution:**
     - User triggers an analysis (AEP, losses, etc.)
     - Backend validates required datasets, builds a fresh PlantData object
     - Analysis runs in a background thread; only one analysis at a time
     - Results (including plots) are returned as structured JSON
     - If frontend times out, it polls for completion and fetches cached result

4. **Result Persistence and Download:**
     - Results are cached in localStorage with metadata
     - Download as JSON or CSV (plots omitted from downloads)

---

## Demo Dataset

**La Haute Borne Wind Farm (ENGIE Open Data):**
- 4 × Senvion MM82 turbines (2.05 MW each, 8.2 MW total)
- Location: 48.45°N, 5.59°E (France)
- ~417,000 SCADA records (10-min resolution)
- ERA5 and MERRA2 reanalysis data included

---

## Development and Deployment

### Prerequisites
- Docker Desktop (recommended for production parity)
- Node.js 18+, Python 3.11+ (for local dev)

### Quick Start (Docker Compose)

```bash
git clone <repo-url>
cd openoa-app
docker compose up -d
open http://localhost
```

### Local Development

```bash
# Backend
cd backend
pip install -r requirements.txt
pip install -e ../../OpenOA
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

---

## License

This project uses [OpenOA](https://github.com/NREL/OpenOA) (BSD-3-Clause License) by NREL.
## Project Directory Structure

backend/
     main.py                 # FastAPI app + Swagger at /api/docs
     requirements.txt
     api/
          routes/
               plant.py            # Plant summary + data preview
               analysis.py         # 6 analysis endpoints + concurrency guard
               upload.py           # CSV upload, status, reset
     core/
          config.py           # Paths & defaults
          plant_manager.py    # PlantData lifecycle
     services/
          data_loader.py      # Demo data ETL pipeline
          analysis_runner.py  # OpenOA analysis wrappers
frontend/
     src/
          App.jsx             # Router (9 pages)
          index.css           # Forced dark theme + animations
          api/
               client.js       # Axios API client
          hooks/
               useAnalysisRunner.js  # Timeout recovery + polling
               usePersistedResult.js # localStorage + download utils
               useDataStatus.js      # Analysis readiness check
          components/
               Layout.jsx      # Sidebar + header shell
               UI.jsx          # StatCard, PlotImage, DownloadButton, etc.
          pages/
               Dashboard.jsx
               DataUpload.jsx
               DataExplorer.jsx
               AEPAnalysis.jsx       # Executive summary + P50/P90
               ElectricalLosses.jsx
               TurbineEnergy.jsx
               WakeLosses.jsx
               GapAnalysis.jsx
               YawMisalignment.jsx
     vite.config.js
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
