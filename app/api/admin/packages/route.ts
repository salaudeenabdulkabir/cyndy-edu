import { NextResponse } from 'next/server'
import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { applications, clientPackages, users } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/require-admin'
import { ensureClientPackage } from '@/lib/client-profile'
import { generateReferenceNo } from '@/lib/utils'

const schema = z.object({ clientId: z.string().uuid(), totalApplications: z.number().int().min(1).max(3),
  amountPaid: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/), currency: z.enum(['NGN', 'USD', 'GBP', 'EUR']), notes: z.string().trim().max(2000).default(''),
}).strict()

export async function PATCH(request: Request) {
  const access = await requireAdmin()
  if ('response' in access) return access.response
  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Check the package fields' }, { status: 400 })
    const { clientId, totalApplications, amountPaid, currency, notes } = parsed.data
    const client = await db.query.users.findFirst({ where: and(eq(users.id, clientId), eq(users.role, 'client'), eq(users.isActive, true)) })
    if (!client) return NextResponse.json({ error: 'Active client not found' }, { status: 404 })
    const pkg = await ensureClientPackage(clientId)
    if (totalApplications < (pkg.totalApplications ?? 1)) return NextResponse.json({ error: 'Application allowances cannot be reduced after allocation' }, { status: 409 })
    const values = await Promise.all(Array.from({ length: totalApplications }, async (_, i) => ({
      clientId, packageId: pkg.id, slot: i + 1, referenceNo: await generateReferenceNo(), paymentConfirmed: pkg.paymentConfirmed,
    })))
    // Atomic allocation. Concurrent requests cannot reduce the allowance or duplicate slots.
    await db.batch([
      db.update(clientPackages).set({ totalApplications: sql`greatest(${clientPackages.totalApplications}, ${totalApplications})`, amountPaid, currency, notes, updatedAt: new Date() }).where(eq(clientPackages.id, pkg.id)),
      db.insert(applications).values(values).onConflictDoNothing({ target: [applications.clientId, applications.slot] }),
    ])
    return NextResponse.json({ ok: true })
  } catch { return NextResponse.json({ error: 'Could not save package' }, { status: 500 }) }
}
