import { NextResponse } from 'next/server'
import { desc } from 'drizzle-orm'
import { requireAdmin } from '@/lib/require-admin'
import { db } from '@/lib/db'
import { auditEvents } from '@/lib/db/schema'
export async function GET() {
  const access = await requireAdmin(); if ('response' in access) return access.response
  return NextResponse.json({ events: await db.select().from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(200) })
}
