// Intentionally bound to the isolated redesign branch. Never reads .env.local.
const fs = require('node:fs')
const { neon } = require('@neondatabase/serverless')
const connectionString = fs.readFileSync('.env.redesign.local','utf8').match(/DATABASE_URL=(.+)/)?.[1].trim()
if (!connectionString || !new URL(connectionString).hostname.startsWith('ep-long-union-aeg9fpob')) throw new Error('Refusing to migrate a database outside the isolated redesign branch')
const database = neon(connectionString)
async function run() {
  try {
    const [state] = await database`SELECT to_regclass('public.application_orders') AS installed`
    if (!state.installed) {
    const statements = fs.readFileSync('lib/db/migrations/0003_opportunities.sql','utf8').split('--> statement-breakpoint').map(text=>text.trim()).filter(Boolean)
    await database.transaction(statements.map(statement=>database.query(statement)))
    console.log('Isolated redesign migration applied successfully.')
    }
    const [standalone] = await database`SELECT 1 AS installed FROM information_schema.columns WHERE table_schema='public' AND table_name='programs' AND column_name='opportunity_status'`
    if (!standalone) {
      const statements = fs.readFileSync('lib/db/migrations/0004_standalone_opportunities.sql','utf8').split('--> statement-breakpoint').map(text=>text.trim()).filter(Boolean)
      await database.transaction(statements.map(statement=>database.query(statement)))
      console.log('Standalone opportunities migration applied to isolated redesign database.')
    } else console.log('Standalone opportunities schema already installed.')
  } catch (error) { console.error('Migration failed:', error.code || 'database unavailable', String(error.message).replace(/postgres(?:ql)?:\/\/\S+/g,'[redacted]')); process.exitCode=1 }
}
void run()
