const { loadEnvConfig } = require('@next/env')
const fs = require('node:fs')
loadEnvConfig(process.cwd(), true, { info() {}, error() {} })
if (process.argv.includes('--staging')) {
  const entry = fs.existsSync('.env.staging.local') && fs.readFileSync('.env.staging.local', 'utf8').match(/^DATABASE_URL=(.+)$/m)
  if (!entry) { console.error('Missing .env.staging.local DATABASE_URL'); process.exit(1) }
  process.env.DATABASE_URL = entry[1].trim()
}
let failed = false
function check(name, ok, hint) {
  console.log(`${ok ? 'OK' : 'MISSING/INVALID'} ${name}${ok ? '' : ': ' + hint}`)
  if (!ok) failed = true
}
const env = process.env
check('Clerk development key pair', env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_test_') && env.CLERK_SECRET_KEY?.startsWith('sk_test_'), 'Use keys from the SAME Clerk development instance in .env.local.')
check('Database connection configured', Boolean(env.DATABASE_URL), 'Set DATABASE_URL, or use --staging for the isolated branch.')
check('Admin PIN hash', /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(env.ADMIN_PIN_HASH || ''), 'Run node scripts/admin-pin.cjs. Escape each dollar sign as \\$ in .env.local; paste the unescaped hash in Vercel.')
check('Admin security storage', Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN), 'Set both Upstash REST URL and token; do not disable the PIN gate.')
for (const key of ['CLOUDFLARE_R2_ACCOUNT_ID','CLOUDFLARE_R2_ACCESS_KEY_ID','CLOUDFLARE_R2_SECRET_ACCESS_KEY','CLOUDFLARE_R2_BUCKET_NAME']) check(key, Boolean(env[key]), 'Required for receipt and document uploads.')
console.log('Configuration checks do not prove successful sign-in, bucket privacy, or delivery. No secret values are printed.')
process.exitCode = failed ? 1 : 0
