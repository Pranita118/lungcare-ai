let counter = 0

/** Readable, prefixed identifiers (e.g. PRED-8F3K21). */
export function createId(prefix: string): string {
  counter += 1
  const stamp = Date.now().toString(36).toUpperCase().slice(-5)
  const salt = Math.random().toString(36).toUpperCase().slice(2, 5)
  return `${prefix}-${stamp}${salt}${counter % 10}`
}

export function createPatientId(): string {
  const stamp = Date.now().toString(36).toUpperCase().slice(-4)
  const salt = Math.random().toString(36).toUpperCase().slice(2, 4)
  return `LC-${stamp}${salt}`
}
