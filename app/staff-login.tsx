'use client'
import { usePortalFetch } from '@/lib/use-portal-fetch'

import { SignIn, useAuth, useClerk } from '@clerk/nextjs'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function StaffLogin({ portal }: { portal: 'admin' | 'worker' }) {
  const fetch = usePortalFetch()
  const { isLoaded, isSignedIn } = useAuth()
  const { signOut } = useClerk()
  const router = useRouter()
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)
  const [admin, setAdmin] = useState(false)
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(0)
  const destination = portal === 'admin' ? '/admin/login' : '/worker/login'

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    const controller = new AbortController()
    setChecking(true); setError(''); setAdmin(false)
    fetch('/api/auth/session', { cache: 'no-store', signal: controller.signal }).then(async response => {
      const account = await response.json()
      if (!response.ok) throw new Error(account.error || 'Unable to verify your account.')
      if (portal === 'admin') {
        if (account.role !== 'admin') throw new Error('This account is not an administrator. Switch accounts or contact support.')
        setAdmin(true)
      } else {
        if (!['worker', 'admin'].includes(account.role)) throw new Error('This account does not have staff access. Switch accounts or contact support.')
        router.replace(account.role === 'admin' ? '/admin/login' : account.passwordChangeRequired ? '/worker/change-password' : '/worker')
      }
    }).catch(failure => {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Unable to verify account.')
    }).finally(() => { if (!controller.signal.aborted) setChecking(false) })
    return () => controller.abort()
  }, [isLoaded, isSignedIn, portal, router, retry, fetch])

  async function verifyPin(event: React.FormEvent) {
    event.preventDefault()
    if (busy || !/^\d{6}$/.test(pin)) return
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/auth/admin-pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Unable to verify PIN.')
      router.replace('/admin'); router.refresh()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to verify PIN.')
      setPin('')
    } finally { setBusy(false) }
  }

  return <main className="flex min-h-screen items-center justify-center bg-navy px-4 py-10">
    <section className="w-full max-w-md space-y-6">
      <header className="text-center"><h1 className="font-heading text-4xl text-gold">Cyndy</h1><p className="mt-2 text-white">{portal === 'admin' ? 'Administrator' : 'Worker'} sign in</p></header>
      {!isLoaded ? <p role="status" className="text-center text-white">Loading secure sign in…</p> : !isSignedIn ?
        <SignIn routing="hash" forceRedirectUrl={destination} signUpUrl="/sign-up" /> :
        <div className="space-y-5 rounded-2xl bg-white p-6">
          {checking && <p role="status">Checking account access…</p>}
          {admin && <form onSubmit={verifyPin} className="space-y-4">
            <h2 className="font-heading text-2xl">Enter security PIN</h2>
            <label className="block" htmlFor="admin-pin">Six-digit security PIN</label>
            <input id="admin-pin" type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} disabled={busy} className="w-full rounded-lg border p-3 text-center text-xl tracking-widest" />
            <button disabled={busy || pin.length !== 6} className="w-full rounded-lg bg-gold p-3 font-semibold text-navy disabled:opacity-50">{busy ? 'Verifying…' : 'Verify PIN'}</button>
            <p className="text-sm text-text-secondary">Three attempts are allowed before a 15-minute lockout.</p>
          </form>}
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-danger">{error}</p>}
          {!checking && !admin && <button onClick={() => setRetry(value => value + 1)} className="underline">Check access again</button>}
          <button disabled={busy} onClick={() => void signOut({ redirectUrl: destination })} className="block text-sm underline">Sign out and use another account</button>
        </div>}
      <footer className="flex justify-between text-sm text-white"><Link href="/">Back to home</Link><Link href="/contact">Contact support</Link></footer>
    </section>
  </main>
}
