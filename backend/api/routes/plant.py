"""Plant data routes — summary, turbines, data preview."""

from __future__ import annotations

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException

from api.schemas import PlantSummary, TurbineInfo, ScadaPreview
from core.plant_manager import get_plant, get_store_source, get_raw_uploads

router = APIRouter(prefix="/plant", tags=["Plant"])


@router.get("/summary", response_model=PlantSummary)
def plant_summary():
    """Get plant overview: capacity, turbines, date range, stats."""
    source = get_store_source()

    if source == "custom":
        return _custom_summary()

    # Demo mode — use the PlantData object
    plant = get_plant()
    if plant is None:
        raise HTTPException(status_code=404, detail="No plant data loaded")
    return _demo_summary(plant)


def _demo_summary(plant) -> PlantSummary:
    """Build summary from demo PlantData."""
    asset = plant.asset
    scada = plant.scada

    turbines = _build_turbine_list(asset)

    scada_reset = scada.reset_index()
    time_col_name = scada_reset.columns[0]
    time_col = pd.to_datetime(scada_reset[time_col_name])
    date_range = [str(time_col.min()), str(time_col.max())]

    avg_ws = round(float(scada["WMET_HorWdSpd"].mean()), 2) if "WMET_HorWdSpd" in scada.columns else None
    avg_power = round(float(scada["WTUR_W"].mean()), 2) if "WTUR_W" in scada.columns else None
    capacity_kw = float(plant.metadata.capacity) * 1000 if plant.metadata.capacity else None
    cap_factor = round(avg_power / capacity_kw, 4) if avg_power and capacity_kw else None
    reanalysis_products = list(plant.reanalysis.keys()) if plant.reanalysis else []
    meter_rows = len(plant.meter) if plant.meter is not None else 0

    return PlantSummary(
        name="La Haute Borne Wind Farm",
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
        source="demo",
    )


def _custom_summary() -> PlantSummary:
    """Build summary directly from user-uploaded raw DataFrames (no demo fallback)."""
    raw = get_raw_uploads()
    scada_df = raw.get("scada")
    asset_df = raw.get("asset")
    meter_df = raw.get("meter")
    reanalysis = raw.get("reanalysis")

    # Turbines from uploaded asset data
    turbines = []
    if asset_df is not None and len(asset_df) > 0:
        turbines = _build_turbine_list(asset_df)

    # SCADA stats from uploaded SCADA data
    date_range = ["N/A", "N/A"]
    scada_rows = 0
    avg_ws = None
    avg_power = None

    if scada_df is not None and len(scada_df) > 0:
        scada_rows = len(scada_df)
        if "time" in scada_df.columns:
            time_col = pd.to_datetime(scada_df["time"])
            date_range = [str(time_col.min()), str(time_col.max())]
        if "WMET_HorWdSpd" in scada_df.columns:
            avg_ws = round(float(scada_df["WMET_HorWdSpd"].mean(skipna=True)), 2)
        if "WTUR_W" in scada_df.columns:
            avg_power = round(float(scada_df["WTUR_W"].mean(skipna=True)), 2)

    # Capacity from uploaded asset data
    capacity_mw = 0.0
    if asset_df is not None and "rated_power" in asset_df.columns:
        try:
            capacity_mw = round(float(asset_df["rated_power"].sum()) / 1000, 2)
        except Exception:
            pass

    cap_factor = None
    if avg_power and capacity_mw > 0:
        cap_factor = round(avg_power / (capacity_mw * 1000), 4)

    # Meter
    meter_rows = len(meter_df) if meter_df is not None else 0

    # Reanalysis
    reanalysis_products = []
    if isinstance(reanalysis, dict):
        reanalysis_products = list(reanalysis.keys())
    elif reanalysis is not None:
        reanalysis_products = ["user_reanalysis"]

    # Lat/lon from asset data
    lat, lon = 0.0, 0.0
    if asset_df is not None and "latitude" in asset_df.columns and "longitude" in asset_df.columns:
        lat = round(float(asset_df["latitude"].mean()), 4)
        lon = round(float(asset_df["longitude"].mean()), 4)

    return PlantSummary(
        name="Custom Wind Farm",
        latitude=lat,
        longitude=lon,
        capacity_mw=capacity_mw,
        num_turbines=len(turbines),
        turbines=turbines,
        scada_date_range=date_range,
        scada_rows=scada_rows,
        meter_rows=meter_rows,
        reanalysis_products=reanalysis_products,
        avg_wind_speed=avg_ws,
        avg_power_kw=avg_power,
        capacity_factor=cap_factor,
        source="custom",
    )


