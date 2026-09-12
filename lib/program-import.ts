import { z } from 'zod'
export type ImportProgram = { title: string; level: string | null; deadline: string | null }
const rowSchema = z.object({ title: z.string().min(2).max(250), level: z.string().min(1).max(100), deadline: z.union([z.literal(''), z.string().date()]) })
export const programKey = (row: ImportProgram) => [row.title.trim().toLowerCase(), (row.level ?? '').trim().toLowerCase(), row.deadline ?? ''].join('|')
export function previewPrograms(text: string, existing: ImportProgram[]) {
  const seen = new Set(existing.map(programKey))
  return text.split(/\r?\n/).map((line, index) => {
    const parts = line.split('|').map(value => value.trim())
    const program = { title: parts[0] ?? '', level: parts[1] || 'Program', deadline: parts[2] || '' }
    const valid = parts.length <= 3 && rowSchema.safeParse(program).success
    const duplicate = seen.has(programKey(program))
    if (valid) seen.add(programKey(program))
    return { ...program, line: index + 1, blank: !line.trim(), problem: !valid ? 'Use Title | Level | YYYY-MM-DD (date optional)' : duplicate ? 'Already present or repeated in this paste' : '' }
  }).filter(row => !row.blank)
}
