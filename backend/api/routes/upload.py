"""Upload routes — CSV upload endpoints for each data type."""

from __future__ import annotations


import asyncio
import io
import traceback
from functools import partial
import os
import uuid

import pandas as pd
from fastapi import APIRouter, File, HTTPException, UploadFile

from core.plant_manager import (
    get_data_info,
    get_loaded_status,
    reset_to_demo,
    set_dataset,
)
from services.validators import (
    ANALYSIS_REQUIREMENTS,
    REQUIRED_COLUMNS,
    validate_csv_columns,
    validate_time_column,
)

router = APIRouter(prefix="/data", tags=["Data Upload"])


def _parse_csv_bytes(raw: bytes) -> pd.DataFrame:
    """Parse raw CSV bytes into a DataFrame (runs in thread pool)."""
    return pd.read_csv(io.BytesIO(raw))


@router.post("/upload/{dataset_type}")
async def upload_csv(dataset_type: str, file: UploadFile = File(...)):
    """
    Upload a CSV file for a specific dataset type.

    dataset_type must be one of: scada, meter, reanalysis, curtailment, asset
    """
    valid_types = ["scada", "meter", "reanalysis", "curtailment", "asset"]
    if dataset_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid dataset type '{dataset_type}'. Must be one of: {', '.join(valid_types)}",
        )

    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")


    # Save uploaded file to /backend/tmp/session-id/dataset_type.csv
    session_id = 'default'  # For now, single-user; can be replaced with real session logic
    tmp_dir = os.path.join(os.path.dirname(__file__), '../tmp', session_id)
    os.makedirs(tmp_dir, exist_ok=True)
    file_path = os.path.join(tmp_dir, f'{dataset_type}.csv')
    try:
        with open(file_path, 'wb') as f:
            content = await file.read()
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {str(e)}")

    # Parse CSV from saved file
    try:
        loop = asyncio.get_running_loop()
        df = await loop.run_in_executor(None, pd.read_csv, file_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")

    if len(df) == 0:
        raise HTTPException(status_code=400, detail="CSV file is empty.")

    # Validate required columns
    is_valid, missing = validate_csv_columns(df, dataset_type)
    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Required columns for {dataset_type} are missing. "
                f"Missing: {', '.join(missing)}. "
                f"Expected columns: {', '.join(REQUIRED_COLUMNS[dataset_type])}."
            ),
        )

    # Validate time column (for time-series datasets)
    if dataset_type in ("scada", "meter", "reanalysis", "curtailment"):
        time_valid, time_err = validate_time_column(df)
        if not time_valid:
            raise HTTPException(status_code=400, detail=time_err)
        df["time"] = pd.to_datetime(df["time"])

    # Store the dataset (runs in thread pool — set_dataset + _rebuild_plant
    # are CPU-heavy and would block the event loop)
    try:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, set_dataset, dataset_type, df)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to store dataset: {str(e)}")

    return {
        "status": "success",
        "message": f"{dataset_type} data uploaded successfully.",
        "rows": len(df),
        "columns": list(df.columns),
    }


@router.get("/status")
def data_status():
    """
    Get the current status of all loaded datasets.
    Shows which datasets are available and their sizes.
    """
    status = get_loaded_status()
    info = get_data_info()

    # For each analysis, check if requirements are met
    analysis_ready = {}
    for analysis_name, reqs in ANALYSIS_REQUIREMENTS.items():
        missing = [ds for ds in reqs["required"] if not status.get(ds, False)]
        analysis_ready[analysis_name] = {
            "ready": len(missing) == 0,
            "missing": missing,
            "required": reqs["required"],
            "description": reqs["description"],
        }

    return {
        "source": info["source"],
        "datasets": status,
        "details": info.get("datasets", {}),
        "analysis_ready": analysis_ready,
    }


@router.post("/reset")
async def reset_data():
    """Reset all data back to the demo dataset."""
    try:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, reset_to_demo)
        return {"status": "success", "message": "Data reset to demo dataset."}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to reset: {str(e)}")


@router.get("/templates")
def get_templates():
    """Return the expected CSV column templates for each data type."""
    return {
        dataset_type: {
            "required_columns": columns,
            "description": _template_desc(dataset_type),
        }
        for dataset_type, columns in REQUIRED_COLUMNS.items()
    }


def _template_desc(dtype: str) -> str:
    descs = {
        "scada": "SCADA data — 10min/daily/monthly turbine-level time series with power, wind speed, direction, pitch, temperature, and status.",
        "meter": "Meter data — plant-level energy production from the revenue meter.",
        "reanalysis": "Reanalysis data — hourly/daily gridded weather data (e.g. ERA5, MERRA2) with wind speed, direction, temperature, density, pressure.",
        "curtailment": "Curtailment data — plant-level availability and curtailment losses.",
        "asset": "Asset data — turbine metadata including location, capacity, dimensions. Not a time series.",
    }
    return descs.get(dtype, "")
