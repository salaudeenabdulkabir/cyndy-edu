import { serverLog } from '@/lib/server-log'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
export async function GET() {
  let stage = 'authentication'
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Sign in first', code: 'UNAUTHORIZED' }, { status: 401 })
    stage = 'database'
    const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
    if (!user?.isActive) return NextResponse.json({ error: 'Account is unavailable. Contact support.', code: 'FORBIDDEN' }, { status: 403 })
    if (user.role === 'admin' || user.role === 'worker') {
      stage = 'identity-role'
      const identity = await (await clerkClient()).users.getUser(userId)
      if (identity.publicMetadata.role !== user.role) return NextResponse.json({ error: 'Staff account setup is incomplete. Contact the site owner to align your account role.', code: 'ROLE_CONFIGURATION_MISMATCH' }, { status: 409 })
    }
    return NextResponse.json({ role: user.role, passwordChangeRequired: user.role === 'worker' && user.firstLogin })
  } catch (error) { serverLog('[GET /api/auth/session:' + stage + ']', error); return NextResponse.json({ error: 'Unable to verify account', code: 'AUTH_UNAVAILABLE' }, { status: 503 }) }
}
