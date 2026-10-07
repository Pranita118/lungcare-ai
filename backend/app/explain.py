"""SHAP explainability: global importance, local attribution and summary plot data.

TreeSHAP is used for tree models; a permutation explainer covers the linear
baseline and the stacked ensembles.

Global feature importance is a property of the *model*, not of the patient, so it
is computed once per model and cached. This matters a great deal here: TreeSHAP
over a 300-tree forest costs roughly a second per row, and recomputing the same
global summary on every request would stall the service. ``warm_global_importance``
pre-computes the cache in a background thread at start-up so the first user
request is already fast.
"""

from __future__ import annotations

import threading
from typing import Optional

import numpy as np
import pandas as pd

from .dataset import CANONICAL_FEATURES, FEATURE_LABELS, format_value
from .models import PRIMARY_MODEL_ID, ModelRegistry

#: Longest first so ``asbestos_exposure_high`` never matches a shorter feature.
_SORTED_FEATURES = sorted(CANONICAL_FEATURES, key=len, reverse=True)


def canonical_feature(encoded_name: str) -> Optional[str]:
    """Map a preprocessor output name back onto a canonical model feature.

    ``num__age`` and ``cat__asbestos_exposure_high`` both resolve to their
    canonical feature so one-hot columns can be summed together.
    """
    tail = encoded_name.split("__", 1)[-1]
    if tail in CANONICAL_FEATURES:
        return tail
    for feature in _SORTED_FEATURES:
        if tail.startswith(f"{feature}_"):
            return feature
    return None


try:  # pragma: no cover - optional dependency
    import shap

    SHAP_AVAILABLE = True
except Exception:  # pragma: no cover
    shap = None
    SHAP_AVAILABLE = False

MAX_SWARM_SAMPLES = 60

#: How long a request will wait for the background warm-up before computing
#: the overview itself. Comfortably longer than one model's TreeSHAP pass.
WARM_UP_WAIT_SECONDS = 180.0

_EMPTY_OVERVIEW: dict = {"points": [], "beeswarm": [], "baseValue": 0.0}

#: Global importance is model-scoped, so it is computed once and reused.
_GLOBAL_CACHE: dict[str, dict] = {}
_GLOBAL_LOCKS: dict[str, threading.Lock] = {}
_GLOBAL_READY: dict[str, threading.Event] = {}
_CACHE_LOCK = threading.Lock()


def _lock_for(model_id: str) -> threading.Lock:
    with _CACHE_LOCK:
        return _GLOBAL_LOCKS.setdefault(model_id, threading.Lock())


def _ready_event(model_id: str, create: bool) -> Optional[threading.Event]:
    with _CACHE_LOCK:
        event = _GLOBAL_READY.get(model_id)
        if event is None and create:
            event = _GLOBAL_READY.setdefault(model_id, threading.Event())
        return event


def _publish(model_id: str, payload: dict) -> None:
    """Store a computed overview and release anyone waiting for it."""
    with _CACHE_LOCK:
        _GLOBAL_CACHE[model_id] = payload
    event = _ready_event(model_id, create=True)
    if event is not None:
        event.set()


# --------------------------------------------------------------------------- warm-up
#
# TreeSHAP over a 300-tree forest takes about a second per row and holds the GIL
# while it runs, so doing this on a thread inside the API process would make every
# other endpoint unresponsive for over a minute. The warm-up therefore runs in a
# small process pool: the child processes load the artifacts themselves and return
# only the small result payload, leaving the API process free to answer requests.

_WARM_REGISTRY = None


def _warm_worker(model_id: str) -> tuple[str, dict]:
    """Entry point executed in a child process for one model."""
    global _WARM_REGISTRY
    if _WARM_REGISTRY is None:
        from .config import settings
        from .dataset import load_dataset

        registry = ModelRegistry()
        registry.load()
        adapter = load_dataset(settings.primary_dataset())
        if adapter is not None:
            set_evaluation_frame(registry, registry.evaluation_frame(adapter, settings))
        _WARM_REGISTRY = registry
    try:
        return model_id, _compute_global_importance(_WARM_REGISTRY, model_id)
    except Exception:  # pragma: no cover - defensive
        return model_id, dict(_EMPTY_OVERVIEW)


