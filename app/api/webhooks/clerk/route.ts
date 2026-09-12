import { verifyWebhook } from '@clerk/nextjs/webhooks'
import { clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  if (!process.env.CLERK_WEBHOOK_SECRET) return NextResponse.json({ error: 'Webhook unavailable' }, { status: 503 })
  let event
  try { event = await verifyWebhook(request, { signingSecret: process.env.CLERK_WEBHOOK_SECRET }) }
  catch { return NextResponse.json({ error: 'Invalid signature' }, { status: 400 }) }
  try {
    if (event.type === 'user.deleted' && event.data.id) {
      await db.update(users).set({ isActive: false, updatedAt: new Date() }).where(eq(users.clerkId, event.data.id))
    } else if (event.type === 'user.created' || event.type === 'user.updated') {
      // Read the current profile so delayed or duplicate events cannot restore stale details.
      const profile = await (await clerkClient()).users.getUser(event.data.id)
      const values = { firstName: profile.firstName, lastName: profile.lastName,
        email: profile.emailAddresses.find(item => item.id === profile.primaryEmailAddressId)?.emailAddress ?? null, updatedAt: new Date() }
      await db.insert(users).values({ ...values, clerkId: profile.id, role: 'client', isActive: !profile.banned })
        .onConflictDoUpdate({ target: users.clerkId, set: { ...values, ...(profile.banned ? { isActive: false } : {}) } })
      // Existing roles and manual deactivation are deliberately preserved.
    }
    return NextResponse.json({ received: true })
  } catch { return NextResponse.json({ error: 'Synchronization failed; retry delivery' }, { status: 503 }) }
}
