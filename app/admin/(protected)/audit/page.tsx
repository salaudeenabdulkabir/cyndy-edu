import Link from 'next/link'
import { desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { auditEvents } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/require-admin'
import { notFound } from 'next/navigation'
export const dynamic = 'force-dynamic'
export default async function AuditPage() {
  if ('response' in await requireAdmin()) notFound()
  const events = await db.select().from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(200)
  return <main className="mx-auto max-w-5xl px-5 py-12"><Link href="/admin" className="underline">Back to administration</Link><h1 className="my-6 font-heading text-4xl font-bold text-navy">Audit records</h1><p className="mb-5 text-sm text-text-secondary">Latest 200 database changes. These records identify the affected record and operation; they do not yet identify the staff member who initiated it.</p><div className="overflow-x-auto rounded border bg-white"><table className="w-full text-left text-sm"><thead><tr>{['Time','Record type','Operation','Record ID'].map(text => <th key={text} className="p-3">{text}</th>)}</tr></thead><tbody>{events.map(event => <tr key={event.id} className="border-t"><td className="p-3 whitespace-nowrap">{event.createdAt.toISOString()}</td><td className="p-3">{event.entityType.replace(/_/g,' ')}</td><td className="p-3">{event.action}</td><td className="p-3 font-mono text-xs">{event.entityId}</td></tr>)}</tbody></table>{!events.length && <p className="p-5">No recorded changes yet.</p>}</div></main>
}
