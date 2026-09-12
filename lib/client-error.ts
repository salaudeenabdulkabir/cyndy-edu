export function clientError(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error && 'errors' in error && Array.isArray(error.errors)) {
    const first = error.errors[0] as { longMessage?: unknown; message?: unknown } | undefined
    if (typeof first?.longMessage === 'string') return first.longMessage
    if (typeof first?.message === 'string') return first.message
  }
  return error instanceof Error ? error.message : fallback
}
