const fs = require('node:fs')
const path = require('node:path')
const { loadEnvConfig } = require('@next/env')
loadEnvConfig(process.cwd(), false, { info() {}, error() {} })
const ignored = new Set(['node_modules', '.next', '.git', '.vercel', '.codex', '.agents', 'coverage', 'mnt'])
const secretValues = Object.entries(process.env).filter(([key, value]) => /SECRET|TOKEN|DATABASE_URL|API_KEY|ADMIN_PIN_HASH/.test(key) && !key.startsWith('NEXT_PUBLIC_') && value?.length > 15)
  .flatMap(([key, value]) => { if (!key.startsWith('DATABASE_URL')) return [value]; try { const password = new URL(value).password; return password.length > 8 ? [value, password] : [] } catch { return [] } }).filter(value => value.length > 15)
const patterns = [/(?:sk_(?:live|test)_|re_)[A-Za-z0-9_-]{25,}/, /postgres(?:ql)?:\/\/[^\s:]+:[^\s@]{8,}@/, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/]
const files = []
function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(item.name) || (item.name.startsWith('.env') && item.name !== '.env.example') || item.name.endsWith('.tsbuildinfo')) continue
    const filename = path.join(dir, item.name)
    if (item.isDirectory()) walk(filename)
    else if (!item.isSymbolicLink() && /\.(?:tsx?|c?js|mjs|json|md|txt|sql|ya?ml|example)$/.test(item.name)) files.push(filename)
  }
}
walk('.')
let failed = false
for (const file of files) {
  if (file.endsWith('check-secrets.cjs')) continue
  const content = fs.readFileSync(file, 'utf8')
  if (secretValues.some(value => content.includes(value)) || patterns.some(pattern => pattern.test(content))) {
    console.error('Potential secret in ' + file + ' (value withheld)'); failed = true
  }
}
console.log(failed ? 'Secret check FAILED' : 'Secret check passed for ' + files.length + ' publishable text files')
process.exitCode = failed ? 1 : 0
