'use client'
import { useState } from 'react'
export default function PackageEditor({ clientId, initialTotal, onSaved }: { clientId: string; initialTotal: number; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  return <div className="mt-2"><button type="button" className="text-sm underline text-navy" onClick={() => setOpen(!open)}>Configure package</button>
    {open && <form className="mt-3 grid gap-2 min-w-64" onSubmit={async event => {
      event.preventDefault(); setSaving(true); setError('')
      const data = new FormData(event.currentTarget)
      try {
        const response = await fetch('/api/admin/packages', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, totalApplications: Number(data.get('totalApplications')), amountPaid: data.get('amountPaid'), currency: data.get('currency'), notes: data.get('notes') }) })
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Could not save package')
        setOpen(false); onSaved()
      } catch (err) { setError(err instanceof Error ? err.message : 'Could not save package') } finally { setSaving(false) }
    }}>
      <label>Applications<select name="totalApplications" defaultValue={initialTotal || 1}>{[1,2,3].map(n => <option key={n} value={n} disabled={n < initialTotal}>{n}</option>)}</select></label>
      <label>Agreed amount<input name="amountPaid" type="number" min="0" step="0.01" required /></label>
      <label>Currency<select name="currency">{['NGN','USD','GBP','EUR'].map(c => <option key={c}>{c}</option>)}</select></label>
      <label>Internal notes<textarea name="notes" maxLength={2000} /></label>
      <p className="text-xs">Saving a package does not confirm a payment.</p>
      {error && <p role="alert" className="text-danger">{error}</p>}
      <button disabled={saving} className="rounded bg-gold p-2 text-navy">{saving ? 'Saving…' : 'Save package'}</button>
    </form>}
  </div>
}
