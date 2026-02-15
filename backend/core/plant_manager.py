"""
Data Manager — central store for PlantData + raw upload DataFrames.

Architecture:
  - On startup: loads demo dataset as a single PlantData object
  - On CSV upload: stores raw DataFrames, rebuilds PlantData from them
  - For each analysis: validates required datasets, returns the PlantData
  - Stateless (no database) — new upload replaces previous dataset
  - Single-user demo
"""

from __future__ import annotations

from typing import Any, Optional

import pandas as pd
from openoa.plant import PlantData

from services.data_loader import load_demo_plant
from services.validators import validate_analysis_requirements


# ── Global state ──
_plant: Optional[PlantData] = None
_loading: bool = False
_source: str = "none"  # "demo" | "custom"

# Raw DataFrames for custom uploads (used to rebuild PlantData)
_raw_uploads: dict[str, Any] = {
    "scada": None,
    "meter": None,
    "curtail": None,
    "reanalysis": None,
    "asset": None,
}


def init_demo():
    """Load demo dataset on startup."""
    global _plant, _loading, _source
    if _plant is not None:
        return
    _loading = True
    try:
        _plant = load_demo_plant()
        _source = "demo"
    finally:
        _loading = False


def reset_to_demo():
    """Reset all data back to the demo dataset."""
    global _plant, _source, _raw_uploads
    _raw_uploads = {k: None for k in _raw_uploads}
    _plant = None
    _source = "none"
    init_demo()


def set_dataset(dataset_type: str, df: pd.DataFrame):
    """
    Store a user-uploaded dataset and rebuild PlantData.
    First upload uses demo data for all other datasets.
    """
    global _plant, _source, _raw_uploads

    # On first custom upload, initialize raw_uploads from demo data
    if _source == "demo" and _plant is not None:
        _init_raw_from_demo()

    _raw_uploads[dataset_type] = df
    _source = "custom"
    _rebuild_plant()


def _init_raw_from_demo():
    """Extract raw data from demo PlantData for custom rebuild base."""
    global _raw_uploads
    demo = load_demo_plant.__wrapped__() if hasattr(load_demo_plant, '__wrapped__') else load_demo_plant()
    # Store the raw inputs used by load_demo_plant (before PlantData processing)
    from services.data_loader import extract_demo_data, clean_scada, METADATA_YML
    import openoa.utils.met_data_processing as met
    path = extract_demo_data()

    _raw_uploads["scada"] = clean_scada(path / "la-haute-borne-data-2014-2015.csv")

    meter_curtail_df = pd.read_csv(path / "plant_data.csv")
    meter_df = meter_curtail_df.copy()
    meter_df["time"] = pd.to_datetime(meter_df.time_utc).dt.tz_localize(None)
    meter_df.drop(["time_utc", "availability_kwh", "curtailment_kwh"], axis=1, inplace=True)
    _raw_uploads["meter"] = meter_df

    curtail_df = meter_curtail_df.copy()
    curtail_df["time"] = pd.to_datetime(curtail_df.time_utc).dt.tz_localize(None)
    curtail_df.drop(["time_utc"], axis=1, inplace=True)
    _raw_uploads["curtail"] = curtail_df

    merra2_df = pd.read_csv(path / "merra2_la_haute_borne.csv")
    merra2_df["datetime"] = pd.to_datetime(merra2_df["datetime"], utc=True).dt.tz_localize(None)
    merra2_df["winddirection_deg"] = met.compute_wind_direction(merra2_df["u_50"], merra2_df["v_50"])
    merra2_df.drop(columns=["Unnamed: 0"], errors="ignore", inplace=True)

    era5_df = pd.read_csv(path / "era5_wind_la_haute_borne.csv")
    era5_df = era5_df.loc[:, ~era5_df.columns.duplicated()].copy()
    era5_df["datetime"] = pd.to_datetime(era5_df["datetime"], utc=True).dt.tz_localize(None)
    era5_df = era5_df.set_index(pd.DatetimeIndex(era5_df.datetime)).asfreq("1h")
    era5_df["datetime"] = era5_df.index
    era5_df["winddirection_deg"] = met.compute_wind_direction(era5_df["u_100"], era5_df["v_100"]).values
    era5_df.drop(columns=["Unnamed: 0"], errors="ignore", inplace=True)
    _raw_uploads["reanalysis"] = {"era5": era5_df, "merra2": merra2_df}

    asset_df = pd.read_csv(path / "la-haute-borne_asset_table.csv")
    asset_df["type"] = "turbine"
    _raw_uploads["asset"] = asset_df


