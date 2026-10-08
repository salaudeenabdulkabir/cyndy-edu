'use client'
import { usePortalFetch } from '@/lib/use-portal-fetch'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, CircleAlert, LoaderCircle } from 'lucide-react'
import { missingApplicationFields } from '@/lib/application-policy'
import { useWizard } from '../wizard-context'

interface Application {
  policiesReady: boolean
  testSubmissionsEnabled?: boolean
  referenceNo: string
  status: string
  paymentConfirmed: boolean | null
  program?: { title: string; schoolLabel?: string | null; deadline: string | null; university?: { name: string; country?: { name: string } } } | null
  customCourseText: string | null
  applicationData: Record<string, unknown> | null
}
interface Requirement { section?: string; id: string; name: string; isMandatory: boolean; waived?: boolean }
interface Document { documentTypeId: string; status: string }

export default function ReviewSubmit() {
  const fetch = usePortalFetch()
  const { applicationId, setCurrentSection } = useWizard()
  const [application, setApplication] = useState<Application | null>(null)
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [confirmed, setConfirmed] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [applicationResponse, documentsResponse] = await Promise.all([
          fetch(`/api/applications/${applicationId}`),
          fetch(`/api/applications/${applicationId}/documents`),
        ])
        const applicationBody = await applicationResponse.json() as Application & { error?: string }
        const documentsBody = await documentsResponse.json() as { requirements?: Requirement[]; documents?: Document[]; error?: string }
        if (!applicationResponse.ok) throw new Error(applicationBody.error ?? 'Unable to load your application')
        if (!documentsResponse.ok) throw new Error(documentsBody.error ?? 'Unable to load your documents')
        if (!cancelled) {
          setApplication(applicationBody)
          setRequirements(documentsBody.requirements ?? [])
          setDocuments(documentsBody.documents ?? [])
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Unable to load your application')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [applicationId, fetch])

  const checks = useMemo(() => {
    const data = application?.applicationData ?? {}
    const mandatoryDocuments = requirements.filter((requirement) => requirement.isMandatory)
    const uploadedIds = new Set(documents.filter((document) => ['uploaded', 'verified'].includes(document.status)).map((document) => document.documentTypeId))
    return [
      { name: 'Opportunity selection', complete: Boolean(application?.program || application?.customCourseText) },
      { name: 'Personal information', complete: !missingApplicationFields(data).includes('Personal information') },
      ...['Education background', 'Legal guardians', 'Research experience'].map(name => ({ name, complete: !missingApplicationFields(data).includes(name) })),
      { name: 'Required documents', complete: mandatoryDocuments.every((requirement) => requirement.waived || uploadedIds.has(requirement.id)) },
      { name: 'Payment confirmation', complete: application?.paymentConfirmed === true },
    ]
  }, [application, documents, requirements])
  const missingDocuments = requirements.filter(item => item.isMandatory && !item.waived && !documents.some(doc => doc.documentTypeId === item.id && ['uploaded','verified'].includes(doc.status)))
  const sectionForCheck: Record<string, number> = { 'Opportunity selection': 0, 'Personal information': 1, 'Education background': 2, 'Legal guardians': 1, 'Research experience': 2, 'Payment confirmation': 0 }
  const documentSection: Record<string, number> = { personal: 1, academic: 2, language: 4, admissions: 5, supporting: 5 }
  const missing = checks.filter((check) => !check.complete).map((check) => check.name)
  const canSubmit = (application?.policiesReady === true || application?.testSubmissionsEnabled === true) && missing.length === 0 && confirmed && termsAccepted && application?.status === 'draft'

  const submit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'submitted', confirmed, termsAccepted }),
      })
      const body = await response.json() as { error?: string }
      if (!response.ok) throw new Error(body.error ?? 'Failed to submit application')
      window.location.href = '/status'
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to submit application')
      setSubmitting(false)
    }
  }

  if (loading) return <div className="flex items-center gap-2 rounded-xl border border-border bg-white p-8 text-text-secondary"><LoaderCircle className="animate-spin" size={18} strokeWidth={1.5} /> Loading your application summary...</div>
  if (error && !application) return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-danger">{error}</div>
  if (!application) return null

  return <div className="space-y-8">
    <div><h1 className="mb-2 font-heading text-3xl font-bold text-navy">Review &amp; Submit</h1><p className="text-text-secondary">Review your details and resolve anything missing before submitting.</p></div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{checks.map((check) => <div key={check.name} className={`flex items-center justify-between rounded-lg border p-4 ${check.complete ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}><span className="text-sm font-semibold text-navy">{check.name}{!check.complete && sectionForCheck[check.name] !== undefined && <button type="button" onClick={() => setCurrentSection(sectionForCheck[check.name])} className="mt-2 block text-left text-sm underline">Go to section</button>}</span>{check.complete ? <CheckCircle2 className="text-success" size={19} strokeWidth={1.5} /> : <CircleAlert className="text-warning" size={19} strokeWidth={1.5} />}</div>)}</div>
    <div className="rounded-xl border border-border bg-white p-5 sm:p-6"><h2 className="mb-4 font-heading text-2xl font-bold text-navy">Application summary</h2><dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2"><div><dt className="text-text-secondary">Reference</dt><dd className="font-semibold text-navy">{application.referenceNo}</dd></div><div><dt className="text-text-secondary">Program</dt><dd className="font-semibold text-navy">{application.program?.title ?? application.customCourseText ?? 'Not selected'}</dd></div><div><dt className="text-text-secondary">School</dt><dd className="font-semibold text-navy">{application.program?.schoolLabel || application.program?.university?.name || 'To be confirmed'}</dd></div><div><dt className="text-text-secondary">Deadline</dt><dd className="font-semibold text-navy">{application.program?.deadline ?? 'Not set'}</dd></div></dl></div>
    {missingDocuments.length > 0 && <section className="rounded-xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-semibold">Documents still needed</h2><ul className="mt-3 space-y-3">{missingDocuments.map(item => <li key={item.id}><button type="button" onClick={() => setCurrentSection(documentSection[item.section || 'supporting'] ?? 5)} className="text-left underline">Upload or replace {item.name}</button></li>)}</ul><a href="/support" className="mt-4 inline-block text-sm underline">Missing a document? Contact Cyndy for help.</a></section>}
    <a href={`/applications/${applicationId}/print`} target="_blank" rel="noreferrer" className="inline-block text-sm underline">Print application / Save as PDF</a><div className="space-y-3">{application.testSubmissionsEnabled && <p role="status" className="rounded border border-blue-300 bg-blue-50 p-3">Test submissions are enabled on this staging site. This is a practice application, not a live application or approval of our draft service terms. Email delivery remains disabled.</p>}{!application?.policiesReady && !application.testSubmissionsEnabled && <p role="status" className="rounded border border-amber-300 bg-amber-50 p-3">Applications will open once our service terms are finalized. Your draft remains saved.</p>}<label className="flex items-start gap-3 text-sm text-text-secondary"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-gold" /> I confirm that all information and documents provided are accurate and complete.</label><label className="flex items-start gap-3 text-sm text-text-secondary"><input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-1 h-4 w-4 accent-gold" /> I agree to the <a href="/terms-of-service" className="font-semibold text-gold hover:underline">Terms of Service</a> and <a href="/privacy-policy" className="font-semibold text-gold hover:underline">Privacy Policy</a>.</label></div>
    {missing.length > 0 && <p className="rounded-lg bg-amber-50 p-4 text-sm text-warning">Complete these items before submitting: {missing.join(', ')}.</p>}
    {error && <p className="rounded-lg bg-red-50 p-4 text-sm text-danger">{error}</p>}
    <button type="button" onClick={() => void submit()} disabled={!canSubmit || submitting} className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-5 py-4 text-lg font-semibold text-white transition hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50">{submitting && <LoaderCircle className="animate-spin" size={19} strokeWidth={1.5} />}{submitting ? 'Submitting...' : application.testSubmissionsEnabled ? 'Submit test application' : 'Submit application'}</button>
    {application.status !== 'draft' && <p className="text-center text-sm text-text-secondary">This application has already been submitted.</p>}
  </div>
}
