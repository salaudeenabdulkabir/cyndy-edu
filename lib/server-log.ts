// Keep credentials, SQL parameters, applicant answers and document URLs out of logs.
export function serverLog(scope: string, error: unknown) {
  const candidate = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
  const code = /^[A-Z0-9_]{2,40}$/.test(candidate) ? candidate : 'UNEXPECTED_ERROR'
  console.error(scope, { code })
}
