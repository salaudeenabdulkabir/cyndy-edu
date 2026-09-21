/** Compare browser origins against deployment configuration, never forwarded headers. */
export function isAllowedRequestOrigin(origin: string | null, requestOrigin: string, configuredUrls: Array<string | undefined>): boolean {
  // Non-browser clients and same-origin requests can omit Origin.
  if (origin === null) return true
  const configured = configuredUrls.filter((value): value is string => Boolean(value))
  const candidates = configured.length ? configured : [requestOrigin]
  return candidates.some(value => {
    try {
      const url = new URL(value)
      return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password && origin === url.origin
    } catch {
      return false
    }
  })
}
