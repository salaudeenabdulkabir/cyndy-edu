const { loadEnvConfig } = require('@next/env')
loadEnvConfig(process.cwd(), false, { info() {}, error() {} })
const required = ['DATABASE_URL', 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY', 'ADMIN_PIN_HASH', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'CLOUDFLARE_R2_ACCOUNT_ID', 'CLOUDFLARE_R2_ACCESS_KEY_ID', 'CLOUDFLARE_R2_SECRET_ACCESS_KEY', 'CLOUDFLARE_R2_BUCKET_NAME', 'NEXT_PUBLIC_APP_URL', 'CLERK_WEBHOOK_SECRET', 'SUPPORT_EMAIL', 'LEGAL_POLICIES_APPROVED', 'CRON_SECRET', 'RESEND_API_KEY', 'EMAIL_FROM']
let failed = false
for (const key of required) {
  const value = process.env[key]
  let valid = Boolean(value) && !/YOUR_|your_|placeholder|\.\.\./.test(value)
  if (key === 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY') valid = value?.startsWith('pk_live_') ?? false
  if (key === 'CLERK_SECRET_KEY') valid = value?.startsWith('sk_live_') ?? false
  if (key === 'ADMIN_PIN_HASH') valid = /^\$2[aby]\$(1[2-9]|[2-3][0-9])\$[./A-Za-z0-9]{53}$/.test(value ?? '')
  if (key === 'NEXT_PUBLIC_APP_URL') { try { const url = new URL(value); valid = url.protocol === 'https:' && !url.hostname.endsWith('.vercel.app') && !url.hostname.includes('localhost') } catch { valid = false } }
  if (key === 'LEGAL_POLICIES_APPROVED') valid = value === 'true'
  if (key === 'SUPPORT_EMAIL' || key === 'EMAIL_FROM') valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value ?? '')
  if (key === 'CRON_SECRET') valid = (value?.length ?? 0) >= 32
  console.log(key + ': ' + (valid ? 'configured (connection not tested)' : 'MISSING OR NOT PRODUCTION READY'))
  if (!valid) failed = true
}
if (process.env.NEXT_PUBLIC_ADMIN_PIN) console.log('Remove the obsolete NEXT_PUBLIC_ADMIN_PIN and choose a new private PIN; the old value was public.')
process.exitCode = failed ? 1 : 0
