'use client'

import { WORLD_COUNTRIES } from '@/lib/countries'
import { previewPrograms } from '@/lib/program-import'
import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, LoaderCircle, Plus, ToggleLeft, ToggleRight } from 'lucide-react'

interface Program { id: string; title: string; level: string | null; deadline: string | null; isActive: boolean | null }
interface University { id: string; name: string; type: string | null; location: string | null; isAcceptingApplications: boolean | null; intakeClosedReason: string | null; nextIntakeDate: string | null; programs: Program[] }
interface Country { id: string; name: string; code: string | null; flagEmoji: string | null; universities: University[] }

export default function CatalogManager() {
  const [countries, setCountries] = useState<Country[]>([])
  const [selectedCountryId, setSelectedCountryId] = useState('')
  const [selectedUniversityId, setSelectedUniversityId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [newUniversity, setNewUniversity] = useState({ name: '', location: '', type: 'university' })
  const [newProgram, setNewProgram] = useState({ title: '', level: '', deadline: '' })
  const [bulkPrograms, setBulkPrograms] = useState('')

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/catalog')
      const body = await response.json() as { countries?: Country[]; error?: string }
      if (!response.ok) throw new Error(body.error ?? 'Unable to load catalog')
      setCountries(body.countries ?? [])
      if (body.countries?.[0]) setSelectedCountryId(current => body.countries?.find(item => item.code === current)?.id || current || body.countries?.[0]?.id || '')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load catalog')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const allCountries: Country[] = [...countries, ...WORLD_COUNTRIES.filter(entry => !countries.some(item => item.code?.toUpperCase() === entry.code)).map(entry => ({ ...entry, id: entry.code, universities: [] }))].sort((a, b) => a.name.localeCompare(b.name))
  const selectedCountry = allCountries.find((country) => country.id === selectedCountryId)
  const selectedUniversity = selectedCountry?.universities.find((university) => university.id === selectedUniversityId)

  const create = async (data: Record<string, unknown>) => {
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/admin/catalog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const body = await response.json() as { error?: string }
      if (!response.ok) throw new Error(body.error ?? 'Unable to create item')
      await load()
      if (data.type === 'university') setNewUniversity({ name: '', location: '', type: 'university' })
      if (data.type === 'program') setNewProgram({ title: '', level: '', deadline: '' })
      return true
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to create item')
      return false
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (type: 'university' | 'program', item: University | Program) => {
    setSaving(true)
    setError('')
    try {
      const isUniversity = type === 'university'
      const response = await fetch('/api/admin/catalog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isUniversity
          ? { type, id: item.id, isAcceptingApplications: !(item as University).isAcceptingApplications, intakeClosedReason: (item as University).intakeClosedReason ?? undefined, nextIntakeDate: (item as University).nextIntakeDate ?? undefined }
          : { type, id: item.id, isActive: !(item as Program).isActive }),
      })
      const body = await response.json() as { error?: string }
      if (!response.ok) throw new Error(body.error ?? 'Unable to update item')
      await load()
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Unable to update item')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (type: 'university' | 'program', id: string, name: string) => {
    if (!window.confirm('Permanently delete "' + name + '"? Items linked to applications or course requests cannot be deleted.')) return
    setSaving(true); setError('')
    try {
      const response = await fetch('/api/admin/catalog', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, id }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Unable to delete item')
      if (type === 'university' && selectedUniversityId === id) setSelectedUniversityId('')
      await load()
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to delete item') }
    finally { setSaving(false) }
  }

  const importPrograms = async () => {
      if (!selectedUniversity) return
      const programsToImport = previewPrograms(bulkPrograms, selectedUniversity.programs).filter(row => !row.problem)
      if (!programsToImport.length) {
        setError('Add at least one program line before importing.')
        return
      }
      const saved = await create({ type: 'bulk_programs', universityId: selectedUniversity.id, programs: programsToImport.map(({title,level,deadline}) => ({title,level,deadline})) })
      if (saved) setBulkPrograms('')
  }

  if (loading) return <div className="flex items-center justify-center rounded-xl border border-border bg-white py-20 text-text-secondary"><LoaderCircle className="mr-2 animate-spin" size={18} strokeWidth={1.5} /> Loading countries and programs...</div>

  return <div className="space-y-6">
    {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-danger">{error}</div>}
    <div className="grid gap-6 lg:grid-cols-[240px_1fr_1fr]">
      <section className="rounded-xl border border-border bg-white p-4">
        <div className="mb-4 flex items-center justify-between"><h2 className="font-heading text-xl font-bold text-navy">Countries</h2><Plus size={17} className="text-gold" strokeWidth={1.5} /></div>
        <select value={selectedCountryId} onChange={(event) => { setSelectedCountryId(event.target.value); setSelectedUniversityId('') }} className="mb-3 w-full rounded-md border border-border px-3 py-2 text-sm" aria-label="Select country"><option value="">Select country</option>{allCountries.map((country) => <option key={country.id} value={country.id}>{country.flagEmoji ?? '🌐'} {country.name}</option>)}</select>
        <div className="max-h-80 space-y-1 overflow-y-auto">{countries.map((country) => <button type="button" key={country.id} onClick={() => { setSelectedCountryId(country.id); setSelectedUniversityId('') }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${selectedCountryId === country.id ? 'bg-gold-dim font-semibold text-navy' : 'text-text-secondary hover:bg-gray-50'}`}><span>{country.flagEmoji}</span><span className="flex-1">{country.name}</span><span className="text-xs">{country.universities.length}</span></button>)}</div>
      </section>

      <section className="rounded-xl border border-border bg-white p-4">
        <div className="mb-4 flex items-center justify-between"><h2 className="font-heading text-xl font-bold text-navy">{selectedCountry?.name ?? 'Schools'}</h2><Plus size={17} className="text-gold" strokeWidth={1.5} /></div>
        {!selectedCountry ? <p className="text-sm text-text-secondary">Add or select a country.</p> : <div className="space-y-3">{selectedCountry.universities.map((university) => <div key={university.id} className={`rounded-lg border p-3 ${university.isAcceptingApplications ? 'border-border' : 'border-amber-300 bg-amber-50 opacity-70'}`}><button type="button" onClick={() => setSelectedUniversityId(university.id)} className="flex w-full items-start gap-2 text-left"><span className="pt-1">{selectedUniversityId === university.id ? <ChevronDown size={16} strokeWidth={1.5} /> : <ChevronRight size={16} strokeWidth={1.5} />}</span><span className="flex-1"><span className="block font-semibold text-navy">{university.name}</span><span className="text-xs text-text-secondary">{university.type} · {university.location}</span></span>{university.isAcceptingApplications ? <ToggleRight className="text-success" size={22} strokeWidth={1.5} /> : <ToggleLeft className="text-warning" size={22} strokeWidth={1.5} />}</button><button type="button" disabled={saving} onClick={() => void toggle('university', university)} className="mt-2 text-xs font-semibold text-gold">{university.isAcceptingApplications ? 'Close intake' : 'Reopen intake'}</button><button type="button" disabled={saving} onClick={() => void remove('university', university.id, university.name)} className="ml-4 text-xs font-semibold text-danger">Delete school</button>{selectedUniversityId === university.id && !university.isAcceptingApplications && <p className="mt-2 text-xs text-warning">{university.intakeClosedReason ?? 'Intake closed'}</p>}</div>)}</div>}
        {selectedCountry && <div className="mt-5 border-t border-border pt-4"><input value={newUniversity.name} onChange={(event) => setNewUniversity({ ...newUniversity, name: event.target.value })} placeholder="School or scholarship name" className="mb-2 w-full rounded-md border border-border px-3 py-2 text-sm" /><input value={newUniversity.location} onChange={(event) => setNewUniversity({ ...newUniversity, location: event.target.value })} placeholder="Location" className="mb-2 w-full rounded-md border border-border px-3 py-2 text-sm" /><button type="button" disabled={saving} onClick={() => void create({ ...(selectedCountry.id.length === 2 ? { countryCode: selectedCountry.code } : { countryId: selectedCountry.id }), ...newUniversity, type: 'university', universityType: newUniversity.type })} className="w-full rounded-md bg-navy px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Add school</button></div>}
      </section>

      <section className="rounded-xl border border-border bg-white p-4">
        <h2 className="mb-4 font-heading text-xl font-bold text-navy">{selectedUniversity?.name ?? 'Programs'}</h2>
        {!selectedUniversity ? <p className="text-sm text-text-secondary">Select a school to manage its programs.</p> : <><div className="space-y-2">{selectedUniversity.programs.map((program) => <div key={program.id} className="flex items-center gap-3 rounded-lg border border-border p-3"><div className="flex-1"><p className={`text-sm font-semibold ${program.isActive ? 'text-navy' : 'text-text-secondary line-through'}`}>{program.title}</p><p className="text-xs text-text-secondary">{program.level}{program.deadline ? ` · Deadline ${program.deadline}` : ''}</p></div><button type="button" disabled={saving} onClick={() => void toggle('program', program)} className="text-xs font-semibold text-gold">{program.isActive ? 'Hide' : 'Show'}</button><button type="button" disabled={saving} onClick={() => void remove('program', program.id, program.title)} className="text-xs font-semibold text-danger">Delete</button></div>)}</div><div className="mt-5 border-t border-border pt-4"><input value={newProgram.title} onChange={(event) => setNewProgram({ ...newProgram, title: event.target.value })} placeholder="Program title" className="mb-2 w-full rounded-md border border-border px-3 py-2 text-sm" /><div className="flex gap-2"><input value={newProgram.level} onChange={(event) => setNewProgram({ ...newProgram, level: event.target.value })} placeholder="Level" className="w-1/2 rounded-md border border-border px-3 py-2 text-sm" /><input type="date" value={newProgram.deadline} onChange={(event) => setNewProgram({ ...newProgram, deadline: event.target.value })} className="w-1/2 rounded-md border border-border px-3 py-2 text-sm" /></div><button type="button" disabled={saving} onClick={() => void create({ type: 'program', universityId: selectedUniversity.id, ...newProgram, scholarshipAvailable: false })} className="mt-2 w-full rounded-md bg-navy px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Add program</button><textarea value={bulkPrograms} onChange={(event) => setBulkPrograms(event.target.value)} placeholder={'Bulk import: one program per line\\nTitle | Level | 2027-01-30'} rows={5} className="mt-3 w-full rounded-md border border-border px-3 py-2 text-sm" /><div className="mt-3 max-h-56 overflow-auto text-xs" aria-live="polite">{previewPrograms(bulkPrograms, selectedUniversity.programs).map(row => <p key={row.line} className={row.problem ? "text-danger" : "text-navy"}>{row.line}. {row.title} · {row.problem || "Ready to import"}</p>)}</div><button type="button" disabled={saving} onClick={() => void importPrograms()} className="mt-2 w-full rounded-md border border-gold px-3 py-2 text-xs font-semibold text-navy disabled:opacity-50">Import valid, new programs</button></div></>}
      </section>
    </div>
  </div>
}
