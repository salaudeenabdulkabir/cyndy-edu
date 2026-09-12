'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
type Notice = { id: string; title: string; message: string; isRead: boolean; createdAt: string }
export default function NotificationsPage() {
  const [rows, setRows] = useState<Notice[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => { let cancelled = false; void (async () => { try { const response = await fetch('/api/notifications'); const body = await response.json(); if (!response.ok) throw new Error(body.error); if (!cancelled) setRows(body.notifications) } catch { if (!cancelled) setError('Unable to load notifications. Please try again.') } finally { if (!cancelled) setLoading(false) } })(); return () => { cancelled = true } }, [])
  return <main className="mx-auto max-w-3xl px-5 py-16"><Link href="/" className="underline">Back to dashboard</Link><h1 className="my-7 font-heading text-4xl font-bold text-navy">Notifications</h1>{error && <p role="alert" className="text-danger">{error}</p>}{loading ? <p>Loading notifications…</p> : rows.length === 0 ? <p>No notifications yet.</p> : <ul className="space-y-4">{rows.map(row => <li key={row.id} className={`rounded-xl border p-5 ${row.isRead ? 'bg-white' : 'bg-amber-50'}`}><h2 className="font-semibold">{row.title}</h2><p className="mt-2 text-sm">{row.message}</p><p className="mt-2 text-xs text-text-secondary">{new Date(row.createdAt).toLocaleString()}</p>{!row.isRead && <button className="mt-3 text-sm underline" onClick={async () => { const response = await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({id:row.id}) }); if (response.ok) setRows(items => items.map(item => item.id === row.id ? {...item,isRead:true} : item)); else setError('Could not mark notification as read.') }}>Mark as read</button>}</li>)}</ul>}</main>
}
