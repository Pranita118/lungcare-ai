import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Download, HelpCircle, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { PatientPageHeader, SectionHeading, SafetyNote, PatientDisclaimer } from '@/components/patient/Safety'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/StatusStates'
import { useApp } from '@/store/AppProvider'
import { useHealth } from '@/store/HealthProvider'
import { useToast } from '@/components/ui/Toast'
import { buildQuestions, questionsToText } from '@/lib/doctorQuestions'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/cn'

export function DoctorQuestionsPage() {
  const navigate = useNavigate()
  const { notify } = useToast()
  const { prediction } = useApp()
  const {
    profile,
    symptoms,
    lastReading,
    setQuestions,
    allQuestions,
    toggleQuestionDiscussed,
    addCustomQuestion,
    removeCustomQuestion,
  } = useHealth()

  const [custom, setCustom] = useState('')

  const generated = useMemo(
    () => buildQuestions(profile, prediction, symptoms, lastReading),
    [profile, prediction, symptoms, lastReading],
  )

  // Keep the generated set in sync with the person's own information, while
  // preserving anything they have already ticked as discussed.
  useEffect(() => {
    if (generated.length === 0) return
    setQuestions((current) =>
      generated.map((question) => {
        const previous = current.find((item) => item.text === question.text)
        return previous ? { ...question, id: previous.id, discussed: previous.discussed } : question
      }),
    )
  }, [generated, setQuestions])

  const discussedCount = allQuestions.filter((question) => question.discussed).length

  const download = () => {
    const text = questionsToText(allQuestions, profile)
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `my-questions-${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
    notify({ tone: 'success', title: 'Questions downloaded' })
  }

  return (
    <div className="space-y-6">
      <PatientPageHeader
        title="Questions for My Doctor"
        subtitle="These questions are suggested from your own information, so you arrive at your appointment knowing what to ask."
        actions={
          <>
            <Button variant="secondary" icon={RefreshCw} onClick={() => setQuestions(generated)}>
              Refresh questions
            </Button>
            <Button icon={Download} onClick={download} disabled={allQuestions.length === 0}>
              Download Questions
            </Button>
          </>
        }
      />

      <div className="flex items-center gap-2 rounded-card border border-hairline bg-surface px-4 py-3 text-2xs text-ink-soft">
        <Badge tone="medical">
          {discussedCount} of {allQuestions.length} discussed
        </Badge>
        <span>Tick a question once you have discussed it with your healthcare professional.</span>
      </div>

      {allQuestions.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title="No questions prepared yet"
          description="Complete your health assessment and record how you have been feeling. Your questions will be prepared automatically from your own answers."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => navigate('/my-risk')}>Complete my assessment</Button>
              <Button variant="secondary" onClick={() => navigate('/my-lung-health')}>
                Record how I feel
              </Button>
            </div>
          }
          className="border-0 bg-transparent bg-surface/60"
        />
      ) : (
        <section className="space-y-3">
          <SectionHeading
            title="My questions"
            description="Grouped by whether they came from your own information or general advice."
          />
          <ul className="space-y-2.5">
            {allQuestions.map((question) => (
              <li
                key={question.id}
                className={cn(
                  'flex items-start gap-3 rounded-card border p-4 shadow-card transition-colors',
                  question.discussed ? 'border-success/25 bg-success/[0.05]' : 'border-hairline bg-surface',
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleQuestionDiscussed(question.id)}
                  aria-pressed={question.discussed}
                  aria-label={question.discussed ? `Mark "${question.text}" as not discussed` : `Mark "${question.text}" as discussed`}
                  className={cn(
                    'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border transition-colors',
                    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-medical-500/15',
                    question.discussed
                      ? 'border-success bg-success text-white'
                      : 'border-hairline-strong bg-surface hover:border-medical-300',
                  )}
                >
                  {question.discussed ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-[0.9rem] font-semibold text-ink',
                      question.discussed && 'text-ink-soft',
                    )}
                  >
                    {question.text}
                  </p>
                  <p className="mt-1 text-2xs leading-relaxed text-ink-muted">{question.reason}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {question.personalised ? (
                      <Badge tone="teal">Based on your information</Badge>
                    ) : (
                      <Badge tone="outline">General question</Badge>
                    )}
                    {question.discussed ? <Badge tone="success">Discussed</Badge> : null}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeCustomQuestion(question.id)}
                  aria-label={`Remove question: ${question.text}`}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-danger/10 hover:text-danger focus-visible:ring-4 focus-visible:ring-medical-500/15"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ----------------------------------------------------- add own */}
      <section className="rounded-panel border border-hairline bg-surface p-5 shadow-card">
        <h2 className="font-display text-[1rem] font-semibold text-ink">Add my own question</h2>
        <p className="mt-1 text-xs text-ink-muted">Anything you want to remember to ask.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="custom-question" className="sr-only">
            Your own question
          </label>
          <TextInput
            id="custom-question"
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                addCustomQuestion(custom)
                setCustom('')
              }
            }}
            placeholder="e.g. Should my partner also be tested?"
            className="flex-1"
          />
          <Button
            icon={Plus}
            onClick={() => {
              addCustomQuestion(custom)
              setCustom('')
            }}
            disabled={!custom.trim()}
          >
            Add question
          </Button>
        </div>
      </section>

      <p className="text-2xs text-ink-muted">
        Questions were prepared from your current information on{' '}
        {formatDateTime(new Date().toISOString())}.
      </p>

      <PatientDisclaimer />
      <SafetyNote />
    </div>
  )
}
