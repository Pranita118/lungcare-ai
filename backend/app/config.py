"""Application configuration for the LungCare AI ML service."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("LUNGCARE_DATA_DIR", BASE_DIR / "data"))
ARTIFACT_DIR = Path(os.getenv("LUNGCARE_ARTIFACT_DIR", BASE_DIR / "artifacts"))

TARGET_COLUMN = os.getenv("LUNGCARE_TARGET", "lung_cancer")
RANDOM_STATE = 42
TEST_SIZE = 0.2

#: Decision threshold used to band a screening score into a risk category.
LOWER_THRESHOLD = 0.30
UPPER_THRESHOLD = 0.60

SUPPORTED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/dicom"}


def _cors_origins() -> list[str]:
    """Browser origins allowed to call this service.

    Defaults to the local Vite dev server. In deployment the front end is served
    from a different origin (for example Netlify), so set LUNGCARE_CORS_ORIGINS
    to a comma-separated list of allowed origins:

        LUNGCARE_CORS_ORIGINS=https://my-site.netlify.app,https://my-site.com

    Use "*" only for a throwaway deployment: it allows any site to call the
    service. Note the service has no authentication, so it must never be exposed
    to the public internet without that understood.
    """
    raw = os.getenv("LUNGCARE_CORS_ORIGINS", "").strip()
    if not raw:
        return ["http://localhost:5173", "http://127.0.0.1:5173"]
    origins = [item.strip() for item in raw.split(",") if item.strip()]
    return origins or ["http://localhost:5173"]


@dataclass
class Settings:
    """Runtime settings for the service."""

    data_dir: Path = DATA_DIR
    artifact_dir: Path = ARTIFACT_DIR
    target_column: str = TARGET_COLUMN
    random_state: int = RANDOM_STATE
    test_size: float = TEST_SIZE
    lower_threshold: float = LOWER_THRESHOLD
    upper_threshold: float = UPPER_THRESHOLD
    max_upload_bytes: int = 12 * 1024 * 1024
    cors_origins: list[str] = field(default_factory=_cors_origins)

    def primary_dataset(self) -> Path:
        return self.data_dir / "lung_cancer_dataset.csv"


settings = Settings()
settings.artifact_dir.mkdir(parents=True, exist_ok=True)
