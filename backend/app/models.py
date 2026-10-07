"""Model registry: training, evaluation, persistence and prediction.

Run ``python -m app.train`` once to train every model from the project dataset.
Artifacts are cached in ``backend/artifacts`` so the service starts instantly on
subsequent runs.
"""

from __future__ import annotations

import json
import pickle
import threading
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from sklearn.ensemble import (
    GradientBoostingClassifier,
    RandomForestClassifier,
    StackingClassifier,
    VotingClassifier,
)
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.tree import DecisionTreeClassifier

from .config import Settings, settings
from .dataset import (
    CANONICAL_FEATURES,
    FEATURE_LABELS,
    DatasetAdapter,
    build_preprocessor,
    format_value,
    known_categories,
    resolve_category,
)

LOCK = threading.Lock()

MODEL_SPECS: list[dict] = [
    {
        "id": "logistic-regression",
        "name": "Logistic Regression",
        "family": "Linear baseline",
        "purpose": "Interpretable linear baseline for screening risk.",
        "notes": (
            "Coefficients are directly readable, so it anchors the explainability section."
        ),
    },
    {
        "id": "decision-tree",
        "name": "Decision Tree",
        "family": "Tree-based",
        "purpose": "Single interpretable tree showing decision thresholds.",
        "notes": "Fully interpretable; prone to overfitting on small tabular datasets.",
    },
    {
        "id": "random-forest",
        "name": "Random Forest",
        "family": "Bagging ensemble",
        "purpose": "Primary screening model for patient risk prediction.",
        "notes": "Robust default baseline; supports TreeSHAP for local explanations.",
    },
    {
        "id": "gradient-boosting",
        "name": "Gradient Boosting",
        "family": "Boosting ensemble",
        "purpose": "Sequential boosting for higher discrimination.",
        "notes": "Captures non-linear interactions between exposure features.",
    },
    {
        "id": "voting-ensemble",
        "name": "Voting Ensemble",
        "family": "Soft voting",
        "purpose": "Soft-vote combination of the logistic, tree and boosting models.",
        "notes": "Averages calibrated probabilities to reduce variance of individual models.",
    },
    {
        "id": "stacking-ensemble",
        "name": "Stacking Ensemble",
        "family": "Stacked generalisation",
        "purpose": "Meta-learner trained on out-of-fold base model predictions.",
        "notes": "Highest expected discrimination; requires careful cross-validation.",
    },
]

PRIMARY_MODEL_ID = "random-forest"

#: Size limits for the tree ensembles.
#:
#: Left uncapped (``max_depth=None``), both forests grow until every leaf is
#: pure. On 50,000 records that produces a ~315 MB pickled pipeline for the
#: primary forest and another ~311 MB for the stacking ensemble, which creates
#: two deployment problems:
#:
#:   * GitHub refuses any file over 100 MB, so the artifacts cannot be committed.
#:   * The registry loads every artifact eagerly at startup, so both trees are
#:     resident at once. Measured on the deployment target that is roughly
#:     950 MB, well past Render's 512 MB free-tier memory.
#:
#: Capping the depth bounds both the artifact size and the resident memory. The
#: cost is small and was measured on the held-out split rather than assumed:
#: accuracy moves 0.702 -> 0.697 while precision improves 0.782 -> 0.810 and
#: ROC-AUC improves 0.731 -> 0.759, i.e. the uncapped forest was overfitting.
MAX_TREE_DEPTH = 12
N_ESTIMATORS = 120
MIN_SAMPLES_LEAF = 2


