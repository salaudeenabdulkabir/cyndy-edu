const fs = require('node:fs')
const { spawn } = require('node:child_process')
require('@next/env').loadEnvConfig(process.cwd(), true, {info(){},error(){}})
const url = fs.readFileSync('.env.redesign.local','utf8').match(/^\uFEFF?DATABASE_URL=(.+)$/m)?.[1].trim()
if (!url || !new URL(url).hostname.startsWith('ep-long-union-aeg9fpob')) throw new Error('Refusing to use a database outside the isolated redesign branch')
process.env.DATABASE_URL = url
process.env.CYNDY_REDESIGN_PREVIEW = 'true'
process.env.EMAIL_NOTIFICATIONS_ENABLED = 'false'
process.env.LEGAL_POLICIES_APPROVED = 'false'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3002'
process.env.CLOUDFLARE_R2_BUCKET_NAME = 'cyndy-edu-staging-documents'
process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = process.env.R2_STAGING_ACCESS_KEY_ID
process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = process.env.R2_STAGING_SECRET_ACCESS_KEY
process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, '--dns-result-order=ipv4first'].filter(Boolean).join(' ')
console.log('Starting isolated redesign preview on http://localhost:3002')
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next','dev','--hostname','localhost','--port','3002'], {stdio:'inherit',env:process.env})
child.on('exit',code=>process.exit(code ?? 1))
