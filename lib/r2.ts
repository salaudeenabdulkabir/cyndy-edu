import { randomUUID } from 'node:crypto'
import { S3Client, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME!

export async function getSignedDownloadUrl(key: string, expiresInSeconds = 3600) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key })
  return getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds })
}

export async function deleteFile(key: string) {
  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: key })
  await r2Client.send(command)
}

export function buildDocumentKey(applicationId: string, documentTypeId: string, mimeType: string): string {
  const ext = mimeType.split('/')[1] || 'pdf'
  const ts = randomUUID()
  return `documents/${applicationId}/${documentTypeId}/${ts}.${ext}`
}

export function buildReceiptKey(clientId: string, mimeType: string): string {
  const ext = mimeType.split('/')[1] || 'pdf'
  const ts = randomUUID()
  return `receipts/${clientId}/${ts}.${ext}`
}
