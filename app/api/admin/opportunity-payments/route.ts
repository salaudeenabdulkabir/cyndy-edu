import { NextResponse } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { applicationOrders, applications, programs, users } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/require-admin'
import { getSignedDownloadUrl } from '@/lib/r2'
export async function GET() {
  const access = await requireAdmin(); if ('response' in access) return access.response
  try {
    const rows = await db.select({ order: applicationOrders, reference: applications.referenceNo, title: programs.title, email: users.email }).from(applicationOrders)
      .innerJoin(applications, eq(applications.id, applicationOrders.applicationId)).innerJoin(programs, eq(programs.id, applicationOrders.programId)).innerJoin(users, eq(users.id, applicationOrders.clientId))
    return NextResponse.json({ orders: await Promise.all(rows.map(async row => ({ ...row, order: { ...row.order, receiptKey: undefined }, receiptUrl: row.order.receiptKey ? await getSignedDownloadUrl(row.order.receiptKey, 900) : null }))) })
  } catch { return NextResponse.json({ error: 'Unable to load payments' }, { status: 503 }) }
}
export async function PATCH(request: Request) {
  const access = await requireAdmin(); if ('response' in access) return access.response
  try {
    const parsed = z.object({ id: z.string().uuid(), action: z.enum(['confirm','reject']), reason: z.string().trim().max(2000).default('') }).strict().safeParse(await request.json())
    if (!parsed.success || (parsed.data.action === 'reject' && parsed.data.reason.length < 5)) return NextResponse.json({ error: 'Select a payment and give a rejection reason if needed' }, { status: 400 })
    const {id,action,reason} = parsed.data
    // A single statement atomically claims the pending receipt and changes only its application.
    const result = await db.execute(sql`WITH reviewed AS (
      UPDATE application_orders SET status=${action === 'confirm' ? 'confirmed' : 'rejected'}, rejection_reason=${action === 'reject' ? reason : null}, reviewed_by=${access.admin.id}::uuid, reviewed_at=now()
      WHERE id=${id}::uuid AND status='pending_review' AND receipt_key IS NOT NULL RETURNING application_id
    ), changed AS (
      UPDATE applications SET payment_confirmed=${action === 'confirm'}, updated_at=now() WHERE id IN (SELECT application_id FROM reviewed) RETURNING id
    ) SELECT id FROM changed`)
    if (!result.rows.length) return NextResponse.json({ error: 'This receipt is no longer pending review. Refresh the list.' }, { status: 409 })
    return NextResponse.json({ ok: true })
  } catch { return NextResponse.json({ error: 'Unable to review payment' }, { status: 500 }) }
}
