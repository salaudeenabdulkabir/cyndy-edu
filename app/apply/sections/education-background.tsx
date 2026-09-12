'use client'

import { useState } from 'react'
import { z } from 'zod'
import { Plus, Trash2 } from 'lucide-react'
import { useAutoSave, useWizard } from '../wizard-context'

const universitySchema = z.object({ institution: z.string().trim().min(1), location: z.string().trim().min(1), course: z.string().trim().min(1), degree: z.string().trim().min(1), startYear: z.string().trim().min(1), endYear: z.string().trim().min(1), cgpa: z.string().trim().min(1), scale: z.string().trim().min(1) })
const highSchoolSchema = z.object({ school: z.string().trim().min(1), location: z.string().trim().min(1), startYear: z.string().trim().min(1), endYear: z.string().trim().min(1) })
type UniversityEntry = z.infer<typeof universitySchema>
type HighSchoolEntry = z.infer<typeof highSchoolSchema>
const blankUniversity = (): UniversityEntry => ({ institution: '', location: '', course: '', degree: '', startYear: '', endYear: '', cgpa: '', scale: '' })
const blankHighSchool = (): HighSchoolEntry => ({ school: '', location: '', startYear: '', endYear: '' })
const inputClass = 'w-full rounded-lg border border-border bg-white px-3 py-3 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold-dim'

export default function EducationBackground() {
  const { setIsDirty, initialData } = useWizard()
  const [universities, setUniversities] = useState<UniversityEntry[]>(() => initialData.universities as UniversityEntry[] ?? [blankUniversity()])
  const [highSchools, setHighSchools] = useState<HighSchoolEntry[]>(() => initialData.highSchools as HighSchoolEntry[] ?? [blankHighSchool()])
  const [errors, setErrors] = useState<string[]>([])
  useAutoSave({ universities, highSchools })

  const updateUniversity = (index: number, field: keyof UniversityEntry, value: string) => {
    setUniversities((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, [field]: value } : entry))
    setIsDirty(true)
  }
  const updateHighSchool = (index: number, field: keyof HighSchoolEntry, value: string) => {
    setHighSchools((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, [field]: value } : entry))
    setIsDirty(true)
  }
  const validate = () => {
    const messages: string[] = []
    universities.forEach((entry, index) => { if (!universitySchema.safeParse(entry).success) messages.push(`Complete all required fields for university ${index + 1}.`) })
    highSchools.forEach((entry, index) => { if (!highSchoolSchema.safeParse(entry).success) messages.push(`Complete all required fields for high school ${index + 1}.`) })
    setErrors(messages)
  }

  return <div className="space-y-8">
    <div><h1 className="mb-2 font-heading text-3xl font-bold text-navy">Education Background</h1><p className="text-text-secondary">Tell us about your academic history. All fields are required unless marked optional.</p></div>
    {errors.length > 0 && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-danger">{errors.map((message) => <p key={message}>{message}</p>)}</div>}
    <section className="space-y-4"><div className="flex items-center justify-between"><h2 className="font-heading text-2xl font-bold text-navy">University education</h2><button type="button" onClick={() => setUniversities((current) => [...current, blankUniversity()])} className="flex items-center gap-1 text-sm font-semibold text-gold"><Plus size={16} strokeWidth={1.5} /> Add another</button></div>
      {universities.map((entry, index) => <div key={`university-${index}`} className="rounded-xl border border-border bg-gray-50 p-4 sm:p-6"><div className="mb-4 flex items-center justify-between"><h3 className="font-semibold text-navy">University {index + 1}</h3>{universities.length > 1 && <button type="button" onClick={() => setUniversities((current) => current.filter((_, entryIndex) => entryIndex !== index))} className="flex items-center gap-1 text-sm text-danger"><Trash2 size={15} strokeWidth={1.5} /> Remove</button>}</div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{([
        ['institution', 'Institution name'], ['location', 'Location'], ['course', 'Course'], ['degree', 'Degree'], ['startYear', 'Start year'], ['endYear', 'End year'], ['cgpa', 'CGPA'], ['scale', 'Scale'],
      ] as const).map(([field, placeholder]) => <input key={field} value={entry[field]} onChange={(event) => updateUniversity(index, field, event.target.value)} aria-label={placeholder} placeholder={`${placeholder} *`} className={inputClass} />)}</div></div>)}
    </section>
    <section className="space-y-4"><div className="flex items-center justify-between"><h2 className="font-heading text-2xl font-bold text-navy">High school education</h2><button type="button" onClick={() => setHighSchools((current) => [...current, blankHighSchool()])} className="flex items-center gap-1 text-sm font-semibold text-gold"><Plus size={16} strokeWidth={1.5} /> Add another</button></div>
      {highSchools.map((entry, index) => <div key={`high-school-${index}`} className="rounded-xl border border-border bg-gray-50 p-4 sm:p-6"><div className="mb-4 flex items-center justify-between"><h3 className="font-semibold text-navy">High school {index + 1}</h3>{highSchools.length > 1 && <button type="button" onClick={() => setHighSchools((current) => current.filter((_, entryIndex) => entryIndex !== index))} className="flex items-center gap-1 text-sm text-danger"><Trash2 size={15} strokeWidth={1.5} /> Remove</button>}</div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{([['school', 'School name'], ['location', 'Location'], ['startYear', 'Start year'], ['endYear', 'End year']] as const).map(([field, placeholder]) => <input key={field} value={entry[field]} onChange={(event) => updateHighSchool(index, field, event.target.value)} aria-label={placeholder} placeholder={`${placeholder} *`} className={inputClass} />)}</div></div>)}
    </section>
    <button type="button" onClick={validate} className="rounded-lg border border-gold px-5 py-3 font-semibold text-gold hover:bg-gold-dim">Validate education details</button>
  </div>
}
