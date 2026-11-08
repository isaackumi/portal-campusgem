'use client'

import { QrSheet } from '@/components/ui/qr-sheet'

/** Full-screen QR to hold out to a student: their camera opens the outreach form, credited to whoever is showing it. */
export function OutreachQrSheet({
  open,
  onOpenChange,
  url,
  campusName,
  campusLabel,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string | null
  campusName: string
  campusLabel: string
}) {
  return (
    <QrSheet
      open={open}
      onOpenChange={onOpenChange}
      url={url}
      title={campusName}
      overline={`Campus GEM · ${campusLabel}`}
      hint="Scan with your phone camera to leave your details"
      fileName={`campus-gem-${campusLabel}-outreach`}
      shareText={`Leave your details with Campus GEM (${campusLabel}):`}
    />
  )
}
