"""Pydantic schemas for API request/response models."""

from __future__ import annotations

from typing import Any, Optional
from pydantic import BaseModel, Field


# ── Plant Schemas ──

class TurbineInfo(BaseModel):
    asset_id: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    rated_power: Optional[float] = None
    hub_height: Optional[float] = None
    rotor_diameter: Optional[float] = None


class PlantSummary(BaseModel):
    name: str
    latitude: float
    longitude: float
    capacity_mw: float
    num_turbines: int
    turbines: list[TurbineInfo]
    scada_date_range: list[str]  # [start, end]
    scada_rows: int
    meter_rows: int
    reanalysis_products: list[str]
    avg_wind_speed: Optional[float] = None
    avg_power_kw: Optional[float] = None
    capacity_factor: Optional[float] = None


class ScadaPreview(BaseModel):
    columns: list[str]
    sample_rows: list[dict[str, Any]]
    column_stats: dict[str, dict[str, Any]]
    total_rows: int


# ── Analysis Request Schemas ──

class AEPRequest(BaseModel):
    num_sim: int = Field(default=1000, ge=100, le=10000)
    reg_model: str = Field(default="lin", pattern="^(lin|gam|gbm|etr)$")
    reg_temperature: bool = False
    reg_wind_direction: bool = False
    time_resolution: str = Field(default="MS", pattern="^(MS|ME|D|h)$")


class ElectricalLossesRequest(BaseModel):
    num_sim: int = Field(default=1000, ge=100, le=10000)
    uncertainty_meter: float = Field(default=0.005, ge=0.0, le=0.1)
    uncertainty_scada: float = Field(default=0.005, ge=0.0, le=0.1)


class TurbineEnergyRequest(BaseModel):
    num_sim: int = Field(default=5, ge=5, le=100)
    uncertainty_scada: float = Field(default=0.005, ge=0.0, le=0.1)


class WakeLossesRequest(BaseModel):
    num_sim: int = Field(default=10, ge=5, le=200)
    wind_direction_col: str = "WMET_HorWdDir"
    wind_direction_data_type: str = Field(default="scada", pattern="^(scada|tower)$")


class GapAnalysisRequest(BaseModel):
    eya_aep: float = Field(description="EYA estimated AEP (GWh/yr)")
    eya_gross_energy: float = Field(description="EYA gross energy (GWh/yr)")
    eya_availability_losses: float = Field(default=0.05, ge=0.0, le=1.0)
    eya_electrical_losses: float = Field(default=0.02, ge=0.0, le=1.0)
    eya_turbine_losses: float = Field(default=0.1, ge=0.0, le=1.0)
    eya_blade_degradation_losses: float = Field(default=0.0, ge=0.0, le=1.0)
    eya_wake_losses: float = Field(default=0.05, ge=0.0, le=1.0)
    oa_aep: float = Field(description="OA estimated AEP (GWh/yr)")
    oa_availability_losses: float = Field(ge=0.0, le=1.0)
    oa_electrical_losses: float = Field(ge=0.0, le=1.0)
    oa_turbine_ideal_energy: float = Field(description="OA turbine ideal energy (GWh/yr)")


class YawMisalignmentRequest(BaseModel):
    num_sim: int = Field(default=10, ge=5, le=200)
