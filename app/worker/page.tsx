'use client'

import { useClerk, useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { ClipboardList, Clock3, FileCheck2, LogOut, Search, X } from 'lucide-react'

interface WorkerApplication {
  id: string
  referenceNo: string
  status: string | null
  deadline: string | null
  clientFirstName: string | null
  clientLastName: string | null
  programTitle: string | null
  universityName: string | null
  }
  interface ApplicationDetail extends WorkerApplication {
    applicationData?: Record<string, unknown> | null
    workerNotes?: string | null
    paymentConfirmed?: boolean | null
    documents?: ApplicationDocument[]
  }

  interface ApplicationDocument {
    id: string
    fileName: string | null
    fileUrl: string
    status: string | null
    rejectionReason: string | null
    documentType?: { name: string } | null
  }

interface WorkerResponse {
  applications: WorkerApplication[]
  stats: { active: number; pendingDocuments: number; completedThisMonth: number }
}

export default function WorkerDashboard() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const [data, setData] = useState<WorkerResponse | null>(null)
  const [selectedApplication, setSelectedApplication] = useState<ApplicationDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [status, setStatus] = useState('')
  const [workerNotes, setWorkerNotes] = useState('')
  const [savingDetail, setSavingDetail] = useState(false)
  const [updatingDocument, setUpdatingDocument] = useState('')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    const loadApplications = async () => {
      try {
        const response = await fetch('/api/worker/applications')
        const body = await response.json() as WorkerResponse & { error?: string; code?: string }
        if (response.status === 403 && body.code === 'PASSWORD_CHANGE_REQUIRED') { window.location.href = '/worker/change-password'; return }
        if (!response.ok) throw new Error(body.error ?? 'Failed to load applications')
        setData(body)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load applications')
      }
    }

    void loadApplications()
  }, [])

  const stats = [
    { label: 'Active applications', value: data?.stats.active ?? 0, icon: ClipboardList },
    { label: 'Documents pending', value: data?.stats.pendingDocuments ?? 0, icon: Clock3 },
    { label: 'Completed this month', value: data?.stats.completedThisMonth ?? 0, icon: FileCheck2 },
  ]
  const filteredApplications = data?.applications.filter((application) => {
    const query = search.trim().toLowerCase()
    const matchesSearch = !query || `${application.referenceNo} ${application.clientFirstName ?? ''} ${application.clientLastName ?? ''} ${application.programTitle ?? ''} ${application.universityName ?? ''}`.toLowerCase().includes(query)
    return matchesSearch && (statusFilter === 'all' || application.status === statusFilter)
  }) ?? []

  const openApplication = async (applicationId: string) => {
    setDetailLoading(true)
    setDetailError('')
    try {
      const response = await fetch(`/api/applications/${applicationId}`)
      const body = await response.json() as ApplicationDetail & { error?: string }
      if (!response.ok) throw new Error(body.error ?? 'Failed to load application')
      setSelectedApplication(body)
      setStatus(body.status ?? 'draft')
      setWorkerNotes(body.workerNotes ?? '')
    } catch (loadError) {
      setDetailError(loadError instanceof Error ? loadError.message : 'Failed to load application')
    } finally {
      setDetailLoading(false)
    }
  }

  const saveApplication = async () => {
    if (!selectedApplication) return
    setSavingDetail(true)
    setDetailError('')
    try {
      const response = await fetch(`/api/applications/${selectedApplication.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, workerNotes }),
      })
      const body = await response.json() as ApplicationDetail & { error?: string }
      if (!response.ok) throw new Error(body.error ?? 'Failed to save application')
      setSelectedApplication(body)
      setData((previous) => previous ? {
        ...previous,
        applications: previous.applications.map((application) => application.id === body.id ? { ...application, status: body.status } : application),
      } : previous)
    } catch (saveError) {
      setDetailError(saveError instanceof Error ? saveError.message : 'Failed to save application')
    } finally {
      setSavingDetail(false)
    }
  }

  const reviewDocument = async (documentId: string, documentStatus: 'verified' | 'rejected') => {
    const rejectionReason = documentStatus === 'rejected' ? window.prompt('Why should this document be re-uploaded?')?.trim() : undefined
    if (documentStatus === 'rejected' && !rejectionReason) return
    if (!selectedApplication) return

    setUpdatingDocument(documentId)
    setDetailError('')
    try {
      const response = await fetch(`/api/applications/${selectedApplication.id}/documents`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, status: documentStatus, rejectionReason }),
      })
      const body = await response.json() as { document?: ApplicationDocument; error?: string }
      if (!response.ok || !body.document) throw new Error(body.error ?? 'Failed to update document')
      setSelectedApplication((previous) => previous ? { ...previous, documents: previous.documents?.map((document) => document.id === documentId ? body.document as ApplicationDocument : document) } : previous)
    } catch (reviewError) {
      setDetailError(reviewError instanceof Error ? reviewError.message : 'Failed to update document')
    } finally {
      setUpdatingDocument('')
    }
  }

  return (
    <main className="min-h-screen bg-background text-text-primary">
      <header className="flex h-16 items-center justify-between border-b border-border bg-white px-6">
        <div>
          <p className="font-heading text-xl font-bold text-navy">Cyndy</p>
          <p className="text-xs text-text-secondary">Worker portal</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-text-secondary sm:inline">
            {user?.firstName ?? 'Worker'}
          </span>
          <button
            type="button"
            onClick={() => void signOut({ redirectUrl: '/' })}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-navy"
          >
            <LogOut size={16} strokeWidth={1.5} />
            Sign out
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold">Workspace</p>
        <h1 className="mt-2 font-heading text-4xl font-bold text-navy">Your applications</h1>
        <p className="mt-2 text-text-secondary">Review assigned clients and keep their applications moving.</p>

        {error && <div className="mt-6 border border-red-200 bg-red-50 p-4 text-sm text-danger">{error}</div>}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="border border-border bg-white p-6 shadow-sm">
                <Icon className="text-gold" size={22} strokeWidth={1.5} />
                <p className="mt-5 text-sm text-text-secondary">{stat.label}</p>
                <p className="mt-1 font-heading text-3xl font-bold text-navy">{stat.value}</p>
              </div>
            )
          })}
        </div>

        {data && data.applications.length > 0 && <div className="mt-8 grid gap-3 sm:grid-cols-[1fr_220px]"><label className="relative block"><Search className="absolute left-3 top-3 text-text-secondary" size={17} strokeWidth={1.5} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reference, client, or program" className="w-full pl-10" /></label><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status"><option value="all">All statuses</option><option value="draft">Draft</option><option value="submitted">Submitted</option><option value="docs_pending">Documents pending</option><option value="docs_complete">Documents complete</option><option value="under_review">Under review</option><option value="offer_received">Offer received</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option></select></div>}

        {filteredApplications.length ? (
          <div className="mt-8 overflow-hidden border border-border bg-white">
            <div className="hidden grid-cols-[1fr_1.2fr_1.2fr_0.8fr_0.8fr] gap-4 border-b border-border bg-gray-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary md:grid">
              <span>Reference</span><span>Client</span><span>Program</span><span>Status</span><span>Deadline</span>
            </div>
            {filteredApplications.map((application) => (
              <button type="button" key={application.id} onClick={() => void openApplication(application.id)} className="grid w-full gap-2 border-b border-border px-5 py-5 text-left last:border-0 hover:bg-gray-50 md:grid-cols-[1fr_1.2fr_1.2fr_0.8fr_0.8fr] md:items-center md:gap-4">
                <span className="font-mono text-sm font-semibold text-navy">{application.referenceNo}</span>
                <span className="text-sm text-navy">{application.clientFirstName} {application.clientLastName}</span>
                <span className="text-sm text-text-secondary">{application.programTitle ?? 'Program not selected'}{application.universityName ? ` · ${application.universityName}` : ''}</span>
                <span className="w-fit rounded-full bg-gold-dim px-2 py-1 text-xs font-semibold text-navy">{application.status?.replaceAll('_', ' ') ?? 'draft'}</span>
                <span className="text-sm text-text-secondary">{application.deadline ?? 'No deadline'}</span>
              </button>
            ))}
          </div>
        ) : data ? (
          <div className="mt-8 border border-border bg-white p-10 text-center">
            <ClipboardList className="mx-auto text-text-secondary" size={34} strokeWidth={1.5} />
            <h2 className="mt-4 font-heading text-2xl font-bold text-navy">{data.applications.length ? 'No matching applications' : 'No applications assigned'}</h2>
            <p className="mx-auto mt-2 max-w-md text-text-secondary">{data.applications.length ? 'Try a different search or status filter.' : 'Assigned client applications will appear here when they are ready for review.'}</p>
          </div>
        ) : (
          <div className="mt-8 border border-border bg-white p-10 text-center text-sm text-text-secondary">Loading applications...</div>
        )}
      </section>

          {(detailLoading || selectedApplication) && (
            <div className="fixed inset-0 z-50 flex justify-end bg-navy/30" role="dialog" aria-modal="true">
              <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-xl">
                <div className="flex items-start justify-between border-b border-border pb-5">
                  <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Application detail</p><h2 className="mt-1 font-heading text-3xl font-bold text-navy">{selectedApplication?.referenceNo ?? 'Loading...'}</h2></div>
                  <button type="button" onClick={() => setSelectedApplication(null)} aria-label="Close application detail" className="text-text-secondary hover:text-navy"><X size={20} strokeWidth={1.5} /></button>
                </div>
                {detailLoading ? <p className="py-10 text-sm text-text-secondary">Loading application...</p> : selectedApplication && <div className="space-y-6 py-6">
                  <div><p className="text-sm text-text-secondary">Client</p><p className="font-semibold text-navy">{selectedApplication.clientFirstName} {selectedApplication.clientLastName}</p></div>
                  <div><p className="text-sm text-text-secondary">Program</p><p className="font-semibold text-navy">{selectedApplication.programTitle ?? 'Not selected'}</p><p className="text-sm text-text-secondary">{selectedApplication.universityName ?? 'University not selected'}</p></div>
                  <div><p className="text-sm text-text-secondary">Payment</p><p className={selectedApplication.paymentConfirmed ? 'font-semibold text-success' : 'font-semibold text-warning'}>{selectedApplication.paymentConfirmed ? 'Confirmed' : 'Pending'}</p></div>
                  <div><p className="mb-3 text-sm font-semibold text-text-secondary">Documents</p><div className="space-y-3">{selectedApplication.documents?.length ? selectedApplication.documents.map((document) => <div key={document.id} className="border border-border p-3"><div className="flex items-center justify-between gap-3"><a href={document.fileUrl} target="_blank" rel="noreferrer" className="truncate text-sm text-gold hover:underline">{document.documentType?.name ?? 'View document'}</a><span className="text-xs font-semibold capitalize text-text-secondary">{document.status ?? 'pending'}</span></div>{document.rejectionReason && <p className="mt-2 text-xs text-danger">{document.rejectionReason}</p>}{document.status !== 'verified' && <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={updatingDocument === document.id} onClick={() => void reviewDocument(document.id, 'verified')} className="rounded-md bg-success px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Verify</button><button type="button" disabled={updatingDocument === document.id} onClick={() => void reviewDocument(document.id, 'rejected')} className="rounded-md border border-danger px-3 py-2 text-xs font-semibold text-danger disabled:opacity-50">Reject</button></div>}</div>) : <p className="text-sm text-text-secondary">No application documents uploaded.</p>}</div></div>
                  <label className="block text-sm font-semibold text-text-secondary">Status<select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 block w-full"><option value="draft">Draft</option><option value="submitted">Submitted</option><option value="docs_pending">Documents pending</option><option value="under_review">Under review</option><option value="offer_received">Offer received</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option></select></label>
                  <label className="block text-sm font-semibold text-text-secondary">Internal note<textarea value={workerNotes} onChange={(event) => setWorkerNotes(event.target.value)} rows={5} className="mt-2 block w-full" placeholder="Add a note for the Cyndy team" /></label>
                  {detailError && <p className="text-sm text-danger">{detailError}</p>}
                  <button type="button" disabled={savingDetail} onClick={() => void saveApplication()} className="w-full bg-gold px-4 py-3 font-semibold text-white disabled:opacity-50">{savingDetail ? 'Saving...' : 'Save changes'}</button>
                </div>}
              </div>
            </div>
          )}
    </main>
  )
}