def warm_global_importance(
    registry: ModelRegistry, model_ids: Optional[list[str]] = None, workers: int = 4
) -> Optional[threading.Thread]:
    """Pre-compute the global-importance cache in background processes.

    Returns immediately. Any model that cannot be explained caches an empty
    overview rather than raising, so this can never break start-up. If the pool
    cannot be created the cache simply stays cold and is computed lazily on first
    use instead.

    ``workers=0`` skips the pool entirely and returns None. Use that on a
    memory-constrained host: every worker is a separate interpreter that imports
    SHAP, so the pool can cost more memory than the whole service.
    """
    if workers <= 0:
        return None

    ids = model_ids if model_ids is not None else [
        model_id
        for model_id, artifact in registry.artifacts.items()
        if artifact.is_trained
    ]
    if not ids:
        return None
    for model_id in ids:
        _ready_event(model_id, create=True)

    def run() -> None:
        try:
            from concurrent.futures import ProcessPoolExecutor

            with ProcessPoolExecutor(max_workers=max(1, min(workers, len(ids)))) as pool:
                for model_id, payload in pool.map(_warm_worker, ids):
                    _publish(model_id, payload)
        except Exception:  # pragma: no cover - falls back to lazy computation
            for model_id in ids:
                if _ready_event(model_id, create=False) is not None:
                    _ready_event(model_id, create=False).set()  # type: ignore[union-attr]

    thread = threading.Thread(target=run, name="shap-warmup", daemon=True)
    thread.start()
    return thread


class ExplainUnavailable(RuntimeError):
    """Raised when explainability cannot be produced for the current artifacts."""


def _normalise_shap(raw: np.ndarray, n_samples: int, n_features: int) -> np.ndarray:
    """Return SHAP values for the positive class as ``(n_samples, n_features)``.

    SHAP has shipped three layouts across versions:
      * ``(n_outputs, n_samples, n_features)``
      * ``(n_samples, n_outputs, n_features)``
      * ``(n_samples, n_features, n_outputs)``

    The output axis is located by shape rather than assumed, so the module works
    with any of them.
    """
    array = np.asarray(raw)

    if array.ndim == 1:
        return array.reshape(1, -1)
    if array.ndim == 2:
        if array.shape == (n_samples, n_features):
            return array
        if array.shape[0] == n_samples:
            return array
        # (n_outputs, n_features)
        return array[1:2] if array.shape[0] == 2 else array
    if array.ndim == 3:
        for axis in (2, 0, 1):
            size = array.shape[axis]
            if size > 2:
                continue
            others = [array.shape[(axis + 1) % 3], array.shape[(axis + 2) % 3]]
            if sorted(others) == sorted([n_samples, n_features]):
                return np.take(array, min(1, size - 1), axis=axis).reshape(n_samples, n_features)
    return array.reshape(n_samples, -1)


def _explainer(registry: ModelRegistry, artifact):
    """Build the most appropriate SHAP explainer for a trained pipeline."""
    estimator = artifact.pipeline.named_steps["model"]
    preprocessor = artifact.pipeline.named_steps["preprocess"]
    if not SHAP_AVAILABLE:
        return None, None

    if hasattr(estimator, "estimators_") or estimator.__class__.__name__ in {
        "RandomForestClassifier",
        "GradientBoostingClassifier",
        "DecisionTreeClassifier",
    }:
        return shap.TreeExplainer(estimator), preprocessor
    try:
        return shap.LinearExplainer(estimator, preprocessor.transform(_background(registry))), preprocessor
    except Exception:
        return shap.KernelExplainer(_predict_fn(artifact), shap.kmeans(_background(registry), 10)), preprocessor


def _predict_fn(artifact):
    def predict(matrix):
        return artifact.pipeline.named_steps["model"].predict_proba(matrix)[:, 1]

    return predict


def _background(registry: ModelRegistry) -> pd.DataFrame:
    frame = registry._cached_eval_frame  # type: ignore[attr-defined]
    return frame.head(80)


def set_evaluation_frame(registry: ModelRegistry, frame: pd.DataFrame) -> None:
    registry._cached_eval_frame = frame  # type: ignore[attr-defined]


