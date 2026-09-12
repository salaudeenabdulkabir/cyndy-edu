import { serverLog } from '@/lib/server-log'
import { requireAdmin } from '@/lib/require-admin'
import { and, count, eq, ilike, or } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { applications, clientPackages, users } from '@/lib/db/schema'

export async function GET(request: Request) {
  const access = await requireAdmin()
  if ('response' in access) return access.response
  try {
    const params = new URL(request.url).searchParams
    const search = params.get('search')?.trim()
    const payment = params.get('payment')
    const filters = [eq(users.role, 'client' as typeof users.role.enumValues[number])]
    if (search) filters.push(or(ilike(users.firstName, `%${search}%`), ilike(users.lastName, `%${search}%`), ilike(users.email, `%${search}%`))!)
    if (payment === 'confirmed') filters.push(eq(clientPackages.paymentConfirmed, true))
    if (payment === 'pending') filters.push(eq(clientPackages.paymentConfirmed, false))
    const clients = await db.select({
      id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email,
      phone: users.phone, joinedAt: users.createdAt, packageId: clientPackages.id,
      totalApplications: clientPackages.totalApplications, amountPaid: clientPackages.amountPaid,
      currency: clientPackages.currency, paymentConfirmed: clientPackages.paymentConfirmed,
      applicationCount: count(applications.id),
    }).from(users).leftJoin(clientPackages, eq(clientPackages.clientId, users.id))
      .leftJoin(applications, eq(applications.clientId, users.id))
      .where(and(...filters)).groupBy(users.id, clientPackages.id)
    return NextResponse.json({ clients })
  } catch (error) {
    serverLog('[GET /api/admin/clients]', error)
    return NextResponse.json({ error: 'Failed to load clients', code: 'CLIENTS_LOAD_FAILED' }, { status: 500 })
  }
}
