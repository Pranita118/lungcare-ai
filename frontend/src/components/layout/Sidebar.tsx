import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, ServerCog, WifiOff, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { NAV_GROUPS, SETTINGS_ITEM } from '@/config/navigation'
import { BrandLockup } from './Brand'
import { StatusDot } from '@/components/ui/Badge'
import { useApp } from '@/store/AppProvider'
import type { ApiMode } from '@/types'

function NavRow({
  to,
  label,
  icon: Icon,
  onNavigate,
  collapsed,
}: {
  to: string
  label: string
  icon: LucideIcon
  onNavigate?: () => void
  collapsed?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={to === '/research'}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-button px-3 py-2.5 text-[0.83rem] transition-all duration-150',
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
              layoutId="nav-indicator"
              className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-medical-500"
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              aria-hidden
            />
          ) : null}
          <Icon
            className={cn(
              'h-[17px] w-[17px] shrink-0 transition-colors',
              isActive ? 'text-medical-500' : 'text-ink-muted group-hover:text-ink-soft',
            )}
            aria-hidden
          />
          {collapsed ? (
            <span className="sr-only">{label}</span>
          ) : (
            <span className="truncate">{label}</span>
          )}
        </>
      )}
    </NavLink>
  )
}

function SystemStatusCard({ mode, collapsed }: { mode: ApiMode; collapsed: boolean }) {
  const isLive = mode === 'live'
  return (
    <div
      className={cn(
        'rounded-card border border-hairline bg-gradient-to-br from-sheen-from to-sheen-to p-3',
        collapsed && 'px-2 py-2.5',
      )}
    >
      <div className="flex items-center gap-2">
        <StatusDot tone={isLive ? 'success' : 'warning'} pulse />
        {collapsed ? null : (
          <p className="text-2xs font-semibold text-ink">
            {isLive ? 'AI System Ready' : 'Service Offline'}
          </p>
        )}
      </div>
      {!collapsed ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-[0.68rem] leading-relaxed text-ink-muted">
          {isLive ? (
            <ServerCog className="mt-px h-3 w-3 shrink-0" aria-hidden />
          ) : (
            <WifiOff className="mt-px h-3 w-3 shrink-0" aria-hidden />
          )}
          {isLive
            ? 'Connected to the trained ML service.'
            : 'The ML service is not connected, so no results are available.'}
        </p>
      ) : (
        <span className="sr-only">{isLive ? 'AI System Ready' : 'Service Offline'}</span>
      )}
    </div>
  )
}

export function Sidebar({
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
  const { mode } = useApp()

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-hairline bg-surface',
        className,
      )}
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
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden h-8 w-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-medical-50 hover:text-medical-600 focus-visible:ring-4 focus-visible:ring-medical-500/15 xl:grid"
        >
          <ChevronLeft
            className={cn('h-4 w-4 transition-transform duration-200', collapsed && 'rotate-180')}
            aria-hidden
          />
        </button>
      </div>

      <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {collapsed ? (
              <div className="mx-auto mb-2 h-px w-6 bg-hairline" aria-hidden />
            ) : (
              <p className="mb-2 px-3 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-ink-muted/80">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavRow
                    to={item.to}
                    label={item.label}
                    icon={item.icon}
                    collapsed={collapsed}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          {collapsed ? (
            <div className="mx-auto mb-2 h-px w-6 bg-hairline" aria-hidden />
          ) : null}
          <ul className="space-y-0.5">
            <li>
              <NavRow
                to={SETTINGS_ITEM.to}
                label={SETTINGS_ITEM.label}
                icon={SETTINGS_ITEM.icon}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            </li>
          </ul>
        </div>
      </nav>

      <div className={cn('shrink-0 space-y-3 border-t border-hairline p-3', collapsed && 'px-2')}>
        <SystemStatusCard mode={mode} collapsed={collapsed} />
        <div
          className={cn(
            'flex items-center gap-2.5 rounded-button px-2 py-1.5',
            collapsed && 'justify-center px-0',
          )}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-medical-500 to-teal-500 text-2xs font-bold text-white">
            LC
          </span>
          {collapsed ? null : (
            <div className="min-w-0">
              <p className="truncate text-[0.78rem] font-semibold text-ink">Researcher</p>
              <p className="truncate text-[0.68rem] text-ink-muted">Educational prototype</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
