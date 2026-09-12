import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

type EmailTemplate =
  | 'StatusUpdate'
  | 'PaymentConfirmed'
  | 'PaymentRejected'
  | 'DocumentRejected'
  | 'DeadlineReminder'
  | 'IncompleteReminder'
  | 'WorkerWelcome'
  | 'NewAssignment'

interface SendEmailOptions {
  to: string
  template: EmailTemplate
  data: Record<string, string>
  replyTo?: string
}

const SUBJECTS: Record<EmailTemplate, string> = {
  StatusUpdate: 'Update on your application — {{reference_no}}',
  PaymentConfirmed: 'Payment confirmed — your application is now active',
  PaymentRejected: 'Action needed: payment receipt issue — {{reference_no}}',
  DocumentRejected: 'Document needs to be re-uploaded — {{reference_no}}',
  DeadlineReminder: 'Reminder: Your application deadline is in 7 days',
  IncompleteReminder: "Don't lose your progress — complete your application",
  WorkerWelcome: 'Welcome to Cyndy Portal — your account is ready',
  NewAssignment: 'New application assigned to you — {{reference_no}}',
}

function interpolate(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? `{{${key}}}`)
}

export async function sendEmail({ to, template, data, replyTo }: SendEmailOptions) {
  const subject = interpolate(SUBJECTS[template], data)

  try {
    const { data: result, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to,
      reply_to: (replyTo ?? process.env.EMAIL_REPLY_TO) as string | undefined,
      subject,
      text: `Hi ${data.first_name ?? ''},\n\nThis is an update regarding your Cyndy Educational Pathways application.\n\nReference: ${data.reference_no ?? 'N/A'}\n\nPlease log in to your portal for full details:\n${process.env.NEXT_PUBLIC_APP_URL}/status\n\nBest regards,\nCyndy Educational Pathways`,
    })

    if (error) {
      console.error('[Resend] Email failed:', error)
      return { success: false, error }
    }

    return { success: true, id: result?.id }
  } catch (error) {
    console.error('[Resend] Email error:', error)
    return { success: false, error }
  }
}
