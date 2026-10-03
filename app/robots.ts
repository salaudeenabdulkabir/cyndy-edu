import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  if (process.env.STAGING_SUBMISSIONS_ENABLED === 'true') {
    return { rules: { userAgent: '*', disallow: '/' } }
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/', '/worker/', '/apply/', '/applications/',
        '/notifications/', '/opportunities/', '/api/',
      ],
    },
  }
}
