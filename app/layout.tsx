import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from '@/components/ui/toaster'

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
  themeColor: '#1e3a8a',
}

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <DevAssetRecoveryScript />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,200..900;1,200..900&family=Space+Grotesk:wght@300..700&display=swap" 
          rel="stylesheet" 
        />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased" style={{ fontFamily: '"Source Sans 3", sans-serif' }}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
