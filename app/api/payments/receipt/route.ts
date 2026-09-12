import { serverLog } from '@/lib/server-log'
import { ensureClientProfile, ensureClientPackage } from '@/lib/client-profile'
import { checkUploadLimit } from '@/lib/upload-limit'
import { matchesFileSignature } from '@/lib/upload-validation'
import { auth } from '@clerk/nextjs/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { db } from '@/lib/db'
import { applications, clientPackages, paymentReceipts, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { r2Client, buildReceiptKey, getSignedDownloadUrl } from '@/lib/r2'
import { NextResponse } from 'next/server'

const MAX_FILE_SIZE = 4 * 1024 * 1024
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png'])

export async function POST(req: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  try {
    const limited = await checkUploadLimit(userId)
    if (limited) return limited
    const formData = await req.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A receipt file is required', code: 'FILE_REQUIRED' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.has(file.type) || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Receipt must be a PDF, JPG, or PNG smaller than 4MB', code: 'INVALID_FILE' }, { status: 400 })
    }

    const user = await ensureClientProfile(userId)
    if (!user.isActive || user.role !== 'client') return NextResponse.json({ error: 'Active client access required', code: 'FORBIDDEN' }, { status: 403 })
    const packageRecord = await ensureClientPackage(user.id)
    if (packageRecord.paymentConfirmed) return NextResponse.json({ error: 'Payment is already confirmed', code: 'ALREADY_CONFIRMED' }, { status: 409 })
    const key = buildReceiptKey(user.id, file.type)
    const bytes = Buffer.from(await file.arrayBuffer())
    if (!matchesFileSignature(bytes, file.type)) return NextResponse.json({ error: 'File contents do not match the selected file type', code: 'INVALID_FILE' }, { status: 400 })
    await r2Client.send(new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Key: key,
      Body: bytes,
      ContentType: file.type,
    }))

    const publicUrl = key
    const [receipt] = await db.insert(paymentReceipts).values({
      packageId: packageRecord.id,
      clientId: user.id,
      r2Key: key,
      fileUrl: publicUrl,
      fileName: file.name,
    }).returning()

    await db.update(applications).set({
      packageId: packageRecord.id,
      updatedAt: new Date(),
    }).where(eq(applications.clientId, user.id))

    return NextResponse.json({ receipt: { ...receipt, fileUrl: await getSignedDownloadUrl(key, 900) } }, { status: 201 })
  } catch (error) {
    serverLog('[POST /api/payments/receipt]', error)
    return NextResponse.json({ error: 'Failed to upload receipt', code: 'RECEIPT_UPLOAD_FAILED' }, { status: 500 })
  }
}

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  try {
    const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
    if (!user?.isActive || user.role !== 'client') return NextResponse.json({ error: 'Active client access required', code: 'FORBIDDEN' }, { status: 403 })

    const receipt = await db.query.paymentReceipts.findFirst({
      where: eq(paymentReceipts.clientId, user.id),
      orderBy: (table, { desc }) => [desc(table.uploadedAt)],
    })

    const packageRecord = await db.query.clientPackages.findFirst({ where: eq(clientPackages.clientId, user.id) })
    return NextResponse.json({ paymentConfirmed: packageRecord?.paymentConfirmed === true, receipt: receipt ? { ...receipt, fileUrl: await getSignedDownloadUrl(receipt.r2Key, 900) } : null })
  } catch (error) {
    serverLog('[GET /api/payments/receipt]', error)
    return NextResponse.json({ error: 'Failed to load receipt status', code: 'RECEIPT_STATUS_FAILED' }, { status: 500 })
  }
}
