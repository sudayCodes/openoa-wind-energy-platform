"""
Validators — CSV schema validation and dataset requirement checks for each analysis type.

Flow:  CSV upload → validate_csv_columns() → store in DataManager
       Analysis request → validate_analysis_requirements() → build PlantData → run
"""

from __future__ import annotations

from typing import Any
import pandas as pd


# ──────────────────────────────────────────────────────────────
# Required columns per CSV type
# ──────────────────────────────────────────────────────────────

REQUIRED_COLUMNS: dict[str, list[str]] = {
    "scada": [
        "time",
        "asset_id",
        "WTUR_W",          # Power (kW)
        "WMET_HorWdSpd",   # Wind speed (m/s)
        "WMET_HorWdDir",   # Wind direction (deg)
        "WROT_BlPthAngVal", # Blade pitch (deg)
        "WMET_EnvTmp",     # Temperature (°C)
        "WTUR_TurSt",      # Turbine status code
    ],
    "meter": [
        "time",
        "MMTR_SupWh",      # Energy (kWh)
    ],
    "reanalysis": [
        "time",
        "WMETR_HorWdSpd",
        "WMETR_HorWdSpdU",
        "WMETR_HorWdSpdV",
        "WMETR_HorWdDir",
        "WMETR_EnvTmp",
        "WMETR_AirDen",
        "WMETR_EnvPres",
    ],
    "curtailment": [
        "time",
        "IAVL_ExtPwrDnWh",
        "IAVL_DnWh",
    ],
    "asset": [
        "asset_id",
        "latitude",
        "longitude",
        "rated_power",
        "hub_height",
        "rotor_diameter",
        "elevation",
        "type",
    ],
}


# ──────────────────────────────────────────────────────────────
# Required datasets per analysis type
# ──────────────────────────────────────────────────────────────

ANALYSIS_REQUIREMENTS: dict[str, dict[str, Any]] = {
    "MonteCarloAEP": {
        "required": ["scada", "meter", "reanalysis"],
        "optional": ["curtailment"],
        "description": "Monte Carlo AEP requires SCADA, Meter, and Reanalysis data.",
    },
    "ElectricalLosses": {
        "required": ["scada", "meter"],
        "optional": [],
        "description": "Electrical Losses requires SCADA and Meter data.",
    },
    "TurbineLongTermGrossEnergy": {
        "required": ["scada", "reanalysis"],
        "optional": [],
        "description": "Turbine Long-Term Gross Energy requires SCADA and Reanalysis data.",
    },
    "WakeLosses": {
        "required": ["scada", "asset", "reanalysis"],
        "optional": [],
        "description": "Wake Losses requires SCADA, Asset geometry, and Reanalysis data.",
    },
    "StaticYawMisalignment": {
        "required": ["scada"],
        "optional": [],
        "description": "Static Yaw Misalignment requires SCADA data only.",
    },
    "EYAGapAnalysis": {
        "required": ["scada"],
        "optional": [],
        "description": "EYA Gap Analysis requires SCADA data.",
    },
}


def validate_csv_columns(
    df: pd.DataFrame,
    dataset_type: str,
) -> tuple[bool, list[str]]:
    """
    Check if a DataFrame has all required columns for the given dataset type.

    Returns:
        (is_valid, missing_columns)
    """
    required = REQUIRED_COLUMNS.get(dataset_type, [])
    if not required:
        return True, []

    df_cols = set(df.columns)
    missing = [col for col in required if col not in df_cols]
    return len(missing) == 0, missing


def validate_time_column(df: pd.DataFrame) -> tuple[bool, str]:
    """
    Check the 'time' column exists and can be parsed as datetime.

    Returns:
        (is_valid, error_message)
    """
    if "time" not in df.columns:
        return False, "Missing 'time' column."
    try:
        pd.to_datetime(df["time"])
        return True, ""
    except Exception:
        return False, "Column 'time' cannot be parsed as datetime."


def validate_analysis_requirements(
    loaded_datasets: dict[str, bool],
    analysis_type: str,
) -> tuple[bool, str]:
    """
    Check whether the required datasets for an analysis type are loaded.

    Args:
        loaded_datasets: dict like {"scada": True, "meter": True, "reanalysis": False, ...}
        analysis_type: e.g. "MonteCarloAEP"

    Returns:
        (is_valid, error_message)
    """
    reqs = ANALYSIS_REQUIREMENTS.get(analysis_type)
    if reqs is None:
        return False, f"Unknown analysis type: {analysis_type}"

    missing = [ds for ds in reqs["required"] if not loaded_datasets.get(ds, False)]
    if missing:
        return False, (
            f"Required columns for {analysis_type} are missing. "
            f"{reqs['description']} "
            f"Missing datasets: {', '.join(missing)}."
        )
    return True, ""


def get_analysis_requirements(analysis_type: str) -> dict:
    """Return the requirement spec for a given analysis type."""
    return ANALYSIS_REQUIREMENTS.get(analysis_type, {})
