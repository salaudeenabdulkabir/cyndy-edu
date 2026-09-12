import { auth } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { applications, users } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/require-admin'
import PrintButton from './print-button'
export const dynamic = 'force-dynamic'
const label = (key: string) => key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, char => char.toUpperCase())
function Answers({ value }: { value: unknown }) {
  if (value == null || value === '') return <span>Not provided</span>
  if (Array.isArray(value)) return <ol className="list-decimal space-y-3 pl-5">{value.map((item, index) => <li key={index}><Answers value={item} /></li>)}</ol>
  if (typeof value === 'object') return <dl className="space-y-3">{Object.entries(value).map(([key,item]) => <div key={key} className="break-inside-avoid"><dt className="text-sm font-semibold">{label(key)}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm"><Answers value={item} /></dd></div>)}</dl>
  return <span>{typeof value === 'boolean' ? value ? 'Yes' : 'No' : String(value)}</span>
}
export default async function PrintApplication({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) notFound()
  const { userId } = await auth()
  if (!userId) notFound()
  const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
  if (!user?.isActive || (user.role === 'worker' && user.firstLogin)) notFound()
  if (user.role === 'admin' && 'response' in await requireAdmin()) notFound()
  const application = await db.query.applications.findFirst({ where: eq(applications.id,id), with: { program: { with: { university: true } } } })
  if (!application || !(user.role === 'admin' || user.role === 'client' && application.clientId === user.id || user.role === 'worker' && application.assignedWorkerId === user.id)) notFound()
  return <main className="mx-auto max-w-3xl bg-white px-6 py-12 text-navy print:p-0"><PrintButton /><h1 className="mt-8 font-heading text-3xl font-bold">Cyndy Educational Pathways</h1><p className="mt-2">Application {application.referenceNo}</p><p className="mt-2 text-sm">{application.program?.university?.name} · {application.program?.title || application.customCourseText}</p><p className="my-5 text-sm">Status: {application.status?.replace(/_/g,' ')} · Exported {new Date().toISOString().slice(0,10)}</p><hr className="mb-6" /><Answers value={application.applicationData} /><p className="mt-8 border-t pt-4 text-xs">Confidential applicant copy. Store and share this document securely.</p></main>
}
