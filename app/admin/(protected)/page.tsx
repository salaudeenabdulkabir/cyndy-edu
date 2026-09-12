'use client'
import DocumentManager from '../document-manager'
import PackageEditor from '../package-editor'

import { useEffect, useState } from 'react'
import { Check, CircleDollarSign, FileText, LoaderCircle, LogOut, Search, UserPlus, Users, X } from 'lucide-react'
import { useClerk } from '@clerk/nextjs'
import CatalogManager from '../catalog-manager'

interface Receipt {
  id: string
  fileName: string | null
  fileUrl: string
  uploadedAt: string | null
  confirmed: boolean | null
  rejectionReason: string | null
  clientName: string | null
  clientLastName: string | null
  clientEmail: string | null
  amountPaid: string | null
  currency: string | null
}

interface AdminApplication {
  id: string
  referenceNo: string
  status: string | null
  deadline: string | null
  paymentConfirmed: boolean | null
  formCompletionPct: number | null
  assignedWorkerId: string | null
  clientFirstName: string | null
  clientLastName: string | null
  clientEmail: string | null
  workerFirstName: string | null
  programTitle: string | null
  universityName: string | null
  countryName: string | null
}

interface WorkerOption { id: string; firstName: string | null; lastName: string | null; isActive: boolean | null }
interface AdminWorker extends WorkerOption { email: string | null; lastSeen: string | null; createdAt: string | null; activeApplications: number }
interface AdminClient { id: string; packageId: string | null; firstName: string | null; lastName: string | null; email: string | null; phone: string | null; joinedAt: string | null; totalApplications: number | null; amountPaid: string | null; currency: string | null; paymentConfirmed: boolean | null; applicationCount: number }

