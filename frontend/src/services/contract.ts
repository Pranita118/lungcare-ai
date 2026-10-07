import type {
  CtAnalysisResult,
  DatasetInfo,
  DatasetInsightBundle,
  ExplainBundle,
  GenerateReportPayload,
  HealthResponse,
  ModelInfo,
  PatientInput,
  PredictionResult,
  ReportDocument,
  ReportReading,
  ReportRecord,
} from '@/types'

/** Stages reported while a prediction runs, so the UI can show honest progress. */
export type PredictStage = 'validating' | 'preprocessing' | 'model' | 'explanation' | 'done'

export type StageCallback = (stage: PredictStage) => void

/**
 * The only surface the UI is allowed to use.
 *
 * A single implementation exists: `LiveMLService`, which talks to the FastAPI
 * service and its trained model artifacts. There is no simulated engine.
 */
export interface MLService {
  readonly mode: 'live'
  health(): Promise<HealthResponse>
  predict(patient: PatientInput, onStage?: StageCallback): Promise<PredictionResult>
  /**
   * @param options.includeGlobal also return the model-wide feature-importance
   *   block. Expensive and model-scoped, so only the research screens ask for it.
   */
  explain(
    patient: PatientInput,
    prediction: PredictionResult,
    options?: { includeGlobal?: boolean },
  ): Promise<ExplainBundle>
  analyzeCt(file: File, onStep?: (stepKey: string) => void): Promise<CtAnalysisResult>
  /** Explains lung-related wording in an uploaded report, in plain language. */
  readReport(file: File): Promise<ReportReading>
  /** Same explanation, for text the person copies and pastes themselves. */
  readReportText(text: string): Promise<ReportReading>
  getModels(): Promise<ModelInfo[]>
  getDatasets(): Promise<DatasetInfo[]>
  getDatasetInsights(datasetId: string): Promise<DatasetInsightBundle>
  getReports(): Promise<ReportRecord[]>
  saveReport(payload: GenerateReportPayload): Promise<ReportRecord>
  getReport(id: string): Promise<ReportRecord | null>
  getReportDocument(id: string): Promise<ReportDocument | null>
}

/** REST surface exposed by the FastAPI backend. */
export const API_ENDPOINTS = {
  health: '/api/health',
  predict: '/api/predict',
  analyzeCt: '/api/analyze-ct',
  readReport: '/api/read-report',
  readReportText: '/api/read-report-text',
  models: '/api/models',
  datasets: '/api/datasets',
  explain: '/api/explain',
  report: '/api/report',
} as const
