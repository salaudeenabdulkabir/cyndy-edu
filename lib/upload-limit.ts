import { NextResponse } from 'next/server'
import { adminRedis } from '@/lib/admin-session'
export async function checkUploadLimit(userId: string) {
  try {
    const count = await adminRedis().eval<[], number>("local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], 3600) end; return n", ['upload-attempts:' + userId], [])
    if (count > 20) return NextResponse.json({ error: 'Upload limit reached. Please try again later.', code: 'RATE_LIMITED' }, { status: 429, headers: { 'Retry-After': '3600' } })
    return null
  } catch { return NextResponse.json({ error: 'Uploads are temporarily unavailable. Please try again later.', code: 'UPLOAD_SECURITY_UNAVAILABLE' }, { status: 503 }) }
}
