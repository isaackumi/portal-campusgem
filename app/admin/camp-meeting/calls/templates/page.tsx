'use client'

/**
 * WhatsApp messages callers pick from: the app's ready set, which camp managers can edit, add to,
 * hide or put back. Each is shown filled in with sample details, as a caller will see it.
 */
import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Eye, EyeOff, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useAuth } from '@/components/providers'
import { AccessDenied } from '@/components/auth/access-denied'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { listCallTemplatesAction, resetCallTemplateAction, saveCallTemplateAction } from '@/lib/actions/call-center'
import {
  DEFAULT_CALL_TEMPLATES,
  fillCallTemplate,
  TEMPLATE_LIMITS,
  TEMPLATE_VARIABLES,
  unknownPlaceholders,
  type CallTemplate,
  type TemplateAudience,
} from '@/lib/calls/templates'

const SAMPLE = Object.fromEntries(TEMPLATE_VARIABLES.map((v) => [v.key, v.example]))
const AUDIENCES: Array<{ id: TemplateAudience; label: string; hint: string }> = [
  { id: 'camp', label: 'Camp meeting', hint: 'Shown when calling camp registrants.' },
  { id: 'members', label: 'Members', hint: 'Shown when calling members: new, lapsed, groups.' },
  { id: 'any', label: 'Everyone', hint: 'Shown in every call list.' },
]

type Draft = { key?: string; name: string; body: string; audience: TemplateAudience; position?: number; archived?: boolean; isDefault?: boolean }

