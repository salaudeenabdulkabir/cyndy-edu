'use client'

import { useState } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { useAutoSave, useWizard } from '../wizard-context'

interface Guardian { name: string; phone: string; relationship: string; address: string; postal: string; email: string }
const blankGuardian = (): Guardian => ({ name: '', phone: '', relationship: '', address: '', postal: '', email: '' })
const inputClass = 'w-full rounded-lg border border-border bg-white px-3 py-3 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold-dim'

export default function Guardians() {
  const { setIsDirty, initialData } = useWizard()
  const [guardians, setGuardians] = useState<Guardian[]>(() => initialData.guardians as Guardian[] ?? [blankGuardian()])
  useAutoSave({ guardians })
  const update = (index: number, field: keyof Guardian, value: string) => {
    setGuardians((current) => current.map((guardian, guardianIndex) => guardianIndex === index ? { ...guardian, [field]: value } : guardian))
    setIsDirty(true)
  }
  return <div className="space-y-8">
    <div><h1 className="mb-2 font-heading text-3xl font-bold text-navy">Legal Guardians</h1><p className="text-text-secondary">Provide the details of a parent or legal guardian who can be contacted about your application.</p></div>
    {guardians.map((guardian, index) => <section key={`guardian-${index}`} className="rounded-xl border border-border bg-gray-50 p-4 sm:p-6"><div className="mb-4 flex items-center justify-between"><h2 className="font-heading text-2xl font-bold text-navy">Guardian {index + 1}</h2>{index > 0 && <button type="button" onClick={() => setGuardians((current) => current.filter((_, guardianIndex) => guardianIndex !== index))} className="flex items-center gap-1 text-sm text-danger"><Trash2 size={15} strokeWidth={1.5} /> Remove</button>}</div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{([
      ['name', 'Full name *'], ['phone', 'Phone number *'], ['address', 'Address *'], ['postal', 'Postal code'], ['email', 'Email'],
    ] as const).map(([field, placeholder]) => <input key={field} value={guardian[field]} onChange={(event) => update(index, field, event.target.value)} aria-label={placeholder} placeholder={placeholder} className={`${inputClass} ${field === 'address' ? 'sm:col-span-2' : ''}`} />)}<select aria-label="Relationship" value={guardian.relationship} onChange={(event) => update(index, 'relationship', event.target.value)} className={inputClass}><option value="">Relationship *</option><option value="parent">Parent</option><option value="guardian">Legal guardian</option><option value="spouse">Spouse</option><option value="other">Other</option></select></div></section>)}
    {guardians.length < 2 && <button type="button" onClick={() => setGuardians((current) => [...current, blankGuardian()])} className="flex items-center gap-2 rounded-lg border border-gold px-4 py-3 text-sm font-semibold text-gold hover:bg-gold-dim"><Plus size={16} strokeWidth={1.5} /> Add guardian 2</button>}
  </div>
}
