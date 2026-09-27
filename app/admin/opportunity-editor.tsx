'use client'
import { useCallback, useEffect, useState } from 'react'
import { usePortalFetch } from '@/lib/use-portal-fetch'

type Opportunity = { id?: string; title: string; description: string; destinationLabel: string; schoolLabel: string; level: string; deadline: string; scholarshipAvailable: boolean; opportunityStatus: 'draft' | 'open' | 'closed' }
const empty: Opportunity = { title: '', description: '', destinationLabel: '', schoolLabel: '', level: '', deadline: '', scholarshipAvailable: true, opportunityStatus: 'draft' }
export default function OpportunityEditor({ onSaved }: { onSaved: (id: string) => void }) {
  const fetch = usePortalFetch()
  const [items, setItems] = useState<Opportunity[]>([])
  const [form, setForm] = useState<Opportunity>(empty)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const load = useCallback(async () => {
    setError('')
    try {
      const response = await fetch('/api/admin/opportunities'); const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setItems(data.opportunities)
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load opportunities') }
  }, [fetch])
  useEffect(() => { void load() }, [load])
  return <div className="space-y-5">
    <form className="grid gap-4 rounded-xl border bg-white p-5 sm:grid-cols-2" onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError(''); setMessage('')
      try {
        const response = await fetch('/api/admin/opportunities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        const data = await response.json(); if (!response.ok) throw new Error(data.error)
        setForm(empty); setMessage('Opportunity saved. Add a country price and assign its documents before accepting applications.'); await load(); onSaved(data.opportunity.id)
      } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save opportunity') } finally { setBusy(false) }
    }}>
      <h2 className="text-xl font-bold sm:col-span-2">{form.id ? 'Edit opportunity' : 'Create an opportunity'}</h2>
      <p className="text-sm text-text-secondary sm:col-span-2">Type the name directly. A school or country record is not required. Start with a draft, add prices and documents, then change its status to Open.</p>
      {error && <p role="alert" className="text-danger sm:col-span-2">{error} <button type="button" onClick={() => void load()} className="underline">Reload opportunities</button></p>}
      {message && <p role="status" className="text-green-800 sm:col-span-2">{message}</p>}
      <label className="sm:col-span-2">Opportunity name<input required minLength={2} maxLength={160} placeholder="e.g. Chevening, Erasmus Mundus, Stipendium Hungaricum" className="mt-2 w-full" value={form.title} onChange={e => setForm({...form, title: e.target.value})}/></label>
      <label>Opportunity type<select className="mt-2 w-full" value={form.scholarshipAvailable ? 'scholarship' : 'admission'} onChange={e => setForm({...form, scholarshipAvailable: e.target.value === 'scholarship'})}><option value="scholarship">Scholarship</option><option value="admission">University admission</option></select></label>
      <label>Status<select className="mt-2 w-full" value={form.opportunityStatus} onChange={e => setForm({...form, opportunityStatus: e.target.value as Opportunity['opportunityStatus']})}><option value="draft">Draft — hidden from applicants</option><option value="open">Open — visible to applicants</option><option value="closed">Closed — no new applications</option></select></label>
      <label className="sm:col-span-2">Description and eligibility<textarea maxLength={4000} rows={4} className="mt-2 w-full" placeholder="Explain the opportunity, who can apply and what Cyndy's service includes." value={form.description} onChange={e => setForm({...form, description: e.target.value})}/></label>
      <label>Destination countries (optional)<input maxLength={300} placeholder="e.g. United Kingdom, or Multiple European countries" className="mt-2 w-full" value={form.destinationLabel} onChange={e => setForm({...form, destinationLabel: e.target.value})}/></label>
      <label>School or consortium (optional)<input maxLength={200} className="mt-2 w-full" value={form.schoolLabel} onChange={e => setForm({...form, schoolLabel: e.target.value})}/></label>
      <label>Study level (optional)<input maxLength={100} placeholder="e.g. Master's" className="mt-2 w-full" value={form.level} onChange={e => setForm({...form, level: e.target.value})}/></label>
      <label>Application deadline (optional)<input type="date" className="mt-2 w-full" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})}/></label>
      <div className="flex flex-wrap gap-3 sm:col-span-2"><button disabled={busy} className="rounded-lg bg-navy px-5 py-3 font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : form.id ? 'Save opportunity changes' : 'Create opportunity'}</button>{form.id && <button type="button" disabled={busy} onClick={() => { setForm(empty); setMessage(''); setError('') }} className="rounded-lg border px-5 py-3">Cancel editing</button>}</div>
    </form>
    <section aria-label="Manage opportunities"><h2 className="mb-3 text-xl font-bold">Your opportunities</h2><p className="mb-4 text-sm text-text-secondary">Closing an opportunity preserves existing applications and payments. Manage required uploads in the Documents section.</p><div className="grid gap-3 sm:grid-cols-2">{items.map(item => <article key={item.id} className="rounded-xl border bg-white p-4"><h3 className="font-bold break-words">{item.title}</h3><p className="mt-2 text-sm capitalize">{item.opportunityStatus} · {item.scholarshipAvailable ? 'Scholarship' : 'Admission'}{item.deadline ? ' · Deadline ' + item.deadline : ''}</p><button disabled={busy} type="button" className="mt-3 underline" onClick={() => { setForm({id:item.id,title:item.title,description:item.description || '',destinationLabel:item.destinationLabel || '',schoolLabel:item.schoolLabel || '',level:item.level || '',deadline:item.deadline || '',scholarshipAvailable:!!item.scholarshipAvailable,opportunityStatus:item.opportunityStatus});setError('');setMessage('');window.scrollTo({top:0,behavior:'smooth'}) }}>Edit opportunity</button></article>)}</div></section>
  </div>
}