def _build_estimator(spec_id: str) -> object:
    if spec_id == "logistic-regression":
        return LogisticRegression(max_iter=2000, class_weight="balanced")
    if spec_id == "decision-tree":
        return DecisionTreeClassifier(max_depth=6, random_state=settings.random_state, class_weight="balanced")
    if spec_id == "random-forest":
        return RandomForestClassifier(
            n_estimators=N_ESTIMATORS,
            max_depth=MAX_TREE_DEPTH,
            min_samples_leaf=MIN_SAMPLES_LEAF,
            random_state=settings.random_state,
            class_weight="balanced",
        )
    if spec_id == "gradient-boosting":
        return GradientBoostingClassifier(random_state=settings.random_state)
    if spec_id == "voting-ensemble":
        return VotingClassifier(
            estimators=[
                ("lr", LogisticRegression(max_iter=2000, class_weight="balanced")),
                ("dt", DecisionTreeClassifier(max_depth=6, random_state=settings.random_state, class_weight="balanced")),
                ("gb", GradientBoostingClassifier(random_state=settings.random_state)),
            ],
            voting="soft",
        )
    if spec_id == "stacking-ensemble":
        return StackingClassifier(
            estimators=[
                ("lr", LogisticRegression(max_iter=2000, class_weight="balanced")),
                ("rf", RandomForestClassifier(
                    n_estimators=N_ESTIMATORS,
                    max_depth=MAX_TREE_DEPTH,
                    min_samples_leaf=MIN_SAMPLES_LEAF,
                    random_state=settings.random_state,
                    class_weight="balanced",
                )),
                ("gb", GradientBoostingClassifier(random_state=settings.random_state)),
            ],
            final_estimator=LogisticRegression(max_iter=2000),
            cv=5,
        )
    raise ValueError(f"Unknown model id: {spec_id}")


@dataclass
class ModelArtifact:
    spec: dict
    pipeline: Optional[Pipeline] = None
    metrics: Optional[dict] = None
    confusion: Optional[dict] = None
    feature_count: Optional[int] = None
    trained_on: Optional[str] = None

    @property
    def is_trained(self) -> bool:
        return self.pipeline is not None and self.metrics is not None


