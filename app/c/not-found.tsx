import { ConfirmLinkShell } from '@/components/camp/confirm/confirm-link-shell'

/** Same page for unknown, malformed and cancelled links: reveals nothing. */
export default function ConfirmLinkNotFound() {
  return (
    <ConfirmLinkShell>
      <div className="text-center">
        <h1 className="app-page-title text-2xl text-slate-900 dark:text-white">Link not found</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
          This link is not valid any more. Check that you opened the full link from your text message.
        </p>
      </div>
    </ConfirmLinkShell>
  )
}
