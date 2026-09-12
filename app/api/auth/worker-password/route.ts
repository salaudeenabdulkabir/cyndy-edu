import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
const schema = z.object({ currentPassword: z.string().min(1).max(200), newPassword: z.string().min(12).max(100) }).strict()
export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  try {
    const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
    if (!user?.isActive || user.role !== 'worker' || !user.firstLogin) return NextResponse.json({ error: 'Password setup is unavailable' }, { status: 403 })
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success || parsed.data.newPassword === parsed.data.currentPassword) return NextResponse.json({ error: 'Choose a different password with at least 12 characters' }, { status: 400 })
    const clerk = await clerkClient()
    const verified = await clerk.users.verifyPassword({ userId, password: parsed.data.currentPassword })
    if (!verified.verified) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    await clerk.users.updateUser(userId, { password: parsed.data.newPassword, signOutOfOtherSessions: true })
    await db.update(users).set({ firstLogin: false, updatedAt: new Date() }).where(eq(users.id, user.id))
    return NextResponse.json({ ok: true })
  } catch { return NextResponse.json({ error: 'Could not change password. Check your current password and try again.' }, { status: 400 }) }
}
