import { z } from 'zod'
import { WORLD_COUNTRIES } from './countries'

const countryCodes = new Set<string>(WORLD_COUNTRIES.map(country => country.code))
export const payerCountry = z.string().refine(code => countryCodes.has(code), 'Choose a country')
export const priceSchema = z.object({
  programId: z.string().uuid(), payerCountry,
  amount: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/).refine(value => Number(value) > 0),
  currency: z.string().regex(/^[A-Z]{3}$/),
  bankDetails: z.string().trim().min(10).max(2000),
  instructions: z.string().trim().max(2000).default(''),
  active: z.boolean(),
}).strict()
export const checkoutSchema = z.object({ priceId: z.string().uuid() }).strict()
export const opportunitySchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(4000).default(''),
  destinationLabel: z.string().trim().max(300).default(''),
  schoolLabel: z.string().trim().max(200).default(''),
  level: z.string().trim().max(100).default(''),
  deadline: z.union([z.string().date(), z.literal('')]),
  scholarshipAvailable: z.boolean(),
  opportunityStatus: z.enum(['draft', 'open', 'closed']),
}).strict()
export const DOCUMENT_SECTIONS = ['personal', 'academic', 'language', 'admissions', 'supporting'] as const
// Opportunity orders collect their payment receipt separately from application documents.
// Preserve the legacy global Receipt requirement for package applications only.
export function appliesToApplicationDocuments(requirement: { name: string; global: boolean | null }, opportunityPurchase: boolean) {
  return !opportunityPurchase || !requirement.global || requirement.name.trim().toLowerCase() !== 'receipt'
}
export function requirementSatisfied(id: string, documents: Array<{documentTypeId: string; status: string | null}>, waivers: Array<{documentTypeId: string}>) {
  return waivers.some(item => item.documentTypeId === id) || documents.some(item => item.documentTypeId === id && ['uploaded', 'verified'].includes(item.status ?? ''))
}
