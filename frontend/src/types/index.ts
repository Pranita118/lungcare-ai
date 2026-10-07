/**
 * LungCare AI — domain types.
 *
 * These types are the shared contract between the React UI, the service layer and
 * the FastAPI ML backend. The application is live-only: every result shown to a
 * person is produced by the served model artifacts.
 */

export type ApiMode = 'live' | 'connecting' | 'offline'

/** Where a number on screen came from. Never guess — always label the origin. */
export type Provenance = 'trained-model' | 'unavailable'

export type RiskLevel = 'low' | 'moderate' | 'high'

export type Gender = 'male' | 'female' | 'other'
export type YesNo = 'no' | 'yes'
export type ExposureLevel = 'none' | 'low' | 'moderate' | 'high'
export type AlcoholLevel = 'none' | 'low' | 'moderate' | 'high'

/** Canonical model feature keys. Kept stable so dataset adapters can map columns. */
export type FeatureKey =
  | 'age'
  | 'gender'
  | 'pack_years'
  | 'radon_exposure'
  | 'asbestos_exposure'
  | 'secondhand_smoke_exposure'
  | 'copd_diagnosis'
  | 'alcohol_consumption'
  | 'family_history'

export interface PatientInput {
  patientId: string
  age: number | null
  gender: Gender | ''
  packYears: number | null
  radonExposure: ExposureLevel | ''
  asbestosExposure: ExposureLevel | ''
  secondhandSmokeExposure: ExposureLevel | ''
  copdDiagnosis: YesNo | ''
  alcoholConsumption: AlcoholLevel | ''
  familyHistory: YesNo | ''
}

export interface ModelRef {
  id: string
  name: string
  family: string
}

export interface FactorContribution {
  feature: FeatureKey
  label: string
  /** Display value of the input, e.g. "35 pack-years" or "Yes". */
  displayValue: string
  /** Signed contribution towards predicted risk (log-odds or SHAP units). */
  contribution: number
  /** 0–100, length of the contribution bar. */
  magnitude: number
  direction: 'increases-risk' | 'decreases-risk' | 'neutral'
  /** Plain-language sentence for the clinician-facing UI. */
  sentence: string
}

export interface PredictionResult {
  id: string
  createdAt: string
  patient: PatientInput
  /** Probability-style score in [0, 1] as reported by the model. */
  riskScore: number
  riskLevel: RiskLevel
  riskCategoryLabel: string
  /** Model confidence in the class it reported, in [0, 1]. */
  confidence: number
  model: ModelRef
  /** Decision threshold used to band the score. */
  threshold: number
  /** Score of the complement class (max 1 - riskScore). */
  complementaryScore: number
  contributions: FactorContribution[]
  summary: string
  nextSteps: string[]
  provenance: Provenance
  /** Human readable statement of which engine produced this object. */
  engine: string
  processingMs: number
}

/* ------------------------------------------------------------- report reader */

export type ReportCategory =
  | 'imaging'
  | 'nodes'
  | 'staging'
  | 'pathology'
  | 'biomarker'
  | 'follow-up'
  | 'reassuring'

export interface ReportFinding {
  key: string
  category: ReportCategory
  categoryTitle: string
  title: string
  /** Short verbatim window from the document, so the term can be located. */
  matched: string
  /** What the term generally means. Never what it means for one person. */
  meaning: string
  why: string
  question: string
  /** True when the document describes the finding as *not* present. */
  negated: boolean
  measurement: string | null
}

export interface ReportReading {
  id: string
  createdAt: string
  documentKind: string
  fileName: string
  characterCount: number
  findings: ReportFinding[]
  categories: ReportCategory[]
  followUp: string[]
  notes: string[]
  questions: string[]
  readable: boolean
  engine: string
  processingMs: number
  disclaimer: string
}

export interface ShapLocalPoint {
  feature: FeatureKey
  label: string
  displayValue: string
  shapValue: number
  direction: 'increases-risk' | 'decreases-risk'
  sentence: string
}

export interface ShapGlobalPoint {
  feature: FeatureKey
  label: string
  /** mean(|SHAP value|) across the evaluation dataset, model units. */
  meanAbsShap: number
  /** share of total attribution, 0–100. */
  share: number
  direction: 'risk' | 'protective'
}

export interface BeeswarmRow {
  feature: FeatureKey
  label: string
  /** Sample-level SHAP values for the global summary plot. */
  points: { shap: number; value: number }[]
}

export interface ExplainBundle {
  provenance: Provenance
  /** Expected model output (log-odds) before feature effects. */
  baseValue: number
  /** Model output after adding all local contributions. */
  predictionValue: number
  method: string
  global: ShapGlobalPoint[]
  local: ShapLocalPoint[]
  beeswarm: BeeswarmRow[]
  summary: string
  engine: string
}

