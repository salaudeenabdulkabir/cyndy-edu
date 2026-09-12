import { z } from 'zod'

export const staffUpdateSchema = z.object({
  status: z.enum(['submitted', 'docs_pending', 'docs_complete', 'under_review', 'offer_received', 'accepted', 'rejected', 'withdrawn']).optional(),
  workerNotes: z.string().max(10000).optional(),
}).strict()

export const clientUpdateSchema = z.object({
  programId: z.string().uuid().nullable().optional(),
  customCourseText: z.string().trim().max(200).nullable().optional(),
  countryId: z.string().uuid().optional(), universityId: z.string().uuid().optional(),
  status: z.literal('submitted').optional(),
  confirmed: z.literal(true).optional(), termsAccepted: z.literal(true).optional(),
  firstName: z.string().max(100).optional(), middleName: z.string().max(100).optional(), lastName: z.string().max(100).optional(),
  gender: z.string().max(30).optional(), dateOfBirth: z.string().max(10).optional(),
  phone: z.string().max(40).optional(), email: z.string().max(254).optional(),
  homeAddress: z.string().max(500).optional(), city: z.string().max(100).optional(), postalCode: z.string().max(30).optional(), country: z.string().max(100).optional(),
  universities: z.array(z.record(z.string().max(1000))).max(20).optional(),
  highSchools: z.array(z.record(z.string().max(1000))).max(20).optional(),
  guardians: z.array(z.record(z.string().max(1000))).max(2).optional(),
  projectTitle: z.string().max(500).optional(), year: z.string().max(10).optional(), interests: z.string().max(10000).optional(),
  sections: z.record(z.object({ notApplicable: z.boolean(), entries: z.array(z.record(z.string().max(2000))).max(50) })).optional(),
}).strict()

const filled = (value: unknown) => typeof value === 'string' && value.trim().length > 0
export function missingApplicationFields(data: Record<string, unknown>) {
  const missing: string[] = []
  if (!['firstName', 'lastName', 'gender', 'dateOfBirth', 'phone', 'email', 'homeAddress', 'city', 'country'].every(key => filled(data[key])) || !z.string().email().safeParse(data.email).success) missing.push('Personal information')
  const rowsComplete = (value: unknown, keys: string[]) => Array.isArray(value) && value.length > 0 && value.every(row => row && keys.every(key => filled(row[key])))
  if (!rowsComplete(data.universities, ['institution', 'location', 'course', 'degree', 'startYear', 'endYear', 'cgpa', 'scale']) || !rowsComplete(data.highSchools, ['school', 'location', 'startYear', 'endYear'])) missing.push('Education background')
  if (!rowsComplete(data.guardians, ['name', 'phone', 'relationship', 'address'])) missing.push('Legal guardians')
  if (!filled(data.projectTitle) || !filled(data.year)) missing.push('Research experience')
  return missing
}

export function clientApplication<T extends { adminNotes?: unknown; workerNotes?: unknown }>(application: T) {
  const safe = { ...application }
  delete safe.adminNotes
  delete safe.workerNotes
  return safe
}

export function formProgress(data: Record<string, unknown>, hasProgram: boolean) {
  return Math.round(((4 - missingApplicationFields(data).length + Number(hasProgram)) / 5) * 100)
}
