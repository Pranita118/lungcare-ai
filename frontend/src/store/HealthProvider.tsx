import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  CareItem,
  DoctorQuestion,
  HealthProfile,
  StepCompletion,
  SymptomEntry,
} from '@/types/health'
import { EMPTY_PROFILE } from '@/types/health'
import type { ReportReading } from '@/types'
import { createId } from '@/lib/id'

/**
 * Central patient data layer.
 *
 * Every patient-facing page reads from this single store, so a change made
 * during onboarding is reflected in the result, the healthy steps, the doctor
 * questions and the health report. Nothing on two pages can disagree.
 *
 * Data lives only in this browser. No patient information is transmitted
 * anywhere except the screening inputs sent to the ML service.
 */

const STORAGE_KEY = 'lungcare.patient.v1'

export interface HealthState {
  profile: HealthProfile
  /** True once the person has completed onboarding and a screening run exists. */
  onboarded: boolean
  symptoms: SymptomEntry[]
  completions: StepCompletion[]
  careItems: CareItem[]
  questions: DoctorQuestion[]
  /** A custom question the person added themselves. */
  customQuestions: DoctorQuestion[]
  /** The most recent report the person asked to be explained, if any. */
  lastReading: ReportReading | null
}

const DEFAULT_STATE: HealthState = {
  profile: EMPTY_PROFILE,
  onboarded: false,
  symptoms: [],
  completions: [],
  careItems: [],
  questions: [],
  customQuestions: [],
  lastReading: null,
}

export function todayKey(): string {
  const now = new Date()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function read(): HealthState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw) as Partial<HealthState>
    return {
      ...DEFAULT_STATE,
      ...parsed,
      profile: { ...EMPTY_PROFILE, ...(parsed.profile ?? {}) },
    }
  } catch {
    return DEFAULT_STATE
  }
}

export interface HealthContextValue extends HealthState {
  saveProfile: (profile: HealthProfile) => void
  markOnboarded: () => void
  resetProfile: () => void

  addSymptomEntry: (entry: Omit<SymptomEntry, 'id' | 'recordedAt'>) => SymptomEntry
  removeSymptomEntry: (id: string) => void
  latestSymptoms: SymptomEntry | null

  toggleStep: (stepId: string, day?: string) => void
  stepsDoneToday: number
  isStepDone: (stepId: string, day?: string) => boolean

  addCareItem: (item: Omit<CareItem, 'id' | 'createdAt'>) => CareItem
  updateCareItem: (id: string, patch: Partial<CareItem>) => void
  removeCareItem: (id: string) => void
  toggleCareItem: (id: string) => void
  upcomingCareItems: CareItem[]
  nextAppointment: CareItem | null

  setQuestions: (
    questions: DoctorQuestion[] | ((current: DoctorQuestion[]) => DoctorQuestion[]),
  ) => void
  toggleQuestionDiscussed: (id: string) => void
  addCustomQuestion: (text: string) => void
  removeCustomQuestion: (id: string) => void
  allQuestions: DoctorQuestion[]

  /** Remembers a report so the doctor-questions page can use its findings. */
  setLastReading: (reading: ReportReading | null) => void

  clearAll: () => void
}

const HealthContext = createContext<HealthContextValue | null>(null)

