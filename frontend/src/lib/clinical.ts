import type { FeatureKey, RiskLevel } from '@/types'

/**
 * Clinical metadata for every model feature. Single source of truth for labels,
 * helper text, units and the plain-language wording used by the explainability UI.
 */
export interface FeatureMeta {
  key: FeatureKey
  label: string
  shortLabel: string
  description: string
  helper: string
  unit?: string
  group: 'demographic' | 'exposure' | 'clinical' | 'behavioural' | 'history'
  /** Typical range shown in the form for validation and sliders. */
  range?: { min: number; max: number }
}

export const FEATURES: Record<FeatureKey, FeatureMeta> = {
  age: {
    key: 'age',
    label: 'Age',
    shortLabel: 'Age',
    description: 'Patient age in years at assessment.',
    helper: 'Enter an age between 18 and 100 years.',
    unit: 'years',
    group: 'demographic',
    range: { min: 18, max: 100 },
  },
  gender: {
    key: 'gender',
    label: 'Gender',
    shortLabel: 'Gender',
    description: 'Self-reported gender used as a model input.',
    helper: 'Gender is recorded as a categorical model input.',
    group: 'demographic',
  },
  pack_years: {
    key: 'pack_years',
    label: 'Pack Years',
    shortLabel: 'Pack years',
    description: 'Cumulative tobacco exposure expressed in pack-years.',
    helper: 'Estimated number of cigarette-pack years (packs per day × years smoked).',
    unit: 'pack-years',
    group: 'exposure',
    range: { min: 0, max: 120 },
  },
  radon_exposure: {
    key: 'radon_exposure',
    label: 'Radon Exposure',
    shortLabel: 'Radon',
    description: 'Lifetime residential exposure to radon gas.',
    helper: 'Radon is the second leading cause of lung cancer after smoking.',
    group: 'exposure',
  },
  asbestos_exposure: {
    key: 'asbestos_exposure',
    label: 'Asbestos Exposure',
    shortLabel: 'Asbestos',
    description: 'Occupational or environmental asbestos contact.',
    helper: 'Asbestos exposure is a recognised occupational lung cancer risk factor.',
    group: 'exposure',
  },
  secondhand_smoke_exposure: {
    key: 'secondhand_smoke_exposure',
    label: 'Secondhand Smoke Exposure',
    shortLabel: 'Secondhand smoke',
    description: 'Exposure to environmental tobacco smoke.',
    helper: 'Records regular exposure to smoke from other people.',
    group: 'exposure',
  },
  copd_diagnosis: {
    key: 'copd_diagnosis',
    label: 'COPD Diagnosis',
    shortLabel: 'COPD',
    description: 'History of chronic obstructive pulmonary disease.',
    helper: 'COPD is a chronic lung condition frequently co-occurring with lung cancer.',
    group: 'clinical',
  },
  alcohol_consumption: {
    key: 'alcohol_consumption',
    label: 'Alcohol Consumption',
    shortLabel: 'Alcohol',
    description: 'Regular alcohol intake pattern.',
    helper: 'Recorded as a consumption category, not a clinical diagnosis.',
    group: 'behavioural',
  },
  family_history: {
    key: 'family_history',
    label: 'Family History',
    shortLabel: 'Family history',
    description: 'First-degree relative with lung cancer.',
    helper: 'Records a first-degree relative diagnosed with lung cancer.',
    group: 'history',
  },
}

export const FEATURE_ORDER: FeatureKey[] = [
  'pack_years',
  'family_history',
  'copd_diagnosis',
  'age',
  'asbestos_exposure',
  'radon_exposure',
  'secondhand_smoke_exposure',
  'alcohol_consumption',
  'gender',
]

/** Human wording for categorical inputs inside explanations. */
export const LEVEL_WORDS: Record<string, string> = {
  none: 'None',
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  no: 'No',
  yes: 'Yes',
  male: 'Male',
  female: 'Female',
  other: 'Other',
}

export const RISK_META: Record<
  RiskLevel,
  { label: string; short: string; color: string; softBg: string; softText: string; ring: string; dot: string; bar: string }
> = {
  low: {
    label: 'Low Predicted Risk',
    short: 'Low',
    color: 'text-success',
    softBg: 'bg-success/10',
    softText: 'text-success-ink',
    ring: 'ring-success/25',
    dot: 'bg-success',
    bar: 'bg-success',
  },
  moderate: {
    label: 'Moderate Predicted Risk',
    short: 'Moderate',
    color: 'text-warning-ink',
    softBg: 'bg-warning/12',
    softText: 'text-warning-ink',
    ring: 'ring-warning/30',
    dot: 'bg-warning',
    bar: 'bg-warning',
  },
  high: {
    label: 'Elevated Predicted Risk',
    short: 'Elevated',
    color: 'text-danger-ink',
    softBg: 'bg-danger/10',
    softText: 'text-danger-ink',
    ring: 'ring-danger/25',
    dot: 'bg-danger',
    bar: 'bg-danger',
  },
}

export const APP = {
  name: 'LungCare AI',
  subtitle: 'AI-Powered Lung Cancer Screening & Explainable Healthcare Decision Support',
  shortSubtitle: 'AI Healthcare Platform',
  footer: 'Educational & Research Prototype | Not a Medical Diagnostic Tool',
  disclaimer:
    'This AI system is intended for educational and research purposes and does not provide a medical diagnosis. Clinical decisions should always be made by qualified healthcare professionals.',
  disclaimerStrong:
    'Important: LungCare AI is an educational and research prototype. AI-generated results are not medical diagnoses and should not replace evaluation by a qualified healthcare professional.',
  segmentationDisclaimer:
    'Image segmentation highlights regions of interest in the CT slice. Segmentation is image processing only and is not equivalent to, or a substitute for, validated tumour detection.',
} as const

export const SCREENING_WORKFLOW = [
  { key: 'data', label: 'Patient Data', description: 'Risk factor capture' },
  { key: 'preprocessing', label: 'Preprocessing', description: 'Encoding & scaling' },
  { key: 'model', label: 'ML Model', description: 'Trained classifier' },
  { key: 'prediction', label: 'Prediction', description: 'Screening score' },
  { key: 'xai', label: 'Explainable AI', description: 'SHAP attribution' },
  { key: 'report', label: 'AI Report', description: 'Summary document' },
] as const

export const CT_PIPELINE = [
  { key: 'load', label: 'Image loading', detail: 'Decode and normalise the uploaded slice' },
  { key: 'grayscale', label: 'Grayscale conversion', detail: 'Luminance-weighted intensity projection' },
  { key: 'denoise', label: 'Noise reduction', detail: '3×3 median filter for speckle suppression' },
  { key: 'histogram', label: 'Histogram analysis', detail: '256-bin intensity distribution' },
  { key: 'threshold', label: 'Otsu thresholding', detail: 'Automatic between-class threshold selection' },
  { key: 'segmentation', label: 'K-Means segmentation', detail: 'Intensity clustering of the parenchyma' },
  { key: 'roi', label: 'Region of interest', detail: 'Connected-component contour extraction' },
] as const
