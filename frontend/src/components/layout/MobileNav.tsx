import { NavLink } from 'react-router-dom'
import { MOBILE_NAV_ITEMS } from '@/config/navigation'
import { cn } from '@/lib/cn'

/** Mobile bottom navigation — the five highest-traffic destinations. */
export function MobileNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden no-print"
    >
      <ul className="grid grid-cols-5">
        {MOBILE_NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/research'}
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
                    className={cn('h-[18px] w-[18px]', isActive && 'text-medical-500')}
                    aria-hidden
                  />
                  <span className={cn('truncate', isActive && 'font-semibold')}>{item.label.split(' ')[0]}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
