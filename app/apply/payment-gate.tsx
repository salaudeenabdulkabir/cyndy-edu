'use client'
import { usePortalFetch } from '@/lib/use-portal-fetch'
import { useCallback, useEffect, useState } from 'react'
import type { ReactNode, ChangeEvent } from 'react'
import { LockKeyhole, FileText, LoaderCircle } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
export function PaymentGate({ applicationId, children }: { applicationId: string; children: ReactNode }) {
  const fetch = usePortalFetch()
  const [fileName, setFileName] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<'loading' | 'pending' | 'uploaded' | 'confirmed'>('loading')
  const [error, setError] = useState('')
  const [rejection, setRejection] = useState('')
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/payments/receipt', { cache: 'no-store' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Unable to check payment status')
      setStatus(body.paymentConfirmed ? 'confirmed' : body.receipt && !body.receipt.rejectionReason ? 'uploaded' : 'pending')
      setFileName(body.receipt?.fileName ?? '')
      setRejection(body.receipt?.rejectionReason ?? '')
      setError('')
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to check payment status') }
  }, [fetch])
  useEffect(() => { void load(); const timer = setInterval(() => void load(), 30000); return () => clearInterval(timer) }, [load, applicationId])
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file || busy) return
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) || file.size === 0 || file.size > 4 * 1024 * 1024) { setError('Choose a PDF, JPG, or PNG up to 4MB.'); input.value = ''; return }
    setBusy(true); setError('')
    try {
      const form = new FormData(); form.append('file', file)
      const response = await fetch('/api/payments/receipt', { method: 'POST', body: form })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Receipt upload failed')
      setFileName(file.name); setStatus('uploaded'); setRejection('')
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Receipt upload failed') }
    finally { setBusy(false); input.value = '' }
  }
  if (status === 'confirmed') return <>{children}</>
  return <main className="flex  items-center justify-center bg-background p-4 sm:p-8">
    <section className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-lg sm:p-10" aria-labelledby="payment-heading">
      <div className="mb-6 flex justify-between"><LockKeyhole className="text-gold" size={28} strokeWidth={1.5} /><UserButton afterSignOutUrl="/" /></div>
      <h1 id="payment-heading" className="font-heading text-3xl text-navy">{status === 'loading' ? 'Checking payment' : status === 'uploaded' ? 'Receipt received' : 'Payment confirmation required'}</h1>
      <p className="mt-3 text-sm text-text-secondary">{status === 'uploaded' ? 'Your receipt is awaiting review. You can complete the other sections now; final submission requires confirmed payment.' : 'Upload your receipt for your existing package. You can save and continue with the form while payment is reviewed.'}</p>
      {rejection && <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-navy">Receipt needs attention: {rejection}. Please upload a replacement.</p>}
      {status === 'pending' && <label className="mt-6 block rounded-xl border border-dashed border-gold p-4"><span className="mb-3 flex items-center gap-2 text-sm font-semibold"><FileText size={18} strokeWidth={1.5} /> Upload payment receipt</span><input aria-label="Payment receipt" type="file" accept="application/pdf,image/jpeg,image/png" disabled={busy} onChange={upload} className="w-full min-w-0 text-sm" /><span className="mt-2 block text-xs text-text-secondary">PDF, JPG, or PNG · Up to 4MB</span></label>}
      {status === 'uploaded' && <p className="mt-5 break-words rounded-lg bg-blue-50 p-4 text-sm text-blue-900">{fileName}</p>}
      {busy && <p role="status" className="mt-4 flex items-center gap-2 text-sm"><LoaderCircle className="animate-spin" size={18} /> Uploading receipt…</p>}
      {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
      <button type="button" onClick={() => void load()} className="mt-5 text-sm font-semibold underline">Check status again</button>
      <p className="mt-6 text-sm text-text-secondary">Need help? <a href="/contact" className="underline">Contact support</a></p>
    </section>
  </main>
}
