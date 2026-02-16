"""
Data Manager — central store for PlantData + raw upload DataFrames.

Architecture:
  - On startup: loads demo dataset as a single PlantData object (cached)
  - On CSV upload: stores ONLY the user-uploaded DataFrames
  - get_loaded_status() reports only what the user actually uploaded
  - Analyses check requirements against loaded status
  - Stateless (no database) — new upload replaces previous dataset
  - Single-user demo
"""

from __future__ import annotations

import gc
import traceback
from typing import Any, Optional
import os
import pandas as pd
from openoa.plant import PlantData
from services.data_loader import load_demo_plant
from services.validators import validate_analysis_requirements


# ── Global state ──
_demo_plant: Optional[PlantData] = None   # cached demo (loaded once, reused on reset)
_custom_plant: Optional[PlantData] = None  # rebuilt from user uploads (if any)
_loading: bool = False
_source: str = "none"  # "demo" | "custom"

# Raw DataFrames for custom uploads ONLY (never filled with demo data)
_raw_uploads: dict[str, Any] = {
    "scada": None,
    "meter": None,
    "curtail": None,
    "reanalysis": None,
    "asset": None,
}


def _load_demo_cached() -> PlantData:
    """Load demo plant once and cache it for the process lifetime."""
    global _demo_plant
    if _demo_plant is None:
        _demo_plant = load_demo_plant()
    return _demo_plant


def init_demo():
    """Load demo dataset on startup."""
    global _loading, _source, _custom_plant
    _loading = True
    try:
        _load_demo_cached()
        _custom_plant = None
        _source = "demo"
    finally:
        _loading = False


def reset_to_demo():
    """Reset all data back to the demo dataset."""
    global _source, _raw_uploads, _custom_plant
    # Clear custom uploads
    _raw_uploads = {k: None for k in _raw_uploads}
    # Free the custom plant
    _custom_plant = None
    gc.collect()
    # Switch back to cached demo
    _source = "demo"
    _load_demo_cached()


def set_dataset(dataset_type: str, df: pd.DataFrame):
    """
    Store a user-uploaded dataset and rebuild PlantData.
    Only the datasets the user has actually uploaded are tracked.
    Also saves the uploaded CSV to disk for persistence.
    """
    global _source, _custom_plant

    # Normalize key: frontend sends "curtailment" but internal key is "curtail"
    key = "curtail" if dataset_type == "curtailment" else dataset_type
    _raw_uploads[key] = df
    _source = "custom"
    # Save to disk for persistence (already handled in upload route)
    _rebuild_custom_plant()


def _load_from_tmp_or_memory(dataset_type: str):
    """
    Try to load the dataset from /backend/tmp/default/{dataset_type}.csv if it exists.
    Fallback to in-memory if not found.
    """
    session_id = 'default'
    tmp_dir = os.path.join(os.path.dirname(__file__), '../tmp', session_id)
    file_path = os.path.join(tmp_dir, f'{dataset_type}.csv')
    if os.path.exists(file_path):
        try:
            return pd.read_csv(file_path)
        except Exception:
            pass
    # Fallback to in-memory
    key = "curtail" if dataset_type == "curtailment" else dataset_type
    return _raw_uploads.get(key)


def _rebuild_custom_plant():
    """Rebuild a PlantData from user uploads + demo fallback for missing pieces."""
    global _custom_plant
    from core.config import METADATA_YML

    # We need at least scada + asset to build PlantData.
    # For any dataset the user hasn't uploaded, pull from the demo plant
    # so that PlantData construction doesn't fail.
    demo = _load_demo_cached()

    scada = _load_from_tmp_or_memory("scada")
    asset = _load_from_tmp_or_memory("asset")
    meter = _load_from_tmp_or_memory("meter")
    curtail = _load_from_tmp_or_memory("curtailment")
    reanalysis = _load_from_tmp_or_memory("reanalysis")

    # Fall back to demo for scada/asset if user hasn't uploaded them
    if scada is None:
        scada = demo.scada.reset_index()
    if asset is None:
        asset = demo.asset.reset_index() if demo.asset.index.name else demo.asset.copy()

    # For optional datasets, only pass them if user uploaded them
    # (don't mix in demo data — that would be misleading)
    if isinstance(reanalysis, pd.DataFrame):
        reanalysis = {"user_reanalysis": reanalysis}

    try:
        _custom_plant = PlantData(
            analysis_type=None,
            metadata=METADATA_YML,
            scada=scada,
            meter=meter,
            curtail=curtail,
            asset=asset,
            reanalysis=reanalysis,
        )
        gc.collect()
    except Exception as e:
        print(f"⚠️ Failed to rebuild PlantData: {e}")
        traceback.print_exc()


def get_loaded_status() -> dict[str, bool]:
    """
    Return which datasets are currently loaded.
    In demo mode: everything the demo has.
    In custom mode: ONLY what the user actually uploaded.
    """
    if _source == "demo":
        demo = _load_demo_cached()
        return {
            "scada": demo.scada is not None and len(demo.scada) > 0,
            "meter": demo.meter is not None and len(demo.meter) > 0,
            "reanalysis": demo.reanalysis is not None and len(demo.reanalysis) > 0,
            "curtailment": demo.curtail is not None and len(demo.curtail) > 0,
            "asset": demo.asset is not None and len(demo.asset) > 0,
        }
    # Custom mode: ONLY report datasets the user has uploaded
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
    plant = get_plant()
    info: dict[str, Any] = {
        "source": _source,
        "datasets": {},
    }
    if plant is None:
        return info

    if status["scada"]:
        info["datasets"]["scada"] = {
            "rows": len(plant.scada),
            "columns": list(plant.scada.reset_index().columns),
        }
    if status["meter"]:
        info["datasets"]["meter"] = {
            "rows": len(plant.meter),
            "columns": list(plant.meter.columns),
        }
    if status["reanalysis"]:
        info["datasets"]["reanalysis"] = {
            "products": list(plant.reanalysis.keys()) if plant.reanalysis else [],
            "rows": {k: len(v) for k, v in plant.reanalysis.items()} if plant.reanalysis else {},
        }
    if status["curtailment"]:
        info["datasets"]["curtailment"] = {
            "rows": len(plant.curtail),
            "columns": list(plant.curtail.columns),
        }
    if status["asset"]:
        info["datasets"]["asset"] = {
            "rows": len(plant.asset),
            "columns": list(plant.asset.columns),
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
    plant = get_plant()
    if plant is None:
        return None, "No plant data loaded. Load demo or upload CSVs first."

    status = get_loaded_status()
    valid, error = validate_analysis_requirements(status, analysis_type)
    if not valid:
        return None, error

    return plant, ""


def get_store_source() -> str:
    return _source


def is_loading() -> bool:
    return _loading


def get_plant() -> Optional[PlantData]:
    """Get the current PlantData (demo or custom)."""
    if _source == "custom" and _custom_plant is not None:
        return _custom_plant
    return _demo_plant


def get_raw_uploads() -> dict[str, Any]:
    """Return the raw user-uploaded DataFrames (for Dashboard/Explorer in custom mode)."""
    return _raw_uploads


def init_plant():
    """Alias for init_demo."""
    init_demo()
