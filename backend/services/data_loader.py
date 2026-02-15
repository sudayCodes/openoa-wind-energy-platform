"""
Data loader service — loads demo La Haute Borne data or user-uploaded CSVs
into an OpenOA PlantData object.
"""

from __future__ import annotations

import re
from pathlib import Path
from zipfile import ZipFile

import numpy as np
import pandas as pd

import openoa.utils.unit_conversion as un
import openoa.utils.met_data_processing as met
from openoa.plant import PlantData
from openoa.utils import filters

from core.config import DEMO_ZIP, DEMO_EXTRACTED, METADATA_YML


def extract_demo_data() -> Path:
    """Extract the La Haute Borne demo zip if not already extracted."""
    if not DEMO_EXTRACTED.exists():
        with ZipFile(DEMO_ZIP) as zf:
            zf.extractall(DEMO_EXTRACTED)
    return DEMO_EXTRACTED


def clean_scada(scada_file: Path) -> pd.DataFrame:
    """Clean SCADA data following the ENGIE project workflow."""
    scada_freq = "10min"
    scada_df = pd.read_csv(scada_file)

    # Timestamps to UTC
    scada_df["Date_time"] = pd.to_datetime(scada_df["Date_time"], utc=True).dt.tz_localize(None)

    # Drop duplicate timestamps per turbine
    scada_df = scada_df.drop_duplicates(subset=["Date_time", "Wind_turbine_name"], keep="first")

    # Remove extreme temperature readings
    scada_df = scada_df[(scada_df["Ot_avg"] >= -15.0) & (scada_df["Ot_avg"] <= 45.0)]

    # Flag unresponsive sensors
    turbine_ids = scada_df.Wind_turbine_name.unique()
    sensor_cols = ["Ba_avg", "P_avg", "Ws_avg", "Va_avg", "Ot_avg", "Ya_avg", "Wa_avg"]
    for t_id in turbine_ids:
        ix_turbine = scada_df["Wind_turbine_name"] == t_id
        ix_flag = filters.unresponsive_flag(scada_df.loc[ix_turbine], 3, col=["Va_avg"])
        scada_df.loc[ix_flag.loc[ix_flag["Va_avg"]].index, sensor_cols] = np.nan
        ix_flag = filters.unresponsive_flag(scada_df.loc[ix_turbine], 20, col=["Ot_avg"])
        scada_df.loc[ix_flag.loc[ix_flag["Ot_avg"]].index, "Ot_avg"] = np.nan

    # Normalize pitch angle
    scada_df.loc[:, "Ba_avg"] = scada_df["Ba_avg"] % 360
    ix_gt_180 = scada_df["Ba_avg"] > 180.0
    scada_df.loc[ix_gt_180, "Ba_avg"] = scada_df.loc[ix_gt_180, "Ba_avg"] - 360.0

    # Calculate energy
    scada_df["energy_kwh"] = un.convert_power_to_energy(scada_df.P_avg * 1000, scada_freq) / 1000

    return scada_df


def load_demo_plant() -> PlantData:
    """Load the full La Haute Borne demo dataset into a PlantData object."""
    path = extract_demo_data()

    # SCADA
    scada_df = clean_scada(path / "la-haute-borne-data-2014-2015.csv")

    # Meter
    meter_curtail_df = pd.read_csv(path / "plant_data.csv")
    meter_df = meter_curtail_df.copy()
    meter_df["time"] = pd.to_datetime(meter_df.time_utc).dt.tz_localize(None)
    meter_df.drop(["time_utc", "availability_kwh", "curtailment_kwh"], axis=1, inplace=True)

    # Curtailment
    curtail_df = meter_curtail_df.copy()
    curtail_df["time"] = pd.to_datetime(curtail_df.time_utc).dt.tz_localize(None)
    curtail_df.drop(["time_utc"], axis=1, inplace=True)

    # Reanalysis — MERRA2
    merra2_df = pd.read_csv(path / "merra2_la_haute_borne.csv")
    merra2_df["datetime"] = pd.to_datetime(merra2_df["datetime"], utc=True).dt.tz_localize(None)
    merra2_df["winddirection_deg"] = met.compute_wind_direction(merra2_df["u_50"], merra2_df["v_50"])
    merra2_df.drop(columns=["Unnamed: 0"], errors="ignore", inplace=True)

    # Reanalysis — ERA5
    era5_df = pd.read_csv(path / "era5_wind_la_haute_borne.csv")
    era5_df = era5_df.loc[:, ~era5_df.columns.duplicated()].copy()
    era5_df["datetime"] = pd.to_datetime(era5_df["datetime"], utc=True).dt.tz_localize(None)
    era5_df = era5_df.set_index(pd.DatetimeIndex(era5_df.datetime)).asfreq("1h")
    era5_df["datetime"] = era5_df.index
    era5_df["winddirection_deg"] = met.compute_wind_direction(
        era5_df["u_100"], era5_df["v_100"]
    ).values
    era5_df.drop(columns=["Unnamed: 0"], errors="ignore", inplace=True)

    # Asset
    asset_df = pd.read_csv(path / "la-haute-borne_asset_table.csv")
    asset_df["type"] = "turbine"

    # Build PlantData
    plant = PlantData(
        analysis_type=None,
        metadata=METADATA_YML,
        scada=scada_df,
        meter=meter_df,
        curtail=curtail_df,
        asset=asset_df,
        reanalysis={"era5": era5_df, "merra2": merra2_df},
    )
    return plant
