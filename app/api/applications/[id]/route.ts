import { requirementSatisfied } from '@/lib/opportunity-policy'
import { serverLog } from '@/lib/server-log'
import { policiesApproved, stagingSubmissionsEnabled, POLICY_VERSION } from '@/lib/legal'
import { z } from 'zod'
import { clientUpdateSchema, staffUpdateSchema, missingApplicationFields, clientApplication, formProgress } from '@/lib/application-policy'
import { requireAdmin } from '@/lib/require-admin'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { applications, users, programs, universities, countries, applicationDocuments, documentTypes, programDocuments, documentWaivers } from '@/lib/db/schema'
import { and, eq, or, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getSignedDownloadUrl } from '@/lib/r2'

export async function PATCH(
  req: Request,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    })

    if (!user?.isActive) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const app = await db.query.applications.findFirst({
      where: eq(applications.id, params.id),
    })

    if (user.role === 'worker' && user.firstLogin) return NextResponse.json({ error: 'Change your temporary password first', code: 'PASSWORD_CHANGE_REQUIRED' }, { status: 403 })
    const role = user.role
    if (role === 'admin') { const access = await requireAdmin(); if ('response' in access) return access.response }
    const canEdit = role === 'admin' || (role === 'worker' && app?.assignedWorkerId === user.id) || (role === 'client' && app?.clientId === user.id)

    if (!app || !canEdit) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    if (!z.string().uuid().safeParse(params.id).success) return NextResponse.json({ error: 'Invalid application ID', code: 'INVALID_INPUT' }, { status: 400 })
    const text = await req.text()
    if (text.length > 200000) return NextResponse.json({ error: 'Application update is too large', code: 'PAYLOAD_TOO_LARGE' }, { status: 413 })
    let raw: unknown
    try { raw = JSON.parse(text) } catch { return NextResponse.json({ error: 'Invalid JSON', code: 'INVALID_INPUT' }, { status: 400 }) }
    const parsed = (role === 'client' ? clientUpdateSchema : staffUpdateSchema).safeParse(raw)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid or forbidden application fields', code: 'INVALID_INPUT' }, { status: 400 })
    if (role === 'client' && app.status !== 'draft') return NextResponse.json({ error: !app.paymentConfirmed ? 'Payment confirmation required' : 'Submitted applications cannot be edited', code: 'APPLICATION_LOCKED' }, { status: 403 })
    const body = parsed.data as Record<string, unknown>
    if (app.opportunityPurchase && ('programId' in body || 'customCourseText' in body || 'universityId' in body || 'countryId' in body)) return NextResponse.json({ error: 'This application belongs to the opportunity you selected. Start a separate application for another opportunity.' }, { status: 409 })
    if (role === 'client' && body.status === 'submitted' && Object.keys(body).some(key => !['status', 'confirmed', 'termsAccepted'].includes(key))) return NextResponse.json({ error: 'Save your answers before submitting', code: 'INVALID_INPUT' }, { status: 400 })
    const updates: Record<string, unknown> = { lastSavedAt: new Date(), updatedAt: new Date() }
    const formData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(body)) {
      if (['programId', 'customCourseText', 'status', 'workerNotes'].includes(key)) updates[key] = value
      else formData[key] = value
    }
    if (body.programId) {
      const program = await db.query.programs.findFirst({ where: eq(programs.id, body.programId as string) })
      const school = program && await db.query.universities.findFirst({ where: eq(universities.id, program.universityId) })
      const country = school && await db.query.countries.findFirst({ where: eq(countries.id, school.countryId) })
      if (!program?.isActive || !school?.isAcceptingApplications || !country?.isActive) return NextResponse.json({ error: 'This program is no longer accepting applications', code: 'PROGRAM_CLOSED' }, { status: 400 })
      updates.deadline = program.deadline
      updates.customCourseText = null
      formData.countryId = school.countryId
      formData.universityId = school.id
    } else if (body.programId === null) {
      updates.deadline = null
      const school = typeof body.universityId === 'string' && await db.query.universities.findFirst({ where: eq(universities.id, body.universityId) })
      if (!school || !school.isAcceptingApplications || school.countryId !== body.countryId || !body.customCourseText) return NextResponse.json({ error: 'Select an available school and course', code: 'INVALID_SELECTION' }, { status: 400 })
    }
    if (role === 'client' && body.status === 'submitted') {
      if (!app.paymentConfirmed) return NextResponse.json({ error: 'Payment must be confirmed before final submission', code: 'PAYMENT_REQUIRED' }, { status: 403 })
      if (app.deadline && app.deadline < new Date().toISOString().slice(0,10)) return NextResponse.json({error:'The application deadline has passed. Contact Cyndy for guidance.',code:'DEADLINE_PASSED'},{status:409})
      const missing = missingApplicationFields({ ...(app.applicationData ?? {}), ...formData })
      if (!app.programId && !app.customCourseText) missing.push('Program selection')
      if (!body.confirmed || !body.termsAccepted) missing.push('Declarations')
      const required = await db.select({ id: documentTypes.id, global: documentTypes.isGlobal, mandatory: programDocuments.isMandatory }).from(documentTypes)
        .leftJoin(programDocuments, and(eq(programDocuments.documentTypeId, documentTypes.id), app.programId ? eq(programDocuments.programId, app.programId) : sql`false`))
        .where(or(eq(documentTypes.isGlobal, true), app.programId ? eq(programDocuments.programId, app.programId) : sql`false`))
      const documents = await db.query.applicationDocuments.findMany({ where: eq(applicationDocuments.applicationId, app.id) })
      const waivers = await db.query.documentWaivers.findMany({ where: eq(documentWaivers.applicationId, app.id) })
      if (required.some(item => (item.global || item.mandatory) && !requirementSatisfied(item.id, documents, waivers))) missing.push('Required documents')
      if (missing.length) return NextResponse.json({ error: 'Complete: ' + missing.join(', '), code: 'INCOMPLETE_APPLICATION' }, { status: 400 })
      const testSubmission = stagingSubmissionsEnabled()
      if (!policiesApproved() && !testSubmission) return NextResponse.json({ error: 'Applications will open after our service terms are finalized.', code: 'POLICIES_PENDING' }, { status: 503 })
      formData.testSubmission = testSubmission
      formData.termsVersion = testSubmission ? `staging-test:${POLICY_VERSION}` : POLICY_VERSION
      formData.termsAcceptedAt = new Date().toISOString()
      updates.submittedAt = new Date()
    }
    if (role === 'client') updates.formCompletionPct = formProgress({ ...(app.applicationData ?? {}), ...formData }, Boolean(updates.programId ?? app.programId ?? updates.customCourseText ?? app.customCourseText))
    if (Object.keys(formData).length) {
      // Merge JSON in PostgreSQL to avoid dropping concurrent changes to other sections.
      updates.applicationData = sql`COALESCE(${applications.applicationData}, '{}'::jsonb) || ${JSON.stringify(formData)}::jsonb`
    }
    const updated = await db.update(applications).set(updates).where(and(eq(applications.id, params.id), role === 'client' ? eq(applications.status, 'draft') : undefined)).returning()
    if (!updated[0]) return NextResponse.json({ error: 'Application changed. Reload before editing.', code: 'CONFLICT' }, { status: 409 })

    return NextResponse.json(role === 'client' ? clientApplication(updated[0]) : updated[0])
  } catch (error) {
    serverLog('[PATCH /api/applications/:id]', error)
    return NextResponse.json(
      { error: 'Failed to update application' },
      { status: 500 }
    )
  }
}

