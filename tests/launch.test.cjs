const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const vm = require('node:vm')
function load(file, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: {} }
  vm.runInThisContext('(function(require,module,exports){' + code + '\n})', { filename: file })(name => name === '@/lib/server-log' ? { serverLog() {} } : name in mocks ? mocks[name] : require(name), module, module.exports)
  return module.exports
}
const { csvCell } = load('lib/csv.ts')
test('CSV neutralizes formulas including whitespace and escapes quotes', () => {
  for (const text of ['=1+1',' +1','\t@SUM(1)','-2']) assert.equal(csvCell(text), '"\'' + text + '"')
  assert.equal(csvCell('Hello "world", yes'), '"Hello ""world"", yes"')
})
const uploads = load('lib/upload-validation.ts')
test('per-document format restrictions accept jpeg aliases and deny unsupported MIME', () => {
  assert.equal(uploads.acceptsDocumentFormat(['pdf'], 'image/jpeg'), false)
  assert.equal(uploads.acceptsDocumentFormat(['.JPEG'], 'image/jpeg'), true)
  assert.equal(uploads.acceptsDocumentFormat(null, 'image/svg+xml'), false)
})
test('invalid Clerk signature causes no profile lookup or database mutation', async () => {
  process.env.CLERK_WEBHOOK_SECRET = 'test-only'
  const route = load('app/api/webhooks/clerk/route.ts', {
    '@clerk/nextjs/webhooks': { verifyWebhook: async () => { throw new Error('bad signature') } },
    '@clerk/nextjs/server': { clerkClient: () => { throw new Error('must not fetch profile') } },
    '@/lib/db': { db: {} }, '@/lib/db/schema': load('lib/db/schema.ts'),
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
  })
  assert.equal((await route.POST(new Request('https://example.com/api/webhooks/clerk', { method: 'POST', body: '{}' }))).status, 400)
  delete process.env.CLERK_WEBHOOK_SECRET
})
test('application slot outside the purchased allowance cannot create a record', async () => {
  const route = load('app/api/applications/route.ts', {
    '@clerk/nextjs/server': { auth: async () => ({ userId: 'test-client' }) },
    '@/lib/client-profile': { ensureClientProfile: async () => ({id: 'client', isActive: true, role: 'client'}), ensureClientPackage: async () => ({ totalApplications: 1 }) },
    '@/lib/db': { db: { insert: () => { throw new Error('must not insert') } } }, '@/lib/db/schema': load('lib/db/schema.ts'),
    '@/lib/application-policy': load('lib/application-policy.ts'), '@/lib/utils': { generateReferenceNo: () => { throw new Error('must not allocate') } },
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
  })
  for (const slot of [0,2,-1,1.5,'1']) {
    const response = await route.POST(new Request('https://example.com/api/applications', { method:'POST', body:JSON.stringify({slot}) }))
    assert.equal(response.status,403)
  }
})

test('program import preview flags invalid dates and repeated programs', () => {
  const { previewPrograms } = load('lib/program-import.ts')
  const rows = previewPrograms('Physics | MSc | 2027-02-28\n physics | MSc | 2027-02-28\nChemistry | MSc | 2027-02-30', [])
  assert.equal(rows[0].problem, '')
  assert.match(rows[1].problem, /repeated/)
  assert.match(rows[2].problem, /YYYY-MM-DD/)
})

test('notification job rejects a forged bearer token before any database query', async () => {
  process.env.CRON_SECRET = 'unit-test-secret-only'
  const route = load('app/api/jobs/notifications/route.ts', {
    '@/lib/db': { db: { execute() { throw new Error('must not query') } } },
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
  })
  assert.equal((await route.GET(new Request('https://example.com/api/jobs/notifications', { headers:{authorization:'Bearer forged'} }))).status,401)
  delete process.env.CRON_SECRET
})
