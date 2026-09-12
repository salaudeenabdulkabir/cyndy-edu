import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export async function generateReferenceNo(): Promise<string> {
  const year = new Date().getFullYear()

  const result = await db.execute<{ last_num: number }>(sql`
    INSERT INTO "application_seq" ("year", "last_num")
    VALUES (${year}, 1)
    ON CONFLICT ("year")
    DO UPDATE SET "last_num" = "application_seq"."last_num" + 1
    RETURNING "last_num"
  `)

  const nextNum = result.rows[0]?.last_num
  if (nextNum === undefined) {
    throw new Error('Failed to generate application reference number')
  }

  return `${year}-${String(nextNum).padStart(3, '0')}`
}

export function formatReferenceNo(ref: string): string {
  return ref
}

export function parseReferenceYear(ref: string): number {
  return parseInt(ref.split('-')[0], 10)
}
