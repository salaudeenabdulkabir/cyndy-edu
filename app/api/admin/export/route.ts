import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { applications } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/require-admin'
import { toCsv } from '@/lib/csv'
export async function GET() {
  const access = await requireAdmin(); if ('response' in access) return access.response
  const rows = await db.select({ reference: applications.referenceNo, status: applications.status, deadline: applications.deadline, paid: applications.paymentConfirmed, progress: applications.formCompletionPct }).from(applications).limit(10000)
  return new NextResponse(toCsv([['Reference','Status','Deadline','Payment confirmed','Completion %'], ...rows.map(row => [row.reference,row.status,row.deadline,row.paid,row.progress])]), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="applications.csv"', 'Cache-Control': 'private, no-store' },
  })
}
