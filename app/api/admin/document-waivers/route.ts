import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { applications, documentTypes, documentWaivers, programDocuments, auditEvents } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/require-admin'
export async function POST(request: Request) {
  const access = await requireAdmin(); if ('response' in access) return access.response
  try {
    const parsed = z.object({ applicationId: z.string().uuid(), documentTypeId: z.string().uuid(), reason: z.string().trim().min(5).max(2000) }).strict().safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Application, document and a reason are required' }, { status: 400 })
    const {applicationId,documentTypeId} = parsed.data
    const app = await db.query.applications.findFirst({ where: eq(applications.id, applicationId) })
    const doc = await db.query.documentTypes.findFirst({ where: eq(documentTypes.id, documentTypeId) })
    const linked = app?.programId && await db.query.programDocuments.findFirst({ where: and(eq(programDocuments.programId, app.programId), eq(programDocuments.documentTypeId, documentTypeId)) })
    if (!app || app.status !== 'draft' || !doc || (!doc.isGlobal && !linked)) return NextResponse.json({ error: 'Select a required document on a draft application' }, { status: 400 })
    await db.batch([
      db.insert(documentWaivers).values({ ...parsed.data, approvedBy: access.admin.id }).onConflictDoUpdate({ target: [documentWaivers.applicationId, documentWaivers.documentTypeId], set: {reason: parsed.data.reason, approvedBy: access.admin.id, createdAt: new Date()} }),
      db.insert(auditEvents).values({ entityType: 'document_waiver', entityId: applicationId, action: JSON.stringify({documentTypeId, approvedBy: access.admin.id, reason: parsed.data.reason}) }),
    ])
    return NextResponse.json({ ok: true })
  } catch { return NextResponse.json({ error: 'Unable to save waiver' }, { status: 500 }) }
}
