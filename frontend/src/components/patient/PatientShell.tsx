import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, FlaskConical, LogOut, Menu, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { MOBILE_NAV, PATIENT_NAV, RESEARCH_NAV, type NavItem } from '@/config/patientNavigation'
import { BrandLockup } from '@/components/layout/Brand'
import { StatusDot } from '@/components/ui/Badge'
import { useApp } from '@/store/AppProvider'
import { useHealth } from '@/store/HealthProvider'
import { SafetyNote } from './Safety'
import { ThemeToggle } from '@/components/system/ThemeToggle'
import { formatClock } from '@/lib/format'

const COLLAPSE_KEY = 'lungcare.patient.sidebar'

/* ------------------------------------------------------------------ footer */

function ShellFooter({ isOnline }: { isOnline: boolean }) {
  const navigate = useNavigate()
  const { profile, clearAll } = useHealth()
  const [confirm, setConfirm] = useState(false)

  return (
    <div className="shrink-0 space-y-3 border-t border-hairline p-3">
      <div className="rounded-card border border-hairline bg-gradient-to-br from-surface-subtle to-tint-teal p-3">
        <div className="flex items-center gap-2">
          <StatusDot tone={isOnline ? 'success' : 'danger'} pulse />
          <p className="text-2xs font-semibold text-ink">
            {isOnline ? 'AI Service Ready' : 'Service Offline'}
          </p>
        </div>
        <p className="mt-1.5 text-[0.68rem] leading-relaxed text-ink-muted">
          {isOnline
            ? 'Connected to the trained screening service.'
            : 'The screening service is not reachable, so results are unavailable rather than simulated.'}
        </p>
      </div>

      <div className="flex items-center gap-2.5 rounded-button px-2 py-1.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-medical-500 to-teal-500 text-2xs font-bold text-white">
          {(profile.displayName || 'You').trim().charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.78rem] font-semibold text-ink">
            {profile.displayName || 'My health profile'}
          </p>
          <p className="truncate text-[0.68rem] text-ink-muted">Stored on this device</p>
        </div>
        <button
          type="button"
          onClick={() => setConfirm(true)}
          aria-label="Sign out and clear my data"
          title="Sign out and clear my data"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-danger/10 hover:text-danger focus-visible:ring-4 focus-visible:ring-medical-500/15"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      <button
        type="button"
        onClick={() => navigate('/research')}
        className="flex w-full items-center gap-2 rounded-button px-2.5 py-2 text-left text-[0.7rem] font-medium text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink-soft focus-visible:ring-4 focus-visible:ring-medical-500/15"
      >
        <FlaskConical className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Research / Developer Mode
      </button>

      <AnimatePresence>
        {confirm ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="rounded-card border border-danger/25 bg-tint-danger p-3"
            role="alertdialog"
            aria-label="Confirm sign out"
          >
            <p className="text-2xs font-semibold text-danger-ink">Sign out and clear your data?</p>
            <p className="mt-1 text-[0.68rem] leading-relaxed text-danger-ink">
              This removes your profile, symptoms, healthy steps, care items and questions from
              this device. It cannot be undone.
            </p>
            <div className="mt-2.5 flex gap-1.5">
              <button
                type="button"
                onClick={() => setConfirm(false)}
                className="rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-[0.68rem] font-semibold text-ink-soft hover:bg-medical-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  clearAll()
                  setConfirm(false)
                  navigate('/')
                  window.location.reload()
                }}
                className="rounded-lg bg-danger px-2.5 py-1.5 text-[0.68rem] font-semibold text-white hover:bg-[#C45151]"
              >
                Sign out
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

/* ----------------------------------------------------------------- sidebar */

function NavRow({ item, collapsed, onNavigate }: { item: NavItem; collapsed: boolean; onNavigate?: () => void }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-button px-3 py-2.5 text-[0.84rem] transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-medical-500/15',
          isActive
            ? 'bg-medical-50 font-semibold text-medical-600'
            : 'font-medium text-ink-soft hover:bg-surface-subtle hover:text-ink',
          collapsed && 'justify-center px-0',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? (
            <motion.span
              layoutId="patient-nav-indicator"
              className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-medical-500"
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              aria-hidden
            />
          ) : null}
          <item.icon
            className={cn(
              'h-[18px] w-[18px] shrink-0 transition-colors',
              isActive ? 'text-medical-500' : 'text-ink-muted group-hover:text-ink-soft',
            )}
            aria-hidden
          />
          {collapsed ? <span className="sr-only">{item.label}</span> : <span>{item.label}</span>}
        </>
      )}
    </NavLink>
  )
}

