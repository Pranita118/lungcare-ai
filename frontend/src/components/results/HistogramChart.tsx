import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartFrame, ChartTooltip } from '@/components/charts/ChartFrame'
import { AXIS_PROPS, CHART } from '@/components/charts/chartTheme'
import { formatInt } from '@/lib/format'
import type { HistogramBin, Provenance } from '@/types'

/** 256-bin greyscale histogram with the automatic Otsu threshold marked. */
export function HistogramChart({
  data,
  threshold,
  title,
  description,
  provenance,
}: {
  data: HistogramBin[]
  threshold: number
  title: string
  description: string
  provenance: Provenance
}) {
  const peak = data.reduce((max, entry) => Math.max(max, entry.count), 0)
  const aboveThreshold = data
    .filter((entry) => entry.bin > threshold)
    .reduce((sum, entry) => sum + entry.count, 0)
  const total = data.reduce((sum, entry) => sum + entry.count, 0)

  return (
    <ChartFrame
      title={title}
      description={description}
      provenance={provenance}
      descriptionText={`Greyscale intensity histogram with ${peak} pixels in the most common intensity level. The automatic Otsu threshold is ${threshold}.`}
      bodyClassName="pb-2"
    >
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} barCategoryGap={0}>
            <defs>
              <linearGradient id="histogramFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART.medical} stopOpacity={0.85} />
                <stop offset="100%" stopColor={CHART.medicalPale} stopOpacity={0.55} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="bin" {...AXIS_PROPS} interval={63} tickFormatter={(value) => String(value)} />
            <YAxis {...AXIS_PROPS} width={44} tickFormatter={(value: number) => formatInt(value)} />
            <ReferenceLine
              x={threshold}
              stroke={CHART.teal}
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{
                value: `Otsu t=${threshold}`,
                position: 'top',
                fill: CHART.teal,
                fontSize: 10,
                fontWeight: 600,
              }}
            />
            <Tooltip
              cursor={{ fill: 'rgba(11,92,173,0.05)' }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <ChartTooltip
                    label={`Intensity ${label}`}
                    rows={[
                      {
                        key: 'count',
                        label: 'Pixels',
                        value: formatInt(payload[0].value as number),
                        color: CHART.medical,
                      },
                    ]}
                  />
                ) : null
              }
            />
            <Bar dataKey="count" fill="url(#histogramFill)" isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-3 border-t border-hairline pt-3">
        <div>
          <dt className="text-2xs uppercase tracking-wide text-ink-muted">Peak level</dt>
          <dd className="text-[0.82rem] font-semibold tabular text-ink">{formatInt(peak)} px</dd>
        </div>
        <div>
          <dt className="text-2xs uppercase tracking-wide text-ink-muted">Above threshold</dt>
          <dd className="text-[0.82rem] font-semibold tabular text-ink">
            {total > 0 ? `${((aboveThreshold / total) * 100).toFixed(1)}%` : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-2xs uppercase tracking-wide text-ink-muted">Bins</dt>
          <dd className="text-[0.82rem] font-semibold tabular text-ink">{data.length}</dd>
        </div>
      </dl>
    </ChartFrame>
  )
}
