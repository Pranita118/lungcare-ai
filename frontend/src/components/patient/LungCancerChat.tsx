import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  CornerDownLeft,
  ExternalLink,
  MessageCircleQuestion,
  Send,
  Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import {
  findTopics,
  routeSafety,
  topicById,
  STARTER_QUESTIONS,
  type KnowledgeTopic,
  type SafetyReply,
} from '@/lib/lungKnowledge'

type Reply =
  | { kind: 'answer'; question: string; topic: KnowledgeTopic; related: string[] }
  | { kind: 'safety'; question: string; reply: SafetyReply }
  | { kind: 'unknown'; question: string }

const UNKNOWN =
  'I do not have anything written about that. I only cover lung cancer and general lung health, and I would rather say so than give you an answer I cannot stand behind. Try asking about symptoms, risk factors, screening, staging, diagnosis, treatment, or a word you have seen on a report.'

/** Contextual opener when a topic is reached from a related question. */
function followUpPrefix(previous: string | null, topic: KnowledgeTopic): string {
  if (!previous) return ''
  return `Following on from that — here is the fuller picture on ${topic.title.toLowerCase()}.`
}

function AnswerBubble({ topic, prefix }: { topic: KnowledgeTopic; prefix: string }) {
  const [showDetail, setShowDetail] = useState(false)
  const hasDetail = Boolean(topic.detail?.length || topic.glossary?.length)

  return (
    <div className="space-y-3">
      {prefix ? (
        <p className="text-2xs italic leading-relaxed text-ink-muted">{prefix}</p>
      ) : null}

      <div className="rounded-card border border-hairline bg-surface p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-[0.95rem] font-semibold text-ink">{topic.title}</h3>
          <Badge tone="teal">General information</Badge>
        </div>

        <p className="mt-2.5 text-[0.88rem] leading-relaxed text-ink-soft">{topic.summary}</p>

        {topic.glossary?.length ? (
          <dl className="mt-3 space-y-1.5 rounded-input bg-surface-subtle px-3.5 py-3">
            {topic.glossary.map(([term, meaning]) => (
              <div key={term} className="text-[0.8rem] leading-relaxed">
                <dt className="inline font-semibold text-ink">{term}</dt>
                <span className="text-ink-muted"> — {meaning}</span>
              </div>
            ))}
          </dl>
        ) : null}

        {showDetail && topic.detail?.length ? (
          <div className="mt-3 space-y-2.5">
            {topic.detail.map((paragraph) => (
              <p key={paragraph} className="text-[0.83rem] leading-relaxed text-ink-soft">
                {paragraph}
              </p>
            ))}
          </div>
        ) : null}

        {hasDetail ? (
          <button
            type="button"
            onClick={() => setShowDetail((value) => !value)}
            className="mt-3 text-2xs font-semibold text-medical-600 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-medical-500/15"
          >
            {showDetail ? 'Show less' : 'More detail'}
          </button>
        ) : null}

        {topic.professionalAdvice ? (
          <p className="mt-3 flex items-start gap-2 rounded-input bg-tint-teal px-3 py-2.5 text-[0.8rem] leading-relaxed text-teal-700 dark:text-teal-300">
            <MessageCircleQuestion className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{topic.professionalAdvice}</span>
          </p>
        ) : null}

        {topic.urgent ? (
          <p className="mt-2.5 flex items-start gap-2 rounded-input border border-warning/25 bg-warning/12 px-3 py-2.5 text-[0.8rem] leading-relaxed text-warning-ink">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{topic.urgent}</span>
          </p>
        ) : null}

        <div className="mt-3 border-t border-hairline pt-3">
          <p className="text-2xs font-semibold uppercase tracking-wide text-ink-muted">
            Where this comes from
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
            {topic.sources.map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 text-2xs font-medium text-medical-600 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-medical-500/15"
                >
                  {source.name}
                  <ExternalLink className="h-3 w-3" aria-hidden />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function SafetyBubble({ reply }: { reply: SafetyReply }) {
  return (
    <div className="rounded-card border border-warning/25 bg-warning/12 p-4">
      <Badge tone="warning">Important</Badge>
      <div className="mt-2.5 space-y-2.5">
        {reply.message.split('\n\n').map((paragraph) => (
          <p key={paragraph} className="text-[0.85rem] leading-relaxed text-warning-ink">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  )
}

export function LungCancerChat({ className }: { className?: string }) {
  const [messages, setMessages] = useState<Reply[]>([])
  const [input, setInput] = useState('')
  const [lastTopic, setLastTopic] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollDown = useCallback(() => {
    window.setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
    }, 40)
  }, [])

  useEffect(scrollDown, [messages, scrollDown])

  const ask = useCallback(
    (question: string) => {
      const trimmed = question.trim()
      if (!trimmed) return

      // Safety rules are checked before retrieval, so a personal question is
      // never answered with a general article that happens to match the wording.
      const safety = routeSafety(trimmed)
      if (safety) {
        setMessages((current) => [...current, { kind: 'safety', question: trimmed, reply: safety }])
        setInput('')
        return
      }

      const [best, ...alsoRelevant] = findTopics(trimmed, 3)
      if (!best || best.score < 3) {
        setMessages((current) => [...current, { kind: 'unknown', question: trimmed }])
        setInput('')
        return
      }

      const related = [
        ...best.topic.seeAlso ?? [],
        ...alsoRelevant.map((match) => match.topic.id),
      ].filter((id, index, list) => list.indexOf(id) === index).slice(0, 4)

      setMessages((current) => [
        ...current,
        { kind: 'answer', question: trimmed, topic: best.topic, related },
      ])
      setLastTopic(best.topic.id)
      setInput('')
    },
    [],
  )

  const suggestions = (): string[] => {
    const fromTopic = lastTopic
      ? (topicById(lastTopic)?.seeAlso ?? []).map((id) => topicById(id)?.title ?? '')
      : []
    return fromTopic.filter(Boolean).slice(0, 4)
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-panel border border-hairline bg-surface shadow-panel',
        className,
      )}
    >
      {/* ------------------------------------------------------------- header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline bg-gradient-to-br from-sheen-from to-sheen-to px-4 py-3.5 sm:px-5">
        <div className="flex items-start gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-600 ring-1 ring-inset ring-teal-100">
            <BookOpen className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-[0.98rem] font-bold text-ink">
              Ask About Lung Cancer
            </h2>
            <p className="mt-0.5 text-2xs leading-relaxed text-ink-soft">
              Written, reviewed information on lung cancer. Not a diagnosis.
            </p>
          </div>
        </div>
        <Badge tone="outline">Curated sources</Badge>
      </div>

      {/* -------------------------------------------------------------- thread */}
      <div
        ref={listRef}
        className="h-[26rem] space-y-4 overflow-y-auto bg-surface-subtle px-4 py-4 sm:px-5"
        role="log"
        aria-live="polite"
        aria-label="Conversation"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col justify-center">
            <p className="text-[0.85rem] leading-relaxed text-ink-soft">
              Ask anything about lung cancer and general lung health. I can explain symptoms, risk
              factors, screening, staging, diagnosis, tests, treatment and the words that appear on
              reports.
            </p>
            <p className="mt-2 text-2xs leading-relaxed text-ink-muted">
              Every answer comes from a fixed, reviewed set of topics and links to where the
              information comes from. I cannot tell you what is wrong with you.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((message, index) => (
              <motion.div
                key={`${message.question}-${index}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-2"
              >
                <p className="flex items-start gap-1.5 text-2xs font-semibold text-medical-600">
                  <CornerDownLeft className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                  {message.question}
                </p>
                {message.kind === 'answer' ? (
                  <AnswerBubble
                    topic={message.topic}
                    prefix={followUpPrefix(index === 0 ? null : messages[index - 1].question, message.topic)}
                  />
                ) : message.kind === 'safety' ? (
                  <SafetyBubble reply={message.reply} />
                ) : (
                  <div className="rounded-card border border-hairline bg-surface p-4">
                    <p className="whitespace-pre-line text-[0.85rem] leading-relaxed text-ink-soft">
                      {UNKNOWN}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* ---------------------------------------------------------- suggestions */}
      {suggestions().length > 0 ? (
        <div className="flex flex-wrap gap-1.5 border-t border-hairline px-4 py-2.5 sm:px-5">
          {suggestions().map((suggestion) => (
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
      ) : messages.length === 0 ? (
        <div className="flex flex-wrap gap-1.5 border-t border-hairline px-4 py-2.5 sm:px-5">
          {STARTER_QUESTIONS.map((starter) => (
            <button
              key={starter}
              type="button"
              onClick={() => ask(starter)}
              className="rounded-full border border-hairline bg-surface px-3 py-1.5 text-2xs font-medium text-ink-soft transition-colors hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-medical-500/15"
            >
              {starter}
            </button>
          ))}
        </div>
      ) : null}

      {/* --------------------------------------------------------------- input */}
      <form
        className="flex items-center gap-2 border-t border-hairline bg-surface px-3 py-3 sm:px-4"
        onSubmit={(event) => {
          event.preventDefault()
          ask(input)
        }}
      >
        <label htmlFor="lung-chat-input" className="sr-only">
          Ask a question about lung cancer
        </label>
        <input
          id="lung-chat-input"
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask a question about lung cancer…"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-input border border-hairline bg-surface-subtle px-3.5 py-2.5 text-[0.85rem] text-ink placeholder:text-ink-muted"
        />
        <Button type="submit" icon={Send} disabled={!input.trim()} aria-label="Send question">
          <span className="hidden sm:inline">Ask</span>
        </Button>
      </form>
    </div>
  )
}
