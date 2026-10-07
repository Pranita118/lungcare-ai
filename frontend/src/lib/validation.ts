import type { PatientInput } from '@/types'
import { FEATURES } from './clinical'

export type PatientFieldErrors = Partial<Record<keyof PatientInput, string>>

const ID_PATTERN = /^[A-Za-z0-9_-]{2,24}$/

/** Field-level validation. Runs on every change so errors appear before submission. */
export function validatePatient(patient: PatientInput): PatientFieldErrors {
  const errors: PatientFieldErrors = {}

  if (patient.patientId && !ID_PATTERN.test(patient.patientId)) {
    errors.patientId = 'Use 2–24 letters, numbers, hyphens or underscores.'
  }

  if (patient.age === null) {
    errors.age = 'Please enter the patient age.'
  } else if (patient.age < FEATURES.age.range!.min || patient.age > FEATURES.age.range!.max) {
    errors.age = `Age must be between ${FEATURES.age.range!.min} and ${FEATURES.age.range!.max} years.`
  }

  if (patient.packYears === null) {
    errors.packYears = 'Please enter the pack years value.'
  } else if (patient.packYears < 0 || patient.packYears > FEATURES.pack_years.range!.max) {
    errors.packYears = `Pack years must be between 0 and ${FEATURES.pack_years.range!.max}.`
  }

  if (!patient.gender) errors.gender = 'Please select a gender.'

  if (!patient.radonExposure) errors.radonExposure = 'Please select a radon exposure level.'
  if (!patient.asbestosExposure)
    errors.asbestosExposure = 'Please select an asbestos exposure level.'
  if (!patient.secondhandSmokeExposure)
    errors.secondhandSmokeExposure = 'Please select a secondhand smoke level.'
  if (!patient.alcoholConsumption)
    errors.alcoholConsumption = 'Please select an alcohol consumption level.'
  if (!patient.copdDiagnosis) errors.copdDiagnosis = 'Please indicate the COPD history.'
  if (!patient.familyHistory) errors.familyHistory = 'Please indicate the family history.'

  return errors
}

export function hasErrors(errors: PatientFieldErrors): boolean {
  return Object.keys(errors).length > 0
}

export function firstError(errors: PatientFieldErrors): string | null {
  const entry = Object.entries(errors)[0]
  return entry ? `${FEATURE_ERROR_LABEL[entry[0] as string] ?? 'Field'}: ${entry[1]}` : null
}

const FEATURE_ERROR_LABEL: Record<string, string> = {
  patientId: 'Patient ID',
  age: 'Age',
  gender: 'Gender',
  packYears: 'Pack years',
  radonExposure: 'Radon exposure',
  asbestosExposure: 'Asbestos exposure',
  secondhandSmokeExposure: 'Secondhand smoke',
  alcoholConsumption: 'Alcohol consumption',
  copdDiagnosis: 'COPD diagnosis',
  familyHistory: 'Family history',
}
