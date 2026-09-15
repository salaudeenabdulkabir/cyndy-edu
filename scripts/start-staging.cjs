const fs = require('node:fs')
const { spawn } = require('node:child_process')
const { loadEnvConfig } = require('@next/env')
loadEnvConfig(process.cwd(), true, {info(){},error(){}})
const stage = fs.readFileSync('.env.staging.local','utf8').match(/^DATABASE_URL=(.+)$/m)?.[1].trim()
if (!stage) throw new Error('Missing isolated staging database')
process.env.DATABASE_URL = stage
process.env.CYNDY_STAGING_PREVIEW = 'true'
// Prefer IPv4 for this Windows local preview; preserve other Node options.
// Production hosting configuration is unaffected.
if (!process.env.NODE_OPTIONS?.includes('--dns-result-order')) {
  process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, '--dns-result-order=ipv4first'].filter(Boolean).join(' ')
}
console.log('Starting local preview with isolated staging database; credentials withheld.')
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', process.argv.includes('--production') ? 'start' : 'dev', '--hostname','localhost','--port','3001'], { stdio:'inherit',env:process.env })
child.on('exit', code => process.exit(code ?? 1))
