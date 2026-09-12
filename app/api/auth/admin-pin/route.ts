import { auth } from '@clerk/nextjs/server'
import { compare } from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { adminRedis, adminSessionKey } from '@/lib/admin-session'

export async function POST(request: Request) {
  try {
    const { userId, sessionId } = await auth()
    if (!userId || !sessionId) return NextResponse.json({ error: 'Sign in first', code: 'UNAUTHORIZED' }, { status: 401 })
    const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
    if (!user?.isActive || user.role !== 'admin') return NextResponse.json({ error: 'Administrator access required', code: 'FORBIDDEN' }, { status: 403 })
    const parsed = z.object({ pin: z.string().regex(/^\d{6}$/) }).strict().safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Enter a six-digit PIN', code: 'INVALID_INPUT' }, { status: 400 })
    const hash = process.env.ADMIN_PIN_HASH
    if (!hash) return NextResponse.json({ error: 'Admin security is not configured. Contact the administrator.', code: 'SECURITY_UNAVAILABLE' }, { status: 503 })
    const redis = adminRedis()
    const key = `admin-pin-attempts:${userId}`
    // Atomic increment and expiry: parallel attempts cannot bypass the limit.
    const attempts = await redis.eval<[], number>("local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], 900) end; return n", [key], [])
    if (attempts > 3) return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.', code: 'RATE_LIMITED' }, { status: 429, headers: { 'Retry-After': '900' } })
    if (!await compare(parsed.data.pin, hash)) return NextResponse.json({ error: `Invalid PIN. Attempt ${attempts} of 3.`, code: 'INVALID_PIN' }, { status: 403 })
    await redis.set(adminSessionKey(sessionId), true, { ex: 4 * 60 * 60 })
    await redis.del(key)
    return NextResponse.json({ verified: true })
  } catch {
    return NextResponse.json({ error: 'Unable to verify admin access. Please try again.', code: 'SECURITY_UNAVAILABLE' }, { status: 503 })
  }
}
