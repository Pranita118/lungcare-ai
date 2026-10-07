import { useNavigate } from 'react-router-dom'
import { Compass, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { InlineDisclaimer } from '@/components/medical/Disclaimer'
import { APP } from '@/lib/clinical'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-xl py-10 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-medical-50 text-medical-500 ring-1 ring-inset ring-medical-100">
        <Compass className="h-6 w-6" aria-hidden />
      </span>
      <h1 className="mt-5 font-display text-2xl font-bold text-ink">Page not found</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        The page you requested is not part of {APP.name}. Use the navigation to return to a section
        of the platform.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Button icon={LayoutDashboard} onClick={() => navigate('/')}>
          Back to dashboard
        </Button>
        <Button variant="secondary" onClick={() => navigate('/assessment')}>
          Patient assessment
        </Button>
      </div>
      <InlineDisclaimer className="mt-8 text-left" />
    </div>
  )
}
