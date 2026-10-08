'use client'
import { usePortalFetch } from '@/lib/use-portal-fetch'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, FileText, LoaderCircle, RefreshCw, UploadCloud } from 'lucide-react'
import { useWizard } from '../wizard-context'

interface Requirement { section: string; waived?: boolean; id: string; name: string; description: string | null; acceptedFormats: string[] | null; maxSizeMb: number | null; expiryDays: number | null; isMandatory: boolean }
interface Document { id: string; documentTypeId: string; status: 'pending' | 'uploaded' | 'verified' | 'rejected'; rejectionReason: string | null; fileUrl: string | null; uploadedAt: string | null }

const formatLabel = (formats: string[] | null) => formats?.map((format) => format.toUpperCase()).join(', ') ?? 'PDF, JPG, PNG'

export default function DocumentUpload({ section }: {section?: string}) {
  const fetch = usePortalFetch()
  const { applicationId } = useWizard()
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingId, setUploadingId] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const response = await fetch(`/api/applications/${applicationId}/documents`)
      const body = await response.json() as { requirements?: Requirement[]; documents?: Document[]; error?: string }
      if (!response.ok) throw new Error(body.error ?? 'Unable to load document requirements')
      setRequirements((body.requirements ?? []).filter(item => !section || item.section === section))
      setDocuments(body.documents ?? [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load document requirements')
    } finally {
      setLoading(false)
    }
  }, [applicationId, section, fetch])

  useEffect(() => { void load() }, [load])

  const upload = async (requirement: Requirement, file: File) => {
    if (file.size > Math.min(requirement.maxSizeMb ?? 4, 4) * 1024 * 1024) { setError('This document is too large. Maximum: ' + Math.min(requirement.maxSizeMb ?? 4, 4) + ' MB.'); return }
    setUploadingId(requirement.id)
    setError('')
    try {
      const data = new FormData()
      data.append('file', file)
      data.append('documentTypeId', requirement.id)
      const response = await fetch(`/api/applications/${applicationId}/documents`, { method: 'POST', body: data })
      const body = await response.json() as { document?: Document; error?: string }
      if (!response.ok || !body.document) throw new Error(body.error ?? 'Document upload failed')
      setDocuments((current) => [...current.filter((document) => document.documentTypeId !== requirement.id), body.document as Document])
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Document upload failed')
    } finally {
      setUploadingId('')
    }
  }

  if (loading) return <div className="flex items-center gap-2 rounded-xl border border-border bg-white p-8 text-text-secondary"><LoaderCircle className="animate-spin" size={18} strokeWidth={1.5} /> Loading your document checklist...</div>
  if (error && requirements.length === 0) return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-danger">{error} <button type="button" onClick={() => void load()} className="underline">Retry loading documents</button></div>
  if (requirements.length === 0 && section) return null
  if (requirements.length === 0) return <div className="rounded-xl border border-border bg-white p-8 text-center"><FileText className="mx-auto text-text-secondary" size={32} strokeWidth={1.5} /><h2 className="mt-4 font-heading text-2xl font-bold text-navy">No document checklist yet</h2><p className="mt-2 text-sm text-text-secondary">Your team will add the required documents after confirming your program.</p></div>

  const required = requirements.filter(item => item.isMandatory)
  const uploadedCount = required.filter(item => item.waived || documents.some(doc => doc.documentTypeId===item.id && ['uploaded','verified'].includes(doc.status))).length
  return <div className="mt-8 space-y-6">
    <div><h2 className="mb-2 font-heading text-3xl font-bold text-navy">{section ? ({personal:'Identity documents',academic:'Academic documents',language:'Language proficiency documents',admissions:'Admissions test documents',supporting:'Supporting documents'}[section] || 'Documents') : 'Document Upload'}</h2><p className="text-text-secondary">Upload the documents required for your selected application. Images and PDFs must be smaller than 4MB.</p></div>
    {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-danger">{error}</div>}
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><span className="font-semibold">{uploadedCount} of {required.length}</span> required documents ready. Rejected documents need replacing. Missing something? <a href="/support" className="font-semibold underline">Ask Cyndy for help.</a> You can save and continue.</div>
    <div className="space-y-4">{requirements.map((requirement) => {
      const document = documents.find((item) => item.documentTypeId === requirement.id)
      const isUploading = uploadingId === requirement.id
      return <section key={requirement.id} className="rounded-xl border border-border bg-white p-4 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-3"><FileText className="mt-1 shrink-0 text-gold" size={22} strokeWidth={1.5} /><div><h2 className="font-semibold text-navy">{requirement.name} <span className="text-xs text-text-secondary">({requirement.waived ? 'Waived by admin' : requirement.isMandatory ? 'Required' : 'Optional'})</span></h2><p className="mt-1 text-sm text-text-secondary">{requirement.description ?? `${formatLabel(requirement.acceptedFormats)} · Max ${Math.min(requirement.maxSizeMb ?? 4, 4)}MB`}</p></div></div>{document?.status === 'verified' && <span className="flex items-center gap-1 text-sm font-semibold text-success"><CheckCircle2 size={17} strokeWidth={1.5} /> Verified</span>}{document?.status === 'uploaded' && <span className="text-sm font-semibold text-amber-800">Pending review</span>}</div>{document?.status === 'rejected' && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-danger">Rejected: {document.rejectionReason}</p>}<label className={`mt-5 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gold p-4 text-sm font-semibold text-navy hover:bg-gold-dim ${isUploading ? 'pointer-events-none opacity-60' : ''}`}><input aria-label={`Upload ${requirement.name}`} type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" disabled={Boolean(uploadingId)} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(requirement, file); event.currentTarget.value = '' }} />{isUploading ? <><LoaderCircle className="animate-spin" size={17} strokeWidth={1.5} /> Uploading...</> : document?.status === 'rejected' ? <><RefreshCw size={17} strokeWidth={1.5} /> Re-upload document</> : <><UploadCloud size={17} strokeWidth={1.5} /> {document ? 'Replace document' : 'Upload document'}</>}</label>{document?.fileUrl && <a href={document.fileUrl} target="_blank" rel="noreferrer" className="mt-3 block truncate text-sm text-gold hover:underline">View uploaded document</a>}</section>
    })}</div>
  </div>
}
