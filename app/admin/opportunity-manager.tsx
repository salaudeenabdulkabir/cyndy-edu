'use client'
import { usePortalFetch } from '@/lib/use-portal-fetch'
import { useCallback, useEffect, useState } from 'react'
import { WORLD_COUNTRIES } from '@/lib/countries'
type Price = { programId: string; payerCountry: string; amount: string; currency: string; bankDetails: string; instructions: string; active: boolean }
type Payment = {reference: string; title: string; email: string; receiptUrl: string | null; order: {id: string; amount: string; currency: string; payerCountry: string; status: string; receiptName: string | null}}
const empty: Price = {programId:'',payerCountry:'',amount:'',currency:'',bankDetails:'',instructions:'',active:false}
export default function OpportunityManager() {
  const fetch = usePortalFetch()
  const [prices,setPrices]=useState<Price[]>([])
  const [programs,setPrograms]=useState<Array<{id:string;title:string}>>([])
  const [payments,setPayments]=useState<Payment[]>([])
  const [form,setForm]=useState<Price>(empty)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState(false)
  const [apps,setApps]=useState<Array<{id:string;referenceNo:string;status:string}>>([])
  const [docs,setDocs]=useState<Array<{id:string;name:string}>>([])
  const load=useCallback(async()=>{try{
    const responses=await Promise.all(['/api/admin/opportunity-prices','/api/admin/opportunity-payments','/api/admin/applications','/api/admin/document-types'].map(url=>fetch(url)))
    const bodies=await Promise.all(responses.map(response=>response.json()))
    for(let i=0;i<responses.length;i++)if(!responses[i].ok)throw new Error(bodies[i].error)
    setPrices(bodies[0].prices);setPrograms(bodies[0].programs);setPayments(bodies[1].orders);setApps(bodies[2].applications);setDocs(bodies[3].documentTypes)
  }catch(err){setError(err instanceof Error ? err.message : 'Unable to load opportunity settings')}},[fetch])
  useEffect(()=>{void load()},[load])
  async function send(url:string,body:unknown,method='POST'){
    setBusy(true);setError('');setMessage('')
    try{const response=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw new Error(data.error);setMessage('Saved successfully.');await load();return true}
    catch(err){setError(err instanceof Error ? err.message : 'Could not save');return false}finally{setBusy(false)}
  }
  return <section className="space-y-8"><div><h1 className="text-3xl font-bold text-navy">Opportunities &amp; payments</h1><p className="mt-2 text-text-secondary">Create schools and programs in Countries &amp; Programs first. Set a separate service fee and payment instructions for each country the applicant pays from.</p></div>
    {error&&<p role="alert" className="rounded bg-red-50 p-4 text-danger">{error}</p>}{message&&<p role="status" className="rounded bg-green-50 p-4">{message}</p>}
    <form className="grid gap-4 rounded-xl border bg-white p-5 sm:grid-cols-2" onSubmit={async event=>{event.preventDefault();await send('/api/admin/opportunity-prices',form)}}>
      <h2 className="text-xl font-bold sm:col-span-2">Country price &amp; bank account</h2>
      <label>Opportunity<select required className="mt-2 w-full" value={form.programId} onChange={event=>setForm({...form,programId:event.target.value})}><option value="">Select opportunity</option>{programs.map(program=><option key={program.id} value={program.id}>{program.title}</option>)}</select></label>
      <label>Applicant pays from<select required className="mt-2 w-full" value={form.payerCountry} onChange={event=>setForm({...form,payerCountry:event.target.value})}><option value="">Select country</option>{WORLD_COUNTRIES.map(country=><option key={country.code} value={country.code}>{country.name}</option>)}</select></label>
      <label>Service fee<input required inputMode="decimal" pattern="[0-9]+(\.[0-9]{1,2})?" className="mt-2 w-full" value={form.amount} onChange={event=>setForm({...form,amount:event.target.value})}/></label>
      <label>Currency code<input required maxLength={3} pattern="[A-Z]{3}" placeholder="NGN, USD, GBP…" className="mt-2 w-full" value={form.currency} onChange={event=>setForm({...form,currency:event.target.value.toUpperCase()})}/></label>
      <label className="sm:col-span-2">Bank name, account holder &amp; account number<textarea required minLength={10} maxLength={2000} className="mt-2 w-full" value={form.bankDetails} onChange={event=>setForm({...form,bankDetails:event.target.value})}/></label>
      <label className="sm:col-span-2">Payment instructions<textarea maxLength={2000} className="mt-2 w-full" value={form.instructions} onChange={event=>setForm({...form,instructions:event.target.value})}/></label>
      <label className="flex items-center gap-3"><input type="checkbox" checked={form.active} onChange={event=>setForm({...form,active:event.target.checked})}/> Publish this country price</label><button disabled={busy} className="rounded-lg bg-gold p-3 font-semibold text-navy disabled:opacity-50">Save country price</button>
      <p className="text-sm text-text-secondary sm:col-span-2">Saving an existing opportunity/country updates future selections only. Existing applications retain their agreed price and bank details.</p>
    </form>
    <div className="grid gap-3 sm:grid-cols-2">{prices.map(price=><article key={price.programId+price.payerCountry} className="rounded-xl border bg-white p-4"><strong>{programs.find(program=>program.id===price.programId)?.title}</strong><p className="mt-2 text-sm">{WORLD_COUNTRIES.find(country=>country.code===price.payerCountry)?.name} · {price.currency} {price.amount} · {price.active?'Published':'Hidden'}</p><button onClick={()=>{setForm({programId:price.programId,payerCountry:price.payerCountry,amount:price.amount,currency:price.currency,bankDetails:price.bankDetails,instructions:price.instructions,active:price.active});window.scrollTo({top:0,behavior:'smooth'})}} className="mt-3 underline">Edit price and account</button></article>)}</div>
    <div><h2 className="mb-4 text-2xl font-bold">Review opportunity payments</h2><div className="space-y-4">{!payments.length&&<p>No opportunity payments yet.</p>}{payments.map(payment=><article key={payment.order.id} className="rounded-xl border bg-white p-5"><h3 className="font-bold">{payment.reference} · {payment.title}</h3><p className="mt-2 break-all text-sm">{payment.email}</p><p className="mt-2">{payment.order.currency} {payment.order.amount} · {payment.order.payerCountry} · {payment.order.status.replaceAll('_',' ')}</p>{payment.receiptUrl&&<a href={payment.receiptUrl} target="_blank" rel="noreferrer" className="my-3 block underline">Open receipt: {payment.order.receiptName}</a>}{payment.order.status==='pending_review'&&<form className="mt-4 flex flex-wrap gap-3" onSubmit={async event=>{event.preventDefault();const data=new FormData(event.currentTarget);await send('/api/admin/opportunity-payments',{id:payment.order.id,action:'reject',reason:data.get('reason')},'PATCH')}}><button type="button" disabled={busy} onClick={()=>void send('/api/admin/opportunity-payments',{id:payment.order.id,action:'confirm'},'PATCH')} className="rounded bg-green-100 p-3 font-semibold">Confirm this payment</button><input required minLength={5} maxLength={2000} name="reason" aria-label={`Rejection reason for ${payment.reference}`} placeholder="Reason if rejecting"/><button disabled={busy} className="rounded border border-red-200 p-3">Reject receipt</button></form>}</article>)}</div></div>
    <form className="space-y-4 rounded-xl border bg-white p-5" onSubmit={async event=>{event.preventDefault();const f=event.currentTarget;const data=new FormData(f);if(await send('/api/admin/document-waivers',{applicationId:data.get('applicationId'),documentTypeId:data.get('documentTypeId'),reason:data.get('reason')}))f.reset()}}><h2 className="text-xl font-bold">Waive a document requirement</h2><p className="text-sm">Waivers apply only to the selected application. Your identity and reason are recorded.</p><label className="block">Draft application<select name="applicationId" required className="mt-2 w-full"><option value="">Select application</option>{apps.filter(app=>app.status==='draft').map(app=><option key={app.id} value={app.id}>{app.referenceNo}</option>)}</select></label><label className="block">Document<select name="documentTypeId" required className="mt-2 w-full"><option value="">Select document</option>{docs.map(doc=><option key={doc.id} value={doc.id}>{doc.name}</option>)}</select></label><label className="block">Reason<textarea name="reason" required minLength={5} maxLength={2000} className="mt-2 w-full"/></label><button disabled={busy} className="rounded-lg bg-navy px-5 py-3 font-semibold text-white">Approve waiver for this application</button></form>
  </section>
}
