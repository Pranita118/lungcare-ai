/**
 * Patient-facing health data model.
 *
 * These types describe what a *person* records about themselves. They are
 * deliberately separate from the technical ML types: nothing here exposes model
 * internals, training information or evaluation metrics.
 */
import type { FeatureKey, PatientInput } from '@/types'

/* ------------------------------------------------------------------ profile */

/** How the person describes their smoking history, in their own words. */
export type SmokingStatus = 'never' | 'former' | 'current' | 'prefer-not-to-say'

/** Self-reported physical activity level, used for supportive guidance only. */
export type ActivityLevel = 'low' | 'moderate' | 'high'

/** Patient profile. `screening` is exactly the payload the ML API expects. */
export interface HealthProfile {
  displayName: string
  age: number | null
  gender: PatientInput['gender']
  smokingStatus: SmokingStatus
  packYears: number | null
  secondhandSmokeExposure: PatientInput['secondhandSmokeExposure']
  radonExposure: PatientInput['radonExposure']
  asbestosExposure: PatientInput['asbestosExposure']
  copdDiagnosis: PatientInput['copdDiagnosis']
  familyHistory: PatientInput['familyHistory']
  alcoholConsumption: PatientInput['alcoholConsumption']
  activityLevel: ActivityLevel
  /** Optional, used only to tailor supportive guidance. Never sent to the model. */
  sleepQuality: 'good' | 'fair' | 'poor'
  stressLevel: 'low' | 'moderate' | 'high'
  appetite: 'normal' | 'reduced'
  updatedAt: string | null
}

/**
 * Projects the profile onto the existing ML API payload.
 * The screening model receives exactly the same fields it always did.
 */
/**
 * Projects the patient profile onto the exact payload the ML service accepts.
 *
 * The model needs a number for every input, so pack-years defaults to 0 when
 * the person has never smoked or chose not to say — which is the clinically
 * correct value, not a placeholder. Sending `null` here would be rejected by
 * the service as an out-of-range pack-years value.
 */
export function toScreeningInput(profile: HealthProfile, patientId: string): PatientInput {
  return {
    patientId,
    age: profile.age,
    gender: profile.gender,
    packYears: profile.packYears ?? 0,
    radonExposure: profile.radonExposure,
    asbestosExposure: profile.asbestosExposure,
    secondhandSmokeExposure: profile.secondhandSmokeExposure,
    copdDiagnosis: profile.copdDiagnosis,
    alcoholConsumption: profile.alcoholConsumption,
    familyHistory: profile.familyHistory,
  }
}

export const EMPTY_PROFILE: HealthProfile = {
  displayName: '',
  age: null,
  gender: '',
  smokingStatus: 'prefer-not-to-say',
  packYears: null,
  secondhandSmokeExposure: '',
  radonExposure: '',
  asbestosExposure: '',
  copdDiagnosis: '',
  familyHistory: '',
  alcoholConsumption: '',
  activityLevel: 'moderate',
  sleepQuality: 'fair',
  stressLevel: 'moderate',
  appetite: 'normal',
  updatedAt: null,
}

/** Which of the nine model inputs the person has actually answered. */
export const REQUIRED_SCREENING_FIELDS = [
  'age',
  'gender',
  'packYears',
  'secondhandSmokeExposure',
  'radonExposure',
  'asbestosExposure',
  'copdDiagnosis',
  'familyHistory',
  'alcoholConsumption',
] as const

/* ----------------------------------------------------------------- symptoms */

export type SymptomSeverity = 'none' | 'mild' | 'moderate' | 'severe'

export type SymptomKey =
  | 'cough'
  | 'shortness_of_breath'
  | 'chest_discomfort'
  | 'fatigue'
  | 'appetite'
  | 'sleep'

export interface SymptomEntry {
  id: string
  recordedAt: string
  values: Record<SymptomKey, SymptomSeverity>
  notes: string
}

export const SYMPTOM_SEVERITIES: SymptomSeverity[] = ['none', 'mild', 'moderate', 'severe']

/* ------------------------------------------------------------ healthy steps */

export type StepCadence = 'daily' | 'weekly'

export interface HealthyStep {
  id: string
  title: string
  detail: string
  category: StepCategory
  cadence: StepCadence
  /** Personalised: only shown because it is relevant to this person. */
  personalised: boolean
}

export type StepCategory =
  | 'tobacco'
  | 'nutrition'
  | 'activity'
  | 'rest'
  | 'wellbeing'
  | 'appointments'
  | 'hydration'
  | 'routine'

/** One completed checklist item, keyed by local calendar day. */
export interface StepCompletion {
  /** ISO date (yyyy-mm-dd) in the browser's local time. */
  day: string
  stepIds: string[]
}

export const DAILY_STEP_IDS = [
  'avoid-tobacco-smoke',
  'follow-routine',
  'balanced-meal',
  'stay-hydrated',
  'safe-activity',
  'relax',
  'attend-appointments',
] as const

/* ---------------------------------------------------------------- my care */

export interface CareItem {
  id: string
  kind: 'appointment' | 'medication' | 'scan' | 'follow-up'
  title: string
  /** Date (yyyy-mm-dd) — optional for unscheduled reminders. */
  date: string | null
  /** 24h time (HH:mm) — optional. */
  time: string | null
  provider: string
  notes: string
  reminderOn: boolean
  createdAt: string
  completed: boolean
}

/* ------------------------------------------------------ doctor questions */

export interface DoctorQuestion {
  id: string
  text: string
  /** Why this question is relevant to this person. */
  reason: string
  discussed: boolean
  /** True when generated from the person's own information. */
  personalised: boolean
}

export interface DoctorQuestionSet {
  generatedAt: string
  questions: DoctorQuestion[]
}

export const CLINICIAN_QUESTIONS = [
  'What is my current lung health, and is it stable?',
  'How often should I be reviewed, and what should I watch for between visits?',
  'Which of my daily habits most affect my lung health?',
  'Are there any changes I should make to my routine?',
] as const

/* ------------------------------------------------------------------- misc */

export type SafetyLevel = 'routine' | 'discuss' | 'urgent'

export interface SafetyNote {
  level: SafetyLevel
  title: string
  message: string
}

export const AREA_PRIORITY_ORDER: FeatureKey[] = [
  'pack_years',
  'family_history',
  'copd_diagnosis',
  'radon_exposure',
  'asbestos_exposure',
  'secondhand_smoke_exposure',
]
