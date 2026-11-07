import { redirect } from 'next/navigation'

/** The callers now live on the calls page itself (the Callers board); old links land there. */
export default function CallTeamPage() {
  redirect('/admin/camp-meeting/calls#callers')
}
