import { serverLog } from '@/lib/server-log'
import { checkUploadLimit } from '@/lib/upload-limit'
import { acceptsDocumentFormat, matchesFileSignature } from '@/lib/upload-validation'
import { requireAdmin } from '@/lib/require-admin'
import { sql } from 'drizzle-orm'
import { auth } from '@clerk/nextjs/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { and, eq, or } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { applicationDocuments, applications, documentTypes, programDocuments, users } from '@/lib/db/schema'
import { buildDocumentKey, deleteFile, getSignedDownloadUrl, isStorageConfigured, r2Client } from '@/lib/r2'

import { ensureClientProfile as getUser } from '@/lib/client-profile'

export async function GET(_request: Request, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Authentication required', code: 'UNAUTHORIZED' }, { status: 401 })
  try {
    const user = await getUser(userId)
    const application = await db.query.applications.findFirst({ where: eq(applications.id, params.id) })
    if (!user?.isActive || user.role !== 'client' || !application || application.clientId !== user.id) return NextResponse.json({ error: 'Application not found', code: 'APPLICATION_NOT_FOUND' }, { status: 404 })

    const requirements = await db.select({
      id: documentTypes.id, name: documentTypes.name, description: documentTypes.description,
      acceptedFormats: documentTypes.acceptedFormats, maxSizeMb: documentTypes.maxSizeMb,
      expiryDays: documentTypes.expiryDays, isGlobal: documentTypes.isGlobal,
      isMandatory: programDocuments.isMandatory,
    }).from(documentTypes)
      .leftJoin(programDocuments, application.programId
        ? and(eq(programDocuments.documentTypeId, documentTypes.id), eq(programDocuments.programId, application.programId))
        : sql`false`)
      .where(application.programId
        ? or(eq(documentTypes.isGlobal, true), eq(programDocuments.programId, application.programId))
        : eq(documentTypes.isGlobal, true))

    const documents = await db.query.applicationDocuments.findMany({
      where: eq(applicationDocuments.applicationId, application.id),
      columns: { id: true, documentTypeId: true, status: true, rejectionReason: true, fileUrl: true, r2Key: true, uploadedAt: true },
    })
    return NextResponse.json({
      requirements: requirements.map((item) => ({ ...item, isMandatory: item.isMandatory ?? true })),
      documents: await Promise.all(documents.map(async (document) => ({
        ...document,
        fileUrl: await getSignedDownloadUrl(document.r2Key, 3600),
      }))),
    })
  } catch (error) {
    serverLog('[GET /api/applications/:id/documents]', error)
    return NextResponse.json({ error: 'Failed to load document checklist', code: 'DOCUMENTS_LOAD_FAILED' }, { status: 500 })
  }
}

