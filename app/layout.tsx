import type { Metadata, Viewport } from 'next'
import '@fontsource/dm-sans/latin-400.css'
import '@fontsource/dm-sans/latin-500.css'
import '@fontsource/dm-sans/latin-600.css'
import '@fontsource/dm-sans/latin-700.css'
import '@fontsource/cormorant-garamond/latin-500.css'
import '@fontsource/cormorant-garamond/latin-600.css'
import '@fontsource/cormorant-garamond/latin-700.css'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Cyndy Educational Pathways',
  description: 'Study abroad application management platform. Expert guidance, fast processing, secure documents.',
  keywords: 'study abroad, education, application portal, universities',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Cyndy Portal',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/icons/icon.svg', apple: '/icons/icon-180.png',
  },
  robots: process.env.STAGING_SUBMISSIONS_ENABLED === 'true'
    ? { index: false, follow: false }
    : { index: true, follow: true },

}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#D4A847' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#D4A847" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Cyndy Portal" />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
