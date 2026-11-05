import { notFound } from 'next/navigation'
import { getConfirmLinkViewAction } from '@/lib/actions/confirm-link'
import { ConfirmLinkShell } from '@/components/camp/confirm/confirm-link-shell'
import { ConfirmAttendanceForm } from '@/components/camp/confirm/confirm-attendance-form'

export default async function ConfirmAttendancePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const view = await getConfirmLinkViewAction(token)
  if (!view) notFound()

  return (
    <ConfirmLinkShell>
      <ConfirmAttendanceForm token={token} view={view} />
    </ConfirmLinkShell>
  )
}
