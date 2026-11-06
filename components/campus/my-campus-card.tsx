'use client'

import { useEffect, useState } from 'react'
import { GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CampusBadge } from '@/components/campus/campus-badge'
import { useToast } from '@/hooks/use-toast'
import { getMyCampusAction, setMyCampusAction, type MyCampusView } from '@/lib/actions/my-campus'

/**
 * "My campus" card for /me. Shows the signed-in member's campus or lets them pick one.
 * Uses self-scoped actions that only ever move the session user.
 */
export function MyCampusCard({ className }: { className?: string }) {
  const { toast } = useToast()
  const [view, setView] = useState<MyCampusView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [choice, setChoice] = useState('')
  const [confirmFrom, setConfirmFrom] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    const res = await getMyCampusAction()
    if (res.error || !res.data) setError(res.error ?? 'Could not load your campus')
    else {
      setView(res.data)
      setError(null)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function save(confirmMove: boolean) {
    if (!choice) return
    setBusy(true)
    const res = await setMyCampusAction(choice, confirmMove)
    setBusy(false)
    if (res.error || !res.data) {
      toast({ title: 'Campus not changed', description: res.error ?? undefined, variant: 'destructive' })
      return
    }
    if (res.data.status === 'needs_move') {
      setConfirmFrom(res.data.from ?? 'your current campus')
      return
    }
    setConfirmFrom(null)
    setEditing(false)
    toast({ title: 'Campus saved' })
    await load()
  }

  // Nothing to choose from: hide the card.
  if (view && view.options.length === 0 && !view.current) return null

  const chosenLabel = view?.options.find((o) => o.id === choice)?.label

  return (
    <section className={['dashboard-panel p-5', className].filter(Boolean).join(' ')} aria-labelledby="my-campus-title">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-500 dark:text-neutral-400">
            <GraduationCap className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id="my-campus-title" className="app-section-title">My campus</h2>
            {error ? (
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            ) : !view ? (
              <LoadingSpinner size="sm" />
            ) : view.current ? (
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                <CampusBadge label={view.current.label} name={view.current.name} />
                <span className="truncate">{view.current.name}</span>
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">Are you a student? Choose your campus fellowship.</p>
            )}
          </div>
        </div>
        {view && !editing ? (
          <Button
            variant="outline"
            size="sm"
            className="h-11 shrink-0 sm:h-9"
            onClick={() => {
              setEditing(true)
              setChoice(view.current?.group_id ?? '')
            }}
          >
            {view.current ? 'Change' : 'Choose'}
          </Button>
        ) : null}
      </div>

      {view && editing ? (
        <div className="mt-4 space-y-3">
          {confirmFrom ? (
            <>
              <p className="text-sm text-neutral-800 dark:text-neutral-200">
                Move from <strong>{confirmFrom}</strong> to <strong>{chosenLabel}</strong>? You can belong to one campus.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={() => save(true)} disabled={busy} className="h-11 sm:h-10">
                  {busy ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                  Move to {chosenLabel}
                </Button>
                <Button variant="outline" onClick={() => { setConfirmFrom(null); setEditing(false) }} className="h-11 sm:h-10">
                  Keep {confirmFrom}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={choice} onValueChange={setChoice}>
                <SelectTrigger className="h-11 sm:h-10 sm:flex-1" aria-label="Campus">
                  <SelectValue placeholder="Choose your campus" />
                </SelectTrigger>
                <SelectContent>
                  {view.options.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.label === o.name ? o.name : `${o.label} · ${o.name}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => save(false)} disabled={busy || !choice || choice === view.current?.group_id} className="h-11 sm:h-10">
                {busy ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                Save
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)} className="h-11 sm:h-10">Cancel</Button>
            </div>
          )}
        </div>
      ) : null}
    </section>
  )
}
