import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, History, HeartPulse, Save, Trash2 } from 'lucide-react'
import { PatientPageHeader, SectionHeading, SafetyNote } from '@/components/patient/Safety'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/StatusStates'
import { useHealth } from '@/store/HealthProvider'
import { useToast } from '@/components/ui/Toast'
import { SEVERITY_LABELS, SYMPTOM_LABELS, safetyNotes, symptomTrend } from '@/lib/guidance'
import type { SymptomEntry, SymptomKey, SymptomSeverity } from '@/types/health'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/cn'

const SYMPTOM_ORDER: SymptomKey[] = [
  'cough',
  'shortness_of_breath',
  'chest_discomfort',
  'fatigue',
  'appetite',
  'sleep',
]

const SEVERITY_ORDER: SymptomSeverity[] = ['none', 'mild', 'moderate', 'severe']

const TONE_BY_SEVERITY: Record<SymptomSeverity, string> = {
  none: 'border-hairline bg-surface-subtle text-ink-muted',
  mild: 'border-medical-200 bg-medical-50 text-medical-600',
  moderate: 'border-warning/30 bg-warning/10 text-warning-ink',
  severe: 'border-danger/25 bg-danger/10 text-danger-ink',
}

function emptyEntry(): Record<SymptomKey, SymptomSeverity> {
  return {
    cough: 'none',
    shortness_of_breath: 'none',
    chest_discomfort: 'none',
    fatigue: 'none',
    appetite: 'none',
    sleep: 'none',
  }
}

