'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, ChevronDown, Loader2, X, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Long-running client work (bulk SMS, etc.) that keeps going while the user moves
 * around the app. Items are sent to the server in small chunks, so no single request
 * runs long enough to time out, progress is real, and the job can be cancelled.
 * Jobs live in the root provider: they survive in-app navigation, not a tab close.
 * The floating panel is the only feedback (no toasts), so the two never overlap.
 */

export type ChunkResult = { ok: number; failed: number; errors?: string[] }

export type JobSummary = {
  ok: number
  failed: number
  errors: string[]
  status: 'done' | 'cancelled' | 'error'
}

type JobStatus = 'running' | JobSummary['status']

type Job = {
  id: string
  title: string
  total: number
  processed: number
  ok: number
  failed: number
  errors: string[]
  status: JobStatus
  message?: string
  /** Verb for the counter, e.g. "sent". */
  verb: string
}

type StartOptions<T> = {
  title: string
  items: T[]
  chunkSize?: number
  verb?: string
  runChunk: (chunk: T[], chunkIndex: number) => Promise<ChunkResult>
  /** Runs once when the job ends (done, cancelled or failed). */
  onComplete?: (summary: JobSummary) => void
}

type BackgroundJobsContextValue = {
  start: <T>(options: StartOptions<T>) => string
  isRunning: boolean
}

const BackgroundJobsContext = createContext<BackgroundJobsContextValue | null>(null)

export function useBackgroundJobs(): BackgroundJobsContextValue {
  const value = useContext(BackgroundJobsContext)
  if (!value) throw new Error('useBackgroundJobs must be used inside BackgroundJobsProvider')
  return value
}

export function BackgroundJobsProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([])
  const cancelled = useRef(new Set<string>())
  const isRunning = jobs.some((job) => job.status === 'running')

  // Closing or reloading the tab would stop the job; ask first.
  useEffect(() => {
    if (!isRunning) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isRunning])

  const patch = useCallback((id: string, update: (job: Job) => Partial<Job>) => {
    setJobs((prev) => prev.map((job) => (job.id === id ? { ...job, ...update(job) } : job)))
  }, [])

  const start = useCallback(
    <T,>({ title, items, chunkSize = 10, verb = 'sent', runChunk, onComplete }: StartOptions<T>) => {
      const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setJobs((prev) => [
        ...prev,
        { id, title, total: items.length, processed: 0, ok: 0, failed: 0, errors: [], status: 'running', verb },
      ])

      void (async () => {
        let ok = 0
        let failed = 0
        const errors: string[] = []
        let status: JobSummary['status'] = 'done'
        let message: string | undefined

        for (let offset = 0, index = 0; offset < items.length; offset += chunkSize, index++) {
          if (cancelled.current.has(id)) {
            status = 'cancelled'
            break
          }
          const chunk = items.slice(offset, offset + chunkSize)
          try {
            const result = await runChunk(chunk, index)
            ok += result.ok
            failed += result.failed
            if (result.errors?.length) errors.push(...result.errors)
          } catch (error) {
            // A thrown chunk is a setup problem (permissions, provider config), not one
            // bad number, so later chunks would fail the same way: stop here.
            status = 'error'
            message = error instanceof Error ? error.message : 'Something went wrong'
            failed += items.length - offset
            break
          }
          const processed = Math.min(offset + chunk.length, items.length)
          patch(id, () => ({ processed, ok, failed, errors: [...errors] }))
        }

        cancelled.current.delete(id)
        patch(id, (job) => ({ status, message, ok, failed, errors: [...errors], processed: status === 'done' ? job.total : job.processed }))

        onComplete?.({ ok, failed, errors, status })
      })()

      return id
    },
    [patch]
  )

  const cancel = (id: string) => cancelled.current.add(id)
  const dismiss = (id: string) => setJobs((prev) => prev.filter((job) => job.id !== id))

  return (
    <BackgroundJobsContext.Provider value={{ start, isRunning }}>
      {children}
      {jobs.length > 0 ? (
        <div
          className="fixed bottom-4 right-4 z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
          aria-live="polite"
        >
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onCancel={() => cancel(job.id)} onDismiss={() => dismiss(job.id)} />
          ))}
        </div>
      ) : null}
    </BackgroundJobsContext.Provider>
  )
}

function JobCard({ job, onCancel, onDismiss }: { job: Job; onCancel: () => void; onDismiss: () => void }) {
  const [showErrors, setShowErrors] = useState(false)
  const percent = job.total ? Math.round((job.processed / job.total) * 100) : 0
  const running = job.status === 'running'
  const StatusIcon = running ? Loader2 : job.status === 'done' && job.failed === 0 ? CheckCircle2 : XCircle

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start gap-3">
        <StatusIcon
          className={cn(
            'mt-0.5 h-4 w-4 shrink-0',
            running && 'animate-spin text-brand-600',
            job.status === 'done' && job.failed === 0 && 'text-emerald-600',
            !running && !(job.status === 'done' && job.failed === 0) && 'text-amber-600'
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{job.title}</p>
          <p className="mt-0.5 text-[13px] tabular-nums text-neutral-500 dark:text-neutral-400">
            {running
              ? `${job.processed} of ${job.total} · ${job.ok} ${job.verb}${job.failed ? ` · ${job.failed} failed` : ''}`
              : job.message ??
                `${job.ok} ${job.verb}${job.failed ? ` · ${job.failed} failed` : ''}${
                  job.status === 'cancelled' ? ' · cancelled' : ''
                }`}
          </p>
        </div>
        {running ? (
          <Button variant="ghost" size="sm" className="-my-1 -mr-2 h-7 px-2" onClick={onCancel}>
            Cancel
          </Button>
        ) : (
          <button
            type="button"
            onClick={onDismiss}
            className="-my-1 -mr-1 rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={`${job.title} progress`}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-300',
            running ? 'bg-brand-600' : job.failed ? 'bg-amber-500' : 'bg-emerald-500'
          )}
          style={{ width: `${running ? Math.max(percent, 3) : 100}%` }}
        />
      </div>

      {job.errors.length > 0 ? (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowErrors((v) => !v)}
            className="inline-flex items-center gap-1 text-[13px] text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
            aria-expanded={showErrors}
          >
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showErrors && 'rotate-180')} aria-hidden />
            {job.errors.length} problem{job.errors.length === 1 ? '' : 's'}
          </button>
          {showErrors ? (
            <ul className="mt-1.5 max-h-36 space-y-1 overflow-y-auto text-xs text-neutral-600 dark:text-neutral-400">
              {job.errors.slice(0, 50).map((error, index) => (
                <li key={index} className="rounded-md bg-neutral-50 px-2 py-1 dark:bg-neutral-800">
                  {error}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
