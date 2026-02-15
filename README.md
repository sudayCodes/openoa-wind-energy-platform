# OpenOA Wind Energy Analytics Platform

A full-stack web application wrapping NREL's [OpenOA](https://github.com/NREL/OpenOA) library for operational analysis of wind energy plants.

![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)
![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react)
![Docker](https://img.shields.io/badge/Deploy-Docker-2496ED?logo=docker)
![OpenOA](https://img.shields.io/badge/Engine-OpenOA_v3.2-green)

---

## 🏗️ Architecture

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
- **Deployment**: Docker Compose + Nginx reverse proxy

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Dashboard** | Plant overview with turbine map, capacity, and data summary |
| **Data Explorer** | Interactive SCADA data table with column statistics |
| **AEP Analysis** | Monte Carlo–based Annual Energy Production estimation |
| **Electrical Losses** | Electrical loss quantification via monthly resampling |
| **Turbine Energy** | Long-term gross energy estimation per turbine |
| **Wake Losses** | Wake loss calculation using SCADA + reanalysis data |
| **Gap Analysis** | EYA (Expected Yield Assessment) vs OA (Operational) gap waterfall |
| **Yaw Misalignment** | Static yaw misalignment detection per turbine |

## 🚀 Quick Start

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

## 📊 Demo Dataset

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
| POST | `/api/analysis/aep` | Run Monte Carlo AEP analysis |
| POST | `/api/analysis/electrical-losses` | Run electrical losses analysis |
| POST | `/api/analysis/turbine-energy` | Run turbine ideal energy analysis |
| POST | `/api/analysis/wake-losses` | Run wake losses analysis |
| POST | `/api/analysis/gap-analysis` | Run EYA gap analysis |
| POST | `/api/analysis/yaw-misalignment` | Run yaw misalignment analysis |

## 📁 Project Structure

```
openoa-app/
├── docker-compose.yml          # Orchestration
├── nginx/nginx.conf            # Reverse proxy config
├── backend/
│   ├── Dockerfile
│   ├── main.py                 # FastAPI app entry point
│   ├── requirements.txt
│   ├── api/
│   │   ├── schemas.py          # Pydantic request/response models
│   │   └── routes/
│   │       ├── plant.py        # Plant summary + data preview
│   │       └── analysis.py     # All 6 analysis endpoints
│   ├── core/
│   │   ├── config.py           # Paths & defaults
│   │   └── plant_manager.py    # PlantData lifecycle
│   └── services/
│       ├── data_loader.py      # Demo data ETL pipeline
│       └── analysis_runner.py  # OpenOA analysis wrappers
└── frontend/
    ├── Dockerfile
    ├── src/
    │   ├── App.jsx             # Router (8 pages)
    │   ├── api/client.js       # Axios API client
    │   ├── components/
    │   │   ├── Layout.jsx      # Sidebar + header shell
    │   │   └── UI.jsx          # Reusable card/chart components
    │   └── pages/
    │       ├── Dashboard.jsx
    │       ├── DataExplorer.jsx
    │       ├── AEPAnalysis.jsx
    │       ├── ElectricalLosses.jsx
    │       ├── TurbineEnergy.jsx
    │       ├── WakeLosses.jsx
    │       ├── GapAnalysis.jsx
    │       └── YawMisalignment.jsx
    └── vite.config.js
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, Tailwind CSS 4, Recharts 3, Lucide Icons |
| Backend | Python 3.11, FastAPI 0.115, Uvicorn |
| Analysis Engine | OpenOA 3.2 (NREL), Pandas, NumPy, SciPy, Matplotlib |
| Infrastructure | Docker, Nginx 1.27, Docker Compose |

## 📄 License

This project uses [OpenOA](https://github.com/NREL/OpenOA) (BSD-3-Clause License) by NREL.
