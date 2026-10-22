'use client'

import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PERMISSION_LABELS, type Permission } from '@/lib/auth/roles'

/** Consistent "no access" state that tells the user exactly what to ask for. */
export function AccessDenied({ permission }: { permission?: Permission }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
        <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-amber-500" aria-hidden />
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">You don&apos;t have access yet</h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          {permission
            ? <>This page needs the <strong>{PERMISSION_LABELS[permission]}</strong> permission. Ask an administrator to grant it under Access &amp; roles.</>
            : 'Ask an administrator to grant you access under Access & roles.'}
        </p>
        <Button asChild className="mt-5">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
