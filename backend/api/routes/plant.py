"""Plant data routes — summary, turbines, data preview."""

from __future__ import annotations

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException

from api.schemas import PlantSummary, TurbineInfo, ScadaPreview
from core.plant_manager import get_plant, get_store_source

router = APIRouter(prefix="/plant", tags=["Plant"])


@router.get("/summary", response_model=PlantSummary)
def plant_summary():
    """Get plant overview: capacity, turbines, date range, stats."""
    plant = get_plant()
    if plant is None:
        raise HTTPException(status_code=404, detail="No plant data loaded")

    asset = plant.asset
    scada = plant.scada

    # Build turbine list from asset data
    turbines = []
    for idx, row in asset.iterrows():
        tid = str(idx)
        turbines.append(TurbineInfo(
            asset_id=tid,
            latitude=float(row["latitude"]) if "latitude" in row and pd.notna(row["latitude"]) else None,
            longitude=float(row["longitude"]) if "longitude" in row and pd.notna(row["longitude"]) else None,
            rated_power=float(row["rated_power"]) if "rated_power" in row and pd.notna(row["rated_power"]) else None,
            hub_height=float(row["hub_height"]) if "hub_height" in row and pd.notna(row["hub_height"]) else None,
            rotor_diameter=float(row["rotor_diameter"]) if "rotor_diameter" in row and pd.notna(row["rotor_diameter"]) else None,
        ))

    # Date range from MultiIndex (level 0 = time, level 1 = asset_id)
    scada_reset = scada.reset_index()
    time_col_name = scada_reset.columns[0]  # First column after reset is time
    time_col = pd.to_datetime(scada_reset[time_col_name])
    date_range = [str(time_col.min()), str(time_col.max())]

    # Compute stats
    avg_ws = None
    if "WMET_HorWdSpd" in scada.columns:
        avg_ws = round(float(scada["WMET_HorWdSpd"].mean()), 2)

    avg_power = None
    if "WTUR_W" in scada.columns:
        avg_power = round(float(scada["WTUR_W"].mean()), 2)

    capacity_kw = float(plant.metadata.capacity) * 1000 if plant.metadata.capacity else None
    cap_factor = round(avg_power / capacity_kw, 4) if avg_power and capacity_kw else None

    reanalysis_products = list(plant.reanalysis.keys()) if plant.reanalysis else []
    meter_rows = len(plant.meter) if plant.meter is not None else 0

    source = get_store_source()
    plant_name = "La Haute Borne Wind Farm" if source == "demo" else "Custom Wind Farm"

    return PlantSummary(
        name=plant_name,
        latitude=float(plant.metadata.latitude),
        longitude=float(plant.metadata.longitude),
        capacity_mw=float(plant.metadata.capacity),
        num_turbines=len(turbines),
        turbines=turbines,
        scada_date_range=date_range,
        scada_rows=len(scada),
        meter_rows=meter_rows,
        reanalysis_products=reanalysis_products,
        avg_wind_speed=avg_ws,
        avg_power_kw=avg_power,
        capacity_factor=cap_factor,
    )


@router.get("/scada-preview", response_model=ScadaPreview)
def scada_preview():
    """Get SCADA data sample and column statistics."""
    plant = get_plant()
    if plant is None:
        raise HTTPException(status_code=404, detail="No plant data loaded")

    scada = plant.scada

    # Sample rows (first 50), reset index to include time & asset_id
    sample = scada.head(50).copy().reset_index()
    for col in sample.columns:
        if pd.api.types.is_datetime64_any_dtype(sample[col]):
            sample[col] = sample[col].astype(str)
    sample_rows = sample.where(sample.notna(), None).to_dict(orient="records")

    # Column stats for numeric columns
    col_stats = {}
    all_cols = list(scada.reset_index().columns)
    for col in scada.columns:
        if pd.api.types.is_numeric_dtype(scada[col]):
            col_stats[col] = {
                "min": round(float(scada[col].min()), 3) if pd.notna(scada[col].min()) else None,
                "max": round(float(scada[col].max()), 3) if pd.notna(scada[col].max()) else None,
                "mean": round(float(scada[col].mean()), 3) if pd.notna(scada[col].mean()) else None,
                "missing_pct": round(float(scada[col].isna().mean()) * 100, 2),
            }
        else:
            col_stats[col] = {
                "unique": int(scada[col].nunique()),
                "missing_pct": round(float(scada[col].isna().mean()) * 100, 2),
            }

    return ScadaPreview(
        columns=all_cols,
        sample_rows=sample_rows,
        column_stats=col_stats,
        total_rows=len(scada),
    )
