import { useState } from 'react'
import { BookOpen, ChevronDown, Search } from 'lucide-react'
import { PatientPageHeader, EducationDisclaimer, SafetyNote } from '@/components/patient/Safety'
import { TextInput } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { LUNG_HEALTH_TOPICS } from '@/lib/education'
import { cn } from '@/lib/cn'

export function HealthInformationPage() {
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(LUNG_HEALTH_TOPICS[0].id)

  const topics = LUNG_HEALTH_TOPICS.filter((topic) => {
    if (!query.trim()) return true
    const term = query.toLowerCase()
    return (
      topic.title.toLowerCase().includes(term) ||
      topic.summary.toLowerCase().includes(term) ||
      topic.body.join(' ').toLowerCase().includes(term)
    )
  })

  return (
    <div className="space-y-6">
      <PatientPageHeader
        title="Lung Health Information"
        subtitle="Trusted, plain-language information to help you understand your lungs and prepare for appointments."
        actions={
          <div className="w-full sm:w-64">
            <label htmlFor="info-search" className="sr-only">
              Search lung health information
            </label>
            <TextInput
              id="info-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search topics"
              prefix={<Search className="h-4 w-4" />}
            />
          </div>
        }
      />

      {topics.length === 0 ? (
        <div className="rounded-panel border border-dashed border-medical-200 bg-surface/70 px-6 py-12 text-center">
          <p className="font-display text-sm font-semibold text-ink">No topics match your search</p>
          <p className="mx-auto mt-2 max-w-sm text-xs text-ink-muted">
            Try a different word, for example “smoking”, “symptoms” or “CT”.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {topics.map((topic) => {
            const open = openId === topic.id
            return (
              <article
                key={topic.id}
                className={cn(
                  'overflow-hidden rounded-card border bg-surface shadow-card transition-shadow duration-200',
                  open ? 'border-medical-200 shadow-card-hover' : 'border-hairline',
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : topic.id)}
                  aria-expanded={open}
                  className="flex w-full items-start gap-3 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-medical-500/15"
                >
                  <span
                    className={cn(
                      'mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors',
                      open ? 'bg-medical-500 text-white' : 'bg-medical-50 text-medical-500',
                    )}
                  >
                    <BookOpen className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.92rem] font-semibold text-ink">{topic.title}</span>
                    <span className="mt-0.5 block text-2xs leading-relaxed text-ink-muted">
                      {topic.summary}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      'mt-1 h-4 w-4 shrink-0 text-ink-muted transition-transform duration-200',
                      open && 'rotate-180',
                    )}
                    aria-hidden
                  />
                </button>

                {open ? (
                  <div className="border-t border-hairline px-5 py-4">
                    {topic.body.map((paragraph) => (
                      <p
                        key={paragraph.slice(0, 30)}
                        className="mt-2.5 text-[0.85rem] leading-relaxed text-ink-soft text-pretty first:mt-0"
                      >
                        {paragraph}
                      </p>
                    ))}
                    {topic.keyPoints ? (
                      <>
                        <p className="mt-4 text-2xs font-semibold uppercase tracking-wide text-ink-muted">
                          Key points
                        </p>
                        <ul className="mt-2 space-y-1.5">
                          {topic.keyPoints.map((point) => (
                            <li key={point} className="flex gap-2 text-xs leading-relaxed text-ink-soft">
                              <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" aria-hidden />
                              {point}
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      )}

      <div className="rounded-card border border-hairline bg-surface p-4">
        <p className="text-2xs font-semibold uppercase tracking-wide text-ink-muted">Sources and scope</p>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
          This information is written for general education and follows widely accepted public
          health guidance on lung health. It is deliberately general: it does not describe your
          situation and it makes no claims about what will happen to you.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge tone="outline">Educational content</Badge>
          <Badge tone="outline">No diagnosis</Badge>
          <Badge tone="outline">Speak to a clinician about your health</Badge>
        </div>
      </div>

      <EducationDisclaimer />
      <SafetyNote />
    </div>
  )
}
