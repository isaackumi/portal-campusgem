import type { Metadata } from 'next'
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from '@/components/ui/toaster'

/*
 * Type pairing — each family has one job:
 *   display  Instrument Serif   greetings and page titles, 24px and up only
 *   sans     Geist              all UI: body, labels, buttons, cards, numbers
 *   mono     Geist Mono         IDs, codes, keyboard shortcuts
 */
const display = Instrument_Serif({
  subsets: ['latin'],
  display: 'swap',
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-display',
})

const sans = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

const mono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Campus Gem Ministries - Church Management System',
  description: 'Church Management System for Campus Gem Ministries',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
      { url: '/icon-512x512.svg', sizes: '512x512', type: 'image/svg+xml' }
    ],
    apple: '/icon-192x192.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Campus Gem Ministries'
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'Campus Gem Ministries',
    title: 'Campus Gem Ministries - Church Management System',
    description: 'Church Management System for Campus Gem Ministries',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f5f5' },
    { media: '(prefers-color-scheme: dark)', color: '#171717' },
  ],
}

/** App-wide: skip broken static path generation for Convex-backed dynamic routes */
export const dynamic = 'force-dynamic'
export const dynamicParams = true

function DevAssetRecoveryScript() {
  if (process.env.NODE_ENV !== 'development') return null

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(() => {
  const reloadKey = 'chms-dev-chunk-reload';
  sessionStorage.removeItem(reloadKey);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => Promise.all(regs.map((reg) => reg.unregister())));
  }

  const shouldReload = (message) => {
    const text = String(message || '');
    return (
      text.includes('Loading chunk') ||
      text.includes('ChunkLoadError') ||
      text.includes('Failed to load resource') ||
      text.includes('was not found on the server') ||
      text.includes('UnrecognizedActionError') ||
      text.includes('failed-to-find-server-action')
    );
  };

  const reloadOnce = (message) => {
    if (!shouldReload(message)) return;
    if (sessionStorage.getItem(reloadKey)) return;
    sessionStorage.setItem(reloadKey, '1');
    window.location.reload();
  };

  window.addEventListener(
    'error',
    (event) => {
      const target = event?.target;
      if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
        reloadOnce('Failed to load resource');
        return;
      }
      reloadOnce(event?.message);
    },
    true
  );

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    reloadOnce(reason?.message || reason);
  });
})();`,
      }}
    />
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <DevAssetRecoveryScript />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`font-sans min-h-screen bg-background text-foreground antialiased`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
