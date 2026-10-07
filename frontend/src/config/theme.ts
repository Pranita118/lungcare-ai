/**
 * Theme tokens.
 *
 * Colour values live in CSS custom properties so that light and dark share one
 * set of Tailwind classes. Switching themes flips a single class on <html>, which
 * means there is exactly one source of truth for every surface, border and text
 * colour in the application.
 *
 * The clinical blue/teal brand hues are deliberately identical in both themes so
 * that status colours (green / amber / red) keep their meaning and never invert
 * in a way that could mislead someone reading a risk level.
 */

export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'lungcare.theme'

export const THEMES: Theme[] = ['light', 'dark']
