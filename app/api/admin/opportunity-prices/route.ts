import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { opportunityPrices, programs, universities, countries } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/require-admin'
import { priceSchema } from '@/lib/opportunity-policy'
export async function GET() {
  const access = await requireAdmin(); if ('response' in access) return access.response
  try {
    const choices=await db.select({id:programs.id,title:programs.title,school:universities.name,country:countries.name}).from(programs).leftJoin(universities,eq(universities.id,programs.universityId)).leftJoin(countries,eq(countries.id,universities.countryId))
    return NextResponse.json({ prices: await db.select().from(opportunityPrices), programs: choices.map(item=>({id:item.id,title:item.title})) })
  }
  catch { return NextResponse.json({ error: 'Unable to load prices' }, { status: 503 }) }
}
export async function POST(request: Request) {
  const access = await requireAdmin(); if ('response' in access) return access.response
  try {
    const parsed = priceSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Check country, positive amount, three-letter currency and bank details' }, { status: 400 })
    if (!await db.query.programs.findFirst({ where: eq(programs.id, parsed.data.programId) })) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
    await db.insert(opportunityPrices).values(parsed.data).onConflictDoUpdate({ target: [opportunityPrices.programId, opportunityPrices.payerCountry], set: parsed.data })
    return NextResponse.json({ ok: true })
  } catch { return NextResponse.json({ error: 'Could not save this price' }, { status: 500 }) }
}