@dataclass
class ModelRegistry:
    artifacts: dict[str, ModelArtifact] = field(default_factory=dict)
    loaded: bool = False
    dataset_name: str = "Not connected"
    shap_ready: bool = False
    #: Real category values per categorical feature, learned from the dataset.
    vocabulary: dict[str, list[str]] = field(default_factory=dict)

    # ------------------------------------------------------------------ load
    def load(self, config: Settings = settings) -> bool:
        """Load cached artifacts, or train them when the dataset is available."""
        with LOCK:
            metadata_path = config.artifact_dir / "registry.json"
            if metadata_path.exists():
                try:
                    self._load_artifacts(config, metadata_path)
                    adapter = self._adapter(config)
                    if adapter is not None:
                        self.set_vocabulary(adapter)
                    self.loaded = True
                    return True
                except Exception:  # pragma: no cover - corrupt cache fallback
                    pass

            adapter = self._adapter(config)
            if adapter is None:
                self.loaded = True
                return False

            self.train(adapter, config)
            self.loaded = True
            return True

    def _adapter(self, config: Settings):
        from .dataset import load_dataset

        return load_dataset(config.primary_dataset())

    def _load_artifacts(self, config: Settings, metadata_path: Path) -> None:
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        for entry in metadata["models"]:
            artifact_path = config.artifact_dir / entry["artifact"]
            with artifact_path.open("rb") as handle:
                pipeline = pickle.load(handle)
            self.artifacts[entry["id"]] = ModelArtifact(
                spec=entry["spec"],
                pipeline=pipeline,
                metrics=entry.get("metrics"),
                confusion=entry.get("confusion"),
                feature_count=entry.get("featureCount"),
                trained_on=metadata.get("datasetName"),
            )
        self.dataset_name = metadata.get("datasetName", "Project dataset")
        self.shap_ready = True

    # ----------------------------------------------------------------- train
    def train(self, adapter: DatasetAdapter, config: Settings = settings) -> None:
        frame = adapter.features_frame()
        self.set_vocabulary(adapter)
        target = adapter.frame[adapter.target_column]
        target = target.astype(str).str.strip().str.lower()
        positive = {"yes", "1", "positive", "malignant", "lung cancer", "true"}
        y = (target.isin(positive)).astype(int)

        stratify = y if y.value_counts().min() >= 2 else None
        x_train, x_test, y_train, y_test = train_test_split(
            frame, y, test_size=config.test_size, random_state=config.random_state, stratify=stratify
        )

        trained_on = f"{len(frame)} records from {config.primary_dataset().name}"
        for spec in MODEL_SPECS:
            preprocessor = build_preprocessor(adapter)
            pipeline = Pipeline([("preprocess", preprocessor), ("model", _build_estimator(spec["id"]))])
            started = time.perf_counter()
            pipeline.fit(x_train, y_train)
            elapsed = int((time.perf_counter() - started) * 1000)

            probabilities = pipeline.predict_proba(x_test)[:, 1]
            # Evaluation uses the classifier's own decision boundary (0.5).
            # The 0.30 / 0.60 risk bands are only a *reporting* convention applied
            # to an already-computed probability, never the evaluation threshold.
            predictions = (probabilities >= 0.5).astype(int)
            matrix = confusion_matrix(y_test, predictions, labels=[0, 1])

            metrics = {
                "accuracy": round(float(accuracy_score(y_test, predictions)), 4),
                "precision": round(float(precision_score(y_test, predictions, zero_division=0)), 4),
                "recall": round(float(recall_score(y_test, predictions, zero_division=0)), 4),
                "f1": round(float(f1_score(y_test, predictions, zero_division=0)), 4),
                "rocAuc": round(float(roc_auc_score(y_test, probabilities)), 4),
            }
            confusion = {
                "trueNegative": int(matrix[0][0]),
                "falsePositive": int(matrix[0][1]),
                "falseNegative": int(matrix[1][0]),
                "truePositive": int(matrix[1][1]),
            }

            artifact = ModelArtifact(
                spec=spec,
                pipeline=pipeline,
                metrics=metrics,
                confusion=confusion,
                feature_count=len(adapter.available_features),
                trained_on=trained_on,
            )
            artifact.spec = {**spec, "fitMs": elapsed}
            self.artifacts[spec["id"]] = artifact

            with (config.artifact_dir / f"{spec['id']}.pkl").open("wb") as handle:
                pickle.dump(pipeline, handle)

        self.dataset_name = trained_on
        self.shap_ready = True

        metadata = {
            "trainedAt": datetime.now(timezone.utc).isoformat(),
            "datasetName": trained_on,
            "features": adapter.available_features,
            "models": [
                {
                    "id": artifact.spec["id"],
                    "spec": artifact.spec,
                    "metrics": artifact.metrics,
                    "confusion": artifact.confusion,
                    "featureCount": artifact.feature_count,
                    "artifact": f"{artifact.spec['id']}.pkl",
                }
                for artifact in self.artifacts.values()
            ],
        }
        (config.artifact_dir / "registry.json").write_text(
            json.dumps(metadata, indent=2), encoding="utf-8"
        )

    # -------------------------------------------------------------- predict
    def set_vocabulary(self, adapter: DatasetAdapter) -> None:
        """Record the categories each categorical feature really takes.

        A one-hot encoder turns an unrecognised category into an all-zero
        column, so a translated answer is snapped onto a real dataset value here
        before it reaches the model. Without this the answer is silently lost.
        """
        frame = adapter.features_frame()
        self.vocabulary = {
            feature: known_categories(frame, feature)
            for feature in adapter.categorical_features
        }

    def align(self, record: dict) -> dict:
        """Snap a record's categorical values onto the trained vocabulary."""
        if not self.vocabulary:
            return record
        aligned = dict(record)
        for feature, value in record.items():
            available = self.vocabulary.get(feature)
            if available:
                aligned[feature] = resolve_category(feature, str(value), available)
        return aligned

    def predict(self, record: dict) -> dict:
        artifact = self.artifacts.get(PRIMARY_MODEL_ID)
        if artifact is None or not artifact.is_trained:
            raise LookupError("No trained model artifacts are available.")

        frame = pd.DataFrame([self.align(record)])
        probability = float(artifact.pipeline.predict_proba(frame)[0][1])
        return {"probability": probability, "model": artifact}

    def probabilities(self, record: dict) -> dict[str, float]:
        frame = pd.DataFrame([self.align(record)])
        return {
            model_id: float(artifact.pipeline.predict_proba(frame)[0][1])
            for model_id, artifact in self.artifacts.items()
            if artifact.is_trained
        }

    def evaluation_frame(self, adapter: DatasetAdapter, config: Settings = settings) -> pd.DataFrame:
        """Encoded evaluation split, used to compute global SHAP values."""
        frame = adapter.features_frame()
        target = adapter.frame[adapter.target_column].astype(str).str.strip().str.lower()
        positive = {"yes", "1", "positive", "malignant", "lung cancer", "true"}
        y = target.isin(positive).astype(int)
        _, x_test, _, _ = train_test_split(
            frame, y, test_size=config.test_size, random_state=config.random_state, stratify=None
        )
        return x_test

    def model_cards(self) -> list[dict]:
        cards: list[dict] = []
        for spec in MODEL_SPECS:
            artifact = self.artifacts.get(spec["id"])
            if artifact is None:
                cards.append(
                    {
                        **spec,
                        "status": "awaiting",
                        "isPrimary": spec["id"] == PRIMARY_MODEL_ID,
                        "metrics": None,
                        "confusionMatrix": None,
                        "trainedOn": None,
                        "featureCount": None,
                        "provenance": "unavailable",
                    }
                )
                continue
            cards.append(
                {
                    **spec,
                    "status": "trained",
                    "isPrimary": spec["id"] == PRIMARY_MODEL_ID,
                    "metrics": artifact.metrics,
                    "confusionMatrix": artifact.confusion,
                    "trainedOn": artifact.trained_on,
                    "featureCount": artifact.feature_count,
                    "provenance": "trained-model",
                }
            )
        return cards

    def evaluation_features(self) -> list[str]:
        artifact = self.artifacts.get(PRIMARY_MODEL_ID)
        if artifact is None or artifact.pipeline is None:
            return []
        preprocessor = artifact.pipeline.named_steps["preprocess"]
        try:
            return [str(name) for name in preprocessor.get_feature_names_out()]
        except Exception:  # pragma: no cover
            return []


