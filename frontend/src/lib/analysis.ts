import type { PredictStage } from '@/services/contract'

export interface AnalysisStageMeta {
  key: PredictStage
  label: string
  detail: string
}

/** Progress copy for a screening run against the live screening model. */
export const ANALYSIS_STAGES: AnalysisStageMeta[] = [
  {
    key: 'validating',
    label: 'Validating information',
    detail: 'Checking required fields and acceptable value ranges',
  },
  {
    key: 'preprocessing',
    label: 'Processing risk factors',
    detail: 'Encoding categorical inputs and scaling numeric features',
  },
  {
    key: 'model',
    label: 'Running the screening model',
    detail: 'Applying the trained classifier to your preprocessed information',
  },
  {
    key: 'explanation',
    label: 'Generating explanation',
    detail: 'Computing per-feature attributions for this prediction',
  },
]

export function stageIndex(stage: PredictStage | null): number {
  if (!stage) return -1
  const order: PredictStage[] = ['validating', 'preprocessing', 'model', 'explanation', 'done']
  return order.indexOf(stage)
}
