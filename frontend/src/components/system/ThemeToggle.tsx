import { Moon, Sun } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from '@/store/ThemeProvider'
import { cn } from '@/lib/cn'

/**
 * Light / dark switch, pinned to the top-right of every header.
 *
 * The choice is persisted and, until the person picks one, follows the operating
 * system preference.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={cn(
        'group relative grid h-9 w-9 shrink-0 place-items-center rounded-button border border-hairline bg-surface text-ink-soft transition-colors duration-200',
        'hover:border-medical-300 hover:text-medical-600',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-medical-500/15',
        className,
      )}
    >
      <span className="relative grid h-4 w-4 place-items-center">
        <Sun
          className={cn(
            'absolute h-4 w-4 transition-all duration-300',
            isDark ? 'scale-50 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100',
          )}
          aria-hidden
        />
        <Moon
          className={cn(
            'absolute h-4 w-4 transition-all duration-300',
            isDark ? 'scale-100 rotate-0 opacity-100' : 'scale-50 -rotate-90 opacity-0',
          )}
          aria-hidden
        />
      </span>
      <motion.span
        layout
        className="pointer-events-none absolute inset-0 rounded-button ring-1 ring-inset ring-transparent transition-colors group-hover:ring-medical-200 dark:group-hover:ring-medical-500/30"
        aria-hidden
      />
    </button>
  )
}
