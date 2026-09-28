'use client'
import { usePortalFetch } from '@/lib/use-portal-fetch'

import { useEffect, useMemo, useState } from 'react'
import { useAuth, useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Circle, FileText, LoaderCircle, LogOut, MessageCircle } from 'lucide-react'

type AppStatus = 'draft' | 'submitted' | 'docs_pending' | 'docs_complete' | 'under_review' | 'offer_received' | 'accepted' | 'rejected' | 'withdrawn'
interface AppSummary { id: string; referenceNo: string; status: AppStatus; formCompletionPct: number | null; deadline: string | null; paymentConfirmed: boolean | null; programId: string | null }
interface AppDetail extends AppSummary { customCourseText: string | null; program?: { title: string; deadline: string | null; university?: { name: string } | null } | null; documents: Array<{ id: string; status: string; rejectionReason: string | null; documentType?: { name: string } | null }> }

const stages: Array<{ id: AppStatus; label: string }> = [
  { id: 'draft', label: 'Draft' }, { id: 'submitted', label: 'Submitted' }, { id: 'docs_pending', label: 'Documents pending' },
  { id: 'under_review', label: 'Under review' }, { id: 'offer_received', label: 'Offer received' }, { id: 'accepted', label: 'Accepted' },
]
const statusIndex = (status: AppStatus) => status === 'docs_complete' ? 3 : stages.findIndex((stage) => stage.id === status)