def _build_turbine_list(asset) -> list[TurbineInfo]:
    """Build turbine info list from an asset DataFrame or PlantData.asset."""
    turbines = []
    for idx, row in asset.iterrows():
        tid = str(row["asset_id"]) if "asset_id" in row.index else str(idx)
        turbines.append(TurbineInfo(
            asset_id=tid,
            latitude=float(row["latitude"]) if "latitude" in row.index and pd.notna(row.get("latitude")) else None,
            longitude=float(row["longitude"]) if "longitude" in row.index and pd.notna(row.get("longitude")) else None,
            rated_power=float(row["rated_power"]) if "rated_power" in row.index and pd.notna(row.get("rated_power")) else None,
            hub_height=float(row["hub_height"]) if "hub_height" in row.index and pd.notna(row.get("hub_height")) else None,
            rotor_diameter=float(row["rotor_diameter"]) if "rotor_diameter" in row.index and pd.notna(row.get("rotor_diameter")) else None,
        ))
    return turbines


@router.get("/scada-preview", response_model=ScadaPreview)
def scada_preview():
    """Get SCADA data sample and column statistics."""
    source = get_store_source()

    if source == "custom":
        return _custom_scada_preview()

    # Demo mode — use the PlantData object
    plant = get_plant()
    if plant is None:
        raise HTTPException(status_code=404, detail="No plant data loaded")
    return _demo_scada_preview(plant)


def _demo_scada_preview(plant) -> ScadaPreview:
    """Build SCADA preview from demo PlantData."""
    scada = plant.scada

    sample = scada.head(50).copy().reset_index()
    for col in sample.columns:
        if pd.api.types.is_datetime64_any_dtype(sample[col]):
            sample[col] = sample[col].astype(str)
    sample_rows = sample.where(sample.notna(), None).to_dict(orient="records")

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
        source="demo",
    )


def _custom_scada_preview() -> ScadaPreview:
    """Build SCADA preview from user's raw uploaded SCADA DataFrame."""
    raw = get_raw_uploads()
    scada_df = raw.get("scada")

    if scada_df is None or len(scada_df) == 0:
        # No SCADA uploaded — return empty preview
        return ScadaPreview(
            columns=[],
            sample_rows=[],
            column_stats={},
            total_rows=0,
            source="custom",
        )

    # Sample rows (first 50)
    sample = scada_df.head(50).copy()
    for col in sample.columns:
        if pd.api.types.is_datetime64_any_dtype(sample[col]):
            sample[col] = sample[col].astype(str)
    sample_rows = sample.where(sample.notna(), None).to_dict(orient="records")

    # Column stats
    col_stats = {}
    all_cols = list(scada_df.columns)
    for col in scada_df.columns:
        if pd.api.types.is_numeric_dtype(scada_df[col]):
            col_stats[col] = {
                "min": round(float(scada_df[col].min()), 3) if pd.notna(scada_df[col].min()) else None,
                "max": round(float(scada_df[col].max()), 3) if pd.notna(scada_df[col].max()) else None,
                "mean": round(float(scada_df[col].mean()), 3) if pd.notna(scada_df[col].mean()) else None,
                "missing_pct": round(float(scada_df[col].isna().mean()) * 100, 2),
            }
        else:
            col_stats[col] = {
                "unique": int(scada_df[col].nunique()),
                "missing_pct": round(float(scada_df[col].isna().mean()) * 100, 2),
            }

    return ScadaPreview(
        columns=all_cols,
        sample_rows=sample_rows,
        column_stats=col_stats,
        total_rows=len(scada_df),
        source="custom",
    )
