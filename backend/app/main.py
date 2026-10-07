"""LungCare AI — FastAPI ML service.

Educational and research prototype. The API never returns a diagnosis; it returns
screening scores, feature attributions and image-processing output.
"""

from __future__ import annotations

import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from . import explain as explain_module
from .config import settings
from .dataset import FEATURE_LABELS, dataset_profile, encode_patient, load_dataset
from .imaging import analyse as analyse_ct
from .models import (
    NEXT_STEPS,
    PRIMARY_MODEL_ID,
    RISK_LABELS,
    ModelRegistry,
    new_id,
    now_iso,
    registry,
)
from .reports import ReportStore
from . import report_reader
from .schemas import (
    CtAnalysisResult,
    DatasetInfo,
    DatasetInsightBundle,
    ExplainBundle,
    GenerateReportRequest,
    HealthResponse,
    ModelInfo,
    PatientInput,
    PredictionResult,
    ReportFindingModel,
    ReportReadingModel,
    ReportRecord,
)

VERSION = "1.0.0"

app = FastAPI(
    title="LungCare AI ML Service",
    description=(
        "Educational research prototype for lung cancer screening modelling. "
        "Not a medical diagnostic system."
    ),
    version=VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

reports = ReportStore()
_adapter = None
_startup_error: Optional[str] = None


# --------------------------------------------------------------------------- helpers
def _fail(status: int, message: str, hint: str) -> HTTPException:
    return HTTPException(
        status_code=status,
        detail={"userMessage": message, "hint": hint},
    )


def _no_models() -> HTTPException:
    return _fail(
        503,
        "No trained model artifacts are available.",
        "Place lung_cancer_dataset.csv in backend/data and run `python -m app.train`.",
    )


def _validate(patient: PatientInput) -> None:
    if patient.age is None or not 18 <= patient.age <= 100:
        raise _fail(422, "Please enter a valid age.", "Age must be between 18 and 100 years.")
    if patient.packYears is None or not 0 <= patient.packYears <= 120:
        raise _fail(
            422, "Please enter a valid pack years value.", "Pack years must be between 0 and 120."
        )
    if not patient.gender:
        raise _fail(422, "Please select a gender.", "Gender is required as a model input.")


@app.on_event("startup")
def on_startup() -> None:
    global _adapter, _startup_error
    try:
        registry.load(settings)
        _adapter = load_dataset(settings.primary_dataset())
        if _adapter is not None:
            registry.set_vocabulary(_adapter)
            evaluation = registry.evaluation_frame(_adapter, settings)
            explain_module.set_evaluation_frame(registry, evaluation)
    except Exception as error:  # pragma: no cover - surfaced in /api/health
        _startup_error = str(error)
        return

    # Global feature importance does not depend on the patient, and TreeSHAP over
    # a large forest is expensive. Pre-compute it off the request path so the
    # first explanation request does not block on it.
    threading.Thread(
        target=explain_module.warm_global_importance,
        args=(registry,),
        name="shap-warmup",
        daemon=True,
    ).start()


# --------------------------------------------------------------------------- health
@app.get("/api/health", response_model=HealthResponse, tags=["system"])
def health() -> HealthResponse:
    models_loaded = sum(1 for artifact in registry.artifacts.values() if artifact.is_trained)
    datasets_loaded = 1 if _adapter is not None else 0
    if models_loaded == 0:
        return HealthResponse(
            status="degraded",
            mode="unavailable",
            modelsLoaded=0,
            datasetsLoaded=datasets_loaded,
            shapAvailable=explain_module.SHAP_AVAILABLE,
            version=VERSION,
            message=(
                "No trained artifacts found. Run `python -m app.train` with "
                "lung_cancer_dataset.csv in backend/data."
            ),
        )
    return HealthResponse(
        status="ok",
        mode="live",
        modelsLoaded=models_loaded,
        datasetsLoaded=datasets_loaded,
        shapAvailable=registry.shap_ready and explain_module.SHAP_AVAILABLE,
        version=VERSION,
        message=f"{models_loaded} trained models served from {registry.dataset_name}.",
    )


# --------------------------------------------------------------------------- models
@app.get("/api/models", response_model=list[ModelInfo], tags=["models"])
def list_models() -> list[ModelInfo]:
    return [ModelInfo(**card) for card in registry.model_cards()]


# -------------------------------------------------------------------------- predict
@app.post("/api/predict", response_model=PredictionResult, tags=["screening"])
def predict(patient: PatientInput) -> PredictionResult:
    _validate(patient)
    if not registry.artifacts.get(PRIMARY_MODEL_ID) or not registry.artifacts[
        PRIMARY_MODEL_ID
    ].is_trained:
        raise _no_models()

    started = time.perf_counter()
    record = encode_patient(patient.model_dump())
    try:
        outcome = registry.predict(record)
    except LookupError as error:
        raise _no_models() from error

    probability = outcome["probability"]
    artifact = outcome["model"]
    level = _risk_level(probability)

    local = explain_module.explain_prediction(registry, record)
    if local:
        attribution = explain_module._attribute_to_canonical(  # noqa: SLF001 - internal helper
            local["record"], local["encodedNames"], local["shap"]
        )
    else:
        attribution = []

    if attribution:
        peak = max(abs(item["shapValue"]) for item in attribution) or 1.0
        contributions = [
            {
                "feature": item["feature"],
                "label": item["label"],
                "displayValue": item["displayValue"],
                "contribution": item["shapValue"],
                "magnitude": round(abs(item["shapValue"]) / peak * 100, 1),
                "direction": item["direction"],
                "sentence": item["sentence"],
            }
            for item in attribution
        ]
    else:  # SHAP unavailable — return an empty, clearly-labelled contribution set
        contributions = []

    increasing = [item["label"] for item in contributions if item["contribution"] > 0][:3]
    summary = (
        f"The screening score returned by the model falls in the {level} predicted-risk range. "
        + (
            f"The largest upward contributions came from {', '.join(increasing)}. "
            if increasing
            else "No single input feature raised the score on its own. "
        )
        + "This is a model association, not a medical diagnosis."
    )

    return PredictionResult(
        id=new_id("PRED"),
        createdAt=now_iso(),
        patient=patient,
        riskScore=round(probability, 4),
        riskLevel=level,
        riskCategoryLabel=RISK_LABELS[level],
        confidence=round(max(probability, 1 - probability), 4),
        model={"id": PRIMARY_MODEL_ID, "name": artifact.spec["name"], "family": artifact.spec["family"]},
        threshold=settings.upper_threshold,
        complementaryScore=round(1 - probability, 4),
        contributions=contributions,
        summary=summary,
        nextSteps=NEXT_STEPS[level],
        provenance="trained-model",
        engine="Trained model served by the LungCare ML API",
        processingMs=int((time.perf_counter() - started) * 1000),
    )


# ---------------------------------------------------------------------------- XAI
@app.post("/api/explain", response_model=ExplainBundle, tags=["explainability"])
def explain(patient: PatientInput, includeGlobal: bool = True) -> ExplainBundle:
    """Explain one prediction.

    Pass ``includeGlobal=false`` to skip the model-wide feature-importance
    block. It is expensive to compute and identical for every patient, so
    patient-facing screens omit it and stay fast.
    """
    _validate(patient)
    if not registry.shap_ready:
        raise _fail(
            503,
            "Explainability is not available yet.",
            "Train the models with `python -m app.train` to enable SHAP explanations.",
        )
    record = encode_patient(patient.model_dump())
    try:
        bundle = explain_module.build_bundle(registry, record, include_global=includeGlobal)
    except explain_module.ExplainUnavailable:
        raise _no_models() from None
    return ExplainBundle(**bundle)


# ------------------------------------------------------------------------ datasets
@app.get("/api/datasets", response_model=list[DatasetInfo], tags=["datasets"])
def list_datasets() -> list[DatasetInfo]:
    entries = [
        DatasetInfo(
            id="dataset-a",
            name="Lung Cancer Dataset A",
            description="Not connected. Place lung_cancer_dataset.csv in backend/data.",
            source=str(settings.primary_dataset()),
            records=None,
            features=len(FEATURE_LABELS),
            target=settings.target_column,
            missingValues=None,
            duplicates=None,
            provenance="unavailable",
            columns=list(FEATURE_LABELS.keys()) + [settings.target_column],
        ),
        DatasetInfo(
            id="ct-image-dataset",
            name="CT Image Dataset",
            description=(
                "Lung CT slices used by the image-processing pipeline. Segmentation is applied "
                "at inference time; no tumour detector is trained."
            ),
            source="backend/data/ct_images",
            provenance="unavailable",
        ),
    ]
    if _adapter is not None:
        profile = dataset_profile(_adapter, "Lung Cancer Dataset A", str(settings.primary_dataset()))
        entries[0] = DatasetInfo(**profile)
    return entries


@app.get("/api/datasets/{dataset_id}/insights", response_model=DatasetInsightBundle, tags=["datasets"])
def dataset_insights(dataset_id: str) -> DatasetInsightBundle:
    if _adapter is None:
        raise _fail(
            503,
            "Dataset statistics are not available yet.",
            "Connect lung_cancer_dataset.csv in backend/data and restart the service.",
        )

    import numpy as np
    import pandas as pd

    frame = _adapter.frame
    columns = _adapter.column_map

    age_series = (
        pd.to_numeric(frame[columns["age"]], errors="coerce").dropna()
        if "age" in columns
        else pd.Series(dtype=float)
    )
    age_bins = [0, 30, 40, 50, 60, 70, 80, 200]
    age_labels = ["18–29", "30–39", "40–49", "50–59", "60–69", "70–79", "80+"]
    age_histogram = []
    if len(age_series):
        counts, _ = np.histogram(age_series, bins=age_bins)
        age_histogram = [
            {"bin": label, "count": int(count)} for label, count in zip(age_labels, counts)
        ]

    def distribution(column: str) -> list[dict]:
        if column not in columns:
            return []
        values = frame[columns[column]].astype(str).str.strip()
        return [
            {"label": str(label), "count": int(count)}
            for label, count in values.value_counts().items()
        ]

    def presence(column: str) -> int:
        if column not in columns:
            return 0
        values = frame[columns[column]].astype(str).str.strip().str.lower()
        return int((~values.isin(["no", "none", "0", "false", "nan", ""])).sum())

    target = frame[_adapter.target_column].astype(str).str.strip().str.lower()
    positive = {"yes", "1", "positive", "malignant", "lung cancer", "true"}
    y = (target.isin(positive)).astype(int).to_numpy()

    pack_values = (
        pd.to_numeric(frame[columns["pack_years"]], errors="coerce").fillna(0)
        if "pack_years" in columns
        else pd.Series([0] * len(frame))
    )
    band_labels = ["0", "1–10", "11–20", "21–30", "31–40", "41–60", "60+"]
    band_edges = [-0.5, 0.5, 10.5, 20.5, 30.5, 40.5, 60.5, 1000]
    counts, _ = np.histogram(pack_values, bins=band_edges)
    pack_bands = [{"label": label, "count": int(count)} for label, count in zip(band_labels, counts)]

    points = [
        {"age": float(age), "packYears": float(pack), "target": int(label)}
        for age, pack, label in zip(age_series, pack_values, y)
        if not np.isnan(age)
    ][:400]

    return DatasetInsightBundle(
        datasetId=dataset_id,
        provenance="trained-model",
        ageHistogram=age_histogram,
        genderDistribution=distribution("gender"),
        classDistribution=[
            {"label": "Screened positive", "count": int(y.sum())},
            {"label": "Screened negative", "count": int(len(y) - y.sum())},
        ],
        riskFactorPresence=[
            {
                "feature": feature,
                "label": FEATURE_LABELS[feature],
                "present": presence(feature),
            }
            for feature in (
                "pack_years",
                "family_history",
                "copd_diagnosis",
                "asbestos_exposure",
                "radon_exposure",
                "secondhand_smoke_exposure",
                "alcohol_consumption",
            )
            if feature in columns
        ],
        packYearsBands=pack_bands,
        scatter={"points": points, "sampled": len(points) >= 400},
    )


# ------------------------------------------------------------------------- imaging
@app.post("/api/analyze-ct", response_model=CtAnalysisResult, tags=["imaging"])
async def analyze_ct(file: UploadFile = File(...)) -> CtAnalysisResult:
    payload = await file.read()
    if not payload:
        raise _fail(422, "The uploaded file is empty.", "Please choose a valid CT image.")
    if len(payload) > settings.max_upload_bytes:
        raise _fail(
            413,
            "The uploaded file is too large.",
            f"Please choose an image smaller than {settings.max_upload_bytes // (1024 * 1024)} MB.",
        )
    if file.content_type not in {"image/png", "image/jpeg", "image/jpg"}:
        raise _fail(
            415,
            "Unsupported image format.",
            "The server pipeline accepts PNG and JPEG slices.",
        )
    try:
        result = analyse_ct(file.filename or "upload.png", payload)
    except ValueError as error:
        raise _fail(422, "Unable to read the selected image.", str(error)) from error
    return CtAnalysisResult(**result)


# ------------------------------------------------------------------- report reader
REPORT_DISCLAIMER = (
    "This application is an educational and research prototype and does not provide a medical "
    "diagnosis. This explanation describes words that appeared in your document. It is not an "
    "interpretation of the report and it does not say what anything means for you. Your "
    "healthcare professional explains what your results mean in the context of your health."
)

#: Extensions the reader can turn into text without an OCR engine.
READABLE_SUFFIXES = (".pdf", ".txt", ".md", ".rtf", ".csv", ".docx")


def _build_reading(
    text: str,
    filename: str,
    started: float,
    readable: bool = True,
) -> ReportReadingModel:
    reading = report_reader.read_report(text)
    questions: list[str] = []
    for finding in reading.findings:
        if finding.question not in questions:
            questions.append(finding.question)
    if not questions:
        questions = [
            "Could you walk me through this report with me?",
            "Are there any findings in this report that need follow-up?",
        ]
    return ReportReadingModel(
        id=new_id("READ"),
        createdAt=now_iso(),
        documentKind=reading.document_kind if readable else "An uploaded document",
        fileName=filename or "pasted text",
        characterCount=reading.character_count,
        findings=[
            ReportFindingModel(
                key=finding.key,
                category=finding.category,
                categoryTitle=report_reader.CATEGORY_TITLES.get(
                    finding.category, "What the report says"
                ),
                title=finding.title,
                matched=finding.matched,
                meaning=finding.meaning,
                why=finding.why,
                question=finding.question,
                negated=finding.negated,
                measurement=finding.measurement,
            )
            for finding in reading.findings
        ],
        categories=reading.categories_present,
        followUp=reading.follow_up,
        notes=reading.notes,
        questions=questions[:8],
        readable=readable,
        engine="Curated lung-terminology reader (no external AI service)",
        processingMs=int((time.perf_counter() - started) * 1000),
        disclaimer=REPORT_DISCLAIMER,
    )


@app.post("/api/read-report", response_model=ReportReadingModel, tags=["reports"])
async def read_report_upload(file: UploadFile = File(...)) -> ReportReadingModel:
    """Explain lung-related wording in an uploaded report, in plain language."""
    started = time.perf_counter()
    payload = await file.read()
    filename = file.filename or ""
    if not payload:
        raise _fail(422, "The uploaded file is empty.", "Please choose a file to read.")
    if len(payload) > settings.max_upload_bytes:
        raise _fail(
            413,
            "That file is too large to read.",
            f"Please choose a file smaller than {settings.max_upload_bytes // (1024 * 1024)} MB.",
        )

    suffix = Path(filename).suffix.lower()
    text = report_reader.extract_text(payload, filename)

    if not text.strip():
        # Be explicit rather than returning a partial or invented reading.
        if suffix in {".jpg", ".jpeg", ".png", ".webp", ".tiff", ".tif"} or payload[:4] in {
            b"\x89PNG",
            b"\xff\xd8\xff",
        }:
            raise _fail(
                415,
                "Photos of a report cannot be read yet.",
                "This prototype does not include text recognition, so it cannot read an "
                "image of a report. Copy the text of the report and paste it into the box "
                "instead, or download the report as a PDF or text file from your portal.",
            )
        raise _fail(
            415,
            "This file format cannot be read.",
            "Upload a PDF, a Word document (.docx), or a plain text file (.txt).",
        )

    return _build_reading(text, filename, started)


@app.post("/api/read-report-text", response_model=ReportReadingModel, tags=["reports"])
def read_report_pasted(payload: dict) -> ReportReadingModel:
    """Same explanation, for text the person copies and pastes themselves."""
    started = time.perf_counter()
    text = str(payload.get("text") or "").strip()
    if not text:
        raise _fail(
            422,
            "No report text was provided.",
            "Paste the text of your report into the box and try again.",
        )
    if len(text) > 200_000:
        raise _fail(
            413,
            "That text is too long to read.",
            "Please paste a smaller section, such as the findings and impression sections.",
        )
    return _build_reading(text, "pasted text", started)


# ------------------------------------------------------------------------- reports
@app.get("/api/report", response_model=list[ReportRecord], tags=["reports"])
def list_reports() -> list[ReportRecord]:
    return reports.list()


@app.post("/api/report", response_model=ReportRecord, tags=["reports"])
def create_report(payload: GenerateReportRequest) -> ReportRecord:
    record = reports.create(payload)
    return ReportRecord(**record)


@app.get("/api/report/{report_id}", response_model=Optional[ReportRecord], tags=["reports"])
def get_report(report_id: str) -> Optional[ReportRecord]:
    return reports.get(report_id)


@app.get("/api/report/{report_id}/document", tags=["reports"])
def get_report_document(report_id: str) -> dict:
    document = reports.document(report_id)
    if document is None:
        raise _fail(404, "Report not found.", "Generate the report again to store it locally.")
    return document


def _risk_level(score: float) -> str:
    if score >= settings.upper_threshold:
        return "high"
    if score >= settings.lower_threshold:
        return "moderate"
    return "low"


def _unused_datetime() -> datetime:  # pragma: no cover - keeps datetime import meaningful
    return datetime.now(timezone.utc)


__all__ = ["app", "registry", "ModelRegistry"]