export function HealthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HealthState>(() => read())

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage may be full or blocked */
    }
  }, [state])

  const patch = useCallback((update: Partial<HealthState>) => {
    setState((current) => ({ ...current, ...update }))
  }, [])

  const saveProfile = useCallback(
    (profile: HealthProfile) => {
      setState((current) => ({
        ...current,
        profile: { ...profile, updatedAt: new Date().toISOString() },
      }))
    },
    [],
  )

  const markOnboarded = useCallback(() => patch({ onboarded: true }), [patch])

  const resetProfile = useCallback(() => {
    setState((current) => ({ ...current, profile: EMPTY_PROFILE, onboarded: false, questions: [] }))
  }, [])

  const addSymptomEntry = useCallback((entry: Omit<SymptomEntry, 'id' | 'recordedAt'>) => {
    const record: SymptomEntry = { ...entry, id: createId('SYM'), recordedAt: new Date().toISOString() }
    setState((current) => ({ ...current, symptoms: [record, ...current.symptoms].slice(0, 60) }))
    return record
  }, [])

  const removeSymptomEntry = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      symptoms: current.symptoms.filter((entry) => entry.id !== id),
    }))
  }, [])

  const toggleStep = useCallback((stepId: string, day?: string) => {
    const key = day ?? todayKey()
    setState((current) => {
      const existing = current.completions.find((entry) => entry.day === key)
      const withoutDay = current.completions.filter((entry) => entry.day !== key)
      if (!existing) return { ...current, completions: [...withoutDay, { day: key, stepIds: [stepId] }] }
      const isDone = existing.stepIds.includes(stepId)
      const stepIds = isDone
        ? existing.stepIds.filter((id) => id !== stepId)
        : [...existing.stepIds, stepId]
      const next = stepIds.length > 0 ? [{ day: key, stepIds }] : []
      return { ...current, completions: [...withoutDay, ...next] }
    })
  }, [])

  const stepsDoneToday = useMemo(() => {
    const today = state.completions.find((entry) => entry.day === todayKey())
    return today?.stepIds.length ?? 0
  }, [state.completions])

  const isStepDone = useCallback(
    (stepId: string, day?: string) => {
      const key = day ?? todayKey()
      return state.completions.find((entry) => entry.day === key)?.stepIds.includes(stepId) ?? false
    },
    [state.completions],
  )

  const addCareItem = useCallback((item: Omit<CareItem, 'id' | 'createdAt'>) => {
    const record: CareItem = { ...item, id: createId('CARE'), createdAt: new Date().toISOString() }
    setState((current) => ({ ...current, careItems: [record, ...current.careItems] }))
    return record
  }, [])

  const updateCareItem = useCallback((id: string, update: Partial<CareItem>) => {
    setState((current) => ({
      ...current,
      careItems: current.careItems.map((item) => (item.id === id ? { ...item, ...update } : item)),
    }))
  }, [])

  const removeCareItem = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      careItems: current.careItems.filter((item) => item.id !== id),
    }))
  }, [])

  const toggleCareItem = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      careItems: current.careItems.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item,
      ),
    }))
  }, [])

  const upcomingCareItems = useMemo(() => {
    return [...state.careItems].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      const left = a.date ?? '9999-12-31'
      const right = b.date ?? '9999-12-31'
      if (left !== right) return left.localeCompare(right)
      return (a.time ?? '99:99').localeCompare(b.time ?? '99:99')
    })
  }, [state.careItems])

  const nextAppointment = useMemo(() => {
    const today = todayKey()
    return (
      upcomingCareItems.find(
        (item) => !item.completed && (item.kind === 'appointment' || item.kind === 'scan') && (item.date ?? '9999') >= today,
      ) ?? null
    )
  }, [upcomingCareItems])

  const setQuestions = useCallback(
    (questions: DoctorQuestion[] | ((current: DoctorQuestion[]) => DoctorQuestion[])) => {
      setState((current) => ({
        ...current,
        questions:
          typeof questions === 'function' ? questions(current.questions) : questions,
      }))
    },
    [],
  )

  const allQuestions = useMemo(
    () => [...state.questions, ...state.customQuestions],
    [state.questions, state.customQuestions],
  )

  const setLastReading = useCallback((reading: ReportReading | null) => {
    setState((current) => ({ ...current, lastReading: reading }))
  }, [])

  const toggleQuestionDiscussed = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      questions: current.questions.map((item) =>
        item.id === id ? { ...item, discussed: !item.discussed } : item,
      ),
      customQuestions: current.customQuestions.map((item) =>
        item.id === id ? { ...item, discussed: !item.discussed } : item,
      ),
    }))
  }, [])

  const addCustomQuestion = useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setState((current) => ({
      ...current,
      customQuestions: [
        { id: createId('Q'), text: trimmed, reason: 'Added by you.', discussed: false, personalised: false },
        ...current.customQuestions,
      ],
    }))
  }, [])

  const removeCustomQuestion = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      customQuestions: current.customQuestions.filter((item) => item.id !== id),
    }))
  }, [])

  const clearAll = useCallback(() => {
    setState(DEFAULT_STATE)
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo<HealthContextValue>(
    () => ({
      ...state,
      saveProfile,
      markOnboarded,
      resetProfile,
      addSymptomEntry,
      removeSymptomEntry,
      latestSymptoms: state.symptoms[0] ?? null,
      toggleStep,
      stepsDoneToday,
      isStepDone,
      addCareItem,
      updateCareItem,
      removeCareItem,
      toggleCareItem,
      upcomingCareItems,
      nextAppointment,
      setQuestions,
      toggleQuestionDiscussed,
      addCustomQuestion,
      removeCustomQuestion,
      allQuestions,
      setLastReading,
      clearAll,
    }),
    [
      state,
      saveProfile,
      markOnboarded,
      resetProfile,
      addSymptomEntry,
      removeSymptomEntry,
      toggleStep,
      stepsDoneToday,
      isStepDone,
      addCareItem,
      updateCareItem,
      removeCareItem,
      toggleCareItem,
      upcomingCareItems,
      nextAppointment,
      setQuestions,
      toggleQuestionDiscussed,
      addCustomQuestion,
      removeCustomQuestion,
      allQuestions,
      setLastReading,
      clearAll,
    ],
  )

  return <HealthContext.Provider value={value}>{children}</HealthContext.Provider>
}

export function useHealth(): HealthContextValue {
  const context = useContext(HealthContext)
  if (!context) throw new Error('useHealth must be used inside HealthProvider')
  return context
}