export type PipelineStepStatus = 'pending' | 'running' | 'done' | 'skipped'

export interface PipelineStep {
  key: string
  label: string
  detail: string
  status: PipelineStepStatus
  durationMs?: number
}

export interface RoiRegion {
  id: number
  x: number
  y: number
  width: number
  height: number
  areaPx: number
  /** share of the image area, 0–100 */
  areaPct: number
  /** mean grayscale intensity inside the region, 0–255 */
  meanIntensity: number
}

export interface HistogramBin {
  bin: number
  count: number
}

export interface CtImageSet {
  original: string
  grayscale: string
  denoised: string
  segmented: string
  overlay: string
}

export interface CtAnalysisResult {
  id: string
  createdAt: string
  fileName: string
  fileSizeBytes: number
  width: number
  height: number
  /** DICOM is only supported once a backend parser is connected. */
  format: 'png' | 'jpeg' | 'dicom' | 'unknown'
  steps: PipelineStep[]
  histogram: HistogramBin[]
  otsuThreshold: number
  clusterCount: number
  clusterCenters: number[]
  regions: RoiRegion[]
  roiPixelShare: number
  processingMethod: string
  segmentationMethod: string
  engine: 'client' | 'server'
  provenance: Provenance
  processingMs: number
  images: CtImageSet
  notes: string[]
}

export type ModelStatus = 'trained' | 'awaiting'

export interface ModelMetrics {
  accuracy: number | null
  precision: number | null
  recall: number | null
  f1: number | null
  rocAuc?: number | null
}

export interface ConfusionMatrix {
  trueNegative: number
  falsePositive: number
  falseNegative: number
  truePositive: number
}

export interface ModelInfo {
  id: string
  name: string
  family: string
  purpose: string
  status: ModelStatus
  isPrimary: boolean
  metrics: ModelMetrics | null
  confusionMatrix: ConfusionMatrix | null
  trainedOn: string | null
  featureCount: number | null
  provenance: Provenance
  notes: string
}

export interface DatasetInfo {
  id: string
  name: string
  description: string
  source: string | null
  records: number | null
  features: number | null
  target: string | null
  missingValues: number | null
  duplicates: number | null
  classDistribution: { label: string; count: number | null; share: number | null }[]
  ageSummary: {
    min: number | null
    max: number | null
    mean: number | null
    median: number | null
  } | null
  provenance: Provenance
  columns: string[] | null
}

export interface DatasetInsightBundle {
  datasetId: string
  provenance: Provenance
  ageHistogram: { bin: string; count: number | null }[]
  genderDistribution: { label: string; count: number | null }[]
  classDistribution: { label: string; count: number | null }[]
  riskFactorPresence: { feature: FeatureKey; label: string; present: number | null }[]
  packYearsBands: { label: string; count: number | null }[]
  scatter: { points: { age: number; packYears: number; target: 0 | 1 }[]; sampled: boolean }
}

export type ReportStatus = 'generated' | 'draft'
export type AnalysisType = 'Risk assessment' | 'CT segmentation' | 'Combined screening'

export interface ReportRecord {
  id: string
  createdAt: string
  patientId: string
  patientLabel: string
  analysisType: AnalysisType
  resultLabel: string
  riskLevel: RiskLevel
  modelName: string
  status: ReportStatus
  provenance: Provenance
  includesCt: boolean
  score: number | null
}

export interface GenerateReportPayload {
  patient: PatientInput
  prediction: PredictionResult | null
  explanation: ExplainBundle | null
  ct: CtAnalysisResult | null
}

/** A stored report: its table entry plus everything needed to render the document. */
export interface ReportDocument {
  record: ReportRecord
  payload: GenerateReportPayload
}

export interface HealthResponse {
  status: 'ok' | 'degraded'
  mode: ApiMode
  modelsLoaded: number
  datasetsLoaded: number
  shapAvailable: boolean
  version: string
  message: string
}

/** Structured, user-safe error used across the UI. Raw backend errors never surface. */
export class AppError extends Error {
  readonly userMessage: string
  readonly hint: string
  readonly retryable: boolean
  readonly cause?: unknown

  constructor(
    userMessage: string,
    options: { hint?: string; retryable?: boolean; cause?: unknown } = {},
  ) {
    super(userMessage)
    this.name = 'AppError'
    this.userMessage = userMessage
    this.hint = options.hint ?? 'Please verify the input information and try again.'
    this.retryable = options.retryable ?? true
    this.cause = options.cause
  }
}
