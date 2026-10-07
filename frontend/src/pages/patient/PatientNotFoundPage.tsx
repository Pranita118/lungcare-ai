import { useNavigate } from 'react-router-dom'
import { Home, Search } from 'lucide-react'
import { PatientPageHeader, SafetyNote } from '@/components/patient/Safety'
import { Button } from '@/components/ui/Button'
import { useHealth } from '@/store/HealthProvider'

const SUGGESTIONS = [
  { to: '/', label: 'Home', description: 'Your lung health overview' },
  { to: '/my-risk', label: 'My Risk', description: 'Your AI screening result' },
  { to: '/my-healthy-steps', label: 'My Healthy Steps', description: "Today's daily checklist" },
  { to: '/lung-health-information', label: 'Lung Health Information', description: 'Learn about your lungs' },
]

export function PatientNotFoundPage() {
  const navigate = useNavigate()
  const { profile } = useHealth()

  return (
    <div className="space-y-6">
      <PatientPageHeader
        title="We could not find that page"
        subtitle="The link may be out of date, or the address may have a typo. Nothing is wrong with your information."
      />

      <div className="rounded-panel border border-dashed border-medical-200 bg-surface px-6 py-12 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-medical-50 text-medical-500 ring-1 ring-inset ring-medical-100">
          <Search className="h-6 w-6" aria-hidden />
        </span>
        <h2 className="mt-4 font-display text-lg font-semibold text-ink">Try one of these instead</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
          Your health information is still saved on this device
          {profile.displayName ? `, ${profile.displayName.trim()}` : ''}.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button icon={Home} onClick={() => navigate('/')}>
            Go to Home
          </Button>
        </div>
      </div>

      <ul className="grid gap-2.5 sm:grid-cols-2">
        {SUGGESTIONS.slice(1).map((item) => (
          <li key={item.to}>
            <button
              type="button"
              onClick={() => navigate(item.to)}
              className="w-full rounded-button border border-hairline bg-surface px-4 py-3 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-medical-200 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-medical-500/15"
            >
              <span className="block text-[0.85rem] font-semibold text-ink">{item.label}</span>
              <span className="mt-0.5 block text-2xs text-ink-muted">{item.description}</span>
            </button>
          </li>
        ))}
      </ul>

      <SafetyNote />
    </div>
  )
}
