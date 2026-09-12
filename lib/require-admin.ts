import { auth } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { hasAdminSession } from '@/lib/admin-session'

export async function requireAdmin() {
  try {
    const { userId, sessionId } = await auth()
    if (!userId) return { response: NextResponse.json({ error: 'Authentication required', code: 'UNAUTHORIZED' }, { status: 401 }) }
    const admin = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
    if (!admin?.isActive || admin.role !== 'admin') return { response: NextResponse.json({ error: 'Administrator access required', code: 'FORBIDDEN' }, { status: 403 }) }
    if (!await hasAdminSession(sessionId)) return { response: NextResponse.json({ error: 'Verify your admin PIN', code: 'PIN_REQUIRED' }, { status: 403 }) }
    return { admin }
  } catch {
    return { response: NextResponse.json({ error: 'Unable to verify access', code: 'AUTH_UNAVAILABLE' }, { status: 503 }) }
  }
}
