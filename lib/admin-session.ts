import { Redis } from '@upstash/redis/cloudflare'

export function adminRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error('Admin security storage is not configured')
  }
  return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
}

export const adminSessionKey = (sessionId: string) => `admin-pin-verified:${sessionId}`

export async function hasAdminSession(sessionId: string | null) {
  if (!sessionId) return false
  try {
    return await adminRedis().get(adminSessionKey(sessionId)) === true
  } catch {
    return false
  }
}
