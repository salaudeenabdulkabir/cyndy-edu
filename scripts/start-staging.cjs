const fs = require('node:fs')
const { spawn } = require('node:child_process')
const { loadEnvConfig } = require('@next/env')
// Keep .env values out of the inherited environment so Next can expand them once.
const childEnv = { ...process.env }
loadEnvConfig(process.cwd(), true, {info(){},error(){}})
const stage = fs.readFileSync('.env.staging.local','utf8').match(/^DATABASE_URL=(.+)$/m)?.[1].trim()
if (!stage) throw new Error('Missing isolated staging database')
childEnv.DATABASE_URL = stage
childEnv.CYNDY_STAGING_PREVIEW = 'true'
// Prefer IPv4 for this Windows local preview; preserve other Node options.
// Production hosting configuration is unaffected.
if (!childEnv.NODE_OPTIONS?.includes('--dns-result-order')) {
  childEnv.NODE_OPTIONS = [childEnv.NODE_OPTIONS, '--dns-result-order=ipv4first'].filter(Boolean).join(' ')
}
console.log('Starting local preview with isolated staging database; credentials withheld.')
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', process.argv.includes('--production') ? 'start' : 'dev', '--hostname','localhost','--port','3001'], { stdio:'inherit',env:childEnv })
child.on('exit', code => process.exit(code ?? 1))
