import { DOCUMENT_SECTIONS } from '@/lib/opportunity-policy'
import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { documentTypes, programDocuments, programs } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/require-admin'
const schema = z.object({ section: z.enum(DOCUMENT_SECTIONS).default('supporting'), id: z.string().uuid().optional(), name: z.string().trim().min(2).max(120), description: z.string().trim().max(1000).default(''),
  acceptedFormats: z.array(z.enum(['pdf','jpg','png'])).min(1), maxSizeMb: z.number().int().min(1).max(4), isGlobal: z.boolean(),
  programId: z.string().uuid().optional(), isMandatory: z.boolean().default(true),
}).strict()
export async function GET() {
  const access = await requireAdmin(); if ('response' in access) return access.response
  return NextResponse.json({ documentTypes: await db.select().from(documentTypes).orderBy(asc(documentTypes.sortOrder), asc(documentTypes.name)), programDocuments: await db.select().from(programDocuments), programs: await db.select({id: programs.id,title: programs.title}).from(programs) })
}
export async function POST(request: Request) {
  const access = await requireAdmin(); if ('response' in access) return access.response
  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Check document name, formats and size (1–4 MB)' }, { status: 400 })
    const { id, programId, isMandatory, ...values } = parsed.data
    if (!values.isGlobal && !programId) return NextResponse.json({ error: 'Select a program or make the requirement global' }, { status: 400 })
    if (programId && !await db.query.programs.findFirst({ where: eq(programs.id, programId) })) return NextResponse.json({ error: 'Opportunity not found. Reload and select an existing opportunity.' }, { status: 404 })
    if (id && !await db.query.documentTypes.findFirst({where:eq(documentTypes.id,id)})) return NextResponse.json({error:'Document type not found'},{status:404})
    const documentTypeId = id ?? randomUUID()
    const save = id ? db.update(documentTypes).set(values).where(eq(documentTypes.id,id)) : db.insert(documentTypes).values({...values,id:documentTypeId})
    if (programId) await db.batch([save,db.insert(programDocuments).values({programId,documentTypeId,isMandatory}).onConflictDoUpdate({target:[programDocuments.programId,programDocuments.documentTypeId],set:{isMandatory}})])
    else await save
    return NextResponse.json({ ok: true })
  } catch { return NextResponse.json({ error: 'Could not save document requirement' }, { status: 500 }) }
}
