/**
 * Shared, restrained chart palette — medical blues and clinical teals only.
 *
 * Values are CSS custom properties so charts follow the light/dark theme.
 * Recharts writes these straight into SVG `fill`/`stroke`, which resolves
 * `var()` correctly in every modern browser.
 */
export const CHART = {
  medical: 'var(--chart-medical)',
  medicalSoft: 'var(--chart-medical-soft)',
  medicalPale: 'var(--chart-medical-pale)',
  teal: 'var(--chart-teal)',
  tealSoft: 'var(--chart-teal-soft)',
  tealPale: 'var(--chart-teal-pale)',
  success: 'var(--chart-success)',
  warning: 'var(--chart-warning)',
  danger: 'var(--chart-danger)',
  grid: 'var(--chart-grid)',
  axis: 'var(--chart-axis)',
  text: 'var(--chart-text)',
} as const

/** Ordered series colours for grouped comparisons (accuracy/precision/recall/F1). */
export const METRIC_SERIES = [
  { key: 'accuracy', label: 'Accuracy', color: CHART.medical },
  { key: 'precision', label: 'Precision', color: CHART.teal },
  { key: 'recall', label: 'Recall', color: CHART.medicalSoft },
  { key: 'f1', label: 'F1 score', color: CHART.tealSoft },
] as const

export type MetricKey = (typeof METRIC_SERIES)[number]['key']

export const AXIS_PROPS = {
  stroke: CHART.axis,
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const
