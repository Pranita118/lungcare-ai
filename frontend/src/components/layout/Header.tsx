import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  Menu,
  MonitorPlay,
  ServerCog,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { ALL_NAV_ITEMS } from '@/config/navigation'
import { StatusDot, Badge } from '@/components/ui/Badge'
import { ThemeToggle } from '@/components/system/ThemeToggle'
import { Logo } from './Brand'
import { useApp } from '@/store/AppProvider'
import type { ApiMode } from '@/types'

function ModeChip({ mode, isResolving }: { mode: ApiMode; isResolving: boolean }) {
  if (isResolving) {
    return (
      <Badge tone="neutral" icon={Wifi}>
        Connecting…
      </Badge>
    )
  }
  if (mode === 'live') {
    return (
      <Badge tone="success" icon={ServerCog}>
        <span className="hidden sm:inline">ML service connected</span>
        <span className="sm:hidden">Live</span>
      </Badge>
    )
  }
  return (
    <Badge tone="warning" icon={WifiOff}>
      <span className="hidden sm:inline">Service offline</span>
      <span className="sm:hidden">Offline</span>
    </Badge>
  )
}

function NotificationsMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { mode } = useApp()

  useEffect(() => {
    if (!open) return
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative grid h-9 w-9 place-items-center rounded-button border border-hairline bg-surface text-ink-soft transition-colors hover:border-medical-200 hover:bg-medical-50 hover:text-medical-600 focus-visible:ring-4 focus-visible:ring-medical-500/15"
      >
        <Bell className="h-[17px] w-[17px]" aria-hidden />
        <span
          className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-medical-500 ring-2 ring-white"
          aria-hidden
        />
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-72 rounded-card border border-hairline bg-surface p-4 shadow-panel">
          <p className="font-display text-[0.85rem] font-semibold text-ink">System notices</p>
          <ul className="mt-3 space-y-2.5">
            <li className="flex gap-2.5 rounded-input bg-surface-subtle p-2.5">
              <StatusDot tone={mode === 'live' ? 'success' : 'warning'} className="mt-1.5" />
              <div>
                <p className="text-2xs font-semibold text-ink">
                  {mode === 'live' ? 'ML service connected' : 'Trained model results not connected'}
                </p>
                <p className="mt-0.5 text-[0.68rem] leading-relaxed text-ink-muted">
                  {mode === 'live'
                    ? 'Screening results are produced by the served model artifacts.'
                    : 'The service is not connected, so no metrics or datasets are available.'}
                </p>
              </div>
            </li>
            <li className="flex gap-2.5 rounded-input bg-surface-subtle p-2.5">
              <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden />
              <div>
                <p className="text-2xs font-semibold text-ink">Research environment</p>
                <p className="mt-0.5 text-[0.68rem] leading-relaxed text-ink-muted">
                  Educational prototype. No clinical data is stored or transmitted.
                </p>
              </div>
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export function Header({
  onOpenNav,
  className,
}: {
  onOpenNav: () => void
  className?: string
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const { mode, isResolving, isOnline, presentationMode } = useApp()

  const current =
    ALL_NAV_ITEMS.find((item) =>
      item.to === '/research' ? location.pathname === '/research' : location.pathname.startsWith(item.to),
    ) ?? ALL_NAV_ITEMS[0]

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-hairline bg-surface/92 px-4 backdrop-blur-md sm:px-6 no-print',
        className,
      )}
    >
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Open navigation"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-button border border-hairline bg-surface text-ink-soft transition-colors hover:border-medical-200 hover:text-medical-600 focus-visible:ring-4 focus-visible:ring-medical-500/15 lg:hidden"
      >
        <Menu className="h-[18px] w-[18px]" aria-hidden />
      </button>

      <span className="lg:hidden">
        <Logo size="sm" />
      </span>

      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-[0.95rem] font-semibold text-ink">
          {current.label}
        </h1>
        <p className="hidden truncate text-2xs text-ink-muted sm:block">{current.description}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {presentationMode ? (
          <Badge tone="medical" icon={MonitorPlay}>
            <span className="hidden md:inline">Presentation Mode</span>
            <span className="md:hidden">Present</span>
          </Badge>
        ) : null}

        <div className="hidden items-center gap-2 rounded-button border border-hairline bg-surface px-3 py-1.5 md:flex">
          <StatusDot tone={isResolving ? 'neutral' : isOnline ? 'success' : 'danger'} pulse />
          <span className="text-2xs font-semibold text-ink">
            {isResolving ? 'Connecting' : isOnline ? 'System Ready' : 'Offline'}
          </span>
        </div>

        <ModeChip mode={mode} isResolving={isResolving} />
        <ThemeToggle />
        <NotificationsMenu />

        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-medical-500 to-teal-500 text-2xs font-bold text-white ring-2 ring-white transition-transform hover:scale-105 focus-visible:ring-4 focus-visible:ring-medical-500/20"
          aria-label="Open profile and settings"
        >
          LC
        </button>
      </div>
    </header>
  )
}
