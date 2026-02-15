"""
Analysis runner service — runs OpenOA analyses and captures results + plots.
"""

from __future__ import annotations

import gc
import io
import base64
import traceback
from typing import Any

import numpy as np
import pandas as pd
import matplotlib

matplotlib.use("Agg")  # Non-interactive backend for server
import matplotlib.pyplot as plt

from openoa.plant import PlantData
from openoa.analysis.aep import MonteCarloAEP
from openoa.analysis.electrical_losses import ElectricalLosses
from openoa.analysis.turbine_long_term_gross_energy import TurbineLongTermGrossEnergy
from openoa.analysis.wake_losses import WakeLosses
from openoa.analysis.eya_gap_analysis import EYAGapAnalysis
from openoa.analysis.yaw_misalignment import StaticYawMisalignment


def _fig_to_base64(fig) -> str:
    """Convert a matplotlib figure to a base64 PNG string."""
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=120, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    plt.close("all")  # Safety: close any leaked figures to free memory
    buf.seek(0)
    encoded = base64.b64encode(buf.read()).decode("utf-8")
    buf.close()
    return encoded


def _safe_float(val) -> float | None:
    """Safely convert numpy/pandas scalar to Python float."""
    if val is None:
        return None
    try:
        v = float(val)
        if np.isnan(v) or np.isinf(v):
            return None
        return round(v, 6)
    except (TypeError, ValueError):
        return None


def _series_to_list(series) -> list:
    """Convert a pandas Series or numpy array to a JSON-safe list."""
    if series is None:
        return []
    if isinstance(series, pd.Series):
        return [_safe_float(x) for x in series.values]
    if isinstance(series, np.ndarray):
        return [_safe_float(x) for x in series]
    return list(series)


# ──────────────────────────────────────────────
# AEP Analysis
# ──────────────────────────────────────────────
def run_aep(
    plant: PlantData,
    num_sim: int = 2000,
    reg_model: str = "lin",
    reg_temperature: bool = False,
    reg_wind_direction: bool = False,
    time_resolution: str = "MS",
) -> dict[str, Any]:
    """Run Monte Carlo AEP estimation."""
    aep = MonteCarloAEP(
        plant=plant,
        reg_temperature=reg_temperature,
        reg_wind_direction=reg_wind_direction,
        reg_model=reg_model,
        time_resolution=time_resolution,
    )
    aep.run(num_sim=num_sim)

    results = aep.results
    aep_values = _series_to_list(results.get("aep_GWh"))
    avail_values = _series_to_list(results.get("avail_pct"))
    curt_values = _series_to_list(results.get("curt_pct"))

    # Generate plots
    plots = {}
    try:
        fig = plt.figure(figsize=(10, 6))
        ax = fig.add_subplot(111)
        ax.hist(aep_values, bins=40, color="#2563eb", edgecolor="white", alpha=0.85)
        ax.set_xlabel("AEP (GWh/yr)", fontsize=12)
        ax.set_ylabel("Frequency", fontsize=12)
        ax.set_title("AEP Distribution (Monte Carlo)", fontsize=14)
        ax.axvline(np.nanmean(aep_values), color="#dc2626", linestyle="--", linewidth=2, label=f"Mean: {np.nanmean(aep_values):.2f} GWh")
        ax.legend(fontsize=11)
        ax.grid(True, alpha=0.3)
        plots["aep_distribution"] = _fig_to_base64(fig)
    except Exception:
        traceback.print_exc()

    # Monthly plot
    try:
        result = aep.plot_normalized_monthly_reanalysis_windspeed(return_fig=True)
        if result is not None:
            fig, ax = result
            plots["monthly_windspeed"] = _fig_to_base64(fig)
    except Exception:
        traceback.print_exc()

    try:
        result = aep.plot_aggregate_plant_data_timeseries(return_fig=True)
        if result is not None:
            fig, ax = result
            plots["monthly_energy"] = _fig_to_base64(fig)
    except Exception:
        traceback.print_exc()

    clean_aep = [v for v in aep_values if v is not None]
    return {
        "mean_aep_gwh": _safe_float(np.nanmean(clean_aep)) if clean_aep else None,
        "std_aep_gwh": _safe_float(np.nanstd(clean_aep)) if clean_aep else None,
        "median_aep_gwh": _safe_float(np.nanmedian(clean_aep)) if clean_aep else None,
        "p5_aep_gwh": _safe_float(np.nanpercentile(clean_aep, 5)) if clean_aep else None,
        "p95_aep_gwh": _safe_float(np.nanpercentile(clean_aep, 95)) if clean_aep else None,
        "mean_avail_pct": _safe_float(np.nanmean(avail_values)) if avail_values else None,
        "mean_curt_pct": _safe_float(np.nanmean(curt_values)) if curt_values else None,
        "num_simulations": num_sim,
        "distribution": clean_aep[:500],  # Cap for JSON size
        "plots": plots,
    }


