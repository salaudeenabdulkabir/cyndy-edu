const { test } = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')
const fs = require('node:fs')
const vm = require('node:vm')
function load(file, mocks = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: {} }
  vm.runInThisContext('(function(require,module,exports){' + source + '\n})', { filename: file })(name => name === '@/lib/server-log' ? { serverLog() {} } : name in mocks ? mocks[name] : require(name), module, module.exports)
  return module.exports
}
const policy = load('lib/application-policy.ts')
const uploads = load('lib/upload-validation.ts')
test('worldwide country choices have unique codes and include every region', () => {
  const { WORLD_COUNTRIES } = load('lib/countries.ts')
  assert.equal(WORLD_COUNTRIES.length, 249)
  assert.equal(new Set(WORLD_COUNTRIES.map(item => item.code)).size, 249)
  for (const code of ['NG', 'GH', 'KE', 'US', 'BR', 'JP', 'AU', 'GB', 'ZA', 'CA', 'IN']) assert.ok(WORLD_COUNTRIES.some(item => item.code === code))
})
test('worker failures explain duplicate accounts and unsafe passwords without exposing details', () => {
  const { workerCreationError } = load('lib/worker-errors.ts')
  assert.equal(workerCreationError({ errors: [{ code: 'form_identifier_exists' }] }).status, 409)
  assert.match(workerCreationError({ errors: [{ code: 'form_password_pwned' }] }).error, /unique password/)
  assert.equal(workerCreationError(new Error('secret')).error.includes('secret'), false)
})
test('worker creation persists an authorized worker and returns it to the administrator', async () => {
  let identityInput, saved
  const route = load('app/api/admin/workers/route.ts', {
    '@/lib/worker-errors': load('lib/worker-errors.ts'),
    '@/lib/require-admin': { requireAdmin: async () => ({ user: { role: 'admin' } }) },
    '@clerk/nextjs/server': { clerkClient: async () => ({ users: { createUser: async input => { identityInput = input; return { id: 'clerk-worker' } } } }) },
    '@/lib/db/schema': load('lib/db/schema.ts'),
    '@/lib/db': { db: { insert: () => ({ values: value => { saved = value; return { onConflictDoUpdate: () => ({ returning: async () => [{ id: 'worker', email: value.email }] }) } } }) } },
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
  })
  const response = await route.POST(new Request('https://example.com/api/admin/workers', { method: 'POST', body: JSON.stringify({ firstName: 'Test', lastName: 'Worker', email: ' Test@Example.com ', password: 'test-only-unique-password' }) }))
  assert.equal(response.status, 201)
  assert.equal(identityInput.publicMetadata.role, 'worker')
  assert.equal(saved.email, 'test@example.com')
  assert.equal(saved.firstLogin, true)
  assert.equal((await response.json()).worker.id, 'worker')
})
test('catalog deletion requires admin access before any database operation', async () => {
  const route = load('app/api/admin/catalog/route.ts', {
    '@/lib/import-programs': {}, '@/lib/countries': load('lib/countries.ts'),
    '@/lib/require-admin': { requireAdmin: async () => ({ response: Response.json({ error: 'Forbidden' }, { status: 403 }) }) },
    '@/lib/db': { db: {} }, '@/lib/db/schema': load('lib/db/schema.ts'),
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
  })
  assert.equal((await route.DELETE(new Request('https://example.com/api/admin/catalog', { method: 'DELETE' }))).status, 403)
})
const { isAllowedRequestOrigin } = load('lib/request-origin.ts')
test('payment status remains available when receipt storage is unavailable', async () => {
  const route = load('app/api/payments/receipt/route.ts', {
    '@clerk/nextjs/server': { auth: async () => ({ userId: 'client' }) },
    '@/lib/client-profile': {}, '@/lib/upload-limit': {}, '@/lib/upload-validation': uploads,
    '@/lib/db/schema': load('lib/db/schema.ts'),
    '@/lib/db': { db: { query: {
      users: { findFirst: async () => ({ id: 'client', isActive: true, role: 'client' }) },
      paymentReceipts: { findFirst: async () => ({ id: 'receipt', fileName: 'receipt.pdf', rejectionReason: null, r2Key: 'private-key' }) },
      clientPackages: { findFirst: async () => ({ paymentConfirmed: true }) },
    } } },
    '@/lib/r2': { getSignedDownloadUrl: async () => { throw new Error('Storage unavailable') } },
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
  })
  const response = await route.GET()
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { paymentConfirmed: true, receipt: { id: 'receipt', fileName: 'receipt.pdf', rejectionReason: null } })
})
test('Render HTTPS origin works behind an internal HTTP proxy', () => {
  assert.equal(isAllowedRequestOrigin('https://cyndy-edu-staging.onrender.com', 'http://localhost:10000', ['https://cyndy-edu-staging.onrender.com']), true)
})
test('configured origins reject foreign, null, lookalike and internal origins', () => {
  for (const origin of ['https://evil.example', 'null', 'https://cyndy-edu-staging.onrender.com.evil.example', 'http://localhost:10000', 'http://cyndy-edu-staging.onrender.com', 'https://cyndy-edu-staging.onrender.com:444']) {
    assert.equal(isAllowedRequestOrigin(origin, 'http://localhost:10000', ['https://cyndy-edu-staging.onrender.com']), false)
  }
})
test('origin policy supports a custom domain and local development', () => {
  assert.equal(isAllowedRequestOrigin('https://example.com', 'http://localhost:10000', ['https://example.com/']), true)
  assert.equal(isAllowedRequestOrigin('http://localhost:3001', 'http://localhost:3001', [undefined, '']), true)
  assert.equal(isAllowedRequestOrigin('https://evil.example', 'http://localhost:3001', []), false)
  assert.equal(isAllowedRequestOrigin(null, 'http://localhost:3001', []), true)
  assert.equal(isAllowedRequestOrigin('http://localhost:3001', 'http://localhost:3001', ['invalid']), false)
})
for (const field of ['paymentConfirmed', 'assignedWorkerId', 'packageId', 'adminNotes', 'deadline', 'submittedAt', 'formCompletionPct']) {
  test('clients cannot write ' + field, () => assert.equal(policy.clientUpdateSchema.safeParse({ [field]: true }).success, false))
}
test('clients cannot approve or withdraw an application', () => {
  for (const status of ['accepted', 'rejected', 'withdrawn']) assert.equal(policy.clientUpdateSchema.safeParse({ status }).success, false)
})
test('empty education rows do not satisfy submission', () => assert.ok(policy.missingApplicationFields({ universities: [{}], highSchools: [{}] }).includes('Education background')))
test('client responses omit internal notes', () => assert.deepEqual(policy.clientApplication({ id: 'one', adminNotes: 'private', workerNotes: 'private' }), { id: 'one' }))
test('upload content must match MIME type', () => {
  assert.equal(uploads.matchesFileSignature(Buffer.from('<script>alert(1)</script>'), 'application/pdf'), false)
  assert.equal(uploads.matchesFileSignature(Buffer.from('%PDF-1.7'), 'application/pdf'), true)
  assert.equal(uploads.matchesFileSignature(Buffer.alloc(0), 'image/png'), false)
})
function routeFixture({ active = true, owner = true, paid = true } = {}) {
  let writes = 0
  const user = { id: 'user', role: 'client', isActive: active }
  const app = { id: '123e4567-e89b-42d3-a456-426614174000', clientId: owner ? 'user' : 'other', status: 'draft', paymentConfirmed: paid, applicationData: {} }
  const db = { query: { users: { findFirst: async () => user }, applications: { findFirst: async () => app } }, update: () => { writes++; return { set: () => ({ where: () => ({ returning: async () => [app] }) }) } } }
  const route = load('app/api/applications/[id]/route.ts', {
    '@clerk/nextjs/server': { auth: async () => ({ userId: 'clerk', sessionId: 'session' }) },
    '@/lib/db': { db }, '@/lib/db/schema': load('lib/db/schema.ts'),
    '@/lib/r2': { getSignedDownloadUrl: async () => '' },
    '@/lib/application-policy': policy, '@/lib/legal': { policiesApproved: () => false, POLICY_VERSION: 'test' },
    '@/lib/require-admin': { requireAdmin: async () => { throw new Error('Unexpected admin access') } },
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
  })
  return { patch: body => route.PATCH(new Request('http://localhost/api/applications/' + app.id, { method: 'PATCH', body: JSON.stringify(body) }), { params: Promise.resolve({ id: app.id }) }), writes: () => writes }
}
test('API rejects payment privilege escalation without a database write', async () => {
  const fixture = routeFixture(); const response = await fixture.patch({ paymentConfirmed: true })
  assert.equal(response.status, 400); assert.equal(fixture.writes(), 0)
})
test('deactivated clients cannot edit', async () => {
  const fixture = routeFixture({ active: false }); assert.equal((await fixture.patch({ firstName: 'Test' })).status, 404); assert.equal(fixture.writes(), 0)
})
test('clients cannot edit another client application', async () => {
  const fixture = routeFixture({ owner: false }); assert.equal((await fixture.patch({ firstName: 'Test' })).status, 404); assert.equal(fixture.writes(), 0)
})
test('payment gate is enforced by the API', async () => {
  const fixture = routeFixture({ paid: false }); assert.equal((await fixture.patch({ firstName: 'Test' })).status, 403); assert.equal(fixture.writes(), 0)
})
test('paid clients can save their own draft fields', async () => {
  const fixture = routeFixture(); assert.equal((await fixture.patch({ firstName: 'Test' })).status, 200); assert.equal(fixture.writes(), 1)
})

