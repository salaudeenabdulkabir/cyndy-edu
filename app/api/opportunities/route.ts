import { auth } from '@clerk/nextjs/server'
import { serverLog } from '@/lib/server-log'
import { NextResponse } from 'next/server'
import { and, eq, or, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { opportunityPrices, programs, universities, countries, applicationOrders, documentTypes, programDocuments } from '@/lib/db/schema'
import { ensureClientProfile } from '@/lib/client-profile'
import { checkoutSchema } from '@/lib/opportunity-policy'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Sign in to continue' }, { status: 401 })
  try {
    const client = await ensureClientProfile(userId)
    if (!client.isActive || client.role !== 'client') return NextResponse.json({ error: 'Client access required' }, { status: 403 })
    const offers = await db.select({ id: programs.id, title: programs.title, level: programs.level, deadline: programs.deadline,
      scholarship: programs.scholarshipAvailable, school: universities.name, destination: countries.name,
      priceId: opportunityPrices.id, payerCountry: opportunityPrices.payerCountry, amount: opportunityPrices.amount, currency: opportunityPrices.currency,
    }).from(programs).innerJoin(universities, eq(universities.id, programs.universityId)).innerJoin(countries, eq(countries.id, universities.countryId))
      .leftJoin(opportunityPrices, and(eq(opportunityPrices.programId, programs.id), eq(opportunityPrices.active, true)))
      .where(and(eq(programs.isActive, true), eq(universities.isAcceptingApplications, true), eq(countries.isActive, true), or(sql`${programs.deadline} IS NULL`, sql`${programs.deadline} >= CURRENT_DATE`)))
    const orders = await db.select({ applicationId: applicationOrders.applicationId, amount: applicationOrders.amount, currency: applicationOrders.currency, status: applicationOrders.status }).from(applicationOrders).where(eq(applicationOrders.clientId, client.id))
    const requirements = await db.select({name:documentTypes.name,description:documentTypes.description,global:documentTypes.isGlobal,programId:programDocuments.programId,mandatory:programDocuments.isMandatory}).from(documentTypes).leftJoin(programDocuments,eq(programDocuments.documentTypeId,documentTypes.id))
    return NextResponse.json({ offers, orders, requirements })
  } catch (error) { serverLog('Opportunities load',error); return NextResponse.json({ error: 'Unable to load opportunities. Please try again.' }, { status: 503 }) }
}
export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Sign in to continue' }, { status: 401 })
  try {
    const client = await ensureClientProfile(userId)
    if (!client.isActive || client.role !== 'client') return NextResponse.json({ error: 'Client access required' }, { status: 403 })
    const parsed = checkoutSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Select an available price' }, { status: 400 })
    const result = await db.execute(sql`select checkout_opportunity(${client.id}::uuid, ${parsed.data.priceId}::uuid) as id`)
    return NextResponse.json({ applicationId: result.rows[0].id })
  } catch (error) { serverLog('Opportunity checkout',error); return NextResponse.json({ error: 'This opportunity or price is no longer available. Refresh and try again.' }, { status: 409 }) }
}
