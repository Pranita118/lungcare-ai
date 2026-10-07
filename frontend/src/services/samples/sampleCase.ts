import type { PatientInput } from '@/types'

/**
 * Guided demonstration case.
 *
 * Clearly labelled sample data — used by the "Load sample case" action so the
 * full screening flow can be demonstrated in a few clicks. It is not a real
 * patient record.
 */
export const SAMPLE_PATIENT: PatientInput = {
  patientId: 'LC-DEMO-01',
  age: 67,
  gender: 'male',
  packYears: 45,
  radonExposure: 'moderate',
  asbestosExposure: 'high',
  secondhandSmokeExposure: 'low',
  copdDiagnosis: 'yes',
  alcoholConsumption: 'moderate',
  familyHistory: 'yes',
}

export const SAMPLE_PATIENT_NOTES = [
  'Sample case — synthetic demonstration data, not a real patient.',
  'Pack years 45, radon moderate, asbestos high, COPD yes, family history yes.',
]