export default function AdminDashboard() {
  const { signOut } = useClerk()
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState('')
  const [activeTab, setActiveTab] = useState<'payments' | 'catalog' | 'applications' | 'workers' | 'clients' | 'documents'>('payments')
  const [applications, setApplications] = useState<AdminApplication[]>([])
  const [workers, setWorkers] = useState<WorkerOption[]>([])
  const [applicationLoading, setApplicationLoading] = useState(false)
  const [applicationSearch, setApplicationSearch] = useState('')
  const [applicationStatus, setApplicationStatus] = useState('all')
  const [updatingApplicationId, setUpdatingApplicationId] = useState('')
  const [adminWorkers, setAdminWorkers] = useState<AdminWorker[]>([])
  const [workerLoading, setWorkerLoading] = useState(false)
  const [workerForm, setWorkerForm] = useState({ firstName: '', lastName: '', email: '', password: '' })
  const [workerSaving, setWorkerSaving] = useState(false)
  const [clients, setClients] = useState<AdminClient[]>([])
  const [clientLoading, setClientLoading] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [clientPayment, setClientPayment] = useState('all')

  const loadReceipts = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/payments')
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? 'Failed to load receipts')
      setReceipts(body.receipts ?? [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load receipts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadReceipts()
  }, [])

  const updateReceipt = async (receiptId: string, action: 'confirm' | 'reject') => {
    const reason = action === 'reject' ? window.prompt('Why is this receipt being rejected?')?.trim() : undefined
    if (action === 'reject' && !reason) return

    setUpdatingId(receiptId)
    try {
      const response = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptId, action, reason }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? 'Payment update failed')
      await loadReceipts()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Payment update failed')
    } finally {
      setUpdatingId('')
    }
  }

  const loadApplications = async () => {
      setApplicationLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({ status: applicationStatus })
        if (applicationSearch.trim()) params.set('search', applicationSearch.trim())
        const response = await fetch(`/api/admin/applications?${params}`)
        const body = await response.json() as { applications?: AdminApplication[]; workers?: WorkerOption[]; error?: string }
        if (!response.ok) throw new Error(body.error ?? 'Failed to load applications')
        setApplications(body.applications ?? [])
        setWorkers(body.workers ?? [])
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load applications')
      } finally {
        setApplicationLoading(false)
      }
    }

  const updateApplication = async (id: string, changes: { status?: string; assignedWorkerId?: string | null }) => {
      setUpdatingApplicationId(id)
      try {
        const response = await fetch('/api/admin/applications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...changes }) })
        const body = await response.json() as { error?: string }
        if (!response.ok) throw new Error(body.error ?? 'Failed to update application')
        setApplications((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item))
      } catch (updateError) {
        setError(updateError instanceof Error ? updateError.message : 'Failed to update application')
      } finally {
        setUpdatingApplicationId('')
      }
    }

    const loadWorkers = async () => {
      setWorkerLoading(true)
      setError('')
      try {
        const response = await fetch('/api/admin/workers')
        const body = await response.json() as { workers?: AdminWorker[]; error?: string }
        if (!response.ok) throw new Error(body.error ?? 'Failed to load workers')
        setAdminWorkers(body.workers ?? [])
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load workers')
      } finally {
        setWorkerLoading(false)
      }
    }

    const saveWorker = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setWorkerSaving(true)
      setError('')
      try {
        const response = await fetch('/api/admin/workers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(workerForm) })
        const body = await response.json() as { worker?: AdminWorker; temporaryPassword?: string; error?: string }
        if (!response.ok || !body.worker) throw new Error(body.error ?? 'Failed to create worker')
        window.alert(`Worker created. Temporary password: ${body.temporaryPassword ?? workerForm.password}`)
        setWorkerForm({ firstName: '', lastName: '', email: '', password: '' })
        await loadWorkers()
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : 'Failed to create worker')
      } finally {
        setWorkerSaving(false)
      }
    }

    const toggleWorker = async (worker: AdminWorker) => {
      try {
        const response = await fetch('/api/admin/workers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: worker.id, isActive: !worker.isActive }) })
        const body = await response.json() as { error?: string }
        if (!response.ok) throw new Error(body.error ?? 'Failed to update worker')
        setAdminWorkers((current) => current.map((item) => item.id === worker.id ? { ...item, isActive: !worker.isActive } : item))
      } catch (toggleError) {
        setError(toggleError instanceof Error ? toggleError.message : 'Failed to update worker')
      }
    }

  const loadClients = async (paymentFilter = clientPayment) => {
        setClientLoading(true)
        setError('')
        try {
          const params = new URLSearchParams({ payment: paymentFilter })
          if (clientSearch.trim()) params.set('search', clientSearch.trim())
          const response = await fetch(`/api/admin/clients?${params}`)
          const body = await response.json() as { clients?: AdminClient[]; error?: string }
          if (!response.ok) throw new Error(body.error ?? 'Failed to load clients')
          setClients(body.clients ?? [])
        } catch (loadError) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load clients')
        } finally {
          setClientLoading(false)
  }
    }
  return (
    <main className="min-h-screen bg-background text-text-primary">
      <header className="flex h-16 items-center justify-between border-b border-border bg-white px-6">
        <div className="flex items-center gap-3">
          <CircleDollarSign className="text-gold" strokeWidth={1.5} />
          <div>
            <p className="font-heading text-xl font-bold text-navy">Cyndy</p>
            <p className="text-xs text-text-secondary">Admin portal</p>
          </div>
        </div>
        <button type="button" onClick={() => void signOut({ redirectUrl: '/' })} className="flex items-center gap-2 text-sm text-text-secondary hover:text-navy">
          <LogOut size={16} strokeWidth={1.5} /> Sign out
        </button>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex gap-2 overflow-x-auto border-b border-border">
          <button type="button" onClick={() => setActiveTab('payments')} className={`border-b-2 px-4 py-3 text-sm font-semibold ${activeTab === 'payments' ? 'border-gold text-navy' : 'border-transparent text-text-secondary'}`}>Payments</button>
          <button type="button" onClick={() => setActiveTab('catalog')} className={`border-b-2 px-4 py-3 text-sm font-semibold ${activeTab === 'catalog' ? 'border-gold text-navy' : 'border-transparent text-text-secondary'}`}>Countries &amp; Programs</button>
          <button type="button" onClick={() => { setActiveTab('applications'); void loadApplications() }} className={`border-b-2 px-4 py-3 text-sm font-semibold ${activeTab === 'applications' ? 'border-gold text-navy' : 'border-transparent text-text-secondary'}`}>Applications</button>
          <button type="button" onClick={() => { setActiveTab('workers'); void loadWorkers() }} className={`border-b-2 px-4 py-3 text-sm font-semibold ${activeTab === 'workers' ? 'border-gold text-navy' : 'border-transparent text-text-secondary'}`}>Workers</button>
          <button type="button" onClick={() => { setActiveTab('clients'); void loadClients() }} className={`border-b-2 px-4 py-3 text-sm font-semibold ${activeTab === 'clients' ? 'border-gold text-navy' : 'border-transparent text-text-secondary'}`}>Clients</button>
        </div>
        <div className="mb-5 flex gap-5 text-sm"><button type="button" onClick={() => setActiveTab('documents')} className="underline">Document checklist</button><a href="/api/admin/export" className="underline">Export applications (CSV)</a><a href="/admin/audit" className="underline">Audit records</a><a href="/notifications" className="underline">Notifications</a></div>
        {activeTab === 'documents' ? <DocumentManager /> : activeTab === 'catalog' ? <CatalogManager /> : activeTab === 'clients' ? <section>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold">Clients &amp; packages</p><h1 className="mt-2 font-heading text-4xl font-bold text-navy">Client directory</h1><p className="mt-2 text-text-secondary">Review client accounts, packages, and payment status.</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-[1fr_220px]"><label className="relative"><Search className="absolute left-3 top-3 text-text-secondary" size={17} strokeWidth={1.5} /><input value={clientSearch} onChange={(event) => setClientSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void loadClients() }} placeholder="Search name or email" className="w-full pl-10" /></label><select value={clientPayment} onChange={(event) => { setClientPayment(event.target.value); void loadClients(event.target.value) }} aria-label="Filter clients by payment"><option value="all">All payment statuses</option><option value="confirmed">Payment confirmed</option><option value="pending">Payment pending</option></select></div>
          {clientLoading ? <div className="mt-6 flex items-center justify-center border border-border bg-white py-16 text-text-secondary"><LoaderCircle className="mr-2 animate-spin" size={18} /> Loading clients...</div> : clients.length === 0 ? <div className="mt-6 border border-border bg-white py-16 text-center"><Users className="mx-auto text-text-secondary" size={32} /><h2 className="mt-4 font-heading text-2xl font-bold text-navy">No clients found</h2><p className="mt-2 text-sm text-text-secondary">Registered clients will appear here.</p></div> : <div className="mt-6 overflow-x-auto border border-border bg-white"><table className="min-w-[850px] w-full text-left"><thead className="border-b border-border bg-gray-50 text-xs uppercase tracking-wide text-text-secondary"><tr><th className="px-4 py-3">Client</th><th className="px-4 py-3">Package</th><th className="px-4 py-3">Applications</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Joined</th></tr></thead><tbody>{clients.map((client) => <tr key={`${client.id}-${client.packageId ?? 'none'}`} className="border-b border-border last:border-0"><td className="px-4 py-4 text-sm font-semibold text-navy">{client.firstName} {client.lastName}<p className="font-normal text-text-secondary">{client.email}</p></td><td className="px-4 py-4 text-sm text-text-secondary">{client.totalApplications ?? 0} applications{client.amountPaid ? <p>{client.currency ?? ''} {client.amountPaid}</p> : null}<PackageEditor clientId={client.id} initialTotal={client.totalApplications ?? 1} onSaved={() => void loadClients()} /></td><td className="px-4 py-4 text-sm text-text-secondary">{client.applicationCount}</td><td className={`px-4 py-4 text-sm font-semibold ${client.paymentConfirmed ? 'text-success' : 'text-warning'}`}>{client.paymentConfirmed ? 'Confirmed' : 'Pending'}</td><td className="px-4 py-4 text-sm text-text-secondary">{client.joinedAt ? new Date(client.joinedAt).toLocaleDateString() : '—'}</td></tr>)}</tbody></table></div>}
        </section> : activeTab === 'workers' ? <section>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold">Team</p><h1 className="mt-2 font-heading text-4xl font-bold text-navy">Worker management</h1><p className="mt-2 text-text-secondary">Manage access and workload for your application team.</p>
          <form onSubmit={saveWorker} className="mt-8 grid gap-3 rounded-xl border border-border bg-white p-5 sm:grid-cols-2 lg:grid-cols-5">
            <input required value={workerForm.firstName} onChange={(event) => setWorkerForm({ ...workerForm, firstName: event.target.value })} placeholder="First name" aria-label="Worker first name" />
            <input required value={workerForm.lastName} onChange={(event) => setWorkerForm({ ...workerForm, lastName: event.target.value })} placeholder="Last name" aria-label="Worker last name" />
            <input required type="email" value={workerForm.email} onChange={(event) => setWorkerForm({ ...workerForm, email: event.target.value })} placeholder="Email" aria-label="Worker email" />
            <input required minLength={8} type="password" value={workerForm.password} onChange={(event) => setWorkerForm({ ...workerForm, password: event.target.value })} placeholder="Temporary password" aria-label="Temporary password" />
            <button disabled={workerSaving} className="flex items-center justify-center gap-2 bg-gold px-4 py-3 font-semibold text-white disabled:opacity-50"><UserPlus size={16} />{workerSaving ? 'Creating...' : 'Add worker'}</button>
          </form>
          {workerLoading ? <div className="mt-6 flex items-center justify-center border border-border bg-white py-16 text-text-secondary"><LoaderCircle className="mr-2 animate-spin" size={18} /> Loading workers...</div> : adminWorkers.length === 0 ? <div className="mt-6 border border-border bg-white py-16 text-center"><UserPlus className="mx-auto text-text-secondary" size={32} /><h2 className="mt-4 font-heading text-2xl font-bold text-navy">No workers yet</h2><p className="mt-2 text-sm text-text-secondary">Add your first worker above.</p></div> : <div className="mt-6 overflow-x-auto border border-border bg-white"><table className="min-w-[760px] w-full text-left"><thead className="border-b border-border bg-gray-50 text-xs uppercase tracking-wide text-text-secondary"><tr><th className="px-4 py-3">Worker</th><th className="px-4 py-3">Active applications</th><th className="px-4 py-3">Last seen</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr></thead><tbody>{adminWorkers.map((worker) => <tr key={worker.id} className="border-b border-border last:border-0"><td className="px-4 py-4 text-sm font-semibold text-navy">{worker.firstName} {worker.lastName}<p className="font-normal text-text-secondary">{worker.email}</p></td><td className="px-4 py-4 text-sm text-text-secondary">{worker.activeApplications}</td><td className="px-4 py-4 text-sm text-text-secondary">{worker.lastSeen ? new Date(worker.lastSeen).toLocaleString() : 'Not seen yet'}</td><td className="px-4 py-4 text-sm font-semibold">{worker.isActive ? 'Active' : 'Deactivated'}</td><td className="px-4 py-4"><button type="button" onClick={() => void toggleWorker(worker)} className="border border-border px-3 py-2 text-xs font-semibold text-navy">{worker.isActive ? 'Deactivate' : 'Activate'}</button></td></tr>)}</tbody></table></div>}
        </section> : activeTab === 'applications' ? <section>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold">Applications</p>
          <h1 className="mt-2 font-heading text-4xl font-bold text-navy">Application workspace</h1>
          <p className="mt-2 text-text-secondary">Assign work and keep every client application moving.</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-[1fr_220px]">
            <label className="relative"><Search className="absolute left-3 top-3 text-text-secondary" size={17} strokeWidth={1.5} /><input value={applicationSearch} onChange={(event) => setApplicationSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void loadApplications() }} placeholder="Search reference number" className="w-full pl-10" /></label>
            <select value={applicationStatus} onChange={(event) => { setApplicationStatus(event.target.value); setTimeout(() => void loadApplications(), 0) }} aria-label="Filter applications by status"><option value="all">All statuses</option><option value="submitted">Submitted</option><option value="docs_pending">Documents pending</option><option value="under_review">Under review</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option></select>
          </div>
          {applicationLoading ? <div className="mt-6 flex items-center justify-center border border-border bg-white py-16 text-text-secondary"><LoaderCircle className="mr-2 animate-spin" size={18} /> Loading applications...</div> : applications.length === 0 ? <div className="mt-6 border border-border bg-white py-16 text-center"><FileText className="mx-auto text-text-secondary" size={32} /><h2 className="mt-4 font-heading text-2xl font-bold text-navy">No applications found</h2><p className="mt-2 text-sm text-text-secondary">Try changing the search or status filter.</p></div> : <div className="mt-6 overflow-x-auto border border-border bg-white"><table className="min-w-[900px] w-full text-left"><thead className="border-b border-border bg-gray-50 text-xs uppercase tracking-wide text-text-secondary"><tr><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Program</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Worker</th></tr></thead><tbody>{applications.map((application) => <tr key={application.id} className="border-b border-border last:border-0"><td className="px-4 py-4 font-mono text-sm font-semibold text-navy">{application.referenceNo}<p className="font-sans text-xs font-normal text-text-secondary">{application.deadline ?? 'No deadline'}</p></td><td className="px-4 py-4 text-sm text-navy">{application.clientFirstName} {application.clientLastName}<p className="text-xs text-text-secondary">{application.clientEmail}</p></td><td className="px-4 py-4 text-sm text-text-secondary">{application.programTitle ?? 'Custom course'}<p className="text-xs">{application.universityName ?? 'No university'}</p></td><td className="px-4 py-4"><select disabled={updatingApplicationId === application.id} value={application.status ?? 'draft'} onChange={(event) => void updateApplication(application.id, { status: event.target.value })} aria-label={`Status for ${application.referenceNo}`}><option value="draft">Draft</option><option value="submitted">Submitted</option><option value="docs_pending">Documents pending</option><option value="docs_complete">Documents complete</option><option value="under_review">Under review</option><option value="offer_received">Offer received</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option><option value="withdrawn">Withdrawn</option></select></td><td className="px-4 py-4"><select disabled={updatingApplicationId === application.id} value={application.assignedWorkerId ?? ''} onChange={(event) => void updateApplication(application.id, { assignedWorkerId: event.target.value || null })} aria-label={`Worker for ${application.referenceNo}`}><option value="">Unassigned</option>{workers.filter((worker) => worker.isActive).map((worker) => <option key={worker.id} value={worker.id}>{worker.firstName} {worker.lastName}</option>)}</select></td></tr>)}</tbody></table></div>}
        </section> : <>
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold">Payments</p>
          <h1 className="mt-2 font-heading text-4xl font-bold text-navy">Receipt review</h1>
          <p className="mt-2 text-text-secondary">Confirm client payments to unlock their applications.</p>
        </div>

        {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-danger">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center rounded-xl border border-border bg-white py-20 text-text-secondary">
            <LoaderCircle className="mr-2 animate-spin" size={18} strokeWidth={1.5} /> Loading receipts...
          </div>
        ) : receipts.length === 0 ? (
          <div className="rounded-xl border border-border bg-white py-20 text-center">
            <FileText className="mx-auto text-text-secondary" size={32} strokeWidth={1.5} />
            <h2 className="mt-4 font-heading text-2xl font-bold text-navy">No receipts yet</h2>
            <p className="mt-2 text-sm text-text-secondary">Uploaded payment receipts will appear here for review.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-white">
            <div className="grid grid-cols-[1.3fr_1fr_0.8fr_1.2fr] gap-4 border-b border-border bg-gray-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">
              <span>Client</span><span>Receipt</span><span>Amount</span><span>Action</span>
            </div>
            {receipts.map((receipt) => {
              const isUpdating = updatingId === receipt.id
              return (
                <div key={receipt.id} className="grid grid-cols-[1.3fr_1fr_0.8fr_1.2fr] items-center gap-4 border-b border-border px-5 py-5 last:border-0">
                  <div><p className="font-semibold text-navy">{receipt.clientName} {receipt.clientLastName}</p><p className="text-sm text-text-secondary">{receipt.clientEmail}</p></div>
                  <a href={receipt.fileUrl} target="_blank" rel="noreferrer" className="truncate text-sm text-gold hover:underline">{receipt.fileName ?? 'View receipt'}</a>
                  <span className="text-sm text-navy">{receipt.amountPaid ? `${receipt.currency ?? ''} ${receipt.amountPaid}` : 'Not set'}</span>
                  {receipt.confirmed ? (
                    <span className="flex items-center gap-2 text-sm font-semibold text-success"><Check size={16} strokeWidth={1.5} /> Confirmed</span>
                  ) : (
                    <div className="flex gap-2">
                      <button type="button" disabled={isUpdating} onClick={() => void updateReceipt(receipt.id, 'confirm')} className="flex items-center gap-1 rounded-md bg-success px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Check size={14} strokeWidth={1.5} /> Confirm</button>
                      <button type="button" disabled={isUpdating} onClick={() => void updateReceipt(receipt.id, 'reject')} className="flex items-center gap-1 rounded-md border border-danger px-3 py-2 text-xs font-semibold text-danger disabled:opacity-50"><X size={14} strokeWidth={1.5} /> Reject</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        </>}
      </section>
    </main>
  )
}
