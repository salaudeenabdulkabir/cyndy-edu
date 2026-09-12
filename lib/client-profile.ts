import { clerkClient } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users, clientPackages } from '@/lib/db/schema'

export async function ensureClientProfile(clerkId: string) {
  const existing = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) })
  if (existing) return existing
  const profile = await (await clerkClient()).users.getUser(clerkId)
  const email = profile.emailAddresses.find(item => item.id === profile.primaryEmailAddressId)
  // Never derive authorization from client-editable metadata or update an existing role.
  await db.insert(users).values({ clerkId, firstName: profile.firstName, lastName: profile.lastName,
    email: email?.emailAddress ?? null, role: 'client', isActive: true,
  }).onConflictDoNothing({ target: users.clerkId })
  const user = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) })
  if (!user) throw new Error('Client profile unavailable')
  return user
}

export async function ensureClientPackage(clientId: string) {
  await db.insert(clientPackages).values({ clientId, totalApplications: 1 })
    .onConflictDoNothing({ target: clientPackages.clientId })
  const result = await db.query.clientPackages.findFirst({ where: eq(clientPackages.clientId, clientId) })
  if (!result) throw new Error('Client package unavailable')
  return result
}
