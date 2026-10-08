import { auth } from '@clerk/nextjs/server'
import { serverLog } from '@/lib/server-log'
import { NextResponse } from 'next/server'
import { and, eq, inArray } from 'drizzle-orm'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { db } from '@/lib/db'
import { applicationOrders } from '@/lib/db/schema'
import { ensureClientProfile } from '@/lib/client-profile'
import { checkUploadLimit } from '@/lib/upload-limit'
import { matchesFileSignature } from '@/lib/upload-validation'
import { buildReceiptKey, deleteFile, isStorageConfigured, r2Client } from '@/lib/r2'

type Context = { params: Promise<{ id: string }> }
async function ownedOrder(id: string, userId: string) {
  const user = await ensureClientProfile(userId)
  if (!user.isActive || user.role !== 'client') return undefined
  return db.query.applicationOrders.findFirst({ where: and(eq(applicationOrders.applicationId, id), eq(applicationOrders.clientId, user.id)) })
}
export async function GET(_request: Request, context: Context) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Sign in to continue' }, { status: 401 })
  try {
    const order = await ownedOrder((await context.params).id, userId)
    if (!order) return NextResponse.json({ order: null })
    return NextResponse.json({ order: { ...order, receiptKey: undefined, reviewedBy: undefined } })
  } catch { return NextResponse.json({ error: 'Unable to load payment' }, { status: 503 }) }
}
export async function POST(request: Request, context: Context) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Sign in to continue' }, { status: 401 })
  let uploadedKey: string | undefined
  try {
    const limited = await checkUploadLimit(userId); if (limited) return limited
    const order = await ownedOrder((await context.params).id, userId)
    if (!order) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    if (!['awaiting_payment', 'rejected'].includes(order.status)) return NextResponse.json({ error: 'Your receipt is already under review or confirmed' }, { status: 409 })
    if (!isStorageConfigured()) return NextResponse.json({ error: 'Uploads are unavailable. Please contact support.' }, { status: 503 })
    const file = (await request.formData()).get('file')
    if (!(file instanceof File) || file.size > 4 * 1024 * 1024 || !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) return NextResponse.json({ error: 'Choose a PDF, JPG or PNG under 4 MB' }, { status: 400 })
    const bytes = Buffer.from(await file.arrayBuffer())
    if (!matchesFileSignature(bytes, file.type)) return NextResponse.json({ error: 'File content does not match its type' }, { status: 400 })
    uploadedKey = buildReceiptKey(order.clientId, file.type)
    await r2Client.send(new PutObjectCommand({ Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!, Key: uploadedKey, Body: bytes, ContentType: file.type }))
    const saved = await db.update(applicationOrders).set({ receiptKey: uploadedKey, receiptName: file.name.slice(0,200), status: 'pending_review', rejectionReason: null, reviewedBy: null, reviewedAt: null })
      .where(and(eq(applicationOrders.id, order.id), inArray(applicationOrders.status, ['awaiting_payment', 'rejected']))).returning({ id: applicationOrders.id })
    if (!saved.length) { await deleteFile(uploadedKey); return NextResponse.json({ error: 'Payment changed. Refresh before uploading again.' }, { status: 409 }) }
    // Keep previously reviewed receipts for audit; they remain private.
    uploadedKey = undefined
    return NextResponse.json({ ok: true })
  } catch (error) {
    serverLog('Opportunity receipt upload', error)
    if (uploadedKey) await deleteFile(uploadedKey).catch(() => {})
    return NextResponse.json({ error: 'Receipt upload failed. Please try again.' }, { status: 500 })
  }
}
