import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { Database, Info, ScanLine, UploadCloud } from 'lucide-react'
import { PageHeader, SectionTitle, KeyValue } from '@/components/medical/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ProvenanceChip } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Spinner'
import { EmptyState, ErrorState } from '@/components/ui/StatusStates'
import { ChartFrame, ChartTooltip } from '@/components/charts/ChartFrame'
import { AXIS_PROPS, CHART } from '@/components/charts/chartTheme'
import { useApp } from '@/store/AppProvider'
import { useResource } from '@/store/useResource'
import { ml } from '@/services'
import { cn } from '@/lib/cn'
import { FEATURES } from '@/lib/clinical'
import { formatInt, formatPercent } from '@/lib/format'

const DONUT_COLORS = [CHART.medical, CHART.teal, CHART.medicalSoft]

export function DatasetsPage() {
  const navigate = useNavigate()
  const { mode } = useApp()
  const datasets = useResource(() => ml().getDatasets(), [mode])
  const [activeId, setActiveId] = useState<string | null>(null)

  const list = useMemo(() => datasets.data ?? [], [datasets.data])
  const active = useMemo(
    () => list.find((dataset) => dataset.id === activeId) ?? list[0] ?? null,
    [list, activeId],
  )

  const insights = useResource(
    () => (active ? ml().getDatasetInsights(active.id) : Promise.reject(new Error('no dataset'))),
    [active?.id, mode],
    { enabled: Boolean(active) && active.provenance !== 'unavailable' },
  )

  if (datasets.error) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Project data"
          title="Dataset Overview"
          subtitle="Metadata and distributions for the datasets used in this project."
        />
        <ErrorState error={datasets.error} onRetry={datasets.reload} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Project data"
        title="Dataset Overview"
        subtitle="Metadata and distributions for the datasets used in this project. Values are only shown when they are actually available."
        actions={
          <Button variant="secondary" icon={ScanLine} onClick={() => navigate('/ct-analysis')}>
            CT image dataset
          </Button>
        }
      />

      {/* -------------------------------------------------- dataset switcher */}
      <div className="flex flex-wrap items-center gap-2">
        {datasets.isLoading
          ? [0, 1, 2].map((index) => <Skeleton key={index} className="h-9 w-36 rounded-full" />)
          : list.map((dataset) => {
              const selected = active?.id === dataset.id
              return (
                <button
                  key={dataset.id}
                  type="button"
                  onClick={() => setActiveId(dataset.id)}
                  aria-pressed={selected}
                  className={cn(
                    'rounded-full px-4 py-2 text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-medical-500/15',
                    selected
                      ? 'bg-medical-500 text-white shadow-[0_6px_16px_rgba(11,92,173,0.22)]'
                      : 'bg-surface text-ink-soft ring-1 ring-inset ring-hairline hover:bg-medical-50 hover:text-medical-600',
                  )}
                >
                  {dataset.name}
                </button>
              )
            })}
      </div>

      {list.length === 0 && !datasets.isLoading ? (
        <EmptyState
          icon={Database}
          title="No datasets registered"
          description="The service did not return any dataset metadata. Connect the FastAPI service to populate this page."
          className="border-0 bg-transparent"
        />
      ) : null}

      {active ? (
        <>
          {/* ------------------------------------------------ dataset card */}
          <Card>
            <CardHeader>
              <div className="min-w-0">
                <CardTitle>{active.name}</CardTitle>
                <CardDescription>{active.description}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <ProvenanceChip provenance={active.provenance} />
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
                <KeyValue label="Records" value={formatInt(active.records)} />
                <KeyValue label="Features" value={formatInt(active.features)} />
                <KeyValue label="Target column" value={active.target ?? 'Not available'} />
                <KeyValue label="Missing values" value={formatInt(active.missingValues)} />
                <KeyValue label="Duplicate rows" value={formatInt(active.duplicates)} />
                <KeyValue
                  label="Source"
                  value={
                    <span className="text-[0.78rem] font-medium">{active.source ?? 'Not available'}</span>
                  }
                />
              </dl>

              {active.ageSummary ? (
                <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-hairline pt-4 sm:grid-cols-4">
                  <KeyValue label="Age min" value={active.ageSummary.min ?? '—'} />
                  <KeyValue label="Age max" value={active.ageSummary.max ?? '—'} />
                  <KeyValue label="Age mean" value={active.ageSummary.mean ?? '—'} />
                  <KeyValue label="Age median" value={active.ageSummary.median ?? '—'} />
                </dl>
              ) : null}

              {active.columns ? (
                <div className="mt-5 border-t border-hairline pt-4">
                  <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-muted">
                    Expected schema
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {active.columns.map((column) => (
                      <code
                        key={column}
                        className="rounded-md bg-medical-50 px-2 py-1 font-mono text-2xs text-medical-600 ring-1 ring-inset ring-medical-100"
                      >
                        {column}
                      </code>
                    ))}
                  </div>
                </div>
              ) : null}

              {active.provenance === 'unavailable' ? (
                <div className="mt-5 flex items-start gap-2.5 rounded-input border border-dashed border-medical-200 bg-surface-subtle p-3.5">
                  <UploadCloud className="mt-0.5 h-4 w-4 shrink-0 text-medical-500" aria-hidden />
                  <p className="text-2xs leading-relaxed text-ink-muted">
                    No statistics are available for this dataset yet. Place{' '}
                    <code className="rounded bg-surface px-1 py-0.5 font-mono text-ink-soft">
                      lung_cancer_dataset.csv
                    </code>{' '}
                    in the backend data folder and restart the service — the dataset adapter maps
                    these column names automatically.
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* --------------------------------------------------- insights */}
          {active.provenance === 'unavailable' ? (
            <EmptyState
              icon={Database}
              title="Statistics not available"
              description="Connect the dataset to the FastAPI service to display distributions for this dataset."
              className="border-0 bg-transparent bg-surface/60"
            />
          ) : insights.error ? (
            <ErrorState error={insights.error} onRetry={insights.reload} />
          ) : insights.isLoading || !insights.data ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {[0, 1, 2, 3].map((index) => (
                <Skeleton key={index} className="h-72 w-full rounded-card" />
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              <SectionTitle
                title="Dataset insights"
                description="Distributions of the connected dataset, as reported by the service."
                right={<ProvenanceChip provenance={insights.data.provenance} />}
              />

              <div className="grid gap-5 lg:grid-cols-2">
                <ChartFrame
                  title="Age distribution"
                  description="Records per age band."
                  provenance={insights.data.provenance}
                  descriptionText="Bar chart of record counts by age band."
                >
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={insights.data.ageHistogram}
                        margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
                      >
                        <CartesianGrid stroke={CHART.grid} vertical={false} />
                        <XAxis dataKey="bin" {...AXIS_PROPS} />
                        <YAxis {...AXIS_PROPS} width={44} tickFormatter={formatInt} />
                        <Tooltip
                          cursor={{ fill: 'rgba(11,92,173,0.05)' }}
                          content={({ active: isActive, payload, label }) =>
                            isActive && payload?.length ? (
                              <ChartTooltip
                                label={`Age ${label}`}
                                rows={[
                                  {
                                    key: 'count',
                                    label: 'Records',
                                    value: formatInt(payload[0].value as number),
                                    color: CHART.medical,
                                  },
                                ]}
                              />
                            ) : null
                          }
                        />
                        <Bar dataKey="count" fill={CHART.medical} radius={[5, 5, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartFrame>

                <ChartFrame
                  title="Gender distribution"
                  description="Self-reported gender recorded in the dataset."
                  provenance={insights.data.provenance}
                  descriptionText="Donut chart of the gender split in the dataset."
                >
                  <div className="flex h-60 w-full items-center gap-2">
                    <div className="h-full w-1/2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={insights.data.genderDistribution}
                            dataKey="count"
                            nameKey="label"
                            innerRadius="58%"
                            outerRadius="88%"
                            paddingAngle={2}
                            stroke="#FFFFFF"
                            strokeWidth={2}
                          >
                            {insights.data.genderDistribution.map((entry, index) => (
                              <Cell key={entry.label} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active: isActive, payload }) =>
                              isActive && payload?.length ? (
                                <ChartTooltip
                                  rows={[
                                    {
                                      key: 'count',
                                      label: String(payload[0].name ?? 'Records'),
                                      value: formatInt(payload[0].value as number),
                                      color: payload[0].payload.fill,
                                    },
                                  ]}
                                />
                              ) : null
                            }
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="flex-1 space-y-2">
                      {insights.data.genderDistribution.map((entry, index) => {
                        const total = insights.data!.genderDistribution.reduce(
                          (sum, item) => sum + (item.count ?? 0),
                          0,
                        )
                        return (
                          <li key={entry.label} className="flex items-center gap-2 text-2xs">
                            <span
                              className="h-2.5 w-2.5 rounded-sm"
                              style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
                              aria-hidden
                            />
                            <span className="flex-1 text-ink-soft">{entry.label}</span>
                            <span className="font-semibold tabular text-ink">{formatInt(entry.count)}</span>
                            <span className="w-11 text-right text-ink-muted tabular">
                              {total > 0 ? formatPercent((entry.count ?? 0) / total, 0) : '—'}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </ChartFrame>

                <ChartFrame
                  title="Lung cancer class distribution"
                  description="Screening class balance reported by the service."
                  provenance={insights.data.provenance}
                  descriptionText="Donut chart of the class balance in the dataset."
                >
                  <div className="flex h-60 w-full items-center gap-2">
                    <div className="h-full w-1/2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={insights.data.classDistribution}
                            dataKey="count"
                            nameKey="label"
                            innerRadius="58%"
                            outerRadius="88%"
                            paddingAngle={2}
                            stroke="#FFFFFF"
                            strokeWidth={2}
                          >
                            {insights.data.classDistribution.map((entry, index) => (
                              <Cell
                                key={entry.label}
                                fill={index === 0 ? CHART.danger : CHART.teal}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active: isActive, payload }) =>
                              isActive && payload?.length ? (
                                <ChartTooltip
                                  rows={[
                                    {
                                      key: 'count',
                                      label: String(payload[0].name ?? 'Records'),
                                      value: formatInt(payload[0].value as number),
                                      color: payload[0].payload.fill,
                                    },
                                  ]}
                                />
                              ) : null
                            }
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="flex-1 space-y-2">
                      {insights.data.classDistribution.map((entry) => (
                        <li key={entry.label} className="flex items-center gap-2 text-2xs">
                          <span
                            className={cn(
                              'h-2.5 w-2.5 rounded-sm',
                              entry.label.includes('positive') ? 'bg-danger' : 'bg-teal-500',
                            )}
                            aria-hidden
                          />
                          <span className="flex-1 text-ink-soft">{entry.label}</span>
                          <span className="font-semibold tabular text-ink">{formatInt(entry.count)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </ChartFrame>

                <ChartFrame
                  title="Risk factor presence"
                  description="Share of records where each exposure or history is recorded."
                  provenance={insights.data.provenance}
                  descriptionText="Bar chart showing how often each risk factor is present in the dataset."
                >
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={insights.data.riskFactorPresence.map((entry) => ({
                          name: FEATURES[entry.feature].shortLabel,
                          present: entry.present ?? 0,
                        }))}
                        layout="vertical"
                        margin={{ top: 4, right: 32, bottom: 4, left: 8 }}
                      >
                        <CartesianGrid stroke={CHART.grid} horizontal={false} />
                        <XAxis type="number" {...AXIS_PROPS} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          {...AXIS_PROPS}
                          width={110}
                          tick={{ fill: CHART.text, fontSize: 11 }}
                        />
                        <Tooltip
                          cursor={{ fill: 'rgba(11,92,173,0.05)' }}
                          content={({ active: isActive, payload, label }) =>
                            isActive && payload?.length ? (
                              <ChartTooltip
                                label={String(label)}
                                rows={[
                                  {
                                    key: 'present',
                                    label: 'Records present',
                                    value: formatInt(payload[0].value as number),
                                    color: CHART.teal,
                                  },
                                ]}
                              />
                            ) : null
                          }
                        />
                        <Bar dataKey="present" fill={CHART.teal} radius={[0, 5, 5, 0]} maxBarSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartFrame>

                <ChartFrame
                  title="Pack years distribution"
                  description="Tobacco exposure grouped into screening bands."
                  provenance={insights.data.provenance}
                  descriptionText="Bar chart of pack-year bands in the dataset."
                >
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={insights.data.packYearsBands}
                        margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
                      >
                        <CartesianGrid stroke={CHART.grid} vertical={false} />
                        <XAxis dataKey="label" {...AXIS_PROPS} />
                        <YAxis {...AXIS_PROPS} width={44} tickFormatter={formatInt} />
                        <Tooltip
                          cursor={{ fill: 'rgba(11,92,173,0.05)' }}
                          content={({ active: isActive, payload, label }) =>
                            isActive && payload?.length ? (
                              <ChartTooltip
                                label={`${label} pack-years`}
                                rows={[
                                  {
                                    key: 'count',
                                    label: 'Records',
                                    value: formatInt(payload[0].value as number),
                                    color: CHART.medicalSoft,
                                  },
                                ]}
                              />
                            ) : null
                          }
                        />
                        <Bar
                          dataKey="count"
                          fill={CHART.medicalSoft}
                          radius={[5, 5, 0, 0]}
                          maxBarSize={40}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartFrame>

                <ChartFrame
                  title="Age vs pack years"
                  description="Every record, coloured by screening class."
                  provenance={insights.data.provenance}
                  descriptionText="Scatter plot of age against pack years, coloured by screening class."
                >
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                        <CartesianGrid stroke={CHART.grid} />
                        <XAxis
                          type="number"
                          dataKey="age"
                          name="Age"
                          {...AXIS_PROPS}
                          domain={['dataMin - 4', 'dataMax + 4']}
                        />
                        <YAxis
                          type="number"
                          dataKey="packYears"
                          name="Pack years"
                          {...AXIS_PROPS}
                          width={54}
                          domain={[0, 'dataMax + 10']}
                        />
                        <ZAxis range={[18, 18]} />
                        <Tooltip
                          cursor={{ strokeDasharray: '3 3' }}
                          content={({ active, payload }) => {
                            const point = payload?.[0]?.payload
                            if (!active || !point) return null
                            return (
                              <ChartTooltip
                                rows={[
                                  { key: 'age', label: 'Age', value: String(point.age) },
                                  { key: 'py', label: 'Pack years', value: String(point.packYears) },
                                  {
                                    key: 'class',
                                    label: 'Screening class',
                                    value: point.target === 1 ? 'Positive' : 'Negative',
                                    color: point.target === 1 ? CHART.danger : CHART.teal,
                                  },
                                ]}
                              />
                            )
                          }}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: 11 }}
                          iconType="circle"
                          iconSize={8}
                          payload={[
                            { value: 'Screened negative', type: 'circle', color: CHART.teal },
                            { value: 'Screened positive', type: 'circle', color: CHART.danger },
                          ]}
                        />
                        <Scatter
                          name="Screened negative"
                          data={insights.data.scatter.points.filter((point) => point.target === 0)}
                          fill={CHART.teal}
                          fillOpacity={0.55}
                        />
                        <Scatter
                          name="Screened positive"
                          data={insights.data.scatter.points.filter((point) => point.target === 1)}
                          fill={CHART.danger}
                          fillOpacity={0.6}
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </ChartFrame>
              </div>
            </div>
          )}
        </>
      ) : null}

      <p className="flex items-start gap-2 text-2xs leading-relaxed text-ink-muted">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        Dataset statistics are read from the connected service. When no dataset is connected the
        page shows an explicit empty state rather than placeholder numbers.
      </p>
    </div>
  )
}
