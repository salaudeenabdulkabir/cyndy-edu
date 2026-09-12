'use client'

import { ClerkProvider } from '@clerk/nextjs'
import { ReactNode, useEffect } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])
  return (
    <ClerkProvider>
      {children}
    </ClerkProvider>
  )
}
