const { spawnSync } = require('node:child_process')
const commands = []
if (process.env.VERCEL_ENV === 'production') commands.push(['scripts/check-production.cjs'])
commands.push(['node_modules/next/dist/bin/next', 'build'])
for (const args of commands) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env: process.env })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
