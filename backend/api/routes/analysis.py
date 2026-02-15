"""Analysis routes — AEP, Electrical Losses, Wake, Turbine Energy, Gap, Yaw.

Each route:
  1. Checks that no other analysis is already running (HTTP 429 if busy)
  2. Validates that required datasets are loaded (HTTP 400 if not)
  3. Builds a FRESH PlantData with the correct analysis_type
  4. Runs the OpenOA analysis in a background thread
  5. Returns structured JSON with stats + plots

If the frontend times out before the backend finishes, the result is
cached in _last_result so the frontend can retrieve it by polling.
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

# ── Concurrency guard ──
_analysis_lock = asyncio.Lock()
_current_analysis: str | None = None

# Cache the last completed result so the frontend can fetch it even if
# the original HTTP request timed out (e.g. Railway 30-s proxy, axios).
_last_result: dict | None = None        # {"analysis": str, "data": ...}
_last_error: str | None = None          # error message if analysis failed

_analysis_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="analysis")


async def _run_in_thread(func, *args, **kwargs):
    """Run a blocking function in the thread pool without blocking the event loop."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_analysis_executor, partial(func, *args, **kwargs))


async def _guarded_run(analysis_name: str, runner_coro):
    """
    Acquire the analysis lock, run the coroutine, and release.
    Returns HTTP 429 immediately if another analysis is in progress.
    Caches the result in _last_result for later retrieval.
    """
    global _current_analysis, _last_result, _last_error
    if _analysis_lock.locked():
        raise HTTPException(
            status_code=429,
            detail=f"Another analysis ({_current_analysis}) is already running. "
                   f"Please wait for it to finish before starting a new one.",
        )
    async with _analysis_lock:
        _current_analysis = analysis_name
        _last_result = None
        _last_error = None
        try:
            result = await runner_coro
            _last_result = {"analysis": analysis_name, "data": result}
            return result
        except Exception as exc:
            _last_error = f"{analysis_name} failed: {str(exc)}"
            raise
        finally:
            _current_analysis = None
            gc.collect()


# ── Endpoint to query lock status (useful for frontend) ──
@router.get("/status")
async def analysis_status():
    """Return whether an analysis is currently running and if a result is ready."""
    return {
        "busy": _analysis_lock.locked(),
        "current_analysis": _current_analysis,
        "has_result": _last_result is not None,
        "last_error": _last_error,
    }


@router.get("/last-result")
async def last_result():
    """Return the cached result from the most recent completed analysis.
    
    This is used by the frontend when the original HTTP request timed out
    but the backend kept running and finished successfully.
    """
    if _last_result is None:
        raise HTTPException(status_code=404, detail="No cached result available")
    return {"status": "success", **_last_result}


@router.post("/aep")
async def aep_analysis(params: AEPRequest):
    """Run Monte Carlo AEP estimation."""
    plant, error = build_plant("MonteCarloAEP")
    if plant is None:
        raise HTTPException(status_code=400, detail=error)
    try:
        result = await _guarded_run(
            "AEP",
            _run_in_thread(
                run_aep,
                plant=plant,
                num_sim=params.num_sim,
                reg_model=params.reg_model,
                reg_temperature=params.reg_temperature,
                reg_wind_direction=params.reg_wind_direction,
                time_resolution=params.time_resolution,
            ),
        )
        return {"status": "success", "data": result}
    except HTTPException:
        raise
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
        result = await _guarded_run(
            "Electrical Losses",
            _run_in_thread(
                run_electrical_losses,
                plant=plant,
                num_sim=params.num_sim,
                uncertainty_meter=params.uncertainty_meter,
                uncertainty_scada=params.uncertainty_scada,
            ),
        )
        return {"status": "success", "data": result}
    except HTTPException:
        raise
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
        result = await _guarded_run(
            "Turbine Energy",
            _run_in_thread(
                run_turbine_energy,
                plant=plant,
                num_sim=params.num_sim,
                uncertainty_scada=params.uncertainty_scada,
            ),
        )
        return {"status": "success", "data": result}
    except HTTPException:
        raise
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
        result = await _guarded_run(
            "Wake Losses",
            _run_in_thread(
                run_wake_losses,
                plant=plant,
                num_sim=params.num_sim,
                wind_direction_col=params.wind_direction_col,
                wind_direction_data_type=params.wind_direction_data_type,
            ),
        )
        return {"status": "success", "data": result}
    except HTTPException:
        raise
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
        result = await _guarded_run(
            "Gap Analysis",
            _run_in_thread(run_gap_analysis, plant=plant, eya_estimates=eya, oa_results=oa),
        )
        return {"status": "success", "data": result}
    except HTTPException:
        raise
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
        result = await _guarded_run(
            "Yaw Misalignment",
            _run_in_thread(
                run_yaw_misalignment,
                plant=plant,
                num_sim=params.num_sim,
            ),
        )
        return {"status": "success", "data": result}
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Yaw misalignment analysis failed: {str(e)}")
