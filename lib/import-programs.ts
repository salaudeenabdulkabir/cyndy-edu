import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
export async function importPrograms(universityId: string, rows: Array<{ title: string; level: string; deadline?: string; scholarshipAvailable?: boolean }>) {
  const data = JSON.stringify(rows.map(row => ({ title: row.title.trim(), level: row.level.trim(), deadline: row.deadline || null, scholarship: row.scholarshipAvailable ?? false })))
  // All catalog insertion paths use this same transaction lock, including single-row creates.
  const [, inserted] = await db.batch([
    db.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${universityId}, 0))`),
    db.execute<{ id: string }>(sql`INSERT INTO programs(university_id,title,level,deadline,scholarship_available,is_active,imported_via_paste)
      SELECT ${universityId}::uuid,r.title,r.level,r.deadline::date,r.scholarship,true,true
      FROM (SELECT DISTINCT ON(lower(btrim(title)),lower(btrim(level)),deadline) * FROM jsonb_to_recordset(${data}::jsonb) AS source(title text,level text,deadline text,scholarship boolean)) r
      WHERE NOT EXISTS(SELECT 1 FROM programs p WHERE p.university_id=${universityId}::uuid AND lower(btrim(p.title))=lower(btrim(r.title)) AND lower(btrim(p.level))=lower(btrim(r.level)) AND p.deadline IS NOT DISTINCT FROM r.deadline::date)
      RETURNING id`),
  ])
  return inserted.rows
}
