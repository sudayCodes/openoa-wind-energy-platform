"""Analysis routes — AEP, Electrical Losses, Wake, Turbine Energy, Gap, Yaw.

Each route:
  1. Validates that required datasets are loaded (HTTP 400 if not)
  2. Builds a FRESH PlantData with the correct analysis_type
  3. Runs the OpenOA analysis
  4. Returns structured JSON with stats + plots
"""

from __future__ import annotations

import gc
import asyncio
import traceback
from concurrent.futures import ThreadPoolExecutor
from functools import partial
from fastapi import APIRouter, HTTPException

from api.schemas import (
    AEPRequest,
    ElectricalLossesRequest,
    TurbineEnergyRequest,
    WakeLossesRequest,
    GapAnalysisRequest,
    YawMisalignmentRequest,
)
from core.plant_manager import build_plant, get_plant
from services.analysis_runner import (
    run_aep,
    run_electrical_losses,
    run_turbine_energy,
    run_wake_losses,
    run_gap_analysis,
    run_yaw_misalignment,
)

router = APIRouter(prefix="/analysis", tags=["Analysis"])

# Dedicated thread pool for CPU-heavy analysis work so we don't block
# the uvicorn event loop (critical with a single worker).
_analysis_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="analysis")


async def _run_in_thread(func, *args, **kwargs):
    """Run a blocking function in the thread pool without blocking the event loop."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_analysis_executor, partial(func, *args, **kwargs))


@router.post("/aep")
async def aep_analysis(params: AEPRequest):
    """Run Monte Carlo AEP estimation."""
    plant, error = build_plant("MonteCarloAEP")
    if plant is None:
        raise HTTPException(status_code=400, detail=error)
    try:
        result = await _run_in_thread(
            run_aep,
            plant=plant,
            num_sim=params.num_sim,
            reg_model=params.reg_model,
            reg_temperature=params.reg_temperature,
            reg_wind_direction=params.reg_wind_direction,
            time_resolution=params.time_resolution,
        )
        gc.collect()
        return {"status": "success", "data": result}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AEP analysis failed: {str(e)}")


@router.post("/electrical-losses")
async def electrical_losses_analysis(params: ElectricalLossesRequest):
    """Run electrical losses analysis."""
    plant, error = build_plant("ElectricalLosses")
    if plant is None:
        raise HTTPException(status_code=400, detail=error)
    try:
        result = await _run_in_thread(
            run_electrical_losses,
            plant=plant,
            num_sim=params.num_sim,
            uncertainty_meter=params.uncertainty_meter,
            uncertainty_scada=params.uncertainty_scada,
        )
        gc.collect()
        return {"status": "success", "data": result}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Electrical losses analysis failed: {str(e)}")


@router.post("/turbine-energy")
async def turbine_energy_analysis(params: TurbineEnergyRequest):
    """Run turbine long-term gross energy analysis."""
    plant, error = build_plant("TurbineLongTermGrossEnergy")
    if plant is None:
        raise HTTPException(status_code=400, detail=error)
    try:
        result = await _run_in_thread(
            run_turbine_energy,
            plant=plant,
            num_sim=params.num_sim,
            uncertainty_scada=params.uncertainty_scada,
        )
        gc.collect()
        return {"status": "success", "data": result}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Turbine energy analysis failed: {str(e)}")


@router.post("/wake-losses")
async def wake_losses_analysis(params: WakeLossesRequest):
    """Run wake losses analysis."""
    plant, error = build_plant("WakeLosses")
    if plant is None:
        raise HTTPException(status_code=400, detail=error)
    try:
        result = await _run_in_thread(
            run_wake_losses,
            plant=plant,
            num_sim=params.num_sim,
            wind_direction_col=params.wind_direction_col,
            wind_direction_data_type=params.wind_direction_data_type,
        )
        gc.collect()
        return {"status": "success", "data": result}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Wake losses analysis failed: {str(e)}")


@router.post("/gap-analysis")
async def gap_analysis(params: GapAnalysisRequest):
    """Run EYA gap analysis."""
    plant, error = build_plant("EYAGapAnalysis")
    if plant is None:
        raise HTTPException(status_code=400, detail=error)
    try:
        eya = {
            "aep": params.eya_aep,
            "gross_energy": params.eya_gross_energy,
            "availability_losses": params.eya_availability_losses,
            "electrical_losses": params.eya_electrical_losses,
            "turbine_losses": params.eya_turbine_losses,
            "blade_degradation_losses": params.eya_blade_degradation_losses,
            "wake_losses": params.eya_wake_losses,
        }
        oa = {
            "aep": params.oa_aep,
            "availability_losses": params.oa_availability_losses,
            "electrical_losses": params.oa_electrical_losses,
            "turbine_ideal_energy": params.oa_turbine_ideal_energy,
        }
        result = await _run_in_thread(run_gap_analysis, plant=plant, eya_estimates=eya, oa_results=oa)
        gc.collect()
        return {"status": "success", "data": result}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Gap analysis failed: {str(e)}")


@router.post("/yaw-misalignment")
async def yaw_misalignment_analysis(params: YawMisalignmentRequest):
    """Run static yaw misalignment analysis."""
    plant, error = build_plant("StaticYawMisalignment")
    if plant is None:
        raise HTTPException(status_code=400, detail=error)
    try:
        result = await _run_in_thread(
            run_yaw_misalignment,
            plant=plant,
            num_sim=params.num_sim,
        )
        gc.collect()
        return {"status": "success", "data": result}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Yaw misalignment analysis failed: {str(e)}")