export default function CallTemplatesPage() {
  const { can } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const list = useQuery({
    queryKey: ['call-templates', 'all', 'manage'],
    queryFn: async () => {
      const res = await listCallTemplatesAction({ audience: 'any', includeArchived: true })
      if (res.error || !res.data) throw new Error(res.error ?? 'Could not load the templates')
      return res.data
    },
  })
  const grouped = useMemo(() => {
    const all = list.data ?? []
    return AUDIENCES.map((a) => ({ ...a, items: all.filter((t) => t.audience === a.id) }))
  }, [list.data])

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['call-templates'] })
  }

  async function save(input: Draft) {
    setSaving(true)
    const res = await saveCallTemplateAction({ key: input.key, name: input.name, body: input.body, audience: input.audience, position: input.position, archived: input.archived })
    setSaving(false)
    if (res.error) {
      toast({ variant: 'destructive', title: 'Not saved', description: res.error })
      return false
    }
    refresh()
    return true
  }

  async function reset(t: CallTemplate) {
    const res = await resetCallTemplateAction({ key: t.key })
    if (res.error) toast({ variant: 'destructive', title: 'Not changed', description: res.error })
    else {
      toast({ title: DEFAULT_CALL_TEMPLATES.some((d) => d.key === t.key) ? 'Put back as it was' : 'Deleted' })
      refresh()
    }
  }

  function insert(key: string) {
    if (!draft) return
    const el = bodyRef.current
    const token = `{{${key}}}`
    if (!el) return setDraft({ ...draft, body: draft.body + token })
    const start = el.selectionStart ?? draft.body.length
    const end = el.selectionEnd ?? start
    const body = draft.body.slice(0, start) + token + draft.body.slice(end)
    setDraft({ ...draft, body })
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + token.length, start + token.length)
    })
  }

  if (!can('camp.manage')) return <AccessDenied permission="camp.manage" />

  const unknown = draft ? unknownPlaceholders(draft.body) : []

  return (
    <div className="mx-auto max-w-4xl pb-28">
      <Link href="/admin/camp-meeting/calls" className="inline-flex h-10 items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Calls
      </Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="app-page-title">WhatsApp messages</h1>
          <p className="app-page-description mt-1 max-w-xl">What callers pick from when they tap WhatsApp. They can still change the words before sending.</p>
        </div>
        <Button className="h-11" onClick={() => setDraft({ name: '', body: 'Hi {{firstName}}, this is {{callerName}} from {{ministry}}. ', audience: 'camp' })}>
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          New message
        </Button>
      </div>

      {list.isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center"><LoadingSpinner /></div>
      ) : list.error ? (
        <p className="mt-8 text-sm text-red-700 dark:text-red-300">{list.error instanceof Error ? list.error.message : 'Could not load the templates.'}</p>
      ) : (
        grouped.map((group) => (
          <section key={group.id} className="mt-8" aria-label={group.label}>
            <h2 className="app-section-title">{group.label}</h2>
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400">{group.hint}</p>
            <ul className="mt-3 grid gap-3 md:grid-cols-2">
              {group.items.map((t) => (
                <li key={t.key} className={cn('dashboard-panel flex flex-col gap-2 p-4', t.archived && 'opacity-60')}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-neutral-900 dark:text-neutral-50">
                      {t.name}
                      {t.archived ? <span className="ml-2 text-xs font-medium text-neutral-500">Hidden</span> : null}
                      {!t.isDefault && DEFAULT_CALL_TEMPLATES.some((d) => d.key === t.key) ? <span className="ml-2 text-xs font-medium text-brand-700 dark:text-brand-400">Edited</span> : null}
                    </p>
                  </div>
                  <p className="whitespace-pre-line text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-300">{fillCallTemplate(t.body, SAMPLE)}</p>
                  <div className="mt-auto flex flex-wrap gap-1 pt-2">
                    <Button size="sm" variant="ghost" className="h-9" onClick={() => setDraft({ ...t })}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="h-9" onClick={() => void save({ ...t, archived: !t.archived })}>
                      {t.archived ? <Eye className="mr-1.5 h-3.5 w-3.5" aria-hidden /> : <EyeOff className="mr-1.5 h-3.5 w-3.5" aria-hidden />}
                      {t.archived ? 'Show' : 'Hide'}
                    </Button>
                    {!t.isDefault ? (
                      <Button size="sm" variant="ghost" className="h-9" onClick={() => void reset(t)}>
                        {DEFAULT_CALL_TEMPLATES.some((d) => d.key === t.key) ? <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />}
                        {DEFAULT_CALL_TEMPLATES.some((d) => d.key === t.key) ? 'Put back' : 'Delete'}
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <Dialog open={!!draft} onOpenChange={(v) => (!v ? setDraft(null) : null)}>
        <DialogContent className="sm:max-w-2xl">
          {draft ? (
            <form
              className="grid gap-4"
              onSubmit={async (e) => {
                e.preventDefault()
                if (await save(draft)) {
                  setDraft(null)
                  toast({ title: 'Message saved' })
                }
              }}
            >
              <DialogHeader>
                <DialogTitle>{draft.key ? 'Edit message' : 'New message'}</DialogTitle>
                <DialogDescription>Tap a detail to put it where your cursor is. Callers see it filled in for each person.</DialogDescription>
              </DialogHeader>
              <label className="grid gap-1.5 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Name (what callers see in the list)
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  maxLength={TEMPLATE_LIMITS.name}
                  required
                  className="h-11 rounded-lg border border-neutral-200 bg-white px-3 text-[15px] font-normal text-neutral-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </label>
              <div className="grid gap-1.5">
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Shown for</span>
                <div role="radiogroup" aria-label="Shown for" className="flex flex-wrap gap-2">
                  {AUDIENCES.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      role="radio"
                      aria-checked={draft.audience === a.id}
                      onClick={() => setDraft({ ...draft, audience: a.id })}
                      className={cn(
                        'h-9 rounded-full border px-3.5 text-[13px] font-medium',
                        draft.audience === a.id ? 'border-brand-600 bg-brand-600 text-white' : 'border-neutral-200 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300'
                      )}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="grid gap-1.5 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Message
                <textarea
                  ref={bodyRef}
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                  maxLength={TEMPLATE_LIMITS.body}
                  rows={6}
                  required
                  className="rounded-lg border border-neutral-200 bg-white p-3 text-[15px] font-normal leading-relaxed text-neutral-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </label>
              <div className="flex flex-wrap gap-1.5" aria-label="Details you can add">
                {TEMPLATE_VARIABLES.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insert(v.key)}
                    className="h-8 rounded-full border border-neutral-200 bg-neutral-50 px-3 text-[12px] font-medium text-neutral-700 hover:border-brand-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                  >
                    + {v.label}
                  </button>
                ))}
              </div>
              {unknown.length ? (
                <p className="text-[13px] text-amber-800 dark:text-amber-300">The app doesn&apos;t know {unknown.map((k) => `{{${k}}}`).join(', ')}: it will be left out of the message.</p>
              ) : null}
              <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/30">
                <p className="app-overline">Preview</p>
                <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed text-neutral-800 dark:text-neutral-100">{fillCallTemplate(draft.body, SAMPLE) || '…'}</p>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" className="h-11" onClick={() => setDraft(null)}>Cancel</Button>
                <Button type="submit" className="h-11" disabled={saving || !draft.name.trim() || !draft.body.trim()}>{saving ? 'Saving…' : 'Save message'}</Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
