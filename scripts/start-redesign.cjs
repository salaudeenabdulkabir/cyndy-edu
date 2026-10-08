const fs = require('node:fs')
const { spawn } = require('node:child_process')
// Next must load .env.local itself. Passing already-expanded values to it
// causes dollar signs in bcrypt hashes to be expanded again on a dev reload.
const childEnv = { ...process.env }
require('@next/env').loadEnvConfig(process.cwd(), true, {info(){},error(){}})
if (!/^\$2[aby]\$(0[4-9]|[12]\d|3[01])\$[./A-Za-z0-9]{53}$/.test(process.env.ADMIN_PIN_HASH || '') || !process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error('Local admin security configuration is invalid. Check ADMIN_PIN_HASH and Upstash settings in .env.local.')
}
const url = fs.readFileSync('.env.redesign.local','utf8').match(/^\uFEFF?DATABASE_URL=(.+)$/m)?.[1].trim()
if (!url || !new URL(url).hostname.startsWith('ep-long-union-aeg9fpob')) throw new Error('Refusing to use a database outside the isolated redesign branch')
childEnv.DATABASE_URL = url
childEnv.CYNDY_REDESIGN_PREVIEW = 'true'
childEnv.EMAIL_NOTIFICATIONS_ENABLED = 'false'
childEnv.LEGAL_POLICIES_APPROVED = 'false'
childEnv.NEXT_PUBLIC_APP_URL = 'http://localhost:3002'
childEnv.CLOUDFLARE_R2_BUCKET_NAME = 'cyndy-edu-staging-documents'
childEnv.CLOUDFLARE_R2_ACCESS_KEY_ID = process.env.R2_STAGING_ACCESS_KEY_ID
childEnv.CLOUDFLARE_R2_SECRET_ACCESS_KEY = process.env.R2_STAGING_SECRET_ACCESS_KEY
childEnv.NODE_OPTIONS = [childEnv.NODE_OPTIONS, '--dns-result-order=ipv4first'].filter(Boolean).join(' ')
console.log('Starting isolated redesign preview on http://localhost:3002')
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next','dev','--hostname','localhost','--port','3002'], {stdio:'inherit',env:childEnv})
child.on('exit',code=>process.exit(code ?? 1))
