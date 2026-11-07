'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Check, Download, QrCode, Search, UserPlus, X } from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { useAuth } from '@/components/providers'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ErrorDisplay } from '@/components/ui/error-display'
import { LoadingSpinner } from '@/components/ui/loading'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { OutreachQrSheet } from '@/components/outreach/qr-sheet'
import { OutreachForm, outreachFormFrom } from '@/components/outreach/outreach-form'
import { ContactSheet, placeLine } from '@/components/outreach/contact-sheet'
import { AssignDialog } from '@/components/outreach/assign-dialog'
import {
  outreachKeys,
  useOutreachAssignees,
  useOutreachCampuses,
  useOutreachMutations,
  useOutreachPage,
} from '@/components/outreach/use-outreach'
import { exportOutreachCsvAction, saveOutreachContactAction, type OutreachPageData } from '@/lib/actions/outreach'
import { filterContacts, isSunday, shortDay, sortContacts, summarizeDay, type OutreachTab } from '@/lib/outreach/logic'
import { OUTREACH_STATUS_LABELS, OUTREACH_STATUS_TONES } from '@/lib/outreach/options'
import type { OutreachContact } from '@/lib/outreach/types'

/**
 * Campus outreach for any signed-in GEM member: show your QR, add the people you meet, follow
 * up the ones given to you. Leaders also see everyone and assign. Phone first: everything is a
 * big tap, nothing scrolls sideways, names wrap.
 */
export default function OutreachPage() {
  return (
    <DashboardLayout>
      <Suspense
        fallback={
          <div className="flex min-h-[300px] items-center justify-center">
            <LoadingSpinner />
          </div>
        }
      >
        <OutreachScreen />
      </Suspense>
    </DashboardLayout>
  )
}

function OutreachScreen() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const campuses = useOutreachCampuses(Boolean(user))
  const wanted = params.get('campus')
  const list = campuses.data?.campuses ?? []
  const campus = list.find((c) => c.key === wanted || c.id === wanted) ?? list[0] ?? null
  const page = useOutreachPage(campus?.id ?? null)

  function pickCampus(key: string) {
    const next = new URLSearchParams(params.toString())
    next.set('campus', key)
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }

  if (authLoading || campuses.isLoading || (campus && page.isLoading)) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }
  if (campuses.error) {
    return <ErrorDisplay error={campuses.error.message} onRetry={() => void campuses.refetch()} variant="page" title="Could not load outreach" />
  }
  if (!campus) {
    return (
      <div className="dashboard-panel mx-auto grid max-w-md grid-cols-1 gap-3 p-6 text-center">
        <h1 className="app-section-title">You are not on a campus yet</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Outreach is for members of a campus fellowship. Choose your campus on My GEM, or ask your campus leader to add you.
        </p>
        <Button asChild className="h-12">
          <Link href="/me">Go to My GEM</Link>
        </Button>
      </div>
    )
  }
  if (page.error || !page.data) {
    return (
      <ErrorDisplay
        error={page.error instanceof Error ? page.error.message : 'Could not load outreach'}
        onRetry={() => void page.refetch()}
        variant="page"
        title="Could not load outreach"
      />
    )
  }

  return (
    <OutreachView
      key={page.data.campus.id}
      data={page.data}
      campuses={list}
      onPickCampus={pickCampus}
    />
  )
}

type Chips = { sunday: boolean; fresh: boolean; unassigned: boolean; bibleStudy: boolean }

