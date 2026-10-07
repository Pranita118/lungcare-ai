import { useMemo, useRef, useState } from 'react'
import { Bot, CornerDownLeft, ShieldQuestion } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { FEATURES } from '@/lib/clinical'
import { formatPercent } from '@/lib/format'
import type { ExplainBundle, PredictionResult } from '@/types'

interface Answer {
  question: string
  answer: string
}

const SAFETY_PREFIX =
  'LungCare AI does not provide a diagnosis. Its output is a model-based screening score that must be interpreted by a qualified healthcare professional.'

/**
 * Rule-based insights assistant.
 *
 * Every answer is derived directly from the model output currently held in the
 * session — no language model is connected, and the assistant is explicitly
 * forbidden from stating or implying a diagnosis.
 */
export function InsightsAssistant({
  prediction,
  explanation,
  className,
}: {
  prediction: PredictionResult
  explanation: ExplainBundle | null
  className?: string
}) {
  const [answers, setAnswers] = useState<Answer[]>([])
  const listRef = useRef<HTMLDivElement>(null)

  const suggestions = useMemo(() => {
    const items: string[] = [
      'Why is the predicted risk at this level?',
      'Which factors reduced the predicted risk?',
      'How confident is the model?',
      'What data does the model use?',
      'What are the next steps?',
      'Does this mean I have cancer?',
    ]
    return items
  }, [])

  const answer = (question: string): string => {
    const increasing = prediction.contributions.filter((item) => item.contribution > 0)
    const decreasing = prediction.contributions.filter((item) => item.contribution < 0)
    const q = question.toLowerCase()

    if (q.includes('cancer') && (q.includes('have') || q.includes('diagnos'))) {
      return SAFETY_PREFIX
    }

    if (q.includes('next step')) {
      return `${prediction.nextSteps.join(' ')} These are suggestions generated from the model output, not clinical instructions.`
    }

    if (q.includes('confiden')) {
      return `The model reports a confidence of ${formatPercent(prediction.confidence)} for the class it returned, with a screening score of ${formatPercent(prediction.riskScore)}. Confidence reflects the distance of the score from the ${formatPercent(prediction.threshold, 0)} decision threshold — it is not a probability of disease.`
    }

    if (q.includes('reduced') || q.includes('lower')) {
      if (decreasing.length === 0) {
        return 'No input feature lowered the predicted risk score for this case.'
      }
      return `The following inputs lowered the score: ${decreasing
        .slice(0, 3)
        .map((item) => `${FEATURES[item.feature].label} (${item.displayValue})`)
        .join(', ')}. These are model associations and do not establish medical causation.`
    }

    if (q.includes('data') || q.includes('feature')) {
      return `The model uses ${prediction.contributions.length} inputs: ${prediction.contributions
        .map((item) => FEATURES[item.feature].label)
        .join(', ')}. They are encoded and scaled before inference.`
    }

    if (q.includes('why') || q.includes('risk')) {
      if (increasing.length === 0) {
        return `The model returned a ${prediction.riskCategoryLabel.toLowerCase()} score of ${formatPercent(prediction.riskScore)} and no single input feature raised it on its own. The base population rate accounts for most of the score.`
      }
      const top = increasing.slice(0, 3)
      const globalLead = explanation?.global[0]
      return `The model identified the following input features as major contributors to this prediction: ${top
        .map((item) => FEATURES[item.feature].label)
        .join(', ')}. ${globalLead ? `Across the evaluation population, ${FEATURES[globalLead.feature].label} carries the largest average attribution.` : ''} These are model associations and do not establish medical causation.`
    }

    return 'This assistant answers questions about the current model output, the features used and the dataset metadata. Please select one of the suggested questions.'
  }

  const ask = (question: string) => {
    const next: Answer = { question, answer: answer(question) }
    setAnswers((current) => [...current, next].slice(-6))
    window.setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
    }, 40)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-600 ring-1 ring-inset ring-teal-100">
            <Bot className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <CardTitle>AI Insights Assistant</CardTitle>
            <CardDescription>
              Answers are generated from the current model output. No language model is connected
              and it never provides a diagnosis.
            </CardDescription>
          </div>
        </div>
        <Badge tone="teal">Rule-based</Badge>
      </CardHeader>
      <CardContent>
        <div
          ref={listRef}
          className="max-h-72 min-h-24 space-y-3 overflow-y-auto rounded-input border border-hairline bg-surface-subtle p-3"
        >
          {answers.length === 0 ? (
            <p className="text-2xs leading-relaxed text-ink-muted">
              Ask about the model output, the features used, or what the result means. Everything
              here is derived from the prediction shown on this page.
            </p>
          ) : (
            <AnimatePresence initial={false}>
              {answers.map((item, index) => (
                <motion.div
                  key={`${item.question}-${index}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24 }}
                  className="space-y-2"
                >
                  <p className="flex items-start gap-1.5 text-2xs font-semibold text-medical-600">
                    <CornerDownLeft className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                    {item.question}
                  </p>
                  <p className="rounded-input border border-hairline bg-surface px-3 py-2 text-2xs leading-relaxed text-ink-soft">
                    {item.answer}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => ask(suggestion)}
              className="rounded-full border border-hairline bg-surface px-3 py-1.5 text-2xs font-medium text-ink-soft transition-colors hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-medical-500/15"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <p className="mt-3 flex items-start gap-1.5 text-[0.68rem] leading-relaxed text-ink-muted">
          <ShieldQuestion className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          {SAFETY_PREFIX}
        </p>
      </CardContent>
    </Card>
  )
}
