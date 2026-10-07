import plugin from 'tailwindcss/plugin'

/**
 * Translucent surface utilities.
 *
 * Tailwind cannot apply an opacity modifier to a colour that is a bare CSS
 * variable — it silently drops the class, which would leave sticky headers and
 * tooltips with no background at all. These utilities generate the equivalent
 * `color-mix()` rule instead, with a solid-surface fallback for browsers that do
 * not support it.
 */
const SURFACE_LEVELS = [50, 60, 70, 80, 90, 92, 95, 97]

const translucentSurface = plugin(({ addUtilities }) => {
  const utilities: Record<string, unknown> = {}

  for (const level of SURFACE_LEVELS) {
    utilities[`.bg-surface\\/${level}`] = {
      backgroundColor: 'var(--surface)',
      '@supports (color: color-mix(in srgb, red 50%, blue))': {
        backgroundColor: `color-mix(in srgb, var(--surface) ${level}%, transparent)`,
      },
    }
  }

  addUtilities(utilities)
})

export default translucentSurface
