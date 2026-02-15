"""
OpenOA Wind Energy Assessment Platform — FastAPI Backend
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.plant_manager import init_plant, is_loading, get_plant, get_loaded_status
from api.routes.plant import router as plant_router
from api.routes.analysis import router as analysis_router
from api.routes.upload import router as upload_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load demo data on startup."""
    print("🔄 Loading La Haute Borne demo dataset...")
    init_plant()
    plant = get_plant()
    if plant:
        print(f"✅ Plant data loaded: {len(plant.asset)} turbines, {len(plant.scada)} SCADA rows")
    else:
        print("⚠️  Failed to load plant data")
    yield
    print("👋 Shutting down")


app = FastAPI(
    title="OpenOA Wind Energy Assessment Platform",
    description="A web application wrapping the OpenOA library for wind plant operational assessment.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS — allow frontend dev server and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(plant_router, prefix="/api")
app.include_router(analysis_router, prefix="/api")
app.include_router(upload_router, prefix="/api")


@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    status = get_loaded_status()
    return {
        "status": "ok",
        "plant_loaded": status.get("scada", False),
        "loading": is_loading(),
        "datasets": status,
    }
