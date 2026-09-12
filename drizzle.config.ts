import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema:    './lib/db/schema.ts',
  out:       './lib/db/migrations',
  dialect:   'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED!, // direct URL for migrations
  },
  verbose: true,
  strict:  true,
})
