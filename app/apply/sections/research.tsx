'use client'

import { useState } from 'react'
import { useAutoSave, useWizard } from '../wizard-context'

export default function ResearchExperience() {
  const { setIsDirty, initialData } = useWizard()
  const [formData, setFormData] = useState({ projectTitle: String(initialData.projectTitle ?? ''), year: String(initialData.year ?? ''), interests: String(initialData.interests ?? '') })
  useAutoSave(formData)
  const update = (field: keyof typeof formData, value: string) => { setFormData((current) => ({ ...current, [field]: value })); setIsDirty(true) }
  const inputClass = 'w-full rounded-lg border border-border bg-white px-4 py-3 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold-dim'
  return <div className="space-y-8"><div><h2 className="mb-2 font-heading text-3xl font-bold text-navy">Research Experience</h2><p className="text-text-secondary">Tell us about your research background. A strong research profile can improve admission chances.</p></div><div className="grid grid-cols-1 gap-5 sm:grid-cols-2"><label><span className="mb-2 block text-sm font-semibold text-text-secondary">Project title <span className="text-danger">★</span></span><input value={formData.projectTitle} onChange={(event) => update('projectTitle', event.target.value)} placeholder="Research project title" className={inputClass} /></label><label><span className="mb-2 block text-sm font-semibold text-text-secondary">Year conducted <span className="text-danger">★</span></span><input type="number" value={formData.year} onChange={(event) => update('year', event.target.value)} placeholder="2024" className={inputClass} /></label><label className="sm:col-span-2"><span className="mb-2 block text-sm font-semibold text-text-secondary">Research interests</span><textarea value={formData.interests} onChange={(event) => update('interests', event.target.value)} rows={6} placeholder="Describe your methods, findings, or areas of interest..." className={inputClass} /></label></div></div>
}
