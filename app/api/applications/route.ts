import { serverLog } from '@/lib/server-log'
import { clientApplication } from '@/lib/application-policy'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { applications } from '@/lib/db/schema'
import { and, asc, eq } from 'drizzle-orm'
import { generateReferenceNo } from '@/lib/utils'
import { NextResponse } from 'next/server'

import { ensureClientProfile, ensureClientPackage } from '@/lib/client-profile'

export async function POST(req: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const user = await ensureClientProfile(userId)
    if (!user.isActive || user.role !== 'client') return NextResponse.json({ error: 'Active client access required', code: 'FORBIDDEN' }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const slot = body.slot ?? 1
    const pkg = await ensureClientPackage(user.id)
    if (!Number.isInteger(slot) || slot < 1 || slot > (pkg.totalApplications ?? 1)) return NextResponse.json({ error: 'Application slot is outside your package' }, { status: 403 })
    // Database uniqueness arbitrates concurrent initialization requests.
    const existing = await db.query.applications.findFirst({
      where: and(eq(applications.clientId, user.id), eq(applications.slot, slot)),
    })

    if (existing) {
      return NextResponse.json(clientApplication(existing))
    }

    // Create new application with reference number
    const referenceNo = await generateReferenceNo()

    const newApp = await db.insert(applications).values({
      clientId: user.id, slot, packageId: pkg.id, paymentConfirmed: pkg.paymentConfirmed,
      referenceNo,
      status: 'draft',
    }).onConflictDoNothing({ target: [applications.clientId, applications.slot] }).returning()

    return NextResponse.json(clientApplication(newApp[0] ?? (await db.query.applications.findFirst({ where: and(eq(applications.clientId, user.id), eq(applications.slot, slot)) }))!))
  } catch (error) {
    serverLog('[POST /api/applications]', error)
    return NextResponse.json(
      { error: 'Failed to create application' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const user = await ensureClientProfile(userId)
    if (!user.isActive || user.role !== 'client') return NextResponse.json({ error: 'Active client access required', code: 'FORBIDDEN' }, { status: 403 })

    const apps = await db.query.applications.findMany({
      orderBy: asc(applications.slot),
      where: eq(applications.clientId, user.id),
    })

    return NextResponse.json(apps.map(clientApplication))
  } catch (error) {
    serverLog('[GET /api/applications]', error)
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    )
  }
}
