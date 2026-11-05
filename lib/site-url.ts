/**
 * Public origin for links we send out (SMS, email). Prefers the configured site
 * URL, then Vercel's production domain. `VERCEL_URL` is a per-deployment host
 * (often behind deployment protection), so it is only the last resort.
 */
export function siteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configured) return configured.replace(/\/$/, '')
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  if (production) return `https://${production.replace(/\/$/, '')}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}
