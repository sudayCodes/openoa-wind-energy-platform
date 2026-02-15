"""
Plant manager — handles loading, caching, and access to the PlantData object.
"""

from __future__ import annotations

from openoa.plant import PlantData
from services.data_loader import load_demo_plant

# In-memory cache
_plant: PlantData | None = None
_loading: bool = False


def init_plant():
    """Load the demo dataset on startup."""
    global _plant, _loading
    if _plant is not None:
        return
    _loading = True
    try:
        _plant = load_demo_plant()
    finally:
        _loading = False


def get_plant() -> PlantData | None:
    """Get the cached PlantData instance."""
    return _plant


def is_loading() -> bool:
    """Check if plant data is currently loading."""
    return _loading
