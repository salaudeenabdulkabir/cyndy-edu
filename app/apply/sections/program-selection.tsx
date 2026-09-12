'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle, Search } from 'lucide-react'
import { useWizard } from '../wizard-context'

const selectionSchema = z.object({
  countryId: z.string().min(1, 'Select a country'),
  universityId: z.string().min(1, 'Select a school or scholarship'),
  programId: z.string().optional(),
  customCourseText: z.string().trim().max(200).optional(),
})
type SelectionValues = z.infer<typeof selectionSchema>

interface Program {
  id: string
  title: string
  level: string | null
  deadline: string | null
  scholarshipAvailable: boolean | null
}
interface University {
  id: string
  name: string
  type: string | null
  location: string | null
  programs: Program[]
}
interface Country {
  id: string
  name: string
  code: string | null
  flagEmoji: string | null
  universities: University[]
}

export default function ProgramSelection() {
  const { setIsDirty, initialData, queueSave, flushSave } = useWizard()
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [programSearch, setProgramSearch] = useState('')
  const { register, watch, setValue, handleSubmit, formState: { errors } } = useForm<SelectionValues>({
    resolver: zodResolver(selectionSchema),
    defaultValues: { countryId: String(initialData.countryId ?? ''), universityId: String(initialData.universityId ?? ''), programId: String(initialData.programId ?? ''), customCourseText: String(initialData.customCourseText ?? '') },
  })

  const countryId = watch('countryId')
  const universityId = watch('universityId')
  const programId = watch('programId')
  const customCourseText = watch('customCourseText') ?? ''
  const universities = countries.find((country) => country.id === countryId)?.universities ?? []
  const selectedUniversity = universities.find((university) => university.id === universityId)
  const programs = useMemo(() => selectedUniversity?.programs ?? [], [selectedUniversity])
  const filteredPrograms = useMemo(
    () => programs.filter((program) => program.title.toLowerCase().includes(programSearch.toLowerCase())),
    [programs, programSearch],
  )
  const selectedProgram = programs.find((program) => program.id === programId)

  useEffect(() => {
    let cancelled = false
    const loadCatalog = async () => {
      try {
        const response = await fetch('/api/catalog')
        const body = await response.json() as { countries?: Country[]; error?: string }
        if (!response.ok) throw new Error(body.error ?? 'Unable to load available applications')
        if (!cancelled) setCountries(body.countries ?? [])
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Unable to load available applications')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadCatalog()
    return () => { cancelled = true }
  }, [])

  const saveSelection = async (values: SelectionValues) => {
    if (!values.programId && !values.customCourseText) {
      setError('Select a program or enter a custom course.')
      return
    }
    setSaving(true)
    setError('')
    try {
      queueSave({ programId: values.programId || null, customCourseText: values.programId ? null : values.customCourseText, countryId: values.countryId, universityId: values.universityId })
      if (!await flushSave()) throw new Error('Could not save your selection')
      setIsDirty(false)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save your selection')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex items-center gap-2 rounded-xl border border-border bg-white p-8 text-text-secondary"><LoaderCircle className="animate-spin" size={18} strokeWidth={1.5} /> Loading available schools and programs...</div>
  if (error && countries.length === 0) return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-danger">{error}</div>
  if (countries.length === 0) return <div className="rounded-xl border border-border bg-white p-8 text-center"><h2 className="font-heading text-2xl font-bold text-navy">No applications are available</h2><p className="mt-2 text-text-secondary">Please contact Cyndy support for available opportunities.</p></div>

  return (
    <form onSubmit={handleSubmit(saveSelection)} className="space-y-8">
      <div>
        <h1 className="mb-2 font-heading text-3xl font-bold text-navy">Choose an application</h1>
        <p className="text-text-secondary">Select a destination, then choose an available school and program.</p>
      </div>

      <div>
        <label htmlFor="country" className="mb-2 block text-sm font-semibold text-text-secondary">Country</label>
        <select id="country" {...register('countryId', { onChange: () => { setIsDirty(true); setValue('customCourseText', ''); setValue('universityId', ''); setValue('programId', ''); setProgramSearch('') } })} className="w-full rounded-lg border border-border bg-white px-4 py-3 focus:border-gold focus:outline-none">
          <option value="">Select a country</option>
          {countries.map((country) => <option key={country.id} value={country.id}>{country.flagEmoji ?? ''} {country.name}</option>)}
        </select>
        {errors.countryId && <p className="mt-2 text-sm text-danger">{errors.countryId.message}</p>}
      </div>

      {countryId && <div>
        <label htmlFor="university" className="mb-2 block text-sm font-semibold text-text-secondary">School or scholarship</label>
        <select id="university" {...register('universityId', { onChange: () => { setIsDirty(true); setValue('customCourseText', ''); setValue('programId', ''); setProgramSearch('') } })} className="w-full rounded-lg border border-border bg-white px-4 py-3 focus:border-gold focus:outline-none">
          <option value="">Select a school</option>
          {universities.map((university) => <option key={university.id} value={university.id}>{university.name} · {university.type ?? 'Institution'}{university.location ? ` · ${university.location}` : ''}</option>)}
        </select>
        {errors.universityId && <p className="mt-2 text-sm text-danger">{errors.universityId.message}</p>}
      </div>}

      {universityId && <div>
        <label htmlFor="program-search" className="mb-2 block text-sm font-semibold text-text-secondary">Application or program</label>
        <div className="relative">
          <Search className="absolute left-3 top-3.5 text-text-secondary" size={17} strokeWidth={1.5} />
          <input id="program-search" value={programSearch} onChange={(event) => setProgramSearch(event.target.value)} placeholder="Search available programs..." className="w-full rounded-lg border border-border bg-white py-3 pl-10 pr-4 focus:border-gold focus:outline-none" />
        </div>
        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
          {filteredPrograms.map((program) => <button type="button" key={program.id} onClick={() => { setValue('programId', program.id, { shouldValidate: true }); setValue('customCourseText', ''); setIsDirty(true) }} className={`w-full rounded-lg border-2 p-4 text-left ${programId === program.id ? 'border-gold bg-gold-dim' : 'border-border hover:border-gold'}`}><p className="font-semibold text-navy">{program.title}</p><p className="mt-1 text-sm text-text-secondary">{program.level ?? 'Program'}{program.deadline ? ` · Deadline: ${program.deadline}` : ''}{program.scholarshipAvailable ? ' · Scholarship available' : ''}</p></button>)}
          {filteredPrograms.length === 0 && <p className="rounded-lg bg-gray-50 p-4 text-sm text-text-secondary">No matching programs found.</p>}
        </div>
        <input type="hidden" {...register('programId')} />
        {!programId && <div className="mt-4 rounded-lg border border-dashed border-gold bg-gold-dim p-4"><p className="text-sm text-text-secondary">Can&apos;t find your course?</p><input {...register('customCourseText')} onChange={(event) => { setValue('customCourseText', event.target.value); setIsDirty(true) }} placeholder="Enter the course name" className="mt-2 w-full rounded-lg border border-border bg-white px-4 py-3 focus:border-gold focus:outline-none" /><p className="mt-2 text-xs text-text-secondary">Our team will confirm it and set up the required documents.</p></div>}
      </div>}

      {selectedProgram && <div className="rounded-lg border border-gold-border bg-gold-dim p-4"><p className="text-sm font-semibold text-navy">Selected application</p><p className="mt-1 text-lg font-semibold text-navy">{selectedProgram.title}</p><p className="text-sm text-text-secondary">{selectedUniversity?.name}{selectedProgram.deadline ? ` · Deadline ${selectedProgram.deadline}` : ''}</p></div>}
      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="submit" disabled={saving} className="flex items-center justify-center gap-2 rounded-lg bg-gold px-5 py-3 font-semibold text-white disabled:opacity-50">{saving && <LoaderCircle className="animate-spin" size={17} strokeWidth={1.5} />} Save application choice</button>
      {customCourseText && !programId && <p className="text-xs text-text-secondary">Custom course selected: {customCourseText}</p>}
    </form>
  )
}
