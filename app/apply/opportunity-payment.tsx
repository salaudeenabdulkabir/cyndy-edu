'use client'
import { usePortalFetch } from '@/lib/use-portal-fetch'
import { useCallback, useEffect, useState } from 'react'
import { useAutoSave, useWizard } from './wizard-context'
import { PaymentGate } from './payment-gate'
import ProgramSelection from './sections/program-selection'
type Order = {payerCountry: string; amount: string; currency: string; bankDetails: string; instructions: string; status: string; receiptName: string | null; rejectionReason: string | null}
export default function OpportunityPayment() {
  const fetch = usePortalFetch()
  const {applicationId,initialData,referenceNo} = useWizard()
  const [order,setOrder] = useState<Order | null>(null)
  const [loading,setLoading] = useState(true)
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const [course,setCourse] = useState(String(initialData.desiredCourse ?? ''))
  useAutoSave({desiredCourse: course})
  const load = useCallback(async () => {
    try { const response=await fetch(`/api/applications/${applicationId}/payment`);const body=await response.json();if(!response.ok)throw new Error(body.error);setOrder(body.order);setError('') }
    catch(err){setError(err instanceof Error ? err.message : 'Unable to load payment')}
    finally{setLoading(false)}
  },[applicationId,fetch])
  useEffect(()=>{void load()},[load])
  if (!initialData.opportunityPurchase) return <><PaymentGate applicationId={applicationId}><p className="mb-5 rounded bg-green-50 p-4">Your package payment is confirmed.</p></PaymentGate><ProgramSelection /></>
  return <section className="space-y-6"><div><p className="text-sm text-gold">Application {referenceNo}</p><h1 className="mt-2 text-3xl font-bold text-navy">Your opportunity &amp; payment</h1><p className="mt-3 text-text-secondary">You can complete the other sections while we review your payment. Final submission opens after payment is confirmed.</p></div>
    {loading && <p role="status">Loading payment instructions…</p>}{error && <p role="alert" className="text-danger">{error}</p>}
    {order && <div className="space-y-4 rounded-xl border bg-white p-6"><div className="flex flex-wrap justify-between gap-3"><p className="text-2xl font-bold">{order.currency} {order.amount}</p><span className="rounded-full bg-blue-50 px-3 py-2 text-sm capitalize">{order.status.replaceAll('_',' ')}</span></div><p className="text-sm">Payment country: {order.payerCountry} · Use reference: <strong>{referenceNo}</strong></p><h2 className="font-semibold">Bank details</h2><p className="whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-4">{order.bankDetails}</p><p className="whitespace-pre-wrap text-sm">{order.instructions}</p>{order.receiptName && <p className="text-sm">Receipt: {order.receiptName}</p>}{order.rejectionReason && <p className="rounded-lg bg-red-50 p-4 text-danger">Please correct your receipt: {order.rejectionReason}</p>}
    {['awaiting_payment','rejected'].includes(order.status) && <label className="block text-sm font-semibold">Upload payment receipt (PDF, JPG or PNG, up to 4 MB)<input className="mt-3 block w-full" type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={busy} onChange={async event=>{
      const file=event.target.files?.[0];event.target.value='';if(!file)return
      if(file.size>4*1024*1024){setError('Choose a file under 4 MB');return}setBusy(true);setError('')
      try{const form=new FormData();form.append('file',file);const response=await fetch(`/api/applications/${applicationId}/payment`,{method:'POST',body:form});const body=await response.json();if(!response.ok)throw new Error(body.error);await load()}catch(err){setError(err instanceof Error ? err.message : 'Upload failed')}finally{setBusy(false)}
    }}/></label>}{busy && <p role="status">Uploading receipt…</p>}<button onClick={()=>void load()} className="text-sm underline">Refresh payment status</button></div>}
    <label className="block rounded-xl border bg-white p-5 font-semibold">Which course would you like to study?<input className="mt-3 w-full font-normal" value={course} maxLength={200} onChange={event=>setCourse(event.target.value)} placeholder="For example, Public Health" /><span className="mt-2 block text-sm font-normal text-text-secondary">Tell us your preferred course. This does not change the opportunity or fee you selected.</span></label>
    <p className="rounded-xl bg-amber-50 p-5 text-sm">Missing a document or unsure about payment? <a href="/support" className="font-semibold underline">Contact Cyndy</a> before paying. Each opportunity has its own application and payment.</p>
  </section>
}
