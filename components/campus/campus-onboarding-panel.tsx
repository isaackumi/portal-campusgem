'use client'

import { useMemo, useState } from 'react'
import QRCode from 'react-qr-code'
import { Check, ClipboardList, Copy, Link2, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/ui/loading'
import { PersonAvatar } from '@/components/ui/person'
import { PhoneLink } from '@/components/contact/phone-link'
import { useToast } from '@/hooks/use-toast'
import {
  addCampusMembersAction,
  campusSuggestionsAction,
  importCampusRosterAction,
  previewCampusRosterAction,
  type CampusSuggestion,
} from '@/lib/actions/campuses'
import type { RosterPreviewRow } from '@/lib/campus/roster-import'

/** Onboarding tab: people probably at this campus, the join link, and paste-a-list import. */
export function CampusOnboardingPanel({
  groupId,
  label,
  joinUrl,
  onChanged,
}: {
  groupId: string
  label: string
  joinUrl: string
  onChanged: () => void
}) {
  return (
    <div className="space-y-6">
      <JoinLinkCard label={label} joinUrl={joinUrl} />
      <Suggestions groupId={groupId} label={label} onChanged={onChanged} />
      <RosterImport groupId={groupId} label={label} onChanged={onChanged} />
    </div>
  )
}

function JoinLinkCard({ label, joinUrl }: { label: string; joinUrl: string }) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(joinUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: 'Copy failed', description: joinUrl, variant: 'destructive' })
    }
  }
  return (
    <section className="dashboard-panel p-5" aria-labelledby="join-link-title">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="mx-auto shrink-0 rounded-xl bg-white p-3 ring-1 ring-neutral-200 dark:ring-white/10 sm:mx-0">
          <QRCode value={joinUrl} size={128} aria-label={`QR code for the ${label} join link`} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="join-link-title" className="app-section-title flex items-center gap-2">
            <Link2 className="h-4 w-4 text-neutral-400 dark:text-neutral-500" aria-hidden />
            Join link for {label}
          </h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Students open it, enter their name and phone, and are tagged {label}. People already in the directory
            are matched by phone; their name and role never change.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-neutral-100 px-3 py-2 font-mono text-[13px] text-neutral-800 dark:bg-white/[0.06] dark:text-neutral-200">
              {joinUrl}
            </code>
            <Button variant="outline" onClick={copy} className="h-11 sm:h-10">
              {copied ? <Check className="mr-2 h-4 w-4" aria-hidden /> : <Copy className="mr-2 h-4 w-4" aria-hidden />}
              {copied ? 'Copied' : 'Copy link'}
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

function Suggestions({ groupId, label, onChanged }: { groupId: string; label: string; onChanged: () => void }) {
  const { toast } = useToast()
  const [rows, setRows] = useState<CampusSuggestion[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const res = await campusSuggestionsAction(groupId)
    setLoading(false)
    if (res.error || !res.data) {
      toast({ title: 'Could not look for matches', description: res.error ?? undefined, variant: 'destructive' })
      return
    }
    setRows(res.data)
    setSelected(new Set())
  }

  async function addSelected() {
    setSaving(true)
    const res = await addCampusMembersAction(groupId, Array.from(selected))
    setSaving(false)
    if (res.error || !res.data) {
      toast({ title: 'Not added', description: res.error ?? undefined, variant: 'destructive' })
      return
    }
    const { added, elsewhere } = res.data
    toast({
      title: `${added} added to ${label}`,
      description: elsewhere.length ? `${elsewhere.length} joined another campus meanwhile and were left there.` : undefined,
    })
    onChanged()
    await load()
  }

  const allSelected = rows && rows.length > 0 && selected.size === rows.length

  return (
    <section className="dashboard-panel overflow-hidden" aria-labelledby="suggest-title">
      <div className="flex flex-col gap-3 border-b border-neutral-200/80 p-5 dark:border-white/[0.06] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="suggest-title" className="app-section-title flex items-center gap-2">
            Probably at {label}
          </h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            People with no campus whose school, residence or form answers mention {label}.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading} className="h-11 sm:h-10">
          {loading ? <LoadingSpinner size="sm" className="mr-2" /> : <RefreshCw className="mr-2 h-4 w-4" aria-hidden />}
          {rows ? 'Look again' : 'Find people'}
        </Button>
      </div>
      {rows === null ? null : rows.length === 0 ? (
        <p className="p-5 text-sm text-neutral-600 dark:text-neutral-400">
          No one found. An administrator can add aliases (e.g. the town) to the campus under Groups to match more.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-2 px-5 py-2 text-sm text-neutral-600 dark:text-neutral-400">
            <Checkbox
              id="suggest-all"
              checked={Boolean(allSelected)}
              onCheckedChange={(v) => setSelected(v === true ? new Set(rows.map((r) => r.user_id)) : new Set())}
            />
            <label htmlFor="suggest-all">Select all {rows.length}</label>
          </div>
          <ul className="divide-y divide-neutral-100 border-t border-neutral-200/80 dark:divide-white/[0.06] dark:border-white/[0.06]">
            {rows.map((p) => (
              <li key={p.user_id} className="flex items-start gap-3 px-5 py-3">
                <Checkbox
                  className="mt-1"
                  checked={selected.has(p.user_id)}
                  onCheckedChange={(v) =>
                    setSelected((prev) => {
                      const next = new Set(prev)
                      if (v === true) next.add(p.user_id)
                      else next.delete(p.user_id)
                      return next
                    })
                  }
                  aria-label={`Select ${p.full_name}`}
                />
                <PersonAvatar name={p.full_name} seed={p.user_id} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{p.full_name}</p>
                  <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">{p.reasons.join(' · ')}</p>
                </div>
                {p.phone ? (
                  p.phone.includes('•') ? (
                    <span className="hidden font-mono text-[13px] text-neutral-500 dark:text-neutral-400 sm:inline">{p.phone}</span>
                  ) : (
                    <PhoneLink phone={p.phone} name={p.full_name} className="hidden text-[13px] sm:inline-flex" />
                  )
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}
      {selected.size > 0 ? (
        <div className="fixed inset-x-4 bottom-20 z-30 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border border-neutral-200/80 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-white/10 dark:bg-neutral-900/95 sm:bottom-6">
          <span className="text-sm text-neutral-700 dark:text-neutral-200">{selected.size} selected</span>
          <Button onClick={addSelected} disabled={saving} className="h-11 sm:h-10">
            {saving ? <LoadingSpinner size="sm" className="mr-2" /> : null}
            Add selected to {label}
          </Button>
        </div>
      ) : null}
    </section>
  )
}

const STATUS_TONE: Record<RosterPreviewRow['status'], 'success' | 'brand' | 'warning' | 'danger'> = {
  matched: 'success',
  new: 'brand',
  ambiguous: 'warning',
  invalid: 'danger',
}

const STATUS_LABEL: Record<RosterPreviewRow['status'], string> = {
  matched: 'Found',
  new: 'New',
  ambiguous: 'Check',
  invalid: 'Skipped',
}

function RosterImport({ groupId, label, onChanged }: { groupId: string; label: string; onChanged: () => void }) {
  const { toast } = useToast()
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<RosterPreviewRow[] | null>(null)
  const [previewedText, setPreviewedText] = useState('')
  const [busy, setBusy] = useState(false)
  const [moveOthers, setMoveOthers] = useState(false)

  const counts = useMemo(() => {
    const c = { matched: 0, new: 0, ambiguous: 0, invalid: 0, elsewhere: 0 }
    for (const r of preview ?? []) {
      c[r.status]++
      if (r.status === 'matched' && r.current_campus && r.current_campus !== 'this campus') c.elsewhere++
    }
    return c
  }, [preview])

  async function readFile(file: File) {
    if (file.size > 500_000) {
      toast({ title: 'File too large', description: 'Use a CSV under 500 KB.', variant: 'destructive' })
      return
    }
    setText(await file.text())
    setPreview(null)
  }

  async function runPreview() {
    setBusy(true)
    const res = await previewCampusRosterAction(groupId, text)
    setBusy(false)
    if (res.error || !res.data) {
      toast({ title: 'Could not read the list', description: res.error ?? undefined, variant: 'destructive' })
      return
    }
    setPreview(res.data)
    setPreviewedText(text)
  }

  async function runImport() {
    setBusy(true)
    const res = await importCampusRosterAction(groupId, previewedText, moveOthers)
    setBusy(false)
    if (res.error || !res.data) {
      toast({ title: 'Import failed', description: res.error ?? undefined, variant: 'destructive' })
      return
    }
    const d = res.data
    toast({
      title: `${d.added + d.created} now on ${label}`,
      description: [
        d.created ? `${d.created} new to the directory` : '',
        d.unchanged ? `${d.unchanged} already on ${label}` : '',
        d.elsewhere ? `${d.elsewhere} left on their other campus` : '',
        d.skipped ? `${d.skipped} skipped` : '',
      ]
        .filter(Boolean)
        .join(' · ') || undefined,
    })
    setPreview(null)
    setText('')
    onChanged()
  }

  return (
    <section className="dashboard-panel p-5" aria-labelledby="roster-title">
      <h2 id="roster-title" className="app-section-title flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-neutral-400 dark:text-neutral-500" aria-hidden />
        Paste or import a list
      </h2>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        One person per line: a phone number, a name, or “name, phone”. People are matched by phone first. You’ll
        see who was found before anything changes.
      </p>
      <div className="mt-3 space-y-2">
        <Label htmlFor="roster-text" className="sr-only">List of people</Label>
        <textarea
          id="roster-text"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setPreview(null)
          }}
          rows={6}
          placeholder={'Ama Mensah, 0241234567\n0209876543\nKofi Boateng'}
          className="w-full resize-y rounded-xl border border-neutral-200 bg-white p-3 font-mono text-[13px] text-neutral-900 placeholder:text-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500"
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-md border border-neutral-200 px-4 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-white/15 dark:text-neutral-200 dark:hover:bg-white/[0.06] sm:h-10">
            Choose CSV file
            <input type="file" accept=".csv,.txt,text/csv,text/plain" className="sr-only" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
          </label>
          <Button onClick={runPreview} disabled={busy || !text.trim()} className="h-11 sm:h-10">
            {busy && !preview ? <LoadingSpinner size="sm" className="mr-2" /> : null}
            Preview
          </Button>
        </div>
      </div>

      {preview ? (
        <div className="mt-5 space-y-3">
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="success">{counts.matched} found</Badge>
            <Badge variant="brand">{counts.new} new</Badge>
            <Badge variant="warning">{counts.ambiguous} to check</Badge>
            <Badge variant="danger">{counts.invalid} skipped</Badge>
          </div>
          <div className="max-h-80 overflow-y-auto rounded-xl border border-neutral-200/80 dark:border-white/10">
            <table className="w-full text-left text-[13px]">
              <thead className="sticky top-0 bg-neutral-50 dark:bg-neutral-800">
                <tr className="text-neutral-500 dark:text-neutral-400">
                  <th scope="col" className="px-3 py-2 font-medium">Line</th>
                  <th scope="col" className="px-3 py-2 font-medium">From the list</th>
                  <th scope="col" className="px-3 py-2 font-medium">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
                {preview.map((r) => (
                  <tr key={r.line}>
                    <td className="px-3 py-2 tabular-nums text-neutral-500 dark:text-neutral-400">{r.line}</td>
                    <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200">
                      {r.name ?? '—'} {r.phone || r.bad_phone ? <span className="font-mono text-neutral-500 dark:text-neutral-400">{r.phone ?? r.bad_phone}</span> : null}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                        <span className="text-neutral-600 dark:text-neutral-300">
                          {r.status === 'matched'
                            ? `${r.match_name}${r.current_campus ? ` · on ${r.current_campus}` : ''}`
                            : r.status === 'new'
                              ? 'Will be added to the directory'
                              : r.note}
                          {r.candidates?.length ? `: ${r.candidates.map((c) => c.full_name + (c.campus ? ` (${c.campus})` : '')).join(', ')}` : ''}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {counts.elsewhere > 0 ? (
            <div className="flex items-start gap-2">
              <Checkbox id="roster-move" checked={moveOthers} onCheckedChange={(v) => setMoveOthers(v === true)} className="mt-0.5" />
              <label htmlFor="roster-move" className="text-sm text-neutral-800 dark:text-neutral-200">
                Move the {counts.elsewhere} people on another campus to {label}
                <span className="block text-xs text-neutral-500 dark:text-neutral-400">Otherwise they stay where they are. Campus leaders are never moved.</span>
              </label>
            </div>
          ) : null}
          <Button onClick={runImport} disabled={busy || counts.matched + counts.new === 0} className="h-11 sm:h-10">
            {busy ? <LoadingSpinner size="sm" className="mr-2" /> : null}
            Add {counts.matched + counts.new} to {label}
          </Button>
        </div>
      ) : null}
    </section>
  )
}
