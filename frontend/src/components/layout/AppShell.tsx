import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'
import { APP } from '@/lib/clinical'
import { cn } from '@/lib/cn'

const COLLAPSE_KEY = 'lungcare.sidebar.collapsed'

function Footer() {
  return (
    <footer className="border-t border-hairline bg-surface/70 px-4 py-4 sm:px-6 no-print">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-2xs text-ink-muted">
          <span className="font-semibold text-ink-soft">{APP.name}</span> — {APP.footer}
        </p>
        <p className="max-w-2xl text-2xs leading-relaxed text-ink-muted">{APP.disclaimer}</p>
      </div>
    </footer>
  )
}

/** Faint clinical grid + soft radial glow. Extremely subtle, never competing with content. */
function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-canvas" />
      <div className="absolute inset-0 bg-glow-medical" />
      <div className="absolute inset-0 bg-grid-faint opacity-[0.55]" />
      <div
        className="absolute -right-24 top-24 h-72 w-72 rounded-full opacity-[0.35] blur-3xl"
        style={{ background: 'radial-gradient(closest-side, rgba(15,139,141,0.16), transparent)' }}
      />
    </div>
  )
}

export function AppShell() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(COLLAPSE_KEY) === 'true'
    } catch {
      return false
    }
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

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
        {/* Desktop sidebar */}
        <div
          className={cn(
            'sticky top-0 hidden h-screen shrink-0 transition-[width] duration-250 ease-out lg:block',
            collapsed ? 'w-[76px]' : 'w-[264px]',
          )}
        >
          <Sidebar
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((value) => !value)}
          />
        </div>

        {/* Mobile drawer */}
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
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-y-0 left-0 w-[268px] shadow-panel"
              >
                <Sidebar
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
          <Header onOpenNav={() => setMobileOpen(true)} />

          <main className="flex-1 px-4 pb-24 pt-6 sm:px-6 lg:pb-10">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto w-full max-w-[1500px]"
            >
              <Outlet />
            </motion.div>
          </main>

          <Footer />
        </div>
      </div>

      <MobileNav />
    </div>
  )
}
