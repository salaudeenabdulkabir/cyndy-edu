import { serverLog } from '@/lib/server-log'
import { requireAdmin } from '@/lib/require-admin'
import { getSignedDownloadUrl } from '@/lib/r2'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { applications, clientPackages, paymentReceipts, users } from '@/lib/db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const access = await requireAdmin()
  if ('response' in access) return access.response

  try {
    const receipts = await db
      .select({
        id: paymentReceipts.id,
        fileName: paymentReceipts.fileName,
        fileUrl: paymentReceipts.fileUrl,
        r2Key: paymentReceipts.r2Key,
        uploadedAt: paymentReceipts.uploadedAt,
        confirmed: paymentReceipts.confirmed,
        rejectionReason: paymentReceipts.rejectionReason,
        clientName: users.firstName,
        clientLastName: users.lastName,
        clientEmail: users.email,
        packageId: paymentReceipts.packageId,
        amountPaid: clientPackages.amountPaid,
        currency: clientPackages.currency,
      })
      .from(paymentReceipts)
      .innerJoin(users, eq(paymentReceipts.clientId, users.id))
      .innerJoin(clientPackages, eq(paymentReceipts.packageId, clientPackages.id))
      .orderBy(desc(paymentReceipts.uploadedAt))

    return NextResponse.json({ receipts: await Promise.all(receipts.map(async receipt => ({ ...receipt, fileUrl: await getSignedDownloadUrl(receipt.r2Key, 900) }))) })
  } catch (error) {
    serverLog('[GET /api/admin/payments]', error)
    return NextResponse.json({ error: 'Failed to load payment receipts', code: 'PAYMENTS_LOAD_FAILED' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const access = await requireAdmin()
  if ('response' in access) return access.response

  try {
    const { receiptId, action, reason } = await req.json() as {
      receiptId?: string
      action?: 'confirm' | 'reject'
      reason?: string
    }

    if (!receiptId || !['confirm', 'reject'].includes(action ?? '') || (action === 'reject' && !reason?.trim())) {
      return NextResponse.json({ error: 'Receipt, action, and rejection reason are required', code: 'INVALID_REQUEST' }, { status: 400 })
    }

    const receipt = await db.query.paymentReceipts.findFirst({
      where: eq(paymentReceipts.id, receiptId),
    })

    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found', code: 'RECEIPT_NOT_FOUND' }, { status: 404 })
    }

    if (action === 'confirm') {
      const admin = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
      const confirmedAt = new Date()

      await db.batch([db.update(paymentReceipts).set({
        confirmed: true,
        confirmedBy: admin?.id,
        confirmedAt,
        rejectionReason: null,
      }).where(eq(paymentReceipts.id, receiptId)),

      db.update(clientPackages).set({
        paymentConfirmed: true,
        paymentConfirmedAt: confirmedAt,
      }).where(eq(clientPackages.id, receipt.packageId)),

      db.update(applications).set({
        paymentConfirmed: true,
        packageId: receipt.packageId,
        updatedAt: confirmedAt,
      }).where(and(eq(applications.clientId, receipt.clientId), eq(applications.opportunityPurchase, false)))])
    } else {
      if (receipt.confirmed) return NextResponse.json({ error: 'Confirmed receipts cannot be rejected', code: 'INVALID_TRANSITION' }, { status: 409 })
      const rejected = await db.update(paymentReceipts).set({
        confirmed: false,
        rejectionReason: reason?.trim(),
      }).where(and(eq(paymentReceipts.id, receiptId), eq(paymentReceipts.confirmed, false))).returning({ id: paymentReceipts.id })
      if (!rejected.length) return NextResponse.json({ error: 'Receipt was confirmed while you were reviewing it. Refresh the list.', code: 'CONFLICT' }, { status: 409 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    serverLog('[PATCH /api/admin/payments]', error)
    return NextResponse.json({ error: 'Failed to update payment receipt', code: 'PAYMENT_UPDATE_FAILED' }, { status: 500 })
  }
}
