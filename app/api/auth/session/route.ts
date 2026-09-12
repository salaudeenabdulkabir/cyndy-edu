import { auth } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Sign in first', code: 'UNAUTHORIZED' }, { status: 401 })
    const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
    if (!user?.isActive) return NextResponse.json({ error: 'Account is unavailable. Contact support.', code: 'FORBIDDEN' }, { status: 403 })
    return NextResponse.json({ role: user.role, passwordChangeRequired: user.role === 'worker' && user.firstLogin })
  } catch { return NextResponse.json({ error: 'Unable to verify account', code: 'AUTH_UNAVAILABLE' }, { status: 503 }) }
}