function adminFixture(role, verified) {
  return load('lib/require-admin.ts', {
    '@clerk/nextjs/server': { auth: async () => ({ userId: 'user', sessionId: 'session', sessionClaims: { unsafeMetadata: { role: 'admin' } } }) },
    '@/lib/db': { db: { query: { users: { findFirst: async () => ({ role, isActive: true }) } } } },
    '@/lib/db/schema': load('lib/db/schema.ts'), '@/lib/admin-session': { hasAdminSession: async () => verified },
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
  })
}
test('unsafe metadata cannot grant admin access', async () => {
  assert.equal((await adminFixture('client', true).requireAdmin()).response.status, 403)
})
test('database admins must still verify their PIN session', async () => {
  const result = await adminFixture('admin', false).requireAdmin()
  assert.equal(result.response.status, 403)
  assert.equal((await result.response.json()).code, 'PIN_REQUIRED')
})
test('verified active database admins are authorized', async () => assert.ok((await adminFixture('admin', true).requireAdmin()).admin))
test('submission cannot combine changing a program with bypassing its requirements', async () => {
  const fixture = routeFixture()
  const response = await fixture.patch({ status: 'submitted', confirmed: true, termsAccepted: true, programId: '123e4567-e89b-42d3-a456-426614174111' })
  assert.equal(response.status, 400); assert.equal(fixture.writes(), 0)
})
