import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BookOpen,
  CheckCircle2,
  ClipboardPaste,
  FileSearch,
  FileText,
  HelpCircle,
  Info,
  Ruler,
  ShieldQuestion,
  Upload,
  X,
} from 'lucide-react'
import {
  PatientPageHeader,
  SafetyNote,
  PatientDisclaimer,
  ResultDisclaimer,
  SectionHeading,
} from '@/components/patient/Safety'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { ErrorState, EmptyState, LoadingState } from '@/components/ui/StatusStates'
import { useHealth } from '@/store/HealthProvider'
import { useToast } from '@/components/ui/Toast'
import { ml } from '@/services'
import { env } from '@/config/env'
import { AppError, type ReportFinding, type ReportReading } from '@/types'
import { cn } from '@/lib/cn'

const ACCEPTED = '.pdf,.docx,.txt,.md,.rtf,.csv'
const ACCEPTED_LABEL = 'PDF, Word (.docx) or text (.txt)'

/** Sections are shown in clinical order: what it is, what it means, what to ask. */
const CATEGORY_ORDER = [
  'staging',
  'pathology',
  'biomarker',
  'imaging',
  'nodes',
  'follow-up',
  'reassuring',
] as const

const CATEGORY_ICONS: Record<string, typeof FileText> = {
  staging: ShieldQuestion,
  pathology: FileText,
  biomarker: Ruler,
  imaging: FileText,
  nodes: FileText,
  'follow-up': BookOpen,
  reassuring: CheckCircle2,
}

function groupByCategory(findings: ReportFinding[]): [string, ReportFinding[]][] {
  const groups = new Map<string, ReportFinding[]>()
  for (const finding of findings) {
    const list = groups.get(finding.category) ?? []
    list.push(finding)
    groups.set(finding.category, list)
  }
  return [...groups.entries()].sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a[0] as never) - CATEGORY_ORDER.indexOf(b[0] as never),
  )
}

function FindingCard({ finding }: { finding: ReportFinding }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-card border border-hairline bg-surface p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-[0.95rem] font-semibold text-ink">{finding.title}</h3>
        {finding.measurement ? (
          <Badge tone="medical" icon={Ruler}>
            {finding.measurement}
          </Badge>
        ) : null}
        {finding.negated ? <Badge tone="success">Not present</Badge> : null}
      </div>

      <p className="mt-2.5 rounded-input border-l-2 border-hairline-strong bg-surface-subtle px-3 py-2 font-mono text-2xs leading-relaxed text-ink-soft">
        <span className="font-sans font-semibold text-ink-muted">Your report says: </span>
        {finding.matched}
      </p>

      <p className="mt-2.5 text-[0.85rem] leading-relaxed text-ink-soft">{finding.meaning}</p>
      <p className="mt-1.5 text-[0.82rem] leading-relaxed text-ink-muted">{finding.why}</p>

      <p className="mt-3 flex items-start gap-2 rounded-input bg-tint-teal px-3 py-2.5 text-[0.82rem] leading-relaxed text-teal-700 dark:text-teal-300">
        <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          <span className="font-semibold">Ask your doctor: </span>
          {finding.question}
        </span>
      </p>
    </motion.article>
  )
}