export async function GET(
  req: Request,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    })

    if (!user?.isActive) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const app = await db.query.applications.findFirst({
      where: eq(applications.id, params.id),
      with: {
        program: {
          with: { university: true },
        },
        client: {
          columns: { firstName: true, lastName: true, email: true },
        },
        documents: true,
      },
    })

    if (user.role === 'worker' && user.firstLogin) return NextResponse.json({ error: 'Change your temporary password first', code: 'PASSWORD_CHANGE_REQUIRED' }, { status: 403 })
    const role = user.role
    if (role === 'admin') { const access = await requireAdmin(); if ('response' in access) return access.response }
    const canView = role === 'admin' || (role === 'worker' && app?.assignedWorkerId === user.id) || (role === 'client' && app?.clientId === user.id)

    if (!app || !canView) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const documents = await Promise.all((app.documents ?? []).map(async (document) => ({
      ...document,
      fileUrl: await getSignedDownloadUrl(document.r2Key, 3600),
      documentType: await db.query.documentTypes.findFirst({
        where: (documentType, { eq }) => eq(documentType.id, document.documentTypeId),
        columns: { name: true },
      }),
    })))

    return NextResponse.json({ ...(role === 'client' ? clientApplication(app) : role === 'worker' ? { ...app, adminNotes: undefined } : app), documents, policiesReady: policiesApproved(), testSubmissionsEnabled: stagingSubmissionsEnabled() })
  } catch (error) {
    serverLog('[GET /api/applications/:id]', error)
    return NextResponse.json(
      { error: 'Failed to fetch application' },
      { status: 500 }
    )
  }
}