def explain_prediction(
    registry: ModelRegistry,
    record: dict,
    model_id: str = PRIMARY_MODEL_ID,
) -> Optional[dict]:
    """Local SHAP attribution for one patient, in encoded feature space."""
    artifact = registry.artifacts.get(model_id)
    if artifact is None or not artifact.is_trained:
        return None

    explainer, preprocessor = _explainer(registry, artifact)
    frame = pd.DataFrame([record])
    if explainer is None:
        return None

    transformed = preprocessor.transform(frame)
    values = _normalise_shap(
        explainer.shap_values(transformed), 1, transformed.shape[1]
    )[0]
    base_value = float(np.asarray(explainer.expected_value).reshape(-1)[0])
    probability = float(artifact.pipeline.predict_proba(frame)[0][1])

    return {
        "baseValue": round(base_value, 4),
        "predictionValue": round(base_value + float(values.sum()), 4),
        "probability": probability,
        "shap": values,
        "encodedNames": [str(name) for name in preprocessor.get_feature_names_out()],
        "record": record,
    }


def _attribute_to_canonical(record: dict, encoded_names: list[str], values: np.ndarray) -> list[dict]:
    """Collapse one-hot encoded columns back onto the canonical features."""
    grouped: dict[str, float] = {}
    for name, value in zip(encoded_names, values):
        feature = canonical_feature(name)
        if feature is None:
            continue
        grouped[feature] = grouped.get(feature, 0.0) + float(value)

    results: list[dict] = []
    for feature, value in grouped.items():
        results.append(
            {
                "feature": feature,
                "label": FEATURE_LABELS.get(feature, feature.replace("_", " ").title()),
                "displayValue": format_value(feature, record.get(feature)),
                "shapValue": round(value, 4),
                "direction": "increases-risk" if value >= 0 else "decreases-risk",
                "sentence": _sentence(feature, record.get(feature), value),
            }
        )
    return sorted(results, key=lambda item: abs(item["shapValue"]), reverse=True)


def _sentence(feature: str, value, effect: float) -> str:
    label = FEATURE_LABELS.get(feature, feature.replace("_", " ").title())
    display = format_value(feature, value)
    if abs(effect) < 0.02:
        return f"{label} had a negligible contribution to this model prediction."
    strength = "strong" if abs(effect) >= 0.3 else "moderate" if abs(effect) >= 0.1 else "small"
    if effect > 0:
        return (
            f"{label} ({display}) had a {strength} positive contribution to the "
            "predicted risk score."
        )
    return (
        f"{label} ({display}) had a {strength} negative contribution, lowering the "
        "predicted risk score."
    )


def _as_numeric_codes(frame: pd.DataFrame, feature: str) -> np.ndarray:
    """Numeric view of a feature, used to colour the beeswarm summary plot.

    Numeric features are used as-is; categorical features are mapped to stable
    ordinal codes so the plot can still colour by feature value.
    """
    if feature not in frame.columns:
        return np.zeros(len(frame))
    series = frame[feature]
    if pd.api.types.is_numeric_dtype(series):
        return series.fillna(0).to_numpy(dtype=float)
    codes, _ = pd.factorize(series.astype(str), sort=True)
    return codes.astype(float)


def global_importance(registry: ModelRegistry, model_id: str = PRIMARY_MODEL_ID) -> dict:
    """Mean absolute SHAP value per canonical feature over the evaluation split.

    Cached per model. TreeSHAP over a large forest is expensive and the result
    does not depend on the patient, so it is computed at most once per model.
    If a request arrives while the background warm-up is still working, it waits
    for that result rather than repeating the computation.
    """
    with _CACHE_LOCK:
        cached = _GLOBAL_CACHE.get(model_id)
    if cached is not None:
        return cached

    # A warm-up is running: give it a bounded chance to answer, then fall back to
    # computing here so the request still succeeds.
    event = _ready_event(model_id, create=True)
    if event is not None and not event.is_set():
        event.wait(timeout=WARM_UP_WAIT_SECONDS)
        with _CACHE_LOCK:
            cached = _GLOBAL_CACHE.get(model_id)
        if cached is not None:
            return cached

    with _lock_for(model_id):
        with _CACHE_LOCK:
            cached = _GLOBAL_CACHE.get(model_id)
        if cached is not None:
            return cached
        result = _compute_global_importance(registry, model_id)
        _publish(model_id, result)
        return result


