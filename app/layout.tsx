import type { Metadata } from 'next'
import { Caveat, Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

/** Handwriting for the dashboard's sticky-note quick actions. */
const caveat = Caveat({
  subsets: ['latin'],
  display: 'swap',
  weight: ['500', '600'],
  variable: '--font-hand',
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
    <html lang="en" className={`${inter.variable} ${caveat.variable}`} suppressHydrationWarning>
      <head>
        <DevAssetRecoveryScript />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.className} min-h-screen bg-background text-foreground antialiased`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