function OutreachView({
  data,
  campuses,
  onPickCampus,
}: {
  data: OutreachPageData
  campuses: Array<{ id: string; key: string; label: string; name: string }>
  onPickCampus: (key: string) => void
}) {
  const { campus, access, me, todayIso, sunday } = data
  const canManage = access === 'manage'
  const seesAll = access === 'manage' || access === 'view'
  const qc = useQueryClient()
  const { toast } = useToast()
  const m = useOutreachMutations(campus.id, me)
  const assignees = useOutreachAssignees(campus.id, canManage)

  const [tab, setTab] = useState<OutreachTab>('mine')
  const [chips, setChips] = useState<Chips>({ sunday: false, fresh: false, unassigned: false, bibleStudy: false })
  const [search, setSearch] = useState('')
  const [qrOpen, setQrOpen] = useState(false)
  const [form, setForm] = useState<null | { mode: 'add' } | { mode: 'edit'; contact: OutreachContact }>(null)
  const [formRound, setFormRound] = useState(0)
  const [openId, setOpenId] = useState<string | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [picker, setPicker] = useState<null | 'one' | 'many'>(null)
  const [exporting, setExporting] = useState(false)

  const counts = useMemo(() => {
    const ctx = { userId: me.id, access, todayIso }
    return {
      mine: filterContacts(data.contacts, { tab: 'mine' }, ctx).length,
      met: filterContacts(data.contacts, { tab: 'met' }, ctx).length,
      all: data.contacts.length,
    }
  }, [data.contacts, me.id, access, todayIso])

  // Start where the work is: your follow-ups, else the people you met, else everyone.
  useEffect(() => {
    if (counts.mine === 0) setTab(counts.met > 0 || !seesAll ? 'met' : 'all')
    // Only on first load for this campus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rows = useMemo(() => {
    const filtered = filterContacts(
      data.contacts,
      {
        tab,
        metOn: chips.sunday ? 'sunday' : undefined,
        status: chips.fresh ? 'new' : undefined,
        unassigned: chips.unassigned,
        bibleStudy: chips.bibleStudy,
        search,
      },
      { userId: me.id, access, todayIso }
    )
    return sortContacts(filtered, tab)
  }, [data.contacts, tab, chips, search, me.id, access, todayIso])

  const day = useMemo(() => summarizeDay(data.contacts, sunday), [data.contacts, sunday])
  const placeholder = openId ? data.contacts.find((c) => c.id === openId) : undefined
  const sundayLabel = isSunday(todayIso) ? 'Today' : 'Last Sunday'

  function toggleSelect(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  }

  async function exportCsv() {
    setExporting(true)
    const res = await exportOutreachCsvAction(campus.id, {
      metOn: chips.sunday ? 'sunday' : undefined,
      status: chips.fresh ? 'new' : undefined,
      unassigned: chips.unassigned,
      bibleStudy: chips.bibleStudy,
      search,
    })
    setExporting(false)
    if (res.error || !res.data) {
      toast({ title: 'Could not export', description: res.error ?? undefined, variant: 'destructive' })
      return
    }
    const blob = new Blob([res.data.csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = res.data.filename
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: `Exported ${res.data.rows} ${res.data.rows === 1 ? 'person' : 'people'}` })
  }

  const tabs: Array<{ id: OutreachTab; label: string; count: number }> = [
    { id: 'mine', label: 'My follow-ups', count: counts.mine },
    { id: 'met', label: 'People I met', count: counts.met },
    ...(seesAll ? [{ id: 'all' as const, label: 'Everyone', count: counts.all }] : []),
  ]

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-3xl grid-cols-1 gap-5">
      <header className="grid min-w-0 grid-cols-1 gap-3">
        <div className="min-w-0">
          <p className="app-overline mb-1">Campus GEM</p>
          <h1 className="app-page-title break-words">Outreach on {campus.label}</h1>
          <p className="app-page-description mt-1 break-words">
            {sundayLabel} ({shortDay(sunday)}): {day.met} met · {day.bibleStudy} want Bible study
            {seesAll ? ` · ${day.unassigned} not assigned` : ''}
          </p>
        </div>
        {campuses.length > 1 ? (
          <Select value={campus.key} onValueChange={onPickCampus}>
            <SelectTrigger className="h-12 text-base sm:w-72" aria-label="Campus">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {campuses.map((c) => (
                <SelectItem key={c.id} value={c.key}>
                  {c.label === c.name ? c.name : `${c.label} · ${c.name}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </header>

      <div className="grid min-w-0 grid-cols-2 gap-3" data-tour="outreach-actions">
        <Button type="button" onClick={() => setQrOpen(true)} className="h-16 whitespace-normal text-base leading-tight" data-tour="outreach-qr">
          <QrCode className="mr-2 h-6 w-6 shrink-0" aria-hidden />
          Show QR code
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setFormRound((r) => r + 1)
            setForm({ mode: 'add' })
          }}
          className="h-16 whitespace-normal text-base leading-tight"
          data-tour="outreach-add"
        >
          <UserPlus className="mr-2 h-6 w-6 shrink-0" aria-hidden />
          Add a person
        </Button>
      </div>

      <section className="grid min-w-0 grid-cols-1 gap-3" data-tour="outreach-list">
        <div
          role="tablist"
          aria-label="Lists"
          className={cn('grid gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-white/[0.06]', tabs.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => {
                setTab(t.id)
                setSelected([])
              }}
              className={cn(
                'flex min-h-14 min-w-0 flex-col items-center justify-center rounded-lg px-1 py-1.5 text-center text-[13px] font-semibold leading-tight transition-colors sm:text-sm',
                tab === t.id
                  ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-white'
                  : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
              )}
            >
              <span>{t.label}</span>
              <span className="tabular-nums text-neutral-500 dark:text-neutral-400">{t.count}</span>
            </button>
          ))}
        </div>

        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" aria-hidden />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, phone, hall, programme, ID"
            aria-label="Search"
            className="h-12 pl-9 text-base sm:h-12 sm:text-base"
          />
        </div>

        <div className="flex min-w-0 flex-wrap gap-2" role="group" aria-label="Filters">
          <FilterChip on={chips.sunday} onClick={() => setChips((c) => ({ ...c, sunday: !c.sunday }))}>
            {isSunday(todayIso) ? 'This Sunday' : 'Last Sunday'}
          </FilterChip>
          <FilterChip on={chips.fresh} onClick={() => setChips((c) => ({ ...c, fresh: !c.fresh }))}>
            New
          </FilterChip>
          {canManage ? (
            <FilterChip on={chips.unassigned} onClick={() => setChips((c) => ({ ...c, unassigned: !c.unassigned }))}>
              Unassigned
            </FilterChip>
          ) : null}
          <FilterChip on={chips.bibleStudy} onClick={() => setChips((c) => ({ ...c, bibleStudy: !c.bibleStudy }))}>
            Bible study: yes
          </FilterChip>
        </div>

        {canManage ? (
          <div className="flex min-w-0 flex-wrap gap-2">
            <Button
              type="button"
              variant={selecting ? 'secondary' : 'outline'}
              className="h-11"
              onClick={() => {
                setSelecting((s) => !s)
                setSelected([])
              }}
            >
              {selecting ? 'Done selecting' : 'Select'}
            </Button>
            <Button type="button" variant="outline" className="h-11" onClick={() => setPicker('many')}>
              Share out evenly
            </Button>
            <Button type="button" variant="ghost" className="h-11" onClick={exportCsv} disabled={exporting}>
              {exporting ? <LoadingSpinner size="sm" className="mr-2" /> : <Download className="mr-2 h-4 w-4" aria-hidden />}
              CSV
            </Button>
          </div>
        ) : null}

        {rows.length === 0 ? (
          <EmptyList tab={tab} filtered={Boolean(search || chips.sunday || chips.fresh || chips.unassigned || chips.bibleStudy)} />
        ) : (
          <ul className="dashboard-panel grid min-w-0 grid-cols-1 divide-y divide-neutral-100 overflow-hidden p-0 dark:divide-white/[0.06]">
            {rows.map((c) => (
              <ContactRow
                key={c.id}
                c={c}
                me={me.id}
                selecting={selecting}
                selected={selected.includes(c.id)}
                onToggle={() => toggleSelect(c.id)}
                onOpen={() => setOpenId(c.id)}
              />
            ))}
          </ul>
        )}
      </section>

      {selecting && selected.length > 0 ? (
        <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 rounded-xl border border-neutral-200 bg-white p-2 shadow-pop dark:border-white/10 dark:bg-neutral-900 lg:bottom-4">
          <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2">
            <button
              type="button"
              onClick={() => setSelected([])}
              className="flex h-12 min-w-12 items-center justify-center gap-1 rounded-lg px-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200"
              aria-label="Clear selection"
            >
              <X className="h-4 w-4" aria-hidden />
              {selected.length}
            </button>
            <Button type="button" className="h-12 whitespace-normal px-2 leading-tight" onClick={() => setPicker('one')}>
              Assign to…
            </Button>
            <Button type="button" variant="outline" className="h-12 whitespace-normal px-2 leading-tight" onClick={() => setPicker('many')}>
              Share out evenly
            </Button>
          </div>
        </div>
      ) : null}

      <OutreachQrSheet open={qrOpen} onOpenChange={setQrOpen} url={data.qrUrl} campusName={campus.name} campusLabel={campus.label} />

      <ContactSheet
        campus={campus}
        contactId={openId}
        placeholder={placeholder}
        onClose={() => setOpenId(null)}
        me={me}
        canManage={canManage}
        todayIso={todayIso}
        assignees={assignees.data}
        onEdit={(contact) => {
          setOpenId(null)
          setFormRound((r) => r + 1)
          setForm({ mode: 'edit', contact })
        }}
      />

      <Dialog open={form !== null} onOpenChange={(o) => (!o ? setForm(null) : undefined)}>
        <DialogContent className="grid-cols-1 sm:max-w-lg">
          <DialogHeader className="min-w-0 text-left">
            <DialogTitle>{form?.mode === 'edit' ? 'Edit details' : 'Add a person'}</DialogTitle>
            <DialogDescription>
              {form?.mode === 'edit' ? 'Change what they told you.' : `Someone you met on ${campus.label}. Only name and number are needed.`}
            </DialogDescription>
          </DialogHeader>
          {form ? (
            <OutreachForm
              formKey={formRound}
              mode="member"
              campusShortCode={campus.short_code}
              initial={form.mode === 'edit' ? outreachFormFrom(form.contact) : undefined}
              submitLabel={form.mode === 'edit' ? 'Save changes' : 'Save'}
              againLabel={form.mode === 'add' ? 'Save and add another' : undefined}
              onSubmit={async (payload, again) => {
                const res = await saveOutreachContactAction(campus.id, payload, form.mode === 'edit' ? form.contact.id : undefined)
                if (res.error || !res.data) {
                  toast({ title: 'Not saved', description: res.error ?? undefined, variant: 'destructive' })
                  return {}
                }
                if (!res.data.ok) return res.data.errors
                const first = payload.full_name.trim().split(/\s+/)[0]
                toast({
                  title:
                    form.mode === 'edit'
                      ? 'Changes saved'
                      : res.data.merged
                        ? `${first} was already on the list`
                        : `Saved ${first}`,
                  description: res.data.merged ? 'We added today’s meeting to their record.' : undefined,
                })
                void qc.invalidateQueries({ queryKey: outreachKeys.page(campus.id) })
                if (form.mode === 'edit') void qc.invalidateQueries({ queryKey: outreachKeys.contact(campus.id, form.contact.id) })
                if (again) setFormRound((r) => r + 1)
                else setForm(null)
                if (!again && form.mode === 'add') setTab('met')
                return true
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AssignDialog
        open={picker !== null}
        onOpenChange={(o) => (!o ? setPicker(null) : undefined)}
        mode={picker ?? 'one'}
        people={assignees.data}
        loading={assignees.isLoading}
        count={picker === 'many' && selected.length === 0 ? 'unassigned' : selected.length}
        busy={m.assign.isPending || m.shareOut.isPending}
        onPick={(people) => {
          if (picker === 'one') {
            m.assign.mutate({ contactIds: selected, person: people[0] ?? null }, { onSuccess: () => setSelected([]) })
          } else {
            m.shareOut.mutate(
              { contactIds: selected.length ? selected : 'unassigned', userIds: people.map((p) => p.user_id) },
              { onSuccess: () => setSelected([]) }
            )
          }
          setPicker(null)
        }}
      />
    </div>
  )
}

function FilterChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors',
        on
          ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-500 dark:bg-brand-500'
          : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-200 dark:hover:border-white/20'
      )}
    >
      {on ? <Check className="h-4 w-4" aria-hidden /> : null}
      {children}
    </button>
  )
}

function ContactRow({
  c,
  me,
  selecting,
  selected,
  onToggle,
  onOpen,
}: {
  c: OutreachContact
  me: string
  selecting: boolean
  selected: boolean
  onToggle: () => void
  onOpen: () => void
}) {
  const line = placeLine(c)
  const metBy = c.met_by_user_id === me ? 'you' : c.met_by_name ?? (c.source === 'qr' ? 'QR form' : 'someone')
  const body = (
    <span className="grid min-w-0 grid-cols-1 gap-1">
      <span className="break-words text-base font-semibold leading-snug text-neutral-900 dark:text-neutral-100">{c.full_name}</span>
      {line ? <span className="break-words text-sm text-neutral-600 dark:text-neutral-400">{line}</span> : null}
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-neutral-500 dark:text-neutral-400">
        <Badge variant={OUTREACH_STATUS_TONES[c.status]}>{OUTREACH_STATUS_LABELS[c.status]}</Badge>
        <span className="break-words">
          met by {metBy} on {shortDay(c.met_on)}
        </span>
        {c.assigned_to ? (
          <span className="break-words">· {c.assigned_to === me ? 'yours' : c.assigned_name ?? 'assigned'}</span>
        ) : (
          <span className="text-amber-700 dark:text-amber-300">· not assigned</span>
        )}
      </span>
    </span>
  )
  if (selecting) {
    return (
      <li className="min-w-0">
        <label className={cn('grid min-h-16 cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-start gap-3 px-4 py-3', selected && 'bg-brand-50 dark:bg-brand-500/10')}>
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="mt-1 h-6 w-6 shrink-0 rounded accent-brand-600"
            aria-label={`Select ${c.full_name}`}
          />
          {body}
        </label>
      </li>
    )
  }
  return (
    <li className="min-w-0">
      <button type="button" onClick={onOpen} className="block min-h-16 w-full px-4 py-3 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-white/[0.03]">
        {body}
      </button>
    </li>
  )
}

function EmptyList({ tab, filtered }: { tab: OutreachTab; filtered: boolean }) {
  const text = filtered
    ? 'Nobody matches. Clear the search or a filter.'
    : tab === 'mine'
      ? 'Nobody has been given to you to follow up yet.'
      : tab === 'met'
        ? 'Nobody yet. Show your QR code to a student, or add someone you met.'
        : 'Nobody on the list yet.'
  return <p className="dashboard-panel p-5 text-sm text-neutral-600 dark:text-neutral-400">{text}</p>
}