def _compute_global_importance(registry: ModelRegistry, model_id: str) -> dict:
    """Uncached global-importance computation. See :func:`global_importance`."""
    artifact = registry.artifacts.get(model_id)
    if artifact is None or not artifact.is_trained:
        return dict(_EMPTY_OVERVIEW)

    frame = getattr(registry, "_cached_eval_frame", None)
    if frame is None or len(frame) == 0:
        return dict(_EMPTY_OVERVIEW)

    sample = frame.head(MAX_SWARM_SAMPLES)
    local = explain_prediction(registry, sample.iloc[0].to_dict(), model_id)
    if local is None:
        return {"points": [], "beeswarm": [], "baseValue": 0.0}

    explainer, preprocessor = _explainer(registry, artifact)
    transformed = preprocessor.transform(sample)
    matrix = _normalise_shap(
        explainer.shap_values(transformed), len(sample), transformed.shape[1]
    )

    encoded_names = local["encodedNames"]
    feature_of = [canonical_feature(name) for name in encoded_names]

    totals: dict[str, float] = {}
    signed: dict[str, float] = {}
    for index, feature in enumerate(feature_of):
        if feature is None:
            continue
        column = matrix[:, index]
        totals[feature] = totals.get(feature, 0.0) + float(np.abs(column).mean())
        signed[feature] = signed.get(feature, 0.0) + float(column.mean())

    total = sum(totals.values()) or 1.0
    points = [
        {
            "feature": feature,
            "label": FEATURE_LABELS.get(feature, feature.replace("_", " ").title()),
            "meanAbsShap": round(abs(value), 4),
            "share": round(abs(value) / total, 4),
            "direction": "risk" if signed.get(feature, 0) >= 0 else "protective",
        }
        for feature, value in totals.items()
    ]
    points.sort(key=lambda item: item["meanAbsShap"], reverse=True)

    beeswarm = []
    for feature in [item["feature"] for item in points[:7]]:
        indices = [
            index
            for index, candidate in enumerate(feature_of)
            if candidate == feature and feature is not None
        ]
        if not indices:
            continue
        values = matrix[:, indices].sum(axis=1)
        raw = _as_numeric_codes(sample, feature)
        beeswarm.append(
            {
                "feature": feature,
                "label": FEATURE_LABELS.get(feature, feature.replace("_", " ").title()),
                "points": [
                    {"shap": round(float(shap_value), 4), "value": float(raw_value)}
                    for shap_value, raw_value in zip(values, raw)
                ],
            }
        )

    return {"points": points, "beeswarm": beeswarm, "baseValue": local["baseValue"]}


def build_bundle(
    registry: ModelRegistry,
    patient: dict,
    model_id: str = PRIMARY_MODEL_ID,
    include_global: bool = True,
) -> dict:
    """Explainability payload for one patient.

    ``include_global`` controls the model-wide feature-importance block. Local
    attribution is cheap (one row through the explainer, well under a second)
    whereas the global summary costs roughly a second per row and is identical
    for every patient. Patient-facing screens therefore ask for local only and
    stay fast; the research screens request the global block, which is served
    from the warmed cache.
    """
    local = explain_prediction(registry, patient, model_id)
    if local is None:
        raise ExplainUnavailable("Explainability is unavailable for the current artifacts.")

    attribution = _attribute_to_canonical(local["record"], local["encodedNames"], local["shap"])
    overview = global_importance(registry, model_id) if include_global else dict(_EMPTY_OVERVIEW)

    return {
        "provenance": "trained-model",
        "baseValue": local["baseValue"],
        "predictionValue": local["predictionValue"],
        "method": "SHAP (TreeSHAP / linear explainer)",
        "global": overview["points"],
        "local": attribution,
        "beeswarm": overview["beeswarm"],
        "summary": (
            f"Local attribution sums to the model output for this case, starting from a base "
            f"value of {local['baseValue']:.2f}. The final screening probability is "
            f"{local['probability'] * 100:.1f}%."
        ),
        "engine": "Trained model served by the LungCare ML API",
    }
