import type { Metadata } from 'next'
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from '@/components/ui/toaster'

/*
 * Type system: one family for the whole interface, one for codes.
 *   sans / display  Plus Jakarta Sans   UI, headings (semibold, tight tracking) and numbers
 *   mono            JetBrains Mono      membership IDs, check-in codes, shortcuts
 */
const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500'],
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
  // Pinch-zoom stays on (accessibility); inputs are 16px on phones so iOS doesn't auto-zoom.
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f1f5f9' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
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
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
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
