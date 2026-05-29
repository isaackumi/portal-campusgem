'use client'

import { Eye } from 'lucide-react'

export function PublicFormPreviewBanner() {
  return (
    <div className="sticky top-0 z-50 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-950">
      <span className="inline-flex items-center justify-center gap-2 font-medium">
        <Eye className="h-4 w-4 shrink-0" />
        Preview mode — responses are not saved
      </span>
    </div>
  )
}
