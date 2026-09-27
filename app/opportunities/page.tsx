'use client'
import { usePortalFetch } from '@/lib/use-portal-fetch'
import { useEffect, useState } from 'react'
import { UserButton } from '@clerk/nextjs'
import { WORLD_COUNTRIES } from '@/lib/countries'

type Offer = {id: string; title: string; school: string; destination: string; level: string | null; deadline: string | null; scholarship: boolean; priceId: string | null; payerCountry: string | null; amount: string | null; currency: string | null}
type Requirement = {name:string;description:string|null;global:boolean;programId:string|null;mandatory:boolean|null}
type Application = {program?:{title:string}|null;id: string; referenceNo: string; status: string; formCompletionPct: number; deadline: string | null; paymentConfirmed: boolean}
type Order = {applicationId: string; amount: string; currency: string; status: string}
export default function Opportunities() {
  const fetch = usePortalFetch()
  const [requirements,setRequirements]=useState<Requirement[]>([])
  const [offers,setOffers] = useState<Offer[]>([])
  const [apps,setApps] = useState<Application[]>([])
  const [orders,setOrders] = useState<Order[]>([])
  const [country,setCountry] = useState('')
  const [search,setSearch] = useState('')
  const [error,setError] = useState('')
  const [loading,setLoading] = useState(true)
  const [busy,setBusy] = useState('')
  useEffect(() => { void (async () => {
    try {
      const [a,b] = await Promise.all([fetch('/api/opportunities'),fetch('/api/applications')])
      const [data, applications] = await Promise.all([a.json(),b.json()])
      if (!a.ok || !b.ok) throw new Error(data.error || applications.error || 'Unable to load dashboard')
      setRequirements(data.requirements); setOffers(data.offers); setOrders(data.orders); setApps(applications)
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load dashboard') }
    finally { setLoading(false) }
  })() },[fetch])
  async function select(priceId: string) {
    setBusy(priceId); setError('')
    try {
      const response = await fetch('/api/opportunities',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({priceId}) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error)
      window.location.href='/apply?application='+encodeURIComponent(data.applicationId)
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to select opportunity'); setBusy('') }
  }
  const programs = Array.from(new Map(offers.map(offer => [offer.id,offer])).values()).filter(offer => `${offer.title} ${offer.school} ${offer.destination}`.toLowerCase().includes(search.toLowerCase()))
  return <div className="min-h-screen bg-background">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-5"><a href="/opportunities" className="font-heading text-lg font-bold text-navy">Cyndy Pathways</a><nav className="flex items-center gap-4 text-sm"><a href="/support" className="underline">Get help</a><UserButton /></nav></div></header>
    <main className="mx-auto max-w-6xl space-y-10 px-5 py-8 sm:py-12">
      <div><p className="text-sm font-semibold uppercase tracking-widest text-gold">Your next chapter</p><h1 className="mt-3 text-3xl font-bold text-navy sm:text-4xl">Find your opportunity.</h1><p className="mt-3 max-w-2xl text-text-secondary">Choose an open application, check its fee and documents, then work through your application at your own pace.</p></div>
      <aside className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm"><strong>Missing a document?</strong> If you do not have a recommendation letter, transcript or another required document, <a href="/support" className="font-semibold underline">contact Cyndy before paying</a>. We can explain what you need. You can save a draft while gathering documents; submission needs every required document or an admin-approved waiver.</aside>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-danger">{error} <button onClick={() => window.location.reload()} className="underline">Reload</button></p>}
      {loading && <p role="status">Loading your dashboard…</p>}
      {apps.length > 0 && <section aria-labelledby="my-applications"><h2 id="my-applications" className="mb-4 text-2xl font-bold text-navy">My applications</h2><div className="grid gap-4 md:grid-cols-2">{apps.map(app => {
        const order=orders.find(item => item.applicationId===app.id)
        return <article key={app.id} className="rounded-xl border bg-white p-5"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold">{app.program?.title || 'Application'}</h3><p className="text-xs">{app.referenceNo}</p><span className="text-sm capitalize">{app.status.replaceAll('_',' ')}</span></div><p className="mt-3 text-sm">{order ? `${order.currency} ${order.amount} · ${order.status.replaceAll('_',' ')}` : app.paymentConfirmed ? 'Payment confirmed' : 'Payment awaiting confirmation'}</p><label className="mt-4 block text-sm">Form details: {app.formCompletionPct ?? 0}%<progress className="mt-2 h-2 w-full accent-gold" value={app.formCompletionPct ?? 0} max={100} /></label><p className="mt-2 text-sm">Deadline: {app.deadline || 'Contact Cyndy'}</p><a href={app.status==='draft' ? '/apply?application='+app.id : '/status'} className="mt-5 inline-block rounded-lg bg-navy px-5 py-3 text-sm font-semibold text-white">{app.status==='draft' ? 'Continue application' : 'View application status'}</a></article>
      })}</div></section>}
      <section aria-labelledby="open-opportunities"><h2 id="open-opportunities" className="text-2xl font-bold text-navy">Open opportunities</h2><div className="my-5 grid gap-4 rounded-xl border bg-white p-5 sm:grid-cols-2"><label className="text-sm font-semibold">Country you are paying from<select value={country} onChange={event=>setCountry(event.target.value)} className="mt-2 w-full"><option value="">Select your country</option>{WORLD_COUNTRIES.map(item=><option key={item.code} value={item.code}>{item.name}</option>)}</select></label><label className="text-sm font-semibold">Find a course, school or destination<input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search opportunities" className="mt-2 w-full" /></label></div>
        {!loading && !programs.length && <p className="rounded-xl border bg-white p-6">No matching opportunities are open right now. <a href="/support" className="underline">Contact Cyndy for guidance.</a></p>}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{programs.map(offer=>{const price=offers.find(item=>item.id===offer.id && item.payerCountry===country);return <article key={offer.id} className="flex flex-col rounded-xl border bg-white p-6"><p className="text-xs font-semibold uppercase tracking-wider text-gold">{offer.destination} · {offer.scholarship ? 'Scholarship available' : 'Admission'}</p><h3 className="mt-3 text-xl font-bold text-navy">{offer.title}</h3><p className="mt-2 text-sm text-text-secondary">{offer.school}{offer.level ? ' · '+offer.level : ''}</p><p className="my-5 text-sm">Deadline: {offer.deadline || 'Contact Cyndy'}</p><details className="mb-5 text-sm"><summary className="cursor-pointer font-semibold">Documents to prepare</summary><ul className="mt-3 space-y-2">{Array.from(new Map(requirements.filter(item=>item.global || item.programId===offer.id).map(item=>[item.name,item])).values()).map(item=><li key={item.name}><strong>{item.name}</strong> ({item.global || item.mandatory ? 'required' : 'optional'}){item.description && <p className="text-text-secondary">{item.description}</p>}</li>)}</ul><a href="/support" className="mt-3 block underline">Missing a document? Get help before paying.</a></details><div className="mt-auto border-t pt-4">{price?.priceId ? <><p className="text-xl font-bold">{price.currency} {price.amount}</p><p className="mt-1 text-xs text-text-secondary">Cyndy service fee for this opportunity. Review payment instructions on the next screen.</p><button disabled={Boolean(busy)} onClick={()=>void select(price.priceId!)} className="mt-4 w-full rounded-lg bg-gold p-3 font-semibold text-navy disabled:opacity-50">{busy===price.priceId ? 'Opening…' : 'Choose opportunity'}</button></> : <p className="text-sm">{country ? <>A fee is not published for your payment country. <a href="/support" className="underline">Ask Cyndy before paying.</a></> : 'Select your payment country to see the fee.'}</p>}</div></article>})}</div>
      </section>
    </main>
  </div>
}
