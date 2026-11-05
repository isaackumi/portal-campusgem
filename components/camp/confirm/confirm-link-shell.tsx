import type { ReactNode } from 'react'
import { BrandMark } from '@/components/brand-mark'

/** Branded, chrome-free frame for the public tap-to-confirm page. */
export function ConfirmLinkShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:justify-center sm:py-10">
      <header className="mb-5 flex items-center gap-3">
        <BrandMark size="md" />
        <div className="min-w-0">
          <p className="app-overline leading-4">Campus Gem</p>
          <p className="text-[15px] font-semibold leading-5 tracking-tight text-slate-900 dark:text-white">Ministries</p>
        </div>
      </header>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        {children}
      </section>
    </main>
  )
}
