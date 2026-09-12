export function csvCell(value: unknown): string {
  let text = value == null ? '' : String(value)
  // Prevent spreadsheet formula execution, including leading whitespace/control characters.
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = "'" + text
  return '"' + text.replace(/"/g, '""') + '"'
}
export function toCsv(rows: unknown[][]) { return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') }