function PatientSidebar({
  collapsed,
  onToggleCollapse,
  onNavigate,
  className,
}: {
  collapsed: boolean
  onToggleCollapse: () => void
  onNavigate?: () => void
  className?: string
}) {
  const { isOnline } = useApp()

  return (
    <aside
      className={cn('flex h-full flex-col border-r border-hairline bg-surface', className)}
      aria-label="Main navigation"
    >
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b border-hairline',
          collapsed ? 'justify-center px-3' : 'justify-between px-4',
        )}
      >
        <BrandLockup compact={collapsed} />
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          className="hidden h-8 w-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-medical-50 hover:text-medical-600 focus-visible:ring-4 focus-visible:ring-medical-500/15 xl:grid"
        >
          <ChevronLeft
            className={cn('h-4 w-4 transition-transform duration-200', collapsed && 'rotate-180')}
            aria-hidden
          />
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
        <ul className="space-y-0.5">
          {PATIENT_NAV.map((item) => (
            <li key={item.to}>
              <NavRow item={item} collapsed={collapsed} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>

        <div className="mt-6 border-t border-hairline pt-5">
          {collapsed ? (
            <div className="mx-auto mb-2 h-px w-6 bg-hairline" aria-hidden />
          ) : (
            <p className="mb-2 px-3 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-ink-muted/80">
              Research
            </p>
          )}
          <ul className="space-y-0.5">
            {RESEARCH_NAV.slice(0, 1).map((item) => (
              <li key={item.to}>
                <NavRow item={item} collapsed={collapsed} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <ShellFooter isOnline={isOnline} />
    </aside>
  )
}

/* ------------------------------------------------------------------ header */

function PatientHeader({ onOpenNav }: { onOpenNav: () => void }) {
  const location = useLocation()
  const { isResolving, isOnline, prediction } = useApp()
  const { profile, onboarded } = useHealth()
  void prediction

  const current =
    PATIENT_NAV.find((item) =>
      item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to),
    ) ?? PATIENT_NAV[0]

  const name = profile.displayName.trim()

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-hairline bg-surface/92 px-4 backdrop-blur-md sm:px-6 no-print">
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Open navigation"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-button border border-hairline bg-surface text-ink-soft transition-colors hover:border-medical-200 hover:text-medical-600 focus-visible:ring-4 focus-visible:ring-medical-500/15 lg:hidden"
      >
        <Menu className="h-[18px] w-[18px]" aria-hidden />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-[0.95rem] font-semibold text-ink">{current.label}</h1>
        <p className="hidden truncate text-2xs text-ink-muted sm:block">
          {onboarded ? `Let's take care of your lung health, ${name || 'there'}.` : current.description}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="hidden items-center gap-2 rounded-button border border-hairline bg-surface px-3 py-1.5 sm:flex">
          <StatusDot tone={isResolving ? 'neutral' : isOnline ? 'success' : 'danger'} pulse />
          <span className="text-2xs font-semibold text-ink">
            {isResolving ? 'Connecting' : isOnline ? 'AI Service Ready' : 'Service Offline'}
          </span>
        </div>
        <span className="hidden text-2xs text-ink-muted md:inline">
          {formatClock(new Date())}
        </span>
        <ThemeToggle />
      </div>
    </header>
  )
}

/* -------------------------------------------------------------- mobile nav */

function PatientMobileNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden no-print"
    >
      <ul className="grid grid-cols-5">
        {MOBILE_NAV.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 px-1 py-2.5 text-[0.62rem] font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-medical-500/15',
                  isActive ? 'text-medical-600' : 'text-ink-muted',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn('h-[19px] w-[19px]', isActive && 'text-medical-500')}
                    aria-hidden
                  />
                  <span className={cn('truncate', isActive && 'font-semibold')}>{item.shortLabel}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/* ------------------------------------------------------------------ shell */

function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-canvas" />
      <div className="absolute inset-0 bg-glow-medical" />
      <div className="absolute inset-0 bg-grid-faint opacity-[0.55]" />
    </div>
  )
}

export function PatientShell() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(COLLAPSE_KEY) === 'true'
    } catch {
      return false
    }
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => setMobileOpen(false), [location.pathname])
  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSE_KEY, String(collapsed))
    } catch {
      /* ignore */
    }
  }, [collapsed])

  return (
    <div className="min-h-screen">
      <Backdrop />

      <div className="flex min-h-screen">
        <div
          className={cn(
            'sticky top-0 hidden h-screen shrink-0 transition-[width] duration-250 ease-out lg:block',
            collapsed ? 'w-[76px]' : 'w-[272px]',
          )}
        >
          <PatientSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((v) => !v)} />
        </div>

        <AnimatePresence>
          {mobileOpen ? (
            <div className="fixed inset-0 z-50 lg:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="absolute inset-0 bg-viewer/35"
                onClick={() => setMobileOpen(false)}
                aria-hidden
              />
              <motion.div
                initial={{ x: -290 }}
                animate={{ x: 0 }}
                exit={{ x: -290 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-y-0 left-0 w-[276px] shadow-panel"
              >
                <PatientSidebar
                  collapsed={false}
                  onToggleCollapse={() => setMobileOpen(false)}
                  onNavigate={() => setMobileOpen(false)}
                />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation"
                  className="absolute right-3 top-4 grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-medical-50"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </motion.div>
            </div>
          ) : null}
        </AnimatePresence>

        <div className="flex min-w-0 flex-1 flex-col">
          <PatientHeader onOpenNav={() => setMobileOpen(true)} />

          <main className="flex-1 px-4 pb-24 pt-6 sm:px-6 lg:pb-10">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto w-full max-w-[1180px]"
            >
              <Outlet />
            </motion.div>
          </main>

          <footer className="border-t border-hairline bg-surface/70 px-4 py-5 sm:px-6 no-print">
            <div className="mx-auto max-w-[1180px] space-y-4">
              <SafetyNote />
              <p className="text-2xs text-ink-muted">
                <span className="font-semibold text-ink-soft">LungCare AI</span> — Educational &amp;
                Research Prototype | Not a Medical Diagnostic Tool
              </p>
            </div>
          </footer>
        </div>
      </div>

      <PatientMobileNav />
    </div>
  )
}
