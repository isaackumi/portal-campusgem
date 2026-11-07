'use client'

import { useState } from 'react'
import QRCode from 'react-qr-code'
import { useQuery } from '@tanstack/react-query'
import { Check, Copy, MessageSquareText, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useSmsPreview } from '@/components/comms/sms-preview'
import { useToast } from '@/hooks/use-toast'
import { whatsAppShareHref } from '@/lib/contact-links'
import { getSessionInviteAction, textTeamSessionLinkAction } from '@/lib/actions/call-center'

/**
 * Getting the team in: a QR code to scan in the room (show it on a laptop or the projector), the
 * link to copy or share to the team's WhatsApp group, and for managers, a text to everyone who makes
 * calls, checked first like every SMS.
 */
export function InviteTeamDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast()
  const preview = useSmsPreview()
  const [copied, setCopied] = useState(false)
  const [sending, setSending] = useState(false)
  const invite = useQuery({
    queryKey: ['call-session-invite'],
    enabled: open,
    queryFn: async () => {
      const res = await getSessionInviteAction()
      if (res.error || !res.data) throw new Error(res.error ?? 'Could not load the link')
      return res.data
    },
    staleTime: 60_000,
  })
  const data = invite.data
  // Until the server answers, the link from this page's own address.
  const link = data?.link ?? (typeof window !== 'undefined' ? `${window.location.origin}/admin/camp-meeting/calls/session` : '')
  const shareText = `Join the camp calls on your phone (sign in first): ${link}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy', description: link })
    }
  }

  async function share() {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: 'Camp calls', text: shareText, url: link })
        return
      } catch {
        // Closed the share sheet, or it isn't allowed here: WhatsApp below.
      }
    }
    window.open(whatsAppShareHref(shareText), '_blank', 'noopener,noreferrer')
  }

  async function textTeam() {
    if (!data?.invitees.length) return
    const ok = await preview({
      title: 'Invite the team',
      audience: 'Everyone who makes calls and has a phone number',
      recipients: data.invitees.map((i) => ({ name: i.name, phone: i.phone, message: i.message })),
      warnings: data.optedOut ? [`${data.optedOut} replied STOP before, so they are left out.`] : undefined,
      sendLabel: `Text ${data.invitees.length}`,
    })
    if (!ok) return
    setSending(true)
    const res = await textTeamSessionLinkAction({ userIds: data.invitees.map((i) => i.id) })
    setSending(false)
    if (res.error || !res.data) {
      toast({ variant: 'destructive', title: 'Not sent', description: res.error ?? 'Try again.' })
      return
    }
    toast({
      title: `Sent to ${res.data.sent}`,
      description: res.data.failed.length ? `Not sent to ${res.data.failed.map((f) => f.name).join(', ')}.` : 'They can tap the link to join.',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite the team</DialogTitle>
          <DialogDescription>Scan, tap the link, or get a text. Everyone signs in first, then lands in the session.</DialogDescription>
        </DialogHeader>
        <div className="mx-auto rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200 dark:ring-white/10">
          {link ? <QRCode value={link} size={196} aria-label="QR code to join the session" /> : null}
        </div>
        <p className="break-all rounded-lg bg-neutral-100 px-3 py-2 text-center font-mono text-[13px] text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">{link}</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-11" onClick={() => void copy()}>
            {copied ? <Check className="mr-2 h-4 w-4" aria-hidden /> : <Copy className="mr-2 h-4 w-4" aria-hidden />}
            {copied ? 'Copied' : 'Copy link'}
          </Button>
          <Button variant="outline" className="h-11" onClick={() => void share()}>
            <Share2 className="mr-2 h-4 w-4" aria-hidden />
            Share
          </Button>
        </div>
        {data?.canText ? (
          <Button className="h-12" onClick={() => void textTeam()} disabled={sending || !data.invitees.length}>
            <MessageSquareText className="mr-2 h-4 w-4" aria-hidden />
            {sending ? 'Sending…' : data.invitees.length ? `Text the team (${data.invitees.length})` : 'No one else can make calls yet'}
          </Button>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
