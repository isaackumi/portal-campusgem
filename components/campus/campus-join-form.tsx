'use client'

import { useState, type FormEvent } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/ui/loading'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { submitCampusJoinAction, type CampusJoinResult, type PublicCampus } from '@/lib/actions/campus-join'
import { JOIN_LEVEL_OPTIONS } from '@/lib/campus/join'

/** Public /join/<slug> form. */
export function CampusJoinForm({ campus }: { campus: PublicCampus }) {
  const [form, setForm] = useState({ full_name: '', phone: '', whatsapp: '', level: '', hall: '', programme: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CampusJoinResult | null>(null)

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }))

  async function submit(confirmMove: boolean, e?: FormEvent) {
    e?.preventDefault()
    setBusy(true)
    setError(null)
    const res = await submitCampusJoinAction(campus.key, { ...form, level: form.level || undefined }, confirmMove)
    setBusy(false)
    if (res.error || !res.data) setError(res.error ?? 'Something went wrong.')
    else setResult(res.data)
  }

  if (result && result.status !== 'needs_move') {
    return (
      <div className="text-center" role="status">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          {result.status === 'already' ? `You’re already on ${result.label}` : `Welcome to ${result.label}, ${result.name}!`}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {result.status === 'moved'
            ? `We’ve moved you to ${result.label}. Your campus leaders will be in touch.`
            : 'Your campus leaders will be in touch.'}
        </p>
      </div>
    )
  }

  if (result?.status === 'needs_move') {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Change campus?</h1>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          This number is listed on <strong>{result.from}</strong>. You can belong to one campus. Move from {result.from} to{' '}
          {result.label}?
        </p>
        {error ? <p className="text-sm text-red-700 dark:text-red-300" role="alert">{error}</p> : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => submit(true)} disabled={busy} className="h-12 flex-1">
            {busy ? <LoadingSpinner size="sm" className="mr-2" /> : null}
            Yes, move me to {result.label}
          </Button>
          <Button variant="outline" onClick={() => setResult(null)} disabled={busy} className="h-12 flex-1">
            No, keep {result.from}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={(e) => submit(false, e)} className="space-y-4" noValidate>
      <div>
        <p className="app-overline">Campus fellowship</p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 dark:text-white">Join {campus.name}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">If you’re already with us, use the phone number we have for you.</p>
      </div>
      <Field id="j-name" label="Full name" required>
        <Input id="j-name" autoComplete="name" required value={form.full_name} onChange={(e) => set('full_name')(e.target.value)} className="h-12 text-base" />
      </Field>
      <Field id="j-phone" label="Phone number" required>
        <Input id="j-phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="024XXXXXXX" value={form.phone} onChange={(e) => set('phone')(e.target.value)} className="h-12 font-mono text-base" />
      </Field>
      <Field id="j-wa" label="WhatsApp number (if different)">
        <Input id="j-wa" type="tel" inputMode="tel" value={form.whatsapp} onChange={(e) => set('whatsapp')(e.target.value)} className="h-12 font-mono text-base" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="j-level" label="Level">
          <Select value={form.level} onValueChange={set('level')}>
            <SelectTrigger id="j-level" className="h-12 text-base"><SelectValue placeholder="Choose" /></SelectTrigger>
            <SelectContent>
              {JOIN_LEVEL_OPTIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field id="j-hall" label="Hall / hostel">
          <Input id="j-hall" value={form.hall} onChange={(e) => set('hall')(e.target.value)} className="h-12 text-base" />
        </Field>
      </div>
      <Field id="j-prog" label="Programme">
        <Input id="j-prog" placeholder="e.g. BEd Mathematics" value={form.programme} onChange={(e) => set('programme')(e.target.value)} className="h-12 text-base" />
      </Field>
      {error ? <p className="text-sm text-red-700 dark:text-red-300" role="alert">{error}</p> : null}
      <Button type="submit" disabled={busy} className="h-12 w-full text-base">
        {busy ? <LoadingSpinner size="sm" className="mr-2" /> : null}
        Join {campus.label}
      </Button>
    </form>
  )
}

function Field({ id, label, required, children }: { id: string; label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-red-600 dark:text-red-400" aria-hidden> *</span> : null}
      </Label>
      {children}
    </div>
  )
}
