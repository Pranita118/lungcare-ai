import { motion } from 'framer-motion'
import {
  Brain,
  FileText,
  Search,
  SlidersHorizontal,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { cn } from '@/lib/cn'

const STEPS = [
  { key: 'data', label: 'Patient Data', icon: UserRound, detail: 'Risk factor capture' },
  { key: 'preprocessing', label: 'Preprocessing', icon: SlidersHorizontal, detail: 'Encoding & scaling' },
  { key: 'model', label: 'ML Model', icon: Brain, detail: 'Trained classifier' },
  { key: 'prediction', label: 'Prediction', icon: Sparkles, detail: 'Screening score' },
  { key: 'xai', label: 'Explainable AI', icon: Search, detail: 'SHAP attribution' },
  { key: 'report', label: 'AI Report', icon: FileText, detail: 'Summary document' },
] as const

/**
 * Visual narrative of the screening pipeline. Static on purpose — it explains the
 * architecture rather than reporting live progress.
 */
export function WorkflowDiagram({ className }: { className?: string }) {
  return (
    <ol
      className={cn(
        'grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
        className,
      )}
      aria-label="AI screening workflow"
    >
      {STEPS.map((step, index) => (
        <li key={step.key} className="relative">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="group h-full rounded-card border border-hairline bg-surface p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-medical-200 hover:shadow-card-hover"
          >
            <div className="flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-medical-50 text-medical-500 ring-1 ring-inset ring-medical-100 transition-colors group-hover:bg-tint-medical">
                <step.icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="font-display text-[0.7rem] font-bold text-medical-200 tabular">
                {String(index + 1).padStart(2, '0')}
              </span>
            </div>
            <p className="mt-3 text-[0.84rem] font-semibold text-ink">{step.label}</p>
            <p className="mt-0.5 text-2xs text-ink-muted">{step.detail}</p>
          </motion.div>
        </li>
      ))}
    </ol>
  )
}