# ──────────────────────────────────────────────
# Electrical Losses
# ──────────────────────────────────────────────
def run_electrical_losses(
    plant: PlantData,
    num_sim: int = 3000,
    uncertainty_meter: float = 0.005,
    uncertainty_scada: float = 0.005,
) -> dict[str, Any]:
    """Run electrical losses analysis."""
    el = ElectricalLosses(
        plant=plant,
        UQ=True,
        num_sim=num_sim,
        uncertainty_meter=uncertainty_meter,
        uncertainty_scada=uncertainty_scada,
    )
    el.run()

    losses = _series_to_list(el.electrical_losses)
    clean_losses = [v for v in losses if v is not None]

    plots = {}
    try:
        fig = plt.figure(figsize=(10, 6))
        ax = fig.add_subplot(111)
        ax.hist([v * 100 for v in clean_losses], bins=40, color="#8b5cf6", edgecolor="white", alpha=0.85)
        ax.set_xlabel("Electrical Loss (%)", fontsize=12)
        ax.set_ylabel("Frequency", fontsize=12)
        ax.set_title("Electrical Losses Distribution", fontsize=14)
        mean_loss = np.nanmean(clean_losses) * 100
        ax.axvline(mean_loss, color="#dc2626", linestyle="--", linewidth=2, label=f"Mean: {mean_loss:.2f}%")
        ax.legend(fontsize=11)
        ax.grid(True, alpha=0.3)
        plots["loss_distribution"] = _fig_to_base64(fig)
    except Exception:
        traceback.print_exc()

    try:
        result = el.plot_monthly_losses(return_fig=True)
        if result is not None:
            fig, ax = result
            plots["monthly_losses"] = _fig_to_base64(fig)
    except Exception:
        traceback.print_exc()

    return {
        "mean_loss_pct": _safe_float(np.nanmean(clean_losses) * 100) if clean_losses else None,
        "std_loss_pct": _safe_float(np.nanstd(clean_losses) * 100) if clean_losses else None,
        "median_loss_pct": _safe_float(np.nanmedian(clean_losses) * 100) if clean_losses else None,
        "num_simulations": num_sim,
        "distribution": [round(v * 100, 4) for v in clean_losses[:500]],
        "plots": plots,
    }


# ──────────────────────────────────────────────
# Turbine Long-Term Gross Energy
# ──────────────────────────────────────────────
def run_turbine_energy(
    plant: PlantData,
    num_sim: int = 20,
    uncertainty_scada: float = 0.005,
) -> dict[str, Any]:
    """Run turbine long-term gross energy analysis."""
    tie = TurbineLongTermGrossEnergy(
        plant=plant,
        UQ=True,
        num_sim=num_sim,
        uncertainty_scada=uncertainty_scada,
    )
    tie.run()

    # plant_gross is a 2D numpy array (num_sim, 1) — flatten to 1D
    plant_gross = tie.plant_gross
    if isinstance(plant_gross, np.ndarray) and plant_gross.ndim > 1:
        plant_gross = plant_gross.flatten()
    gross_values = _series_to_list(plant_gross)

    # Per-turbine results
    turbine_results = {}
    if tie.turb_lt_gross is not None and not tie.turb_lt_gross.empty:
        for col in tie.turb_lt_gross.columns:
            vals = _series_to_list(tie.turb_lt_gross[col])
            turbine_results[str(col)] = _safe_float(np.nanmean(vals))

    clean_gross = [v for v in gross_values if v is not None]

    plots = {}
    try:
        fig = plt.figure(figsize=(10, 6))
        ax = fig.add_subplot(111)
        if turbine_results:
            names = list(turbine_results.keys())
            values = [turbine_results[n] for n in names]
            short_names = [n.replace("R80711_", "T") if "R80711" in n else n[:8] for n in names]
            colors = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]
            ax.bar(short_names, [v / 1e6 if v else 0 for v in values],
                   color=colors[:len(names)], edgecolor="white", width=0.6)
            ax.set_ylabel("Long-Term Gross Energy (GWh)", fontsize=12)
            ax.set_title("Per-Turbine Long-Term Gross Energy", fontsize=14)
            ax.grid(True, alpha=0.3, axis="y")
        plots["turbine_gross"] = _fig_to_base64(fig)
    except Exception:
        traceback.print_exc()

    return {
        "mean_plant_gross_gwh": _safe_float(np.nanmean(clean_gross) / 1e6) if clean_gross else None,
        "std_plant_gross_gwh": _safe_float(np.nanstd(clean_gross) / 1e6) if clean_gross else None,
        "num_simulations": num_sim,
        "turbine_gross_energy": turbine_results,
        "distribution": [_safe_float(v / 1e6) for v in clean_gross[:500]],
        "plots": plots,
    }


