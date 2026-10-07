"""Training entry point.

    python -m app.train

Trains every registered model from ``backend/data/lung_cancer_dataset.csv``,
evaluates them on a held-out split, writes the metrics to
``backend/artifacts/registry.json`` and caches the fitted pipelines.
"""

from __future__ import annotations

import json
import sys

from .config import settings
from .dataset import load_dataset
from .models import registry


def main() -> int:
    path = settings.primary_dataset()
    print(f"Looking for the project dataset at: {path}")

    adapter = load_dataset(path)
    if adapter is None:
        print(
            "\nDataset not found or its target column could not be identified.\n"
            "Place lung_cancer_dataset.csv in backend/data and make sure it contains a\n"
            "binary screening target column (lung_cancer).\n"
        )
        return 1

    print(f"Records: {len(adapter.frame)}")
    print(f"Mapped features: {', '.join(adapter.available_features)}")
    if adapter.dropped_columns:
        print(f"Ignored columns: {', '.join(adapter.dropped_columns)}")

    registry.train(adapter, settings)

    print("\nTrained models and held-out evaluation:")
    print("-" * 68)
    header = f"{'Model':<24}{'Accuracy':>11}{'Precision':>11}{'Recall':>9}{'F1':>9}{'AUC':>8}"
    print(header)
    for card in registry.model_cards():
        metrics = card.get("metrics") or {}
        print(
            f"{card['name']:<24}"
            f"{metrics.get('accuracy', 0):>11.3f}"
            f"{metrics.get('precision', 0):>11.3f}"
            f"{metrics.get('recall', 0):>9.3f}"
            f"{metrics.get('f1', 0):>9.3f}"
            f"{metrics.get('rocAuc', 0):>8.3f}"
        )

    metadata = json.loads((settings.artifact_dir / "registry.json").read_text(encoding="utf-8"))
    print(f"\nArtifacts written to: {settings.artifact_dir}")
    print(f"Trained at: {metadata['trainedAt']}")

    print("\nStart the service with:\n    uvicorn app.main:app --reload --port 8000")
    return 0


if __name__ == "__main__":
    sys.exit(main())
