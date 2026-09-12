export function matchesFileSignature(bytes: Uint8Array, mime: string) {
  if (mime === 'application/pdf') return bytes.length >= 5 && Buffer.from(bytes.subarray(0, 5)).toString('ascii') === '%PDF-'
  if (mime === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (mime === 'image/png') return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)
  return false
}

export function acceptsDocumentFormat(formats: string[] | null, mime: string) {
  const extension = ({ 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' } as Record<string, string>)[mime]
  return Boolean(extension && (formats ?? ['pdf', 'jpg', 'png']).some(format => format.toLowerCase().replace(/^\./, '').replace('jpeg', 'jpg') === extension))
}
