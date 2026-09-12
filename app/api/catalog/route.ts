import { serverLog } from '@/lib/server-log'
import { auth } from '@clerk/nextjs/server'
import { and, asc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { countries, programs, universities } from '@/lib/db/schema'

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  try {
    const rows = await db
      .select({
        countryId: countries.id,
        countryName: countries.name,
        countryCode: countries.code,
        flagEmoji: countries.flagEmoji,
        universityId: universities.id,
        universityName: universities.name,
        universityType: universities.type,
        universityLocation: universities.location,
        programId: programs.id,
        programTitle: programs.title,
        programLevel: programs.level,
        programDeadline: programs.deadline,
        scholarshipAvailable: programs.scholarshipAvailable,
      })
      .from(countries)
      .innerJoin(universities, and(
        eq(universities.countryId, countries.id),
        eq(universities.isAcceptingApplications, true),
      ))
      .leftJoin(programs, and(
        eq(programs.universityId, universities.id),
        eq(programs.isActive, true),
      ))
      .where(eq(countries.isActive, true))
      .orderBy(asc(countries.sortOrder), asc(universities.sortOrder), asc(programs.title))

    const catalog = rows.reduce<Array<{
      id: string
      name: string
      code: string | null
      flagEmoji: string | null
      universities: Array<{
        id: string
        name: string
        type: string | null
        location: string | null
        programs: Array<{
          id: string
          title: string
          level: string | null
          deadline: string | null
          scholarshipAvailable: boolean | null
        }>
      }>
    }>>((result, row) => {
      let country = result.find((item) => item.id === row.countryId)
      if (!country) {
        country = {
          id: row.countryId,
          name: row.countryName,
          code: row.countryCode,
          flagEmoji: row.flagEmoji,
          universities: [],
        }
        result.push(country)
      }

      let university = country.universities.find((item) => item.id === row.universityId)
      if (!university) {
        university = {
          id: row.universityId,
          name: row.universityName,
          type: row.universityType,
          location: row.universityLocation,
          programs: [],
        }
        country.universities.push(university)
      }

      if (row.programId && row.programTitle) university.programs.push({
        id: row.programId,
        title: row.programTitle,
        level: row.programLevel,
        deadline: row.programDeadline,
        scholarshipAvailable: row.scholarshipAvailable,
      })
      return result
    }, [])

    return NextResponse.json({ countries: catalog })
  } catch (error) {
    serverLog('[GET /api/catalog]', error)
    return NextResponse.json({ error: 'Failed to load catalog', code: 'CATALOG_LOAD_FAILED' }, { status: 500 })
  }
}