export async function POST(request: Request, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Authentication required', code: 'UNAUTHORIZED' }, { status: 401 })
  try {
    const limited = await checkUploadLimit(userId)
    if (limited) return limited
    const user = await getUser(userId)
    const application = await db.query.applications.findFirst({ where: eq(applications.id, params.id) })
    if (!user?.isActive || user.role !== 'client' || !application || application.clientId !== user.id) return NextResponse.json({ error: 'Application not found', code: 'APPLICATION_NOT_FOUND' }, { status: 404 })

    if (!application.paymentConfirmed) return NextResponse.json({ error: 'Payment confirmation required', code: 'PAYMENT_REQUIRED' }, { status: 403 })
    if (!isStorageConfigured()) return NextResponse.json({ error: 'Document uploads are not ready yet. Please contact support; your application is saved.', code: 'STORAGE_NOT_CONFIGURED' }, { status: 503 })
    const formData = await request.formData()
    const file = formData.get('file')
    const documentTypeId = formData.get('documentTypeId')
    if (!(file instanceof File) || typeof documentTypeId !== 'string') return NextResponse.json({ error: 'A file and document type are required', code: 'INVALID_REQUEST' }, { status: 400 })
    if (!new Set(['application/pdf', 'image/jpeg', 'image/png']).has(file.type) || file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: 'Upload a PDF, JPG, or PNG smaller than 4MB', code: 'INVALID_FILE' }, { status: 400 })
    }

    const requirement = await db.query.documentTypes.findFirst({ where: eq(documentTypes.id, documentTypeId) })
    if (!requirement || (!requirement.isGlobal && !application.programId)) return NextResponse.json({ error: 'Document type is not required for this application', code: 'DOCUMENT_NOT_REQUIRED' }, { status: 400 })
    if (!requirement.isGlobal && application.programId) {
      const linked = await db.query.programDocuments.findFirst({ where: and(eq(programDocuments.programId, application.programId), eq(programDocuments.documentTypeId, documentTypeId)) })
      if (!linked) return NextResponse.json({ error: 'Document type is not required for this application', code: 'DOCUMENT_NOT_REQUIRED' }, { status: 400 })
    }

    const bytes = Buffer.from(await file.arrayBuffer())
    if (!acceptsDocumentFormat(requirement.acceptedFormats, file.type) || !matchesFileSignature(bytes, file.type) || file.size > (requirement.maxSizeMb ?? 10) * 1024 * 1024) return NextResponse.json({ error: 'File type or size is invalid', code: 'INVALID_FILE' }, { status: 400 })
    const previous = await db.query.applicationDocuments.findFirst({ where: and(eq(applicationDocuments.applicationId, application.id), eq(applicationDocuments.documentTypeId, documentTypeId)) })
    if (application.status !== 'draft' && !(previous?.status === 'rejected' && ['submitted', 'docs_pending', 'under_review'].includes(application.status ?? ''))) return NextResponse.json({ error: 'Only documents requested for replacement can be changed after submission', code: 'DOCUMENT_LOCKED' }, { status: 403 })
    const key = buildDocumentKey(application.id, documentTypeId, file.type)
    await r2Client.send(new PutObjectCommand({ Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!, Key: key, Body: bytes, ContentType: file.type }))
    const saved = previous
      ? await db.update(applicationDocuments).set({ fileUrl: key, r2Key: key, status: 'uploaded', rejectionReason: null, uploadedAt: new Date() }).where(eq(applicationDocuments.id, previous.id)).returning()
      : await db.insert(applicationDocuments).values({ applicationId: application.id, documentTypeId, fileUrl: key, r2Key: key, status: 'uploaded' }).onConflictDoUpdate({ target: [applicationDocuments.applicationId, applicationDocuments.documentTypeId], set: { fileUrl: key, r2Key: key, status: 'uploaded', rejectionReason: null, uploadedAt: new Date() } }).returning()
    if (previous) await deleteFile(previous.r2Key).catch(() => console.error('Previous document cleanup failed'))
    return NextResponse.json({ document: { ...saved[0], fileUrl: await getSignedDownloadUrl(key, 3600) } }, { status: previous ? 200 : 201 })
  } catch (error) {
    serverLog('[POST /api/applications/:id/documents]', error)
    return NextResponse.json({ error: 'Failed to upload document', code: 'DOCUMENT_UPLOAD_FAILED' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Authentication required', code: 'UNAUTHORIZED' }, { status: 401 })
  try {
    const reviewer = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
    if (reviewer?.role === 'worker' && reviewer.firstLogin) return NextResponse.json({ error: 'Change your temporary password first', code: 'PASSWORD_CHANGE_REQUIRED' }, { status: 403 })
    const role = reviewer?.role
    if (role === 'admin') { const access = await requireAdmin(); if ('response' in access) return access.response }
    const application = await db.query.applications.findFirst({ where: eq(applications.id, params.id) })
    if (!reviewer?.isActive || !application || !reviewer || (role !== 'admin' && !(role === 'worker' && application.assignedWorkerId === reviewer.id))) return NextResponse.json({ error: 'Application not found', code: 'APPLICATION_NOT_FOUND' }, { status: 404 })
    const body = await request.json() as { documentId?: string; status?: 'verified' | 'rejected'; rejectionReason?: string }
    if (!body.documentId || !['verified', 'rejected'].includes(body.status ?? '') || (body.status === 'rejected' && !body.rejectionReason?.trim())) return NextResponse.json({ error: 'Document, status, and rejection reason are required', code: 'INVALID_REQUEST' }, { status: 400 })
    const document = await db.query.applicationDocuments.findFirst({ where: eq(applicationDocuments.id, body.documentId) })
    if (!document || document.applicationId !== application.id) return NextResponse.json({ error: 'Document not found', code: 'DOCUMENT_NOT_FOUND' }, { status: 404 })
    const [updated] = await db.update(applicationDocuments).set({ status: body.status, rejectionReason: body.status === 'rejected' ? body.rejectionReason?.trim() : null }).where(eq(applicationDocuments.id, body.documentId)).returning()
    return NextResponse.json({ document: updated })
  } catch (error) {
    serverLog('[PATCH /api/applications/:id/documents]', error)
    return NextResponse.json({ error: 'Failed to update document', code: 'DOCUMENT_UPDATE_FAILED' }, { status: 500 })
  }
}
