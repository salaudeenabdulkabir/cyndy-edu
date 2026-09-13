const fs = require('node:fs')
const { spawn } = require('node:child_process')
const { loadEnvConfig } = require('@next/env')
loadEnvConfig(process.cwd(), true, {info(){},error(){}})
const stage = fs.readFileSync('.env.staging.local','utf8').match(/^DATABASE_URL=(.+)$/m)?.[1].trim()
if (!stage) throw new Error('Missing isolated staging database')
process.env.DATABASE_URL = stage
process.env.CYNDY_STAGING_PREVIEW = 'true'
console.log('Starting local preview with isolated staging database; credentials withheld.')
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', process.argv.includes('--production') ? 'start' : 'dev', '--hostname','localhost','--port','3001'], { stdio:'inherit',env:process.env })
child.on('exit', code => process.exit(code ?? 1))
