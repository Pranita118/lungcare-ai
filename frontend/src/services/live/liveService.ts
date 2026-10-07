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
import { AppError } from '@/types'
import { API_ENDPOINTS, type MLService, type StageCallback } from '@/services/contract'
import { request } from '@/services/http'
import { runClientCtPipeline } from '@/services/ct/clientPipeline'

/**
 * Live client for the FastAPI ML service.
 *
 * The React tree is unaware of this class — it only ever talks to `MLService`.
 * Point `VITE_API_BASE_URL` (or the Vite proxy) at the backend and the same
 * interface starts serving trained artifacts.
 */
export class LiveMLService implements MLService {
  readonly mode = 'live' as const

  health(): Promise<HealthResponse> {
    return request<HealthResponse>(API_ENDPOINTS.health, { timeoutMs: 4000 })
  }

  predict(patient: PatientInput, onStage?: StageCallback): Promise<PredictionResult> {
    onStage?.('validating')
    return request<PredictionResult>(API_ENDPOINTS.predict, {
      method: 'POST',
      body: patient,
    }).then((result) => {
      onStage?.('done')
      return result
    })
  }

  /**
   * Local SHAP attribution for one patient.
   *
   * The model-wide feature-importance block is omitted by default: it is far more
   * expensive to compute, identical for every patient, and only the research
   * screens display it. Research screens pass `{ includeGlobal: true }`.
   */
  explain(
    patient: PatientInput,
    _prediction: PredictionResult,
    options?: { includeGlobal?: boolean },
  ): Promise<ExplainBundle> {
    const query = options?.includeGlobal ? '?includeGlobal=true' : '?includeGlobal=false'
    return request<ExplainBundle>(`${API_ENDPOINTS.explain}${query}`, {
      method: 'POST',
      body: patient,
    })
  }

  /**
   * Image processing runs on the server. If the server has no image endpoint
   * configured, the deterministic browser pipeline is used instead and the result
   * is marked with `engine: 'client'` so the interface can say which ran.
   *
   * Both paths are genuine image processing; neither performs detection.
   */
  async analyzeCt(file: File, onStep?: (stepKey: string) => void): Promise<CtAnalysisResult> {
    const form = new FormData()
    form.append('file', file)
    onStep?.('load')
    try {
      const result = await request<CtAnalysisResult>(API_ENDPOINTS.analyzeCt, {
        method: 'POST',
        body: form,
        isForm: true,
      })
      onStep?.('roi')
      return result
    } catch (error) {
      const isMissingEndpoint =
        error instanceof AppError && /unsupported|not found|unavailable/i.test(error.userMessage)
      if (!isMissingEndpoint) throw error
      return runClientCtPipeline(file, { onStep })
    }
  }

  /**
   * Explains lung-related wording in an uploaded report.
   *
   * The document is sent to the service, which turns it into text and matches
   * it against a curated vocabulary. No external AI service is involved.
   */
  readReport(file: File): Promise<ReportReading> {
    const form = new FormData()
    form.append('file', file)
    return request<ReportReading>(API_ENDPOINTS.readReport, {
      method: 'POST',
      body: form,
      isForm: true,
    })
  }

  /** Same explanation, for text the person copies and pastes themselves. */
  readReportText(text: string): Promise<ReportReading> {
    return request<ReportReading>(API_ENDPOINTS.readReportText, {
      method: 'POST',
      body: { text },
    })
  }

  getModels(): Promise<ModelInfo[]> {
    return request<ModelInfo[]>(API_ENDPOINTS.models)
  }

  getDatasets(): Promise<DatasetInfo[]> {
    return request<DatasetInfo[]>(API_ENDPOINTS.datasets)
  }

  getDatasetInsights(datasetId: string): Promise<DatasetInsightBundle> {
    return request<DatasetInsightBundle>(`${API_ENDPOINTS.datasets}/${datasetId}/insights`)
  }

  getReports(): Promise<ReportRecord[]> {
    return request<ReportRecord[]>(API_ENDPOINTS.report)
  }

  saveReport(payload: GenerateReportPayload): Promise<ReportRecord> {
    return request<ReportRecord>(API_ENDPOINTS.report, { method: 'POST', body: payload })
  }

  async getReport(id: string): Promise<ReportRecord | null> {
    try {
      return await request<ReportRecord>(`${API_ENDPOINTS.report}/${id}`)
    } catch (error) {
      if (error instanceof AppError && !error.retryable) return null
      throw error
    }
  }

  async getReportDocument(id: string): Promise<ReportDocument | null> {
    try {
      return await request<ReportDocument>(`${API_ENDPOINTS.report}/${id}/document`)
    } catch (error) {
      if (error instanceof AppError && !error.retryable) return null
      throw error
    }
  }
}
