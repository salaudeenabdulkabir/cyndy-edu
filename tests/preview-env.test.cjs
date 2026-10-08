const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')

for (const file of ['scripts/start-redesign.cjs', 'scripts/start-staging.cjs']) {
  test(`${file} leaves dotenv secrets for Next to load, while preserving database isolation`, () => {
    const env = { PATH: 'test-path' }
    let launched
    const database = 'postgresql://test:test@ep-long-union-aeg9fpob.example/test'
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
      URL,
      process: { env, cwd: () => '.', execPath: 'node', argv: [], exit() {} },
      console: { log() {} },
      require(name) {
        if (name === 'node:fs') return { readFileSync: () => `DATABASE_URL=${database}` }
        if (name === '@next/env') return { loadEnvConfig() {
          env.ADMIN_PIN_HASH = '$2b$12$' + 'a'.repeat(53)
          env.UPSTASH_REDIS_REST_URL = 'https://test.invalid'
          env.UPSTASH_REDIS_REST_TOKEN = 'test-only'
          env.R2_STAGING_ACCESS_KEY_ID = 'test-key'
          env.R2_STAGING_SECRET_ACCESS_KEY = 'test-secret'
          env.__NEXT_PROCESSED_ENV = 'true'
        } }
        if (name === 'node:child_process') return { spawn(_exe, _args, options) { launched = options.env; return { on() {} } } }
        throw new Error(`Unexpected module: ${name}`)
      },
    })
    assert.equal(launched.DATABASE_URL, database)
    assert.equal(launched.PATH, 'test-path')
    assert.equal(launched.ADMIN_PIN_HASH, undefined)
    assert.equal(launched.__NEXT_PROCESSED_ENV, undefined)
    assert.equal(launched.UPSTASH_REDIS_REST_TOKEN, undefined)
    if (file.includes('redesign')) {
      assert.equal(launched.CLOUDFLARE_R2_BUCKET_NAME, 'cyndy-edu-staging-documents')
      assert.equal(launched.CLOUDFLARE_R2_SECRET_ACCESS_KEY, 'test-secret')
      assert.equal(launched.EMAIL_NOTIFICATIONS_ENABLED, 'false')
    }
  })
}
