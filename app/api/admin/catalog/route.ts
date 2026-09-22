import { importPrograms } from '@/lib/import-programs'
import { serverLog } from '@/lib/server-log'
import { requireAdmin } from '@/lib/require-admin'
import { asc, eq, sql } from 'drizzle-orm'
import { WORLD_COUNTRIES } from '@/lib/countries'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { countries, programs, universities } from '@/lib/db/schema'

const createSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('country'), name: z.string().trim().min(2), code: z.string().trim().min(2).max(3), flagEmoji: z.string().trim().min(1).max(8) }),
  z.object({ type: z.literal('university'), countryId: z.string().uuid().optional(), countryCode: z.string().length(2).optional(), name: z.string().trim().min(2), universityType: z.string().trim().min(2), location: z.string().trim().min(2), website: z.string().url().optional().or(z.literal('')) }),
  z.object({ type: z.literal('program'), universityId: z.string().uuid(), title: z.string().trim().min(2), level: z.string().trim().min(2), deadline: z.string().date().optional().or(z.literal('')), scholarshipAvailable: z.boolean().default(false) }),
  z.object({ type: z.literal('bulk_programs'), universityId: z.string().uuid(), programs: z.array(z.object({ title: z.string().trim().min(2), level: z.string().trim().min(1), deadline: z.string().date().optional().or(z.literal('')) })).min(1).max(500) }),
])

const patchSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('university'), id: z.string().uuid(), isAcceptingApplications: z.boolean(), intakeClosedReason: z.string().trim().max(500).optional(), nextIntakeDate: z.string().trim().max(120).optional() }),
  z.object({ type: z.literal('program'), id: z.string().uuid(), isActive: z.boolean() }),
])

