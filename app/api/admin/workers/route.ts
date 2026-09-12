import { serverLog } from '@/lib/server-log'
import { requireAdmin } from '@/lib/require-admin'
import { clerkClient } from '@clerk/nextjs/server'
import { and, count, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { applications, users } from '@/lib/db/schema'

const createSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
})
const updateSchema = z.object({ id: z.string().uuid(), isActive: z.boolean() })

export async function GET() {
  const access = await requireAdmin()
  if ('response' in access) return access.response
  try {
    const workers = await db.select({
      id: users.id, clerkId: users.clerkId, firstName: users.firstName, lastName: users.lastName,
      email: users.email, isActive: users.isActive, lastSeen: users.lastSeen, createdAt: users.createdAt,
      activeApplications: count(applications.id),
    }).from(users).leftJoin(applications, and(eq(applications.assignedWorkerId, users.id), eq(applications.status, 'under_review')))
      .where(eq(users.role, 'worker')).groupBy(users.id).orderBy(users.firstName, users.lastName)
    return NextResponse.json({ workers })
  } catch (error) {
    serverLog('[GET /api/admin/workers]', error)
    return NextResponse.json({ error: 'Failed to load workers', code: 'WORKERS_LOAD_FAILED' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const access = await requireAdmin()
  if ('response' in access) return access.response
  try {
    const parsed = createSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Invalid worker details', code: 'INVALID_INPUT' }, { status: 400 })
    const clerkUser = await (await clerkClient()).users.createUser({
      emailAddress: [parsed.data.email],
      password: parsed.data.password,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      publicMetadata: { role: 'worker' },
    })
    const [worker] = await db.insert(users).values({
      clerkId: clerkUser.id, email: parsed.data.email, firstName: parsed.data.firstName,
      lastName: parsed.data.lastName, role: 'worker', isActive: true, firstLogin: true,
    }).onConflictDoUpdate({ target: users.clerkId, set: { role: 'worker', isActive: true, firstLogin: true } }).returning({ id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName })
    return NextResponse.json({ worker }, { status: 201 })
  } catch (error) {
    serverLog('[POST /api/admin/workers]', error)
    return NextResponse.json({ error: 'Failed to create worker', code: 'WORKER_CREATE_FAILED' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const access = await requireAdmin()
  if ('response' in access) return access.response
  try {
    const parsed = updateSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Invalid worker update', code: 'INVALID_INPUT' }, { status: 400 })
    const worker = await db.query.users.findFirst({ where: and(eq(users.id, parsed.data.id), eq(users.role, 'worker')) })
    if (!worker) return NextResponse.json({ error: 'Worker not found', code: 'WORKER_NOT_FOUND' }, { status: 404 })
    await db.update(users).set({ isActive: parsed.data.isActive, updatedAt: new Date() }).where(eq(users.id, parsed.data.id))
    return NextResponse.json({ updated: true })
  } catch (error) {
    serverLog('[PATCH /api/admin/workers]', error)
    return NextResponse.json({ error: 'Failed to update worker', code: 'WORKER_UPDATE_FAILED' }, { status: 500 })
  }
}
