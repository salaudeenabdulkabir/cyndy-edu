import { NextResponse } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { programs } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/require-admin'
import { opportunitySchema } from '@/lib/opportunity-policy'

export async function GET() {
  const access = await requireAdmin(); if ('response' in access) return access.response
  try {
    return NextResponse.json({ opportunities: await db.select().from(programs).orderBy(asc(programs.title)) })
  } catch { return NextResponse.json({ error: 'Unable to load opportunities' }, { status: 503 }) }
}

export async function POST(request: Request) {
  const access = await requireAdmin(); if ('response' in access) return access.response
  try {
    const parsed = opportunitySchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Check the opportunity name, deadline and status.' }, { status: 400 })
    const { id, ...details } = parsed.data
    const values = { ...details, deadline: details.deadline || null, isActive: details.opportunityStatus === 'open', updatedAt: new Date() }
    const [opportunity] = id
      ? await db.update(programs).set(values).where(eq(programs.id, id)).returning()
      : await db.insert(programs).values(values).returning()
    if (!opportunity) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
    return NextResponse.json({ opportunity })
  } catch { return NextResponse.json({ error: 'Could not save this opportunity' }, { status: 500 }) }
}
