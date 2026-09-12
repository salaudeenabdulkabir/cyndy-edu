// Interactive only: the PIN is never printed, saved, or passed as a command argument.
const bcrypt = require('bcryptjs')
if (!process.stdin.isTTY) { console.error('Run this in your own interactive terminal.'); process.exit(1) }
let input = '', first = ''
process.stdout.write('Choose a NEW six-digit admin PIN (hidden): ')
process.stdin.setRawMode(true)
process.stdin.resume()
process.stdin.setEncoding('utf8')
process.stdin.on('data', async chunk => {
  for (const char of chunk) {
    if (char === '\u0003') { process.stdin.setRawMode(false); process.exit(1) }
    if (char === '\u007f' || char === '\b') { input = input.slice(0, -1); continue }
    if (char === '\r' || char === '\n') {
      if (!/^\d{6}$/.test(input)) { input = ''; process.stdout.write('\nUse exactly six digits. Try again (hidden): '); continue }
      if (!first) { first = input; input = ''; process.stdout.write('\nConfirm PIN (hidden): '); continue }
      if (first !== input) { first = ''; input = ''; process.stdout.write('\nPINs did not match. Start again (hidden): '); continue }
      process.stdin.setRawMode(false); process.stdin.pause()
      const hash = await bcrypt.hash(input, 12)
      input = ''; first = ''
      process.stdout.write('\nStore this hash as ADMIN_PIN_HASH in your secret manager:\n' + hash + '\n')
      process.exit(0)
    }
    if (/\d/.test(char) && input.length < 6) input += char
  }
})
