import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
export const maxDuration = 60
export async function GET(request: Request) {
  const actual = Buffer.from(request.headers.get('authorization') ?? '')
  const expected = Buffer.from('Bearer ' + (process.env.CRON_SECRET ?? ''))
  if (!process.env.CRON_SECRET || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (process.env.EMAIL_NOTIFICATIONS_ENABLED !== 'true' || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || !process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://')) return NextResponse.json({ error: 'Email delivery is not configured' }, { status: 503 })
  // Dedupe reminders by application/date. No decisions or attachments go into email.
  await db.execute(sql`INSERT INTO notifications (recipient_id, application_id, type, title, message, dedupe_key)
    SELECT client_id,id,'deadline_reminder','Application deadline reminder','A deadline is approaching. Sign in to review your application.', 'deadline:' || id || ':' || CURRENT_DATE
    FROM applications WHERE deadline BETWEEN CURRENT_DATE AND CURRENT_DATE + 7 AND status IN ('draft','submitted','docs_pending','under_review')
    ON CONFLICT (dedupe_key) DO NOTHING`)
  const claimed = await db.execute<{ id: string; email: string }>(sql`WITH candidates AS (
    SELECT n.id FROM notifications n JOIN users u ON u.id=n.recipient_id WHERE n.email_sent_at IS NULL AND n.email_attempts < 5
      AND (n.email_claim_until IS NULL OR n.email_claim_until < NOW()) AND n.email_next_attempt_at <= NOW() AND u.is_active=true AND u.email IS NOT NULL
    ORDER BY n.created_at LIMIT 10 FOR UPDATE OF n SKIP LOCKED
  ), claimed AS (
    UPDATE notifications n SET email_claim_until=NOW()+INTERVAL '5 minutes',email_attempts=n.email_attempts+1 FROM candidates c WHERE n.id=c.id RETURNING n.id,n.recipient_id
  ) SELECT c.id,u.email FROM claimed c JOIN users u ON u.id=c.recipient_id`)
  let sent = 0
  for (const row of claimed.rows) {
    try {
      const result = await fetch('https://api.resend.com/emails', { method: 'POST', signal: AbortSignal.timeout(4000), headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type':'application/json', 'Idempotency-Key':`notification-${row.id}` },
        body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [row.email], reply_to: process.env.SUPPORT_EMAIL, subject: 'An update is available in your Cyndy portal', text: `Sign in to your Cyndy Educational Pathways account to view your notifications: ${process.env.NEXT_PUBLIC_APP_URL}/notifications\n\nPlease do not reply with application documents or passwords.` }) })
      if (!result.ok) throw new Error('Delivery rejected')
      await db.execute(sql`UPDATE notifications SET email_sent_at=NOW(),email_claim_until=NULL WHERE id=${row.id}`); sent++
    } catch { await db.execute(sql`UPDATE notifications SET email_claim_until=NULL,email_next_attempt_at=NOW()+INTERVAL '1 hour' WHERE id=${row.id}`) }
  }
  return NextResponse.json({ processed: claimed.rows.length, sent })
}
