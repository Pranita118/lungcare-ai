import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  ApiMode,
  CtAnalysisResult,
  ExplainBundle,
  GenerateReportPayload,
  HealthResponse,
  PatientInput,
  PredictionResult,
  ReportRecord,
} from '@/types'
import { AppError } from '@/types'
import type { PredictStage } from '@/services/contract'
import { isConnectivityFailure, ml, registry } from '@/services'

const STATS_KEY = 'lungcare.session.v1'

interface SessionStats {
  assessments: number
  ctAnalyses: number
  reports: number
  lastPatient: PatientInput | null
}

const DEFAULT_STATS: SessionStats = {
  assessments: 0,
  ctAnalyses: 0,
  reports: 0,
  lastPatient: null,
}

function readStats(): SessionStats {
  try {
    const raw = window.localStorage.getItem(STATS_KEY)
    if (!raw) return DEFAULT_STATS
    return { ...DEFAULT_STATS, ...(JSON.parse(raw) as Partial<SessionStats>) }
  } catch {
    return DEFAULT_STATS
  }
}

function writeStats(stats: SessionStats) {
  try {
    window.localStorage.setItem(STATS_KEY, JSON.stringify(stats))
  } catch {
    /* ignore */
  }
}

export interface AnalysisOutcome {
  prediction: PredictionResult
  explanation: ExplainBundle
}

interface AppContextValue {
  mode: ApiMode
  health: HealthResponse | null
  isResolving: boolean
  /** True once the first connection check has finished (either outcome). */
  hasCompletedFirstCheck: boolean
  /** Re-probes the ML service. Used by the "Try again" button. */
  reconnect: () => Promise<boolean>
  isOnline: boolean

  prediction: PredictionResult | null
  explanation: ExplainBundle | null
  isAnalyzing: boolean
  analysisStage: PredictStage | null
  analysisError: AppError | null
  runAnalysis: (patient: PatientInput) => Promise<AnalysisOutcome | null>
  clearAnalysisError: () => void
  resetAnalysis: () => void

  /**
   * Loads the model-wide feature-importance block for the current prediction.
   * Research screens call this on demand; patient screens never do, because the
   * block is expensive and they have no use for it.
   */
  loadGlobalExplanation: () => Promise<void>
  isLoadingGlobal: boolean
  globalExplanationError: AppError | null

  ctResult: CtAnalysisResult | null
  isAnalyzingCt: boolean
  ctActiveStep: string | null
  ctError: AppError | null
  runCtAnalysis: (file: File) => Promise<CtAnalysisResult | null>
  clearCt: () => void

  reports: ReportRecord[]
  reportsError: AppError | null
  isLoadingReports: boolean
  refreshReports: () => void
  latestReport: ReportRecord | null
  generateReport: (payload: GenerateReportPayload) => Promise<ReportRecord | null>
  isGeneratingReport: boolean

  stats: SessionStats
  presentationMode: boolean
  setPresentationMode: (value: boolean) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ApiMode>('connecting')
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [isResolving, setIsResolving] = useState(true)
  const [hasCompletedFirstCheck, setHasCompletedFirstCheck] = useState(false)