# ──────────────────────────────────────────────
# Wake Losses
# ──────────────────────────────────────────────
def run_wake_losses(
    plant: PlantData,
    num_sim: int = 50,
    wind_direction_col: str = "WMET_HorWdDir",
    wind_direction_data_type: str = "scada",
) -> dict[str, Any]:
    """Run wake losses analysis."""
    wl = WakeLosses(
        plant=plant,
        UQ=True,
        num_sim=num_sim,
        wind_direction_col=wind_direction_col,
        wind_direction_data_type=wind_direction_data_type,
    )
    wl.run()

    plots = {}
    # Wake loss by direction
    try:
        result = wl.plot_wake_losses_by_wind_direction(return_fig=True)
        if result is not None:
            fig, ax = result
            plots["wake_by_direction"] = _fig_to_base64(fig)
    except Exception:
        traceback.print_exc()

    # Per-turbine wake losses (turbine_wake_losses_lt_mean is a numpy array indexed by turbine)
    turbine_wake = {}
    try:
        if hasattr(wl, "turbine_wake_losses_lt_mean") and wl.turbine_wake_losses_lt_mean is not None:
            tids = wl.turbine_ids if hasattr(wl, "turbine_ids") else []
            for i, tid in enumerate(tids):
                turbine_wake[str(tid)] = _safe_float(float(wl.turbine_wake_losses_lt_mean[i]) * 100)
    except Exception:
        traceback.print_exc()

    return {
        "plant_wake_loss_por_pct": _safe_float(float(wl.wake_losses_por_mean) * 100) if hasattr(wl, "wake_losses_por_mean") and wl.wake_losses_por_mean is not None else None,
        "plant_wake_loss_lt_pct": _safe_float(float(wl.wake_losses_lt_mean) * 100) if hasattr(wl, "wake_losses_lt_mean") and wl.wake_losses_lt_mean is not None else None,
        "num_simulations": num_sim,
        "turbine_wake_losses": turbine_wake,
        "plots": plots,
    }


# ──────────────────────────────────────────────
# EYA Gap Analysis
# ──────────────────────────────────────────────
def run_gap_analysis(
    plant: PlantData,
    eya_estimates: dict,
    oa_results: dict,
) -> dict[str, Any]:
    """Run EYA gap analysis."""
    gap = EYAGapAnalysis(
        plant=plant,
        eya_estimates=eya_estimates,
        oa_results=oa_results,
    )
    gap.run()

    plots = {}
    try:
        result = gap.plot_waterfall(return_fig=True)
        if result is not None:
            fig, ax = result
            plots["waterfall"] = _fig_to_base64(fig)
    except Exception:
        traceback.print_exc()

    gap_results = {}
    if hasattr(gap, "compiled_data") and gap.compiled_data is not None:
        if isinstance(gap.compiled_data, pd.DataFrame):
            gap_results = gap.compiled_data.to_dict(orient="records")
        elif isinstance(gap.compiled_data, dict):
            gap_results = {str(k): _safe_float(v) if isinstance(v, (int, float, np.floating)) else str(v) for k, v in gap.compiled_data.items()}
        else:
            gap_results = gap.compiled_data

    return {
        "gap_analysis": gap_results,
        "plots": plots,
    }


# ──────────────────────────────────────────────
# Yaw Misalignment
# ──────────────────────────────────────────────
def run_yaw_misalignment(
    plant: PlantData,
    num_sim: int = 50,
) -> dict[str, Any]:
    """Run static yaw misalignment analysis."""
    yaw = StaticYawMisalignment(
        plant=plant,
        UQ=True,
        num_sim=num_sim,
    )
    yaw.run()

    # Per-turbine misalignment
    turbine_yaw = {}
    if hasattr(yaw, "yaw_misalignment_avg") and yaw.yaw_misalignment_avg is not None:
        if isinstance(yaw.yaw_misalignment_avg, dict):
            for tid, val in yaw.yaw_misalignment_avg.items():
                turbine_yaw[str(tid)] = _safe_float(float(val))
        elif isinstance(yaw.yaw_misalignment_avg, (pd.Series, pd.DataFrame)):
            for tid in yaw.yaw_misalignment_avg.index:
                turbine_yaw[str(tid)] = _safe_float(float(yaw.yaw_misalignment_avg.loc[tid]))

    # Mean/std per turbine
    turbine_stats = {}
    if hasattr(yaw, "yaw_misalignment_mean") and yaw.yaw_misalignment_mean is not None:
        if isinstance(yaw.yaw_misalignment_mean, dict):
            for tid, val in yaw.yaw_misalignment_mean.items():
                turbine_stats[str(tid)] = {
                    "mean_deg": _safe_float(float(val)),
                    "std_deg": _safe_float(float(yaw.yaw_misalignment_std.get(tid, 0))) if hasattr(yaw, "yaw_misalignment_std") else None,
                }

    plots = {}
    try:
        result = yaw.plot_yaw_misalignment_by_turbine(return_fig=True)
        if result is not None:
            fig, ax = result
            plots["yaw_curves"] = _fig_to_base64(fig)
    except Exception:
        traceback.print_exc()

    return {
        "turbine_yaw_misalignment": turbine_yaw,
        "turbine_stats": turbine_stats,
        "num_simulations": num_sim,
        "plots": plots,
    }