registry = ModelRegistry()


def new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8].upper()}"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def risk_level(score: float, config: Settings = settings) -> str:
    if score >= config.upper_threshold:
        return "high"
    if score >= config.lower_threshold:
        return "moderate"
    return "low"


RISK_LABELS = {
    "low": "Low Predicted Risk",
    "moderate": "Moderate Predicted Risk",
    "high": "Elevated Predicted Risk",
}

NEXT_STEPS = {
    "low": [
        "Continue routine clinical follow-up and standard screening intervals.",
        "Maintain lifestyle guidance on tobacco and occupational exposure.",
        "Re-assess if new risk factors or symptoms are reported.",
    ],
    "moderate": [
        "Review exposure history with the patient and record it.",
        "Consider routine clinical review and standard screening intervals.",
        "Re-assess if symptoms or additional risk factors are reported.",
    ],
    "high": [
        "Flag this case for review by a qualified clinician.",
        "Consider low-dose CT screening review under local guidelines.",
        "Document exposure history in detail for the clinical record.",
    ],
}

__all__ = [
    "registry",
    "ModelRegistry",
    "CANONICAL_FEATURES",
    "FEATURE_LABELS",
    "RISK_LABELS",
    "NEXT_STEPS",
    "PRIMARY_MODEL_ID",
    "format_value",
    "new_id",
    "now_iso",
    "np",
]