export default function StatusPage() {
  const fetch = usePortalFetch()
  const { isLoaded, isSignedIn } = useAuth()
  const { signOut } = useClerk()
  const router = useRouter()
  const [applications, setApplications] = useState<AppSummary[]>([])
  const [application, setApplication] = useState<AppDetail | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/'); return }
    const load = async () => {
      try {
        const response = await fetch('/api/applications')
        const body = await response.json() as AppSummary[] | { error?: string }
        if (!response.ok || !Array.isArray(body)) throw new Error(Array.isArray(body) ? 'Unable to load applications' : body.error ?? 'Unable to load applications')
        setApplications(body)
        if (body[0]) setSelectedId(body[0].id)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load applications')
      } finally { setLoading(false) }
    }
    void load()
  }, [isLoaded, isSignedIn, router, fetch])

  useEffect(() => {
    if (!selectedId) return
    let cancelled = false
    setApplication(null)
    setError('')
    const loadDetail = async () => {
      try {
        const response = await fetch(`/api/applications/${selectedId}`)
        const body = await response.json() as AppDetail & { error?: string }
        if (!response.ok) throw new Error(body.error ?? 'Unable to load application details')
        if (!cancelled) { setApplication(body); setError('') }
      } catch (loadError) { if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Unable to load application details') }
    }
    void loadDetail()
    const timer = setInterval(() => void loadDetail(), 30000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [selectedId, fetch])

  const documentStats = useMemo(() => {
    const docs = application?.documents ?? []
    return { total: docs.length, uploaded: docs.filter((doc) => ['uploaded', 'verified'].includes(doc.status)).length, verified: docs.filter((doc) => doc.status === 'verified').length }
  }, [application])

  if (!isLoaded || loading) return <div className="flex min-h-screen items-center justify-center bg-background text-text-secondary"><LoaderCircle className="mr-2 animate-spin" size={20} strokeWidth={1.5} /> Loading your applications...</div>
  if (error && !application) return <div className="flex min-h-screen items-center justify-center bg-background px-5"><div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-danger">{error}</div></div>
  if (applications.length === 0) return <main className="flex min-h-screen items-center justify-center bg-background px-5 text-center"><div><h1 className="font-heading text-3xl font-bold text-navy">No applications yet</h1><p className="mt-2 text-text-secondary">Start an application to track your progress here.</p><button type="button" onClick={() => router.push('/apply')} className="mt-6 rounded-lg bg-gold px-5 py-3 font-semibold text-white">Start application</button></div></main>
  if (!application) return <div className="flex min-h-screen items-center justify-center bg-background text-text-secondary"><LoaderCircle className="mr-2 animate-spin" size={20} strokeWidth={1.5} /> Loading details...</div>

  const currentStage = statusIndex(application.status)
  const deadlineDays = application.deadline ? Math.ceil((new Date(application.deadline).getTime() - Date.now()) / 86400000) : null
  return <main className="min-h-screen bg-background"><a href="/notifications" className="block px-5 pt-5 text-sm underline">View notifications</a>
    <nav className="sticky top-0 z-40 border-b border-border bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6"><span className="font-heading text-2xl font-bold text-navy">Cyndy Portal</span><button type="button" onClick={() => void signOut({ redirectUrl: '/' })} className="flex items-center gap-2 text-sm text-text-secondary hover:text-navy"><LogOut size={16} strokeWidth={1.5} /> Sign out</button></div></nav>
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
      {applications.length > 1 && <div className="flex gap-2 overflow-x-auto pb-1">{applications.map((item, index) => <button type="button" key={item.id} onClick={() => setSelectedId(item.id)} className={`min-w-max rounded-lg border px-4 py-3 text-left text-sm ${item.id === selectedId ? 'border-gold bg-gold-dim text-navy' : 'border-border bg-white text-text-secondary'}`}><span className="block font-semibold">Application {index + 1}</span><span>{item.referenceNo}</span></button>)}</div>}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-danger">{error}</p>}
      <section className="rounded-2xl border border-border bg-white p-5 sm:p-8"><div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div><p className="font-mono text-sm font-bold text-gold">{application.referenceNo}</p><h1 className="mt-2 font-heading text-3xl font-bold text-navy">{application.program?.title ?? application.customCourseText ?? 'Application in progress'}</h1><p className="mt-2 text-lg text-text-secondary">{application.program?.university?.name ?? 'Program to be confirmed'}</p></div><div className="grid grid-cols-2 gap-3 sm:flex"><div className="rounded-lg bg-blue-50 p-4"><p className="text-xs font-semibold text-blue-700">STATUS</p><p className="mt-1 font-bold capitalize text-blue-900">{application.status.replaceAll('_', ' ')}</p></div><div className="rounded-lg bg-amber-50 p-4"><p className="text-xs font-semibold text-amber-700">DEADLINE</p><p className="mt-1 font-bold text-amber-900">{application.deadline ?? 'Not set'}</p>{deadlineDays !== null && <p className="text-xs text-amber-700">{deadlineDays >= 0 ? `${deadlineDays} days remaining` : 'Overdue'}</p>}</div></div></div><div className="mt-8 grid grid-cols-3 gap-3 border-t border-border pt-6 text-sm"><div><p className="text-xs text-text-secondary">Documents</p><p className="font-bold text-navy">{documentStats.uploaded} of {documentStats.total} uploaded</p></div><div><p className="text-xs text-text-secondary">Verified</p><p className="font-bold text-navy">{documentStats.verified}</p></div><div><p className="text-xs text-text-secondary">Form progress</p><p className="font-bold text-navy">{application.formCompletionPct ?? 0}%</p></div></div></section>
      <section className="rounded-2xl border border-border bg-white p-5 sm:p-8"><h2 className="mb-7 font-heading text-2xl font-bold text-navy">Application progress</h2><div className="space-y-5">{stages.map((stage, index) => { const complete = currentStage >= index && currentStage >= 0; const active = currentStage === index; return <div key={stage.id} className="flex gap-3 sm:gap-5"><div className="flex flex-col items-center">{complete ? <CheckCircle2 className={active ? 'text-gold' : 'text-success'} size={23} strokeWidth={1.5} /> : <Circle className="text-border" size={23} strokeWidth={1.5} />}{index < stages.length - 1 && <div className={`mt-1 h-8 w-px ${complete ? 'bg-success' : 'bg-border'}`} />}</div><div><p className={`font-semibold ${active ? 'text-gold' : complete ? 'text-success' : 'text-text-secondary'}`}>{stage.label}</p><p className="text-sm text-text-secondary">{active ? 'Current stage' : complete ? 'Completed' : 'Pending'}</p></div></div> })}</div></section>
      <section className="rounded-2xl border border-border bg-white p-5 sm:p-8"><div className="flex items-center justify-between"><h2 className="font-heading text-2xl font-bold text-navy">Required documents</h2><button type="button" onClick={() => router.push('/apply')} className="text-sm font-semibold text-gold">Manage documents</button></div><div className="mt-5 space-y-3">{application.documents.length === 0 ? <p className="text-sm text-text-secondary">No documents have been added yet.</p> : application.documents.map((document) => <div key={document.id} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3"><FileText className="text-gold" size={19} strokeWidth={1.5} /><span className="flex-1 text-sm font-medium text-navy">{document.documentType?.name ?? 'Application document'}</span><span className={`text-xs font-semibold capitalize ${document.status === 'verified' ? 'text-success' : document.status === 'rejected' ? 'text-danger' : 'text-warning'}`}>{document.status}</span></div>)}</div></section>
      <a href="/contact" className="fixed bottom-5 right-5 flex h-12 w-12 items-center justify-center rounded-full bg-gold text-white shadow-lg" aria-label="Contact support"><MessageCircle size={21} strokeWidth={1.5} /></a>
    </div>
  </main>
}
