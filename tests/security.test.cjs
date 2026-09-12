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
