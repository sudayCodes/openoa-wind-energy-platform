"""Analysis routes — AEP, Electrical Losses, Wake, Turbine Energy, Gap, Yaw."""

from __future__ import annotations

import traceback
from fastapi import APIRouter, HTTPException

from api.schemas import (
    AEPRequest,
    ElectricalLossesRequest,
    TurbineEnergyRequest,
    WakeLossesRequest,
    GapAnalysisRequest,
    YawMisalignmentRequest,
)
from core.plant_manager import get_plant
from services.analysis_runner import (
    run_aep,
    run_electrical_losses,
    run_turbine_energy,
    run_wake_losses,
    run_gap_analysis,
    run_yaw_misalignment,
)

router = APIRouter(prefix="/analysis", tags=["Analysis"])


@router.post("/aep")
def aep_analysis(params: AEPRequest):
    """Run Monte Carlo AEP estimation."""
    plant = get_plant()
    if plant is None:
        raise HTTPException(status_code=404, detail="No plant data loaded")
    try:
        result = run_aep(
            plant=plant,
            num_sim=params.num_sim,
            reg_model=params.reg_model,
            reg_temperature=params.reg_temperature,
            reg_wind_direction=params.reg_wind_direction,
            time_resolution=params.time_resolution,
        )
        return {"status": "success", "data": result}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AEP analysis failed: {str(e)}")


@router.post("/electrical-losses")
def electrical_losses_analysis(params: ElectricalLossesRequest):
    """Run electrical losses analysis."""
    plant = get_plant()
    if plant is None:
        raise HTTPException(status_code=404, detail="No plant data loaded")
    try:
        result = run_electrical_losses(
            plant=plant,
            num_sim=params.num_sim,
            uncertainty_meter=params.uncertainty_meter,
            uncertainty_scada=params.uncertainty_scada,
        )
        return {"status": "success", "data": result}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Electrical losses analysis failed: {str(e)}")


@router.post("/turbine-energy")
def turbine_energy_analysis(params: TurbineEnergyRequest):
    """Run turbine long-term gross energy analysis."""
    plant = get_plant()
    if plant is None:
        raise HTTPException(status_code=404, detail="No plant data loaded")
    try:
        result = run_turbine_energy(
            plant=plant,
            num_sim=params.num_sim,
            uncertainty_meter=params.uncertainty_meter,
        )
        return {"status": "success", "data": result}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Turbine energy analysis failed: {str(e)}")


@router.post("/wake-losses")
def wake_losses_analysis(params: WakeLossesRequest):
    """Run wake losses analysis."""
    plant = get_plant()
    if plant is None:
        raise HTTPException(status_code=404, detail="No plant data loaded")
    try:
        result = run_wake_losses(
            plant=plant,
            num_sim=params.num_sim,
            wind_direction_col=params.wind_direction_col,
            wind_direction_data_type=params.wind_direction_data_type,
        )
        return {"status": "success", "data": result}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Wake losses analysis failed: {str(e)}")


@router.post("/gap-analysis")
def gap_analysis(params: GapAnalysisRequest):
    """Run EYA gap analysis."""
    plant = get_plant()
    if plant is None:
        raise HTTPException(status_code=404, detail="No plant data loaded")
    try:
        eya = {
            "aep": params.eya_aep,
            "gross_energy": params.eya_gross_energy,
            "availability_losses": params.eya_availability_losses,
            "electrical_losses": params.eya_electrical_losses,
            "turbine_ideal_energy": params.eya_turbine_ideal_energy,
            "wake_losses": params.eya_wake_losses,
            "blade_degradation": params.eya_blade_degradation,
        }
        oa = {
            "aep": params.oa_aep,
            "availability_losses": params.oa_availability_losses,
            "electrical_losses": params.oa_electrical_losses,
            "turbine_ideal_energy": params.oa_turbine_ideal_energy,
        }
        result = run_gap_analysis(plant=plant, eya_estimates=eya, oa_results=oa)
        return {"status": "success", "data": result}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Gap analysis failed: {str(e)}")


@router.post("/yaw-misalignment")
def yaw_misalignment_analysis(params: YawMisalignmentRequest):
    """Run static yaw misalignment analysis."""
    plant = get_plant()
    if plant is None:
        raise HTTPException(status_code=404, detail="No plant data loaded")
    try:
        result = run_yaw_misalignment(
            plant=plant,
            num_sim=params.num_sim,
        )
        return {"status": "success", "data": result}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Yaw misalignment analysis failed: {str(e)}")