function ReadingResults({ reading }: { reading: ReportReading }) {
  const groups = useMemo(() => groupByCategory(reading.findings), [reading.findings])

  return (
    <div className="space-y-6">
      {/* --------------------------------------------------------- summary */}
      <Card className="border-teal-100 bg-tint-teal">
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-display text-[1rem] font-semibold text-ink">
              {reading.documentKind} — {reading.findings.length}{' '}
              {reading.findings.length === 1 ? 'term' : 'terms'} explained
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">
              Read from {reading.fileName}. The words below appeared in your document. What they
              mean for you is for your healthcare professional to explain.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-1.5">
            {reading.categories.map((category) => (
              <Badge key={category} tone="outline">
                {reading.findings.find((f) => f.category === category)?.categoryTitle ?? category}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* --------------------------------------------------------- findings */}
      {groups.length > 0 ? (
        groups.map(([category, findings]) => {
          const Icon = CATEGORY_ICONS[category] ?? FileText
          const title = findings[0]?.categoryTitle ?? 'What the report says'
          const isReassuring = category === 'reassuring'
          return (
            <section key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'grid h-7 w-7 place-items-center rounded-lg',
                    isReassuring ? 'bg-tint-success text-success' : 'bg-medical-50 text-medical-500',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <h2 className="font-display text-[1.05rem] font-semibold text-ink">{title}</h2>
                <span className="text-2xs text-ink-muted">
                  {findings.length} {findings.length === 1 ? 'term' : 'terms'}
                </span>
              </div>
              <div className="space-y-3">
                {findings.map((finding) => (
                  <FindingCard key={finding.key} finding={finding} />
                ))}
              </div>
            </section>
          )
        })
      ) : (
        <EmptyState
          icon={FileSearch}
          title="No lung-related terms were recognised"
          description="This does not mean your report is normal. It means the reader did not recognise the wording it uses. A healthcare professional can explain the whole document to you."
        />
      )}

      {/* ------------------------------------------------------- follow-up */}
      {reading.followUp.length > 0 ? (
        <section className="space-y-3">
          <SectionHeading
            title="What the report recommends"
            description="These are the time frames written in the document."
          />
          <ul className="space-y-2">
            {reading.followUp.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 rounded-input border border-hairline bg-surface px-3.5 py-2.5 text-[0.85rem] text-ink-soft"
              >
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-medical-500" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* -------------------------------------------------------- questions */}
      {reading.questions.length > 0 ? (
        <section className="space-y-3">
          <SectionHeading
            title="Questions these terms raise"
            description="Written from the wording in your own document."
          />
          <ol className="space-y-2">
            {reading.questions.map((question, index) => (
              <li
                key={question}
                className="flex items-start gap-3 rounded-input border border-hairline bg-surface px-3.5 py-2.5"
              >
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-medical-50 text-2xs font-bold text-medical-600">
                  {index + 1}
                </span>
                <span className="text-[0.85rem] leading-relaxed text-ink-soft">{question}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {/* ------------------------------------------------------------ notes */}
      {reading.notes.length > 0 ? (
        <div className="space-y-2">
          {reading.notes.map((note) => (
            <p
              key={note}
              className="flex items-start gap-2.5 rounded-input border border-hairline bg-surface-subtle px-3.5 py-2.5 text-xs leading-relaxed text-ink-muted"
            >
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{note}</span>
            </p>
          ))}
        </div>
      ) : null}

      <ResultDisclaimer />
    </div>
  )
}

export function ReadMyReportPage() {
  const { notify } = useToast()
  const { lastReading, setLastReading } = useHealth()
  const inputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [pasted, setPasted] = useState('')
  const [reading, setReading] = useState<ReportReading | null>(lastReading)
  const [isReading, setIsReading] = useState(false)
  const [error, setError] = useState<AppError | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const run = async (action: () => Promise<ReportReading>) => {
    setIsReading(true)
    setError(null)
    try {
      const result = await action()
      setReading(result)
      setLastReading(result)
      notify({
        tone: 'success',
        title: 'Your report has been read',
        description: `${result.findings.length} lung-related ${
          result.findings.length === 1 ? 'term' : 'terms'
        } explained below.`,
      })
    } catch (caught) {
      const appError =
        caught instanceof AppError
          ? caught
          : new AppError('Unable to read that document.', {
              hint: 'Please try another file, or paste the text of the report instead.',
            })
      setError(appError)
    } finally {
      setIsReading(false)
    }
  }

  const readFile = () => {
    if (!file) return
    void run(() => ml().readReport(file))
  }

  const readPasted = () => {
    const text = pasted.trim()
    if (!text) {
      setFileError('Paste the text of your report first.')
      return
    }
    void run(() => ml().readReportText(text))
  }

  const pickFile = (next: File | null) => {
    setError(null)
    setFileError(null)
    if (!next) {
      setFile(null)
      return
    }
    if (next.size > env.maxUploadBytes) {
      setFile(null)
      setFileError(
        `That file is larger than ${Math.round(env.maxUploadBytes / (1024 * 1024))} MB.`,
      )
      return
    }
    setFile(next)
    setPasted('')
  }

  /** Returns to the input panel so another document can be read. */
  const reset = () => {
    setReading(null)
    setLastReading(null)
    setFile(null)
    setPasted('')
    setError(null)
    setFileError(null)
  }

  return (
    <div className="space-y-6">
      <PatientPageHeader
        title="Read My Report"
        subtitle="Upload a scan, test or clinic report and see what the words in it mean, in plain language."
      >
        <p className="mt-2.5 flex items-start gap-2 text-xs leading-relaxed text-ink-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            This explains terms and phrases, not your health. It does not interpret the report and
            does not say what anything means for you.
          </span>
        </p>
      </PatientPageHeader>

      {/* --------------------------------------------------------- input */}
      {!reading ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-medical-50 text-medical-500">
                  <Upload className="h-4 w-4" aria-hidden />
                </span>
                <h2 className="font-display text-[0.98rem] font-semibold text-ink">
                  Upload a report
                </h2>
              </div>

              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED}
                className="sr-only"
                onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
              />

              <div className="rounded-panel border border-dashed border-medical-200 bg-surface-subtle px-6 py-8 text-center">
                <p className="text-[0.85rem] font-semibold text-ink">Choose a document</p>
                <p className="mt-1 text-2xs leading-relaxed text-ink-muted">
                  {ACCEPTED_LABEL}. Photos of a report cannot be read, so download the
                  document instead and use the text box if you only have a picture.
                </p>
                <Button
                  variant="secondary"
                  className="mt-4"
                  icon={Upload}
                  onClick={() => inputRef.current?.click()}
                >
                  Choose Document
                </Button>
              </div>

              {fileError ? (
                <p
                  role="alert"
                  className="rounded-input border border-danger/25 bg-tint-danger px-3.5 py-2.5 text-2xs text-danger-ink"
                >
                  {fileError}
                </p>
              ) : null}

              {file ? (
                <div className="flex items-center gap-3 rounded-input border border-hairline bg-surface p-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-muted text-ink-muted">
                    <FileText className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.82rem] font-semibold text-ink">{file.name}</p>
                    <p className="text-2xs text-ink-muted">{Math.round(file.size / 1024)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => pickFile(null)}
                    aria-label="Remove the selected document"
                    className="grid h-7 w-7 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-medical-50 hover:text-medical-600"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              ) : null}

              <Button
                fullWidth
                size="lg"
                icon={FileText}
                disabled={!file}
                loading={isReading}
                loadingLabel="Reading your report…"
                onClick={readFile}
              >
                Read This Report
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-tint-teal text-teal-600">
                  <ClipboardPaste className="h-4 w-4" aria-hidden />
                </span>
                <h2 className="font-display text-[0.98rem] font-semibold text-ink">
                  Or paste the text
                </h2>
              </div>

              <p className="text-xs leading-relaxed text-ink-muted">
                The most reliable option. Open the report on your patient portal, select the
                findings, and paste them here.
              </p>

              <textarea
                value={pasted}
                onChange={(event) => {
                  setPasted(event.target.value)
                  setFileError(null)
                }}
                rows={9}
                placeholder="Paste the text of your report here…"
                aria-label="Report text"
                className="w-full resize-y rounded-input border border-hairline bg-surface px-3.5 py-3 text-[0.85rem] leading-relaxed text-ink placeholder:text-ink-muted"
              />

              <Button
                fullWidth
                size="lg"
                icon={ClipboardPaste}
                disabled={!pasted.trim()}
                loading={isReading}
                loadingLabel="Reading your report…"
                onClick={readPasted}
              >
                Read Pasted Text
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {isReading ? (
            <LoadingState
              title="Reading your report"
              description="Looking for lung-related terms and checking how each one is used."
            />
          ) : null}

          {error ? <ErrorState error={error} onRetry={readPasted} /> : null}

          {!isReading && !error ? <ReadingResults reading={reading} /> : null}

          <Button variant="secondary" icon={FileSearch} onClick={reset}>
            Read another report
          </Button>
        </>
      )}

      <SafetyNote />
      <PatientDisclaimer />
    </div>
  )
}
