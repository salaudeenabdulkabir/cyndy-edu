'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useAutoSave, useWizard } from '../wizard-context'

type Field = { key: string; label: string; type?: string }
interface Props { title: string; description: string; fields: Field[] }
type Entry = Record<string, string>

export default function OptionalExperience({ title, description, fields }: Props) {
  const { setIsDirty, initialData } = useWizard()
  const sectionKey = title.toLowerCase().replace(/[^a-z]+/g, '_')
  const sections = (initialData.sections ?? {}) as Record<string, { notApplicable: boolean; entries: Entry[] }>
  const saved = sections[sectionKey]
  const [notApplicable, setNotApplicable] = useState(saved?.notApplicable ?? false)
  const [entries, setEntries] = useState<Entry[]>(saved?.entries ?? [Object.fromEntries(fields.map((field) => [field.key, '']))])
  useAutoSave({ sections: { ...sections, [sectionKey]: { notApplicable, entries } } })
  const update = (index: number, key: string, value: string) => {
    setEntries((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, [key]: value } : entry))
    setIsDirty(true)
  }
  return <div className="space-y-8"><div><h1 className="mb-2 font-heading text-3xl font-bold text-navy">{title}</h1><p className="text-text-secondary">{description}</p></div><label className="flex items-center gap-3 rounded-lg border border-border bg-white p-4 text-sm text-text-secondary"><input type="checkbox" checked={notApplicable} onChange={(event) => { setNotApplicable(event.target.checked); setIsDirty(true) }} className="h-4 w-4 accent-gold" /> Not applicable</label>{!notApplicable && <><div className="space-y-4">{entries.map((entry, index) => <section key={`entry-${index}`} className="rounded-xl border border-border bg-gray-50 p-4 sm:p-6"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold text-navy">Entry {index + 1}</h2>{entries.length > 1 && <button type="button" onClick={() => setEntries((current) => current.filter((_, entryIndex) => entryIndex !== index))} className="flex items-center gap-1 text-sm text-danger"><Trash2 size={15} strokeWidth={1.5} /> Remove</button>}</div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{fields.map((field) => <label key={field.key} className="text-sm font-semibold text-navy"><span className="mb-2 block">{field.label}</span><input type={field.type ?? 'text'} value={entry[field.key]} onChange={(event) => update(index, field.key, event.target.value)} aria-label={field.label} placeholder={field.label} className="w-full rounded-lg border border-border bg-white px-3 py-3 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold-dim" /></label>)}</div></section>)}</div><button type="button" onClick={() => setEntries((current) => [...current, Object.fromEntries(fields.map((field) => [field.key, '']))])} className="flex items-center gap-2 rounded-lg border border-gold px-4 py-3 text-sm font-semibold text-gold hover:bg-gold-dim"><Plus size={16} strokeWidth={1.5} /> Add another</button></>}</div>
}
