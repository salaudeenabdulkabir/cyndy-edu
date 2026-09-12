import { serverLog } from '@/lib/server-log'
import { alias } from 'drizzle-orm/pg-core'
import { requireAdmin } from '@/lib/require-admin'
import { and, asc, eq, ilike } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { applications, programs, universities, countries, users } from '@/lib/db/schema'

const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['draft', 'submitted', 'docs_pending', 'docs_complete', 'under_review', 'offer_received', 'accepted', 'rejected', 'withdrawn']).optional(),
  assignedWorkerId: z.string().uuid().nullable().optional(),
})

export async function GET(request: Request) {
  const access = await requireAdmin()
  if ('response' in access) return access.response
  try {
    const params = new URL(request.url).searchParams
    const status = params.get('status')
    const search = params.get('search')?.trim()
    const filters = []
    if (status && status !== 'all') filters.push(eq(applications.status, status as typeof applications.status.enumValues[number]))
    if (search) filters.push(ilike(applications.referenceNo, `%${search}%`))

    const assignedWorker = alias(users, 'assigned_worker')
    const rows = await db.select({
      id: applications.id, referenceNo: applications.referenceNo, status: applications.status,
      deadline: applications.deadline, paymentConfirmed: applications.paymentConfirmed,
      formCompletionPct: applications.formCompletionPct, assignedWorkerId: applications.assignedWorkerId,
      clientFirstName: users.firstName, clientLastName: users.lastName, clientEmail: users.email,
      workerFirstName: assignedWorker.firstName, programTitle: programs.title, universityName: universities.name,
      countryName: countries.name, countryCode: countries.code,
    }).from(applications)
      .innerJoin(users, eq(applications.clientId, users.id))
      .leftJoin(assignedWorker, eq(applications.assignedWorkerId, assignedWorker.id))
      .leftJoin(programs, eq(applications.programId, programs.id))
      .leftJoin(universities, eq(programs.universityId, universities.id))
      .leftJoin(countries, eq(universities.countryId, countries.id))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(asc(applications.deadline), asc(applications.createdAt))

    const workers = await db.query.users.findMany({
      where: eq(users.role, 'worker'),
      columns: { id: true, firstName: true, lastName: true, email: true, isActive: true },
    })
    return NextResponse.json({ applications: rows, workers })
  } catch (error) {
    serverLog('[GET /api/admin/applications]', error)
    return NextResponse.json({ error: 'Failed to load applications', code: 'ADMIN_APPLICATIONS_LOAD_FAILED' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const access = await requireAdmin()
  if ('response' in access) return access.response
  try {
    const parsed = updateSchema.safeParse(await request.json())
    if (!parsed.success || (!parsed.data.status && parsed.data.assignedWorkerId === undefined)) {
      return NextResponse.json({ error: 'Invalid application update', code: 'INVALID_INPUT' }, { status: 400 })
    }
    if (parsed.data.assignedWorkerId) {
      const worker = await db.query.users.findFirst({ where: and(eq(users.id, parsed.data.assignedWorkerId), eq(users.role, 'worker'), eq(users.isActive, true)) })
      if (!worker) return NextResponse.json({ error: 'Active worker not found', code: 'WORKER_NOT_FOUND' }, { status: 400 })
    }
    await db.update(applications).set({
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.assignedWorkerId !== undefined ? { assignedWorkerId: parsed.data.assignedWorkerId } : {}),
      updatedAt: new Date(),
    }).where(eq(applications.id, parsed.data.id))
    return NextResponse.json({ updated: true })
  } catch (error) {
    serverLog('[PATCH /api/admin/applications]', error)
    return NextResponse.json({ error: 'Failed to update application', code: 'ADMIN_APPLICATION_UPDATE_FAILED' }, { status: 500 })
  }
}
