import { clerkMiddleware, createRouteMatcher, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { hasAdminSession } from '@/lib/admin-session'
import { isAllowedRequestOrigin } from '@/lib/request-origin'
const publicRoute = createRouteMatcher(['/', '/contact', '/offline.html', '/api/jobs/notifications', '/api/health', '/api/webhooks/clerk', '/sign-in(.*)', '/sign-up(.*)', '/worker/login', '/admin/login', '/privacy-policy', '/terms-of-service', '/manifest.json', '/sw.js', '/icons(.*)'])
export default clerkMiddleware(async (auth, req) => {
  const path = req.nextUrl.pathname
  if (req.method !== 'GET' && req.method !== 'HEAD' && !path.startsWith('/api/webhooks/')) {
    const origin = req.headers.get('origin')
    if (!isAllowedRequestOrigin(origin, req.nextUrl.origin, [process.env.RENDER_EXTERNAL_URL, process.env.NEXT_PUBLIC_APP_URL])) return NextResponse.json({ error: 'Cross-origin request rejected', code: 'FORBIDDEN' }, { status: 403 })
  }
  if (publicRoute(req)) return NextResponse.next()
  const { userId, sessionId } = await auth()
  if (!userId) return path.startsWith('/api/') ? NextResponse.json({ error: 'Authentication required', code: 'UNAUTHORIZED' }, { status: 401 }) : NextResponse.redirect(new URL('/', req.url))
  if (!path.startsWith('/api/')) {
    const user = await (await clerkClient()).users.getUser(userId)
    const role = user.publicMetadata.role || 'client'
    if (path.startsWith('/admin') && (role !== 'admin' || !await hasAdminSession(sessionId))) return NextResponse.redirect(new URL('/admin/login', req.url))
    if (path.startsWith('/worker') && role !== 'worker' && role !== 'admin') return NextResponse.redirect(new URL('/apply', req.url))
    if ((path.startsWith('/apply') || path.startsWith('/status') || path.startsWith('/opportunities')) && role !== 'client') return NextResponse.redirect(new URL(role === 'admin' ? '/admin' : '/worker', req.url))
  }
  const response = NextResponse.next()
  response.headers.set('Cache-Control', 'private, no-store, max-age=0')
  response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  return response
})
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
