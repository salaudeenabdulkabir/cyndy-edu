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
    '@/lib/db': { db: { query: {clientPackages:{findFirst:async()=>({totalApplications:1})}}, insert: () => { throw new Error('must not insert') } } }, '@/lib/db/schema': load('lib/db/schema.ts'),
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

test('staff session reports mismatched identity role instead of entering a redirect loop', async () => {
  const route = load('app/api/auth/session/route.ts', {
    '@clerk/nextjs/server': { auth: async () => ({ userId: 'test-admin' }), clerkClient: async () => ({ users: { getUser: async () => ({ publicMetadata: { role: 'client' } }) } }) },
    '@/lib/db': { db: { query: { users: { findFirst: async () => ({ isActive: true, role: 'admin' }) } } } },
    '@/lib/db/schema': load('lib/db/schema.ts'),
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
  })
  const response = await route.GET()
  assert.equal(response.status, 409)
  assert.equal((await response.json()).code, 'ROLE_CONFIGURATION_MISMATCH')
})

test('malformed PIN configuration does not consume an attempt or report an incorrect PIN', async () => {
  const keys = ['ADMIN_PIN_HASH', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']
  const previous = keys.map(key => process.env[key])
  process.env.ADMIN_PIN_HASH = 'truncated-by-env-expansion'
  process.env.UPSTASH_REDIS_REST_URL = 'https://example.invalid'
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-only'
  try {
    const route = load('app/api/auth/admin-pin/route.ts', {
      '@clerk/nextjs/server': { auth: async () => ({ userId: 'test-admin', sessionId: 'test-session' }) },
      '@/lib/db': { db: { query: { users: { findFirst: async () => ({ isActive: true, role: 'admin' }) } } } },
      '@/lib/db/schema': load('lib/db/schema.ts'),
      '@/lib/admin-session': { adminRedis: () => { throw new Error('must not consume attempt') } },
      'bcryptjs': { compare: () => { throw new Error('must not compare malformed hash') } },
      'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    })
    const response = await route.POST(new Request('http://localhost/api/auth/admin-pin', { method: 'POST', body: JSON.stringify({ pin: '000001' }) }))
    assert.equal(response.status, 503)
    assert.match((await response.json()).error, /not configured/)
  } finally {
    keys.forEach((key, index) => { if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index] })
  }
})

test('missing PIN storage does not consume a login attempt', async () => {
  const previous = process.env.UPSTASH_REDIS_REST_TOKEN
  delete process.env.UPSTASH_REDIS_REST_TOKEN
  try {
    const route = load('app/api/auth/admin-pin/route.ts', {
      '@clerk/nextjs/server': { auth: async () => ({ userId: 'test-admin', sessionId: 'test-session' }) },
      '@/lib/db': { db: { query: { users: { findFirst: async () => ({ isActive: true, role: 'admin' }) } } } },
      '@/lib/db/schema': load('lib/db/schema.ts'),
      '@/lib/admin-session': { adminRedis: () => { throw new Error('must not consume attempt') } },
      'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    })
    const response = await route.POST(new Request('http://localhost/api/auth/admin-pin', { method: 'POST', body: JSON.stringify({ pin: '123456' }) }))
    assert.equal(response.status, 503)
    assert.match((await response.json()).error, /not configured/)
  } finally { if (previous !== undefined) process.env.UPSTASH_REDIS_REST_TOKEN = previous }
})
