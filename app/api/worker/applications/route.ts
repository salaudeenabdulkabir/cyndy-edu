import { requireAdmin } from '@/lib/require-admin'
import { serverLog } from '@/lib/server-log'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { applications, programs, universities, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  try {
    const account = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
    if (!account?.isActive || !['worker', 'admin'].includes(account.role)) {
      return NextResponse.json({ error: 'Worker access required', code: 'FORBIDDEN' }, { status: 403 })
    }

    if (account.role === 'admin') { const access = await requireAdmin(); if ('response' in access) return access.response }
    if (account.role === 'worker' && account.firstLogin) return NextResponse.json({ error: 'Change your temporary password before continuing', code: 'PASSWORD_CHANGE_REQUIRED' }, { status: 403 })
    const worker = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
    if (!worker) return NextResponse.json({ applications: [], stats: { active: 0, pendingDocuments: 0, completedThisMonth: 0 } })

    const assignedApplications = await db
      .select({
        id: applications.id,
        referenceNo: applications.referenceNo,
        status: applications.status,
        deadline: applications.deadline,
        updatedAt: applications.updatedAt,
        clientFirstName: users.firstName,
        clientLastName: users.lastName,
        programTitle: programs.title,
        universityName: universities.name,
      })
      .from(applications)
      .innerJoin(users, eq(applications.clientId, users.id))
      .leftJoin(programs, eq(applications.programId, programs.id))
      .leftJoin(universities, eq(programs.universityId, universities.id))
      .where(eq(applications.assignedWorkerId, worker.id))

    const activeStatuses = new Set(['draft', 'submitted', 'docs_pending', 'docs_complete', 'under_review', 'offer_received'])
    const completedStatuses = new Set(['accepted', 'rejected', 'withdrawn'])
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const stats = {
      active: assignedApplications.filter((application) => activeStatuses.has(application.status ?? '')).length,
      pendingDocuments: assignedApplications.filter((application) => application.status === 'docs_pending').length,
      completedThisMonth: assignedApplications.filter((application) => completedStatuses.has(application.status ?? '') && application.updatedAt && new Date(application.updatedAt) >= monthStart).length,
    }

    return NextResponse.json({ applications: assignedApplications, stats })
  } catch (error) {
    serverLog('[GET /api/worker/applications]', error)
    return NextResponse.json({ error: 'Failed to load assigned applications', code: 'WORKER_APPLICATIONS_LOAD_FAILED' }, { status: 500 })
  }
}
