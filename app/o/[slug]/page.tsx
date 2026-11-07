import { notFound } from 'next/navigation'
import { ConfirmLinkShell } from '@/components/camp/confirm/confirm-link-shell'
import { PublicOutreachForm } from '@/components/outreach/public-outreach-form'
import { getPublicOutreachCampusAction } from '@/lib/actions/outreach'

/** Public: a student scans a GEM member's QR code (`?by=<signed ref>`) and leaves their details. */
export default async function OutreachFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ by?: string | string[] }>
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams])
  const campus = await getPublicOutreachCampusAction(slug)
  if (!campus) notFound()
  const by = typeof query.by === 'string' ? query.by.slice(0, 100) : null
  return (
    <ConfirmLinkShell>
      <PublicOutreachForm campus={campus} by={by} />
    </ConfirmLinkShell>
  )
}
