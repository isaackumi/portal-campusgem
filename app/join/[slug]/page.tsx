import { notFound } from 'next/navigation'
import { ConfirmLinkShell } from '@/components/camp/confirm/confirm-link-shell'
import { CampusJoinForm } from '@/components/campus/campus-join-form'
import { getPublicCampusAction } from '@/lib/actions/campus-join'

export default async function CampusJoinPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const campus = await getPublicCampusAction(slug)
  if (!campus) notFound()
  return (
    <ConfirmLinkShell>
      <CampusJoinForm campus={campus} />
    </ConfirmLinkShell>
  )
}