export async function GET() {
  const access = await requireAdmin()
  if ('response' in access) return access.response

  try {
    const rows = await db.select({
      countryId: countries.id, countryName: countries.name, countryCode: countries.code,
      flagEmoji: countries.flagEmoji, countryActive: countries.isActive, countrySortOrder: countries.sortOrder,
      universityId: universities.id, universityCountryId: universities.countryId, universityName: universities.name,
      universityType: universities.type, universityLocation: universities.location, universityWebsite: universities.website,
      universityActive: universities.isAcceptingApplications, intakeClosedReason: universities.intakeClosedReason,
      nextIntakeDate: universities.nextIntakeDate, universitySortOrder: universities.sortOrder,
      programId: programs.id, programUniversityId: programs.universityId, programTitle: programs.title,
      programLevel: programs.level, programDeadline: programs.deadline,
      scholarshipAvailable: programs.scholarshipAvailable, programActive: programs.isActive,
    }).from(countries)
      .leftJoin(universities, eq(universities.countryId, countries.id))
      .leftJoin(programs, eq(programs.universityId, universities.id))
      .orderBy(asc(countries.sortOrder), asc(countries.name), asc(universities.sortOrder), asc(universities.name), asc(programs.title))

    const result: Array<Record<string, unknown>> = []
    for (const row of rows) {
      let country = result.find((item) => item.id === row.countryId)
      if (!country) {
        country = { id: row.countryId, name: row.countryName, code: row.countryCode, flagEmoji: row.flagEmoji, isActive: row.countryActive, universities: [] }
        result.push(country)
      }
      const universityList = country.universities as Array<Record<string, unknown>>
      let university = universityList.find((item) => item.id === row.universityId)
      if (!university && row.universityId) {
        university = {
          id: row.universityId, countryId: row.universityCountryId, name: row.universityName, type: row.universityType,
          location: row.universityLocation, website: row.universityWebsite, isAcceptingApplications: row.universityActive,
          intakeClosedReason: row.intakeClosedReason, nextIntakeDate: row.nextIntakeDate, programs: [],
        }
        universityList.push(university)
      }
      if (university && row.programId) {
        const programList = university.programs as Array<Record<string, unknown>>
        if (!programList.some((item) => item.id === row.programId)) {
          programList.push({
            id: row.programId, universityId: row.programUniversityId, title: row.programTitle, level: row.programLevel,
            deadline: row.programDeadline, scholarshipAvailable: row.scholarshipAvailable, isActive: row.programActive,
          })
        }
      }
    }
    return NextResponse.json({ countries: result })
  } catch (error) {
    serverLog('[GET /api/admin/catalog]', error)
    return NextResponse.json({ error: 'Failed to load catalog', code: 'CATALOG_LOAD_FAILED' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const access = await requireAdmin()
  if ('response' in access) return access.response

  try {
    const parsed = createSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Invalid catalog data', code: 'INVALID_INPUT' }, { status: 400 })

    if (parsed.data.type === 'country') {
      const [country] = await db.insert(countries).values({
        name: parsed.data.name,
        code: parsed.data.code.toUpperCase(),
        flagEmoji: parsed.data.flagEmoji,
        isActive: true,
      }).returning({ id: countries.id })
      return NextResponse.json({ id: country.id }, { status: 201 })
    }
    if (parsed.data.type === 'university') {
      let countryId = parsed.data.countryId
      const countryCode = parsed.data.countryCode
      if (!countryId) {
        const entry = WORLD_COUNTRIES.find(item => item.code === countryCode)
        if (!entry) return NextResponse.json({ error: 'Select a country', code: 'INVALID_INPUT' }, { status: 400 })
        const [created] = await db.insert(countries).values({ ...entry, isActive: true }).onConflictDoNothing({ target: countries.code }).returning({ id: countries.id })
        countryId = created?.id ?? (await db.query.countries.findFirst({ where: eq(countries.code, entry.code) }))?.id
      }
      if (!countryId) return NextResponse.json({ error: 'Unable to resolve country' }, { status: 500 })
      const [university] = await db.insert(universities).values({
        countryId,
        name: parsed.data.name,
        type: parsed.data.universityType,
        location: parsed.data.location,
        website: parsed.data.website || null,
        isAcceptingApplications: true,
      }).returning({ id: universities.id })
      return NextResponse.json({ id: university.id }, { status: 201 })
    }
    if (parsed.data.type === 'bulk_programs') {
      const bulk = parsed.data
      const inserted = await importPrograms(bulk.universityId, bulk.programs)
      return NextResponse.json({ imported: inserted.length }, { status: 201 })
    }

    if (parsed.data.type !== 'program') {
      return NextResponse.json({ error: 'Unsupported catalog item', code: 'INVALID_INPUT' }, { status: 400 })
    }
    const inserted = await importPrograms(parsed.data.universityId, [parsed.data])
    return NextResponse.json({ id: inserted[0]?.id, imported: inserted.length }, { status: inserted.length ? 201 : 200 })
  } catch (error) {
    serverLog('[POST /api/admin/catalog]', error)
    return NextResponse.json({ error: 'Failed to create catalog item', code: 'CATALOG_CREATE_FAILED' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const access = await requireAdmin()
  if ('response' in access) return access.response
  const parsed = z.object({ type: z.enum(['university', 'program']), id: z.string().uuid() }).safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid catalog item' }, { status: 400 })
  try {
    const { id, type } = parsed.data
    const result = type === 'program'
      ? await db.execute(sql`DELETE FROM programs WHERE id = ${id} AND NOT EXISTS (SELECT 1 FROM applications WHERE program_id = ${id}) AND NOT EXISTS (SELECT 1 FROM custom_course_suggestions WHERE promoted_to_program = ${id}) RETURNING id`)
      : await db.execute(sql`DELETE FROM universities WHERE id = ${id} AND NOT EXISTS (SELECT 1 FROM programs WHERE university_id = ${id}) AND NOT EXISTS (SELECT 1 FROM custom_course_suggestions WHERE university_id = ${id}) RETURNING id`)
    if (!result.rows.length) return NextResponse.json({ error: type === 'program' ? 'This program is in use or was already deleted. Hide it instead if it is in use.' : 'Delete unused programs first. Schools linked to course requests cannot be deleted; close their intake instead.' }, { status: 409 })
    return NextResponse.json({ deleted: true })
  } catch (error) {
    serverLog('[DELETE /api/admin/catalog]', error)
    return NextResponse.json({ error: 'Unable to delete this item. It may still be in use.' }, { status: 409 })
  }
}

export async function PATCH(request: Request) {
  const access = await requireAdmin()
  if ('response' in access) return access.response

  try {
    const parsed = patchSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Invalid catalog update', code: 'INVALID_INPUT' }, { status: 400 })

    if (parsed.data.type === 'university') {
      await db.update(universities).set({
        isAcceptingApplications: parsed.data.isAcceptingApplications,
        intakeClosedReason: parsed.data.isAcceptingApplications ? null : parsed.data.intakeClosedReason || null,
        nextIntakeDate: parsed.data.isAcceptingApplications ? null : parsed.data.nextIntakeDate || null,
        updatedAt: new Date(),
      }).where(eq(universities.id, parsed.data.id))
    } else {
      await db.update(programs).set({ isActive: parsed.data.isActive, updatedAt: new Date() }).where(eq(programs.id, parsed.data.id))
    }
    return NextResponse.json({ updated: true })
  } catch (error) {
    serverLog('[PATCH /api/admin/catalog]', error)
    return NextResponse.json({ error: 'Failed to update catalog item', code: 'CATALOG_UPDATE_FAILED' }, { status: 500 })
  }
}
