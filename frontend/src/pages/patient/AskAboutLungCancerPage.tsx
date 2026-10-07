import { motion } from 'framer-motion'
import { BookOpenCheck, Info, LibraryBig } from 'lucide-react'
import {
  PatientPageHeader,
  SectionHeading,
  SafetyNote,
  PatientDisclaimer,
} from '@/components/patient/Safety'
import { LungCancerChat } from '@/components/patient/LungCancerChat'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { KNOWLEDGE, STARTER_QUESTIONS } from '@/lib/lungKnowledge'

/** Shown under the chat so the limits are visible without being in the way. */
const LIMITATIONS = [
  {
    title: 'It explains, it does not assess',
    copy: 'Nothing here is a judgement about you. I cannot see your scans, your symptoms or your results, so I cannot say what any of it means for you.',
  },
  {
    title: 'It never gives treatment advice',
    copy: 'I can describe treatment categories in general, but only the person prescribing to you can say what you should take, change or stop.',
  },
  {
    title: 'It only knows what is written down',
    copy: 'If a question falls outside these topics, it says so rather than guessing. It does not invent an answer.',
  },
]

export function AskAboutLungCancerPage() {
  return (
    <div className="space-y-6">
      <PatientPageHeader
        title="Ask About Lung Cancer"
        subtitle="Ask anything about lung cancer and general lung health, and get a clear, plain-language answer with somewhere reliable to read more."
      >
        <p className="mt-2.5 flex items-start gap-2 text-xs leading-relaxed text-ink-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            This is a question-answering tool built on a fixed set of written, reviewed topics. It
            is not a chatbot that invents replies, and it is not connected to your health record.
          </span>
        </p>
      </PatientPageHeader>

      <LungCancerChat />

      <SectionHeading
        title="What it can and cannot do"
        description="Worth knowing before you rely on it."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        {LIMITATIONS.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card className="h-full">
              <CardContent>
                <h3 className="font-display text-[0.88rem] font-semibold text-ink">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-2xs leading-relaxed text-ink-soft">{item.copy}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="border-teal-100 bg-tint-teal">
        <CardContent>
          <div className="flex flex-wrap items-start gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface text-teal-600">
              <LibraryBig className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-[0.9rem] font-semibold text-ink">
                Where the answers come from
              </h2>
              <p className="mt-1 text-2xs leading-relaxed text-ink-soft">
                Every answer links to the sources it is based on — the NHS, Cancer Research UK, the
                American Cancer Society, the US National Cancer Institute, the British Lung
                Foundation and the World Health Organization. Those are the places to read in full,
                and to check anything here that matters to you.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <Badge tone="teal">{KNOWLEDGE.length} topics covered</Badge>
                <Badge tone="outline">No external AI service</Badge>
                <Badge tone="outline">Runs offline</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="flex flex-wrap items-start gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-medical-50 text-medical-500">
              <BookOpenCheck className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className="font-display text-[0.9rem] font-semibold text-ink">
                Not sure where to start?
              </h2>
              <p className="mt-1 text-2xs leading-relaxed text-ink-soft">
                These are the questions people ask most often.
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {STARTER_QUESTIONS.slice(0, 6).map((question) => (
                  <li
                    key={question}
                    className="rounded-full border border-hairline bg-surface-subtle px-2.5 py-1 text-2xs text-ink-soft"
                  >
                    {question}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <SafetyNote />
      <PatientDisclaimer />
    </div>
  )
}
