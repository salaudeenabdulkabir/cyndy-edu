'use client'
import { useEffect, useState } from 'react'
type Requirement = { id: string; name: string; description: string | null; acceptedFormats: string[] | null; maxSizeMb: number | null; isGlobal: boolean | null }
export default function DocumentManager() {
  const [rows, setRows] = useState<Requirement[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function load() { try { const response = await fetch('/api/admin/document-types'); const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Unable to load requirements'); setRows(body.documentTypes) } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load requirements') } }
  useEffect(() => { void load() }, [])
  return <section><h1 className="font-heading text-4xl font-bold text-navy">Document checklist</h1><p className="mt-2 text-text-secondary">Global requirements apply to every application. Changes affect applications that have not yet been submitted.</p>
    {error && <p role="alert" className="my-4 text-danger">{error}</p>}
    <form className="my-6 grid gap-4 rounded-xl bg-white border p-5 sm:grid-cols-2" onSubmit={async event => {
      event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); setBusy(true); setError('')
      try { const response = await fetch('/api/admin/document-types', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: data.get('name'), description: data.get('description'), acceptedFormats: data.getAll('formats'), maxSizeMb: Number(data.get('maxSizeMb')), isGlobal: true }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); form.reset(); await load() } catch (err) { setError(err instanceof Error ? err.message : 'Could not save requirement') } finally { setBusy(false) }
    }}><label>Document name<input name="name" required maxLength={120} className="w-full" /></label><label>Maximum size (MB)<input name="maxSizeMb" type="number" min={1} max={4} defaultValue={4} required /></label>
      <label className="sm:col-span-2">Instructions<textarea name="description" maxLength={1000} className="w-full" /></label><fieldset><legend>Accepted formats</legend><div className="flex gap-4">{['pdf','jpg','png'].map(format => <label key={format}><input type="checkbox" name="formats" value={format} defaultChecked /> {format.toUpperCase()}</label>)}</div></fieldset>
      <button disabled={busy} className="rounded bg-gold p-3 text-navy font-semibold">{busy ? 'Saving…' : 'Add global requirement'}</button></form>
    <ul className="divide-y rounded-xl border bg-white">{rows.map(row => <li key={row.id} className="p-4"><strong>{row.name}</strong><p className="text-sm text-text-secondary">{row.description}</p><p className="mt-1 text-xs">{row.isGlobal ? 'Every application' : 'Program-specific'} · {row.acceptedFormats?.join(', ').toUpperCase()} · Up to {row.maxSizeMb} MB</p></li>)}</ul>
  </section>
}
