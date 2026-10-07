"""Pydantic schemas mirroring the frontend contract in ``src/types/index.ts``."""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

Provenance = Literal["trained-model", "unavailable"]
RiskLevel = Literal["low", "moderate", "high"]
ExposureLevel = Literal["none", "low", "moderate", "high"]


class PatientInput(BaseModel):
    patientId: str = ""
    age: Optional[float] = None
    gender: Literal["male", "female", "other", ""] = ""
    packYears: Optional[float] = None
    radonExposure: Literal["none", "low", "moderate", "high", ""] = ""
    asbestosExposure: Literal["none", "low", "moderate", "high", ""] = ""
    secondhandSmokeExposure: Literal["none", "low", "moderate", "high", ""] = ""
    copdDiagnosis: Literal["no", "yes", ""] = ""
    alcoholConsumption: Literal["none", "low", "moderate", "high", ""] = ""
    familyHistory: Literal["no", "yes", ""] = ""


class ModelRef(BaseModel):
    id: str
    name: str
    family: str


class FactorContribution(BaseModel):
    feature: str
    label: str
    displayValue: str
    contribution: float
    magnitude: float
    direction: Literal["increases-risk", "decreases-risk", "neutral"]
    sentence: str


class PredictionResult(BaseModel):
    id: str
    createdAt: datetime
    patient: PatientInput
    riskScore: float
    riskLevel: RiskLevel
    riskCategoryLabel: str
    confidence: float
    model: ModelRef
    threshold: float
    complementaryScore: float
    contributions: list[FactorContribution]
    summary: str
    nextSteps: list[str]
    provenance: Provenance
    engine: str
    processingMs: int


class ShapLocalPoint(BaseModel):
    feature: str
    label: str
    displayValue: str
    shapValue: float
    direction: Literal["increases-risk", "decreases-risk"]
    sentence: str


# ------------------------------------------------------------------ report reader


class ReportFindingModel(BaseModel):
    key: str
    category: str
    categoryTitle: str
    title: str
    #: Short verbatim window from the report, so the person can find it.
    matched: str
    meaning: str
    why: str
    question: str
    #: True when the report describes the finding as *not* present.
    negated: bool = False
    measurement: Optional[str] = None


class ReportReadingModel(BaseModel):
    id: str
    createdAt: datetime
    documentKind: str
    fileName: str
    characterCount: int
    findings: list[ReportFindingModel]
    categories: list[str]
    followUp: list[str]
    notes: list[str]
    questions: list[str]
    #: Set when the file could not be turned into readable text.
    readable: bool = True
    engine: str
    processingMs: int
    disclaimer: str


class ShapGlobalPoint(BaseModel):
    feature: str
    label: str
    meanAbsShap: float
    share: float
    direction: Literal["risk", "protective"]


class BeeswarmRow(BaseModel):
    feature: str
    label: str
    points: list[dict[str, float]]


class ExplainBundle(BaseModel):
    """``global`` is a Python keyword, so the field is aliased to the JSON name."""

    model_config = ConfigDict(populate_by_name=True)

    provenance: Provenance
    baseValue: float
    predictionValue: float
    method: str
    globalAttribution: list[ShapGlobalPoint] = Field(default_factory=list, alias="global")
    local: list[ShapLocalPoint] = Field(default_factory=list)
    beeswarm: list[BeeswarmRow] = Field(default_factory=list)
    summary: str
    engine: str


class PipelineStep(BaseModel):
    key: str
    label: str
    detail: str
    status: Literal["pending", "running", "done", "skipped"]
    durationMs: Optional[int] = None


class RoiRegion(BaseModel):
    id: int
    x: int
    y: int
    width: int
    height: int
    areaPx: int
    areaPct: float
    meanIntensity: int


class CtImageSet(BaseModel):
    original: str
    grayscale: str
    denoised: str
    segmented: str
    overlay: str


class CtAnalysisResult(BaseModel):
    id: str
    createdAt: datetime
    fileName: str
    fileSizeBytes: int
    width: int
    height: int
    format: str
    steps: list[PipelineStep]
    histogram: list[dict[str, float]]
    otsuThreshold: int
    clusterCount: int
    clusterCenters: list[int]
    regions: list[RoiRegion]
    roiPixelShare: float
    processingMethod: str
    segmentationMethod: str
    engine: Literal["client", "server"]
    provenance: Provenance
    processingMs: int
    images: CtImageSet
    notes: list[str]


class ModelMetrics(BaseModel):
    accuracy: Optional[float] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    f1: Optional[float] = None
    rocAuc: Optional[float] = None


class ConfusionMatrix(BaseModel):
    trueNegative: int
    falsePositive: int
    falseNegative: int
    truePositive: int


class ModelInfo(BaseModel):
    id: str
    name: str
    family: str
    purpose: str
    status: Literal["trained", "awaiting"]
    isPrimary: bool = False
    metrics: Optional[ModelMetrics] = None
    confusionMatrix: Optional[ConfusionMatrix] = None
    trainedOn: Optional[str] = None
    featureCount: Optional[int] = None
    provenance: Provenance
    notes: str


class DatasetInfo(BaseModel):
    id: str
    name: str
    description: str
    source: Optional[str] = None
    records: Optional[int] = None
    features: Optional[int] = None
    target: Optional[str] = None
    missingValues: Optional[int] = None
    duplicates: Optional[int] = None
    classDistribution: list[dict[str, object]] = Field(default_factory=list)
    ageSummary: Optional[dict[str, Optional[float]]] = None
    provenance: Provenance
    columns: Optional[list[str]] = None


class InsightPoint(BaseModel):
    age: float
    packYears: float
    target: int


class DatasetInsightBundle(BaseModel):
    datasetId: str
    provenance: Provenance
    ageHistogram: list[dict[str, object]]
    genderDistribution: list[dict[str, object]]
    classDistribution: list[dict[str, object]]
    riskFactorPresence: list[dict[str, object]]
    packYearsBands: list[dict[str, object]]
    scatter: dict[str, object]


class ReportRecord(BaseModel):
    id: str
    createdAt: datetime
    patientId: str
    patientLabel: str
    analysisType: str
    resultLabel: str
    riskLevel: RiskLevel
    modelName: str
    status: Literal["generated", "draft"]
    provenance: Provenance
    includesCt: bool
    score: Optional[float] = None


class GenerateReportRequest(BaseModel):
    patient: PatientInput
    prediction: Optional[PredictionResult] = None
    explanation: Optional[ExplainBundle] = None
    ct: Optional[CtAnalysisResult] = None


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    mode: Literal["live", "unavailable"]
    modelsLoaded: int
    datasetsLoaded: int
    shapAvailable: bool
    version: str
    message: str


class ErrorResponse(BaseModel):
    """User-safe error envelope. Raw tracebacks are never returned."""

    userMessage: str
    hint: str
