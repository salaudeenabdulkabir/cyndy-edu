import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { notifications, users } from '@/lib/db/schema'
async function recipient() {
  const { userId } = await auth()
  if (!userId) return null
  const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
  return user?.isActive ? user : null
}
export async function GET() {
  const user = await recipient(); if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  const rows = await db.select({ id: notifications.id, title: notifications.title, message: notifications.message, isRead: notifications.isRead, createdAt: notifications.createdAt }).from(notifications)
    .where(eq(notifications.recipientId, user.id)).orderBy(desc(notifications.createdAt)).limit(50)
  return NextResponse.json({ notifications: rows })
}
export async function PATCH(request: Request) {
  const user = await recipient(); if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  const body = z.object({ id: z.string().uuid() }).strict().safeParse(await request.json())
  if (!body.success) return NextResponse.json({ error: 'Invalid notification' }, { status: 400 })
  await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, body.data.id), eq(notifications.recipientId, user.id)))
  return NextResponse.json({ ok: true })
}