export function MyLungHealthPage() {
  const navigate = useNavigate()
  const { notify } = useToast()
  const { symptoms, addSymptomEntry, removeSymptomEntry, profile } = useHealth()

  const [values, setValues] = useState<Record<SymptomKey, SymptomSeverity>>(emptyEntry)
  const [noteText, setNoteText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const safety = useMemo(() => safetyNotes(symptoms), [symptoms])
  const trend = useMemo(() => symptomTrend(symptoms), [symptoms])

  const save = () => {
    setIsSaving(true)
    addSymptomEntry({ values, notes: noteText })
    setValues(emptyEntry())
    setNoteText('')
    setIsSaving(false)
    notify({
      tone: 'success',
      title: 'Your symptom check has been saved',
      description: 'You can add another entry whenever you want.',
    })
  }

  const hasAnySymptom = SEVERITY_ORDER.some((level) =>
    SYMPTOM_ORDER.some((key) => values[key] === level && level !== 'none'),
  )

  return (
    <div className="space-y-6">
      <PatientPageHeader
        title="My Lung Health"
        subtitle="A short daily check-in helps you notice how you are feeling over time. Recording symptoms does not mean something is wrong — it simply helps you describe changes to your healthcare professional."
      />

      {/* --------------------------------------------------------- safety */}
      {safety.map((note) => (
        <div
          key={note.title}
          role="note"
          className={cn(
            'flex items-start gap-3 rounded-card border px-4 py-3.5',
            note.level === 'urgent'
              ? 'border-danger/25 bg-tint-danger'
              : note.level === 'discuss'
                ? 'border-warning/25 bg-warning/[0.06]'
                : 'border-teal-100 bg-tint-teal',
          )}
        >
          <AlertTriangle
            className={cn(
              'mt-0.5 h-4 w-4 shrink-0',
              note.level === 'urgent' ? 'text-danger' : note.level === 'discuss' ? 'text-warning-ink' : 'text-teal-600',
            )}
            aria-hidden
          />
          <div>
            <p
              className={cn(
                'text-[0.82rem] font-semibold',
                note.level === 'urgent'
                  ? 'text-danger-ink'
                  : note.level === 'discuss'
                    ? 'text-warning-ink'
                    : 'text-teal-700 dark:text-teal-300',
              )}
            >
              {note.title}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">{note.message}</p>
          </div>
        </div>
      ))}

      {/* --------------------------------------------------------- check-in */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>How are you feeling today?</CardTitle>
            <CardDescription>Choose the option that best matches how you feel right now.</CardDescription>
          </div>
          <HeartPulse className="h-4 w-4 text-medical-500" aria-hidden />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr className="border-b border-hairline">
                  <th className="pb-2.5 pr-4 text-2xs font-semibold uppercase tracking-wide text-ink-muted">
                    How have you been feeling?
                  </th>
                  {SEVERITY_ORDER.map((level) => (
                    <th
                      key={level}
                      className="pb-2.5 pr-2 text-center text-2xs font-semibold uppercase tracking-wide text-ink-muted"
                    >
                      {SEVERITY_LABELS[level]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {SYMPTOM_ORDER.map((key) => (
                  <tr key={key}>
                    <th scope="row" className="py-3 pr-4 text-left text-[0.85rem] font-semibold text-ink">
                      {SYMPTOM_LABELS[key].label}
                    </th>
                    {SEVERITY_ORDER.map((level) => {
                      const selected = values[key] === level
                      return (
                        <td key={level} className="py-2 pr-2">
                          <button
                            type="button"
                            onClick={() => setValues((current) => ({ ...current, [key]: level }))}
                            aria-pressed={selected}
                            aria-label={`${SYMPTOM_LABELS[key].label}: ${SEVERITY_LABELS[level]}`}
                            className={cn(
                              'w-full rounded-button border px-2 py-2 text-2xs font-semibold transition-all duration-150',
                              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-medical-500/15',
                              selected ? TONE_BY_SEVERITY[level] : 'border-hairline bg-surface text-ink-muted hover:border-medical-200 hover:bg-tint-medical',
                              level === 'none' && selected && 'border-success/25 bg-success/10 text-success-ink',
                            )}
                          >
                            {SEVERITY_LABELS[level]}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <label htmlFor="symptom-notes" className="text-[0.8rem] font-semibold text-ink-soft">
              Any additional symptoms or concerns?
            </label>
            <p className="mt-0.5 text-2xs text-ink-muted">Optional. Only you can see this.</p>
            <textarea
              id="symptom-notes"
              rows={3}
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              placeholder="Anything else you would like to remember about how you are feeling…"
              className="mt-2 w-full rounded-input border border-hairline bg-surface px-3.5 py-2.5 text-sm text-ink shadow-inset transition-all placeholder:text-ink-muted/70 focus:border-medical-400 focus:outline-none focus:ring-4 focus:ring-medical-500/12"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
            <Button icon={Save} onClick={save} loading={isSaving} loadingLabel="Saving…">
              Save today's check-in
            </Button>
            {!hasAnySymptom ? (
              <p className="text-2xs text-ink-muted">
                Everything is set to “None”. You can still save this as your record for today.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* --------------------------------------------------------- history */}
      <section className="space-y-4">
        <SectionHeading
          title="My symptom history"
          description="Your most recent check-ins, newest first."
          action={<Badge tone="outline">{symptoms.length} entries</Badge>}
        />
        {symptoms.length === 0 ? (
          <EmptyState
            icon={History}
            title="You have not recorded any symptoms yet"
            description="Complete the check-in above to start a simple history you can look back on."
            className="border-0 bg-transparent bg-surface/60"
          />
        ) : (
          <ul className="space-y-3">
            {symptoms.map((entry, index) => (
              <SymptomHistoryCard
                key={entry.id}
                entry={entry}
                isFirst={index === 0}
                trend={index === 0 ? trend : []}
                onDelete={() => {
                  removeSymptomEntry(entry.id)
                  notify({ tone: 'info', title: 'Entry removed' })
                }}
              />
            ))}
          </ul>
        )}
      </section>

      {profile.age ? (
        <Button variant="secondary" onClick={() => navigate('/questions-for-my-doctor')}>
          Get questions to ask my doctor
        </Button>
      ) : null}

      <SafetyNote />
    </div>
  )
}

function SymptomHistoryCard({
  entry,
  isFirst,
  trend,
  onDelete,
}: {
  entry: SymptomEntry
  isFirst: boolean
  trend: { key: SymptomKey; label: string; change: 'better' | 'same' | 'worse' }[]
  onDelete: () => void
}) {
  const recorded = SEVERITY_ORDER.some((level) =>
    SYMPTOM_ORDER.some((key) => entry.values[key] === level && level !== 'none'),
  )

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="rounded-card border border-hairline bg-surface p-4 shadow-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-[0.85rem] font-semibold text-ink">
            {isFirst ? 'Today' : 'Earlier entry'}
          </p>
          <span className="text-2xs text-ink-muted">{formatDateTime(entry.recordedAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          {isFirst ? <Badge tone="medical">Most recent</Badge> : null}
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete this entry"
            className="grid h-7 w-7 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-danger/10 hover:text-danger focus-visible:ring-4 focus-visible:ring-medical-500/15"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>

      {recorded ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {SYMPTOM_ORDER.filter((key) => entry.values[key] !== 'none').map((key) => (
            <li
              key={key}
              className={cn(
                'rounded-full border px-2.5 py-1 text-2xs font-semibold',
                TONE_BY_SEVERITY[entry.values[key]],
              )}
            >
              {SYMPTOM_LABELS[key].label}: {SEVERITY_LABELS[entry.values[key]]}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-2xs text-ink-muted">No symptoms recorded — everything was “None”.</p>
      )}

      {entry.notes ? (
        <p className="mt-3 rounded-input bg-surface-subtle px-3 py-2 text-2xs leading-relaxed text-ink-soft">
          “{entry.notes}”
        </p>
      ) : null}

      {isFirst && trend.length > 0 ? (
        <p className="mt-3 border-t border-hairline pt-3 text-2xs text-ink-muted">
          Since your previous entry:{' '}
          {trend
            .map((item) => `${item.label} ${item.change === 'worse' ? 'increased' : 'improved'}`)
            .join(', ')}
          .
        </p>
      ) : null}
    </motion.li>
  )
}
