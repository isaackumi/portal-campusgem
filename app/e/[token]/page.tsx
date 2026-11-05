import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPublicRsvpAction } from '@/lib/actions/events'
import { ConfirmLinkShell } from '@/components/camp/confirm/confirm-link-shell'
import { RsvpForm } from '@/components/events/rsvp-form'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'RSVP', robots: { index: false, follow: false } }

/** Public tap-to-RSVP page. The token in the link is the credential; no sign-in. */
export default async function RsvpPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const view = await getPublicRsvpAction(token)
  if (!view) notFound()

  return (
    <ConfirmLinkShell>
      <RsvpForm token={token} initial={view} />
    </ConfirmLinkShell>
  )
}