def _rebuild_plant():
    """Rebuild PlantData from raw uploads."""
    global _plant
    from core.config import METADATA_YML
    try:
        reanalysis = _raw_uploads["reanalysis"]
        if isinstance(reanalysis, pd.DataFrame):
            reanalysis = {"user_reanalysis": reanalysis}

        _plant = PlantData(
            analysis_type=None,
            metadata=METADATA_YML,
            scada=_raw_uploads["scada"],
            meter=_raw_uploads["meter"],
            curtail=_raw_uploads["curtail"],
            asset=_raw_uploads["asset"],
            reanalysis=reanalysis,
        )
    except Exception as e:
        print(f"⚠️ Failed to rebuild PlantData: {e}")


def get_loaded_status() -> dict[str, bool]:
    """Return which datasets are currently loaded."""
    if _source == "demo" and _plant is not None:
        return {
            "scada": _plant.scada is not None and len(_plant.scada) > 0,
            "meter": _plant.meter is not None and len(_plant.meter) > 0,
            "reanalysis": _plant.reanalysis is not None and len(_plant.reanalysis) > 0,
            "curtailment": _plant.curtail is not None and len(_plant.curtail) > 0,
            "asset": _plant.asset is not None and len(_plant.asset) > 0,
        }
    # Custom mode: check raw uploads
    return {
        "scada": _raw_uploads["scada"] is not None,
        "meter": _raw_uploads["meter"] is not None,
        "reanalysis": _raw_uploads["reanalysis"] is not None,
        "curtailment": _raw_uploads["curtail"] is not None,
        "asset": _raw_uploads["asset"] is not None,
    }


def get_data_info() -> dict[str, Any]:
    """Return detailed info about loaded datasets."""
    status = get_loaded_status()
    info: dict[str, Any] = {
        "source": _source,
        "datasets": {},
    }
    if _plant is None:
        return info

    if status["scada"]:
        info["datasets"]["scada"] = {
            "rows": len(_plant.scada),
            "columns": list(_plant.scada.reset_index().columns),
        }
    if status["meter"]:
        info["datasets"]["meter"] = {
            "rows": len(_plant.meter),
            "columns": list(_plant.meter.columns),
        }
    if status["reanalysis"]:
        info["datasets"]["reanalysis"] = {
            "products": list(_plant.reanalysis.keys()),
            "rows": {k: len(v) for k, v in _plant.reanalysis.items()},
        }
    if status["curtailment"]:
        info["datasets"]["curtailment"] = {
            "rows": len(_plant.curtail),
            "columns": list(_plant.curtail.columns),
        }
    if status["asset"]:
        info["datasets"]["asset"] = {
            "rows": len(_plant.asset),
            "columns": list(_plant.asset.columns),
        }
    return info


def build_plant(analysis_type: str) -> tuple[Optional[PlantData], str]:
    """
    Get PlantData for an analysis, after validating requirements.

    NOTE: We return the *original* reference — no deepcopy here.
    OpenOA analysis classes already deepcopy the plant internally
    (via attrs ``field(converter=deepcopy)``), so copying here would
    triple memory usage and cause OOM on memory-constrained hosts.
    """
    if _plant is None:
        return None, "No plant data loaded. Load demo or upload CSVs first."

    status = get_loaded_status()
    valid, error = validate_analysis_requirements(status, analysis_type)
    if not valid:
        return None, error

    return _plant, ""


def get_store_source() -> str:
    return _source


def is_loading() -> bool:
    return _loading


# ── Backward compatibility ──

def get_plant() -> Optional[PlantData]:
    """Get the current PlantData (for summary/preview endpoints)."""
    return _plant


def init_plant():
    """Alias for init_demo."""
    init_demo()
