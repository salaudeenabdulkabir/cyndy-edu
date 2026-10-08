// Keep credentials, SQL parameters, applicant answers and document URLs out of logs.
export function serverLog(scope: string, error: unknown) {
  const cause = error && typeof error === 'object' && 'cause' in error ? error.cause : error
  const candidate = cause && typeof cause === 'object' && 'code' in cause ? String(cause.code) : ''
  const code = /^[A-Z0-9_]{2,40}$/.test(candidate) ? candidate : 'UNEXPECTED_ERROR'
  console.error(scope, { code })
}
