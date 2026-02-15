"""Application configuration."""

import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
OPENOA_ROOT = Path(os.environ.get("OPENOA_ROOT", str(BASE_DIR.parent.parent / "OpenOA")))
DEMO_DATA_DIR = OPENOA_ROOT / "examples" / "data"
DEMO_ZIP = DEMO_DATA_DIR / "la_haute_borne.zip"
DEMO_EXTRACTED = DEMO_DATA_DIR / "la_haute_borne"
METADATA_YML = DEMO_DATA_DIR / "plant_meta.yml"

# Upload dir
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Analysis defaults
DEFAULT_AEP_SIMS = 2000
DEFAULT_ELEC_SIMS = 3000
DEFAULT_WAKE_SIMS = 50
DEFAULT_TIE_SIMS = 20
DEFAULT_YAW_SIMS = 50
