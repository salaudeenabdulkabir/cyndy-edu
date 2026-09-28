'use client'
import { usePortalFetch } from '@/lib/use-portal-fetch'
import { useState } from 'react'
export default function ChangePassword() {
  const fetch = usePortalFetch()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return <main className="mx-auto max-w-lg px-6 py-20"><h1 className="font-heading text-4xl font-bold text-navy">Set your own password</h1><p className="mt-4 text-text-secondary">Replace your temporary password before accessing assigned applications.</p>
    <form className="mt-8 grid gap-5" onSubmit={async event => {
      event.preventDefault(); const data = new FormData(event.currentTarget); setError('')
      if (data.get('newPassword') !== data.get('confirmPassword')) { setError('The new passwords do not match.'); return }
      setBusy(true)
      try { const response = await fetch('/api/auth/worker-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: data.get('currentPassword'), newPassword: data.get('newPassword') }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); window.location.href = '/worker' } catch (err) { setError(err instanceof Error ? err.message : 'Unable to change password') } finally { setBusy(false) }
    }}><label>Current password<input name="currentPassword" type="password" autoComplete="current-password" required className="w-full" /></label><label>New password<input name="newPassword" type="password" autoComplete="new-password" minLength={12} maxLength={100} required className="w-full" /></label><label>Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={12} maxLength={100} required className="w-full" /></label>
      {error && <p role="alert" className="text-danger">{error}</p>}<button disabled={busy} className="rounded-lg bg-gold p-3 font-semibold text-navy">{busy ? 'Saving…' : 'Save password and continue'}</button></form>
  </main>
}