  const [prediction, setPrediction] = useState<PredictionResult | null>(null)
  const [explanation, setExplanation] = useState<ExplainBundle | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisStage, setAnalysisStage] = useState<PredictStage | null>(null)
  const [analysisError, setAnalysisError] = useState<AppError | null>(null)

  const [ctResult, setCtResult] = useState<CtAnalysisResult | null>(null)
  const [isAnalyzingCt, setIsAnalyzingCt] = useState(false)
  const [ctActiveStep, setCtActiveStep] = useState<string | null>(null)
  const [ctError, setCtError] = useState<AppError | null>(null)

  const [reports, setReports] = useState<ReportRecord[]>([])
  const [reportsError, setReportsError] = useState<AppError | null>(null)
  const [isLoadingReports, setIsLoadingReports] = useState(true)
  const [latestReport, setLatestReport] = useState<ReportRecord | null>(null)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)

  const [stats, setStats] = useState<SessionStats>(() => readStats())
  const [presentationMode, setPresentationModeState] = useState(() => {
    try {
      return window.localStorage.getItem('lungcare.presentation') === 'true'
    } catch {
      return false
    }
  })

  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const updateStats = useCallback((patch: Partial<SessionStats>) => {
    setStats((current) => {
      const next = { ...current, ...patch }
      writeStats(next)
      return next
    })
  }, [])

  const handleFailure = useCallback((error: unknown, fallback: string) => {
    if (error instanceof AppError) return error
    return new AppError(fallback, { cause: error })
  }, [])

  /* ---------------------------------------------------------------- resolve */
  const checkConnection = useCallback(async (): Promise<boolean> => {
    setIsResolving(true)
    try {
      const service = await registry.resolve()
      if (registry.isOnline) {
        setMode('live')
        try {
          setHealth(await service.health())
        } catch {
          setHealth(null)
        }
        return true
      }
      setMode('offline')
      setHealth(null)
      return false
    } catch {
      setMode('offline')
      return false
    } finally {
      setIsResolving(false)
      setHasCompletedFirstCheck(true)
    }
  }, [])

  useEffect(() => {
    void checkConnection()
  }, [checkConnection])

  useEffect(() => registry.subscribe((next) => setMode(next)), [])

  /** Marks the service reachable after a successful call. */
  const noteOnline = useCallback(() => {
    if (mode !== 'live') {
      registry.markOnline()
      setMode('live')
    }
  }, [mode])

  /** Marks the service unreachable so the offline screen is shown. */
  const noteOffline = useCallback(() => {
    if (mode !== 'offline') {
      registry.markOffline()
      setMode('offline')
    }
  }, [mode])

  /* ------------------------------------------------- global feature importance */
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false)
  const [globalExplanationError, setGlobalExplanationError] = useState<AppError | null>(null)

  const loadGlobalExplanation = useCallback(async () => {
    const patient = stats.lastPatient
    if (!patient || !prediction) return
    setIsLoadingGlobal(true)
    setGlobalExplanationError(null)
    try {
      const bundle = await ml().explain(patient, prediction, { includeGlobal: true })
      if (mounted.current) setExplanation(bundle)
    } catch (error) {
      if (mounted.current) {
        setGlobalExplanationError(handleFailure(error, 'Unable to load feature importance.'))
      }
      if (isConnectivityFailure(error)) noteOffline()
    } finally {
      if (mounted.current) setIsLoadingGlobal(false)
    }
  }, [prediction, stats.lastPatient, noteOffline])

  /* -------------------------------------------------------------- analysis */
  const runAnalysis = useCallback(
    async (patient: PatientInput): Promise<AnalysisOutcome | null> => {
      setIsAnalyzing(true)
      setAnalysisError(null)
      setAnalysisStage('validating')
      setExplanation(null)
      try {
        const service = ml()
        const result = await service.predict(patient, (stage) => {
          if (mounted.current) setAnalysisStage(stage)
        })
        const localExplanation = await service.explain(patient, result)
        if (!mounted.current) return null
        setPrediction(result)
        setExplanation(localExplanation)
        updateStats({ assessments: stats.assessments + 1, lastPatient: patient })
        return { prediction: result, explanation: localExplanation }
      } catch (error) {
        const appError = handleFailure(error, 'Unable to complete the analysis.')
        if (mounted.current) setAnalysisError(appError)
        if (isConnectivityFailure(error)) noteOffline()
        return null
      } finally {
        if (mounted.current) {
          setIsAnalyzing(false)
          setAnalysisStage(null)
        }
      }
    },
    [handleFailure, stats.assessments, updateStats],
  )

  const resetAnalysis = useCallback(() => {
    setPrediction(null)
    setExplanation(null)
    setAnalysisError(null)
    setAnalysisStage(null)
  }, [])

  /* -------------------------------------------------------------------- CT */
  const runCtAnalysis = useCallback(
    async (file: File): Promise<CtAnalysisResult | null> => {
      setIsAnalyzingCt(true)
      setCtError(null)
      setCtActiveStep('load')
      try {
        const result = await ml().analyzeCt(file, (step) => {
          if (mounted.current) setCtActiveStep(step)
        })
        if (!mounted.current) return null
        setCtResult(result)
        noteOnline()
        updateStats({ ctAnalyses: stats.ctAnalyses + 1 })
        return result
      } catch (error) {
        const appError = handleFailure(error, 'Unable to process the image.')
        if (mounted.current) setCtError(appError)
        if (isConnectivityFailure(error)) noteOffline()
        return null
      } finally {
        if (mounted.current) {
          setIsAnalyzingCt(false)
          setCtActiveStep(null)
        }
      }
    },
    [handleFailure, stats.ctAnalyses, updateStats],
  )

  const clearCt = useCallback(() => {
    setCtResult(null)
    setCtError(null)
  }, [])

  /* --------------------------------------------------------------- reports */
  const refreshReports = useCallback(() => {
    setIsLoadingReports(true)
    ml()
      .getReports()
      .then((records) => {
        setReports(records)
        setReportsError(null)
      })
      .catch((error) => setReportsError(handleFailure(error, 'Unable to load reports.')))
      .finally(() => setIsLoadingReports(false))
  }, [handleFailure])

  useEffect(() => {
    if (isResolving) return
    refreshReports()
  }, [isResolving, refreshReports])

  const generateReport = useCallback(
    async (payload: GenerateReportPayload): Promise<ReportRecord | null> => {
      setIsGeneratingReport(true)
      try {
        const record = await ml().saveReport(payload)
        setLatestReport(record)
        setReports((current) => [record, ...current.filter((item) => item.id !== record.id)])
        updateStats({ reports: stats.reports + 1 })
        return record
      } catch (error) {
        setReportsError(handleFailure(error, 'Unable to generate the report.'))
        return null
      } finally {
        setIsGeneratingReport(false)
      }
    },
    [handleFailure, stats.reports, updateStats],
  )

  const setPresentationMode = useCallback((value: boolean) => {
    setPresentationModeState(value)
    try {
      window.localStorage.setItem('lungcare.presentation', String(value))
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo<AppContextValue>(
    () => ({
      mode,
      health,
      isResolving,
      hasCompletedFirstCheck,
      reconnect: checkConnection,
      isOnline: mode === 'live',
      prediction,
      explanation,
      isAnalyzing,
      analysisStage,
      analysisError,
      runAnalysis,
      clearAnalysisError: () => setAnalysisError(null),
      resetAnalysis,
      loadGlobalExplanation,
      isLoadingGlobal,
      globalExplanationError,
      ctResult,
      isAnalyzingCt,
      ctActiveStep,
      ctError,
      runCtAnalysis,
      clearCt,
      reports,
      reportsError,
      isLoadingReports,
      refreshReports,
      latestReport,
      generateReport,
      isGeneratingReport,
      stats,
      presentationMode,
      setPresentationMode,
    }),
    [
      mode,
      health,
      isResolving,
      hasCompletedFirstCheck,
      checkConnection,
      prediction,
      explanation,
      isAnalyzing,
      analysisStage,
      analysisError,
      runAnalysis,
      resetAnalysis,
      loadGlobalExplanation,
      isLoadingGlobal,
      globalExplanationError,
      ctResult,
      isAnalyzingCt,
      ctActiveStep,
      ctError,
      runCtAnalysis,
      clearCt,
      reports,
      reportsError,
      isLoadingReports,
      refreshReports,
      latestReport,
      generateReport,
      isGeneratingReport,
      stats,
      presentationMode,
      setPresentationMode,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used inside AppProvider')
  return context
}
