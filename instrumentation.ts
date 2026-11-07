/**
 * Server start-up (Next.js runs this once per server instance, before any request).
 * - Texts follow people who changed number (lib/comms/sms-reroute.ts).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { installSmsReroute } = await import('./lib/comms/sms-reroute')
  installSmsReroute()
}
