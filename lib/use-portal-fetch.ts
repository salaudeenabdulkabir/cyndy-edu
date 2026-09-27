'use client'
import { useAuth } from '@clerk/nextjs'
import { useCallback } from 'react'

// Refresh the short-lived session before API calls, including background tabs.
// Restrict the destination so a session token can never be sent to another origin.
export function usePortalFetch() {
  const { getToken } = useAuth()
  return useCallback(async (path: string, options: RequestInit = {}) => {
    if (!path.startsWith('/api/') || path.includes('\\')) throw new Error('Invalid portal API path')
    const token = await getToken()
    const headers = new Headers(options.headers)
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return globalThis.fetch(path, { ...options, headers, credentials: 'same-origin' })
  }, [getToken])
}
