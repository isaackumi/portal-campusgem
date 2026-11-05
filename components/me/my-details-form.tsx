'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { updateMyDetailsAction } from '@/lib/actions/me'
import { MARITAL_STATUSES, type MyDetailsInput } from '@/lib/me/my-details'

const NONE = '__none__'

export type MyDetailsValues = Required<{ [K in keyof MyDetailsInput]: string }>

const FIELDS: Array<{ key: Exclude<keyof MyDetailsValues, 'marital_status'>; label: string; type?: string; mono?: boolean }> = [
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'area_of_residence', label: 'Area of residence' },
  { key: 'address', label: 'Address' },
  { key: 'occupation', label: 'Occupation' },
  { key: 'place_of_work', label: 'Place of work or school' },
  { key: 'emergency_contact_name', label: 'Emergency contact name' },
  { key: 'emergency_contact_relation', label: 'Emergency contact relation' },
  { key: 'emergency_contact_phone', label: 'Emergency contact phone', type: 'tel', mono: true },
]

/** Edit the signed-in person's own phone-safe details. */
export function MyDetailsForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial: MyDetailsValues
  onSaved: () => void
  onCancel: () => void
}) {
  const { toast } = useToast()
  const [values, setValues] = useState<MyDetailsValues>(initial)
  const [saving, setSaving] = useState(false)

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    // Send only what changed, so untouched fields are never overwritten.
    const changed: Partial<MyDetailsValues> = {}
    for (const key of Object.keys(values) as Array<keyof MyDetailsValues>) {
      if (values[key] !== initial[key]) changed[key] = values[key]
    }
    if (Object.keys(changed).length === 0) {
      setSaving(false)
      onCancel()
      return
    }
    const res = await updateMyDetailsAction(changed)
    setSaving(false)
    if (res.error) {
      toast({ variant: 'destructive', title: 'Not saved', description: res.error })
      return
    }
    toast({ title: 'Details saved' })
    onSaved()
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label htmlFor={`me-${field.key}`}>{field.label}</Label>
            <Input
              id={`me-${field.key}`}
              type={field.type ?? 'text'}
              maxLength={200}
              className={field.mono ? 'h-11 font-mono sm:h-10' : 'h-11 sm:h-10'}
              value={values[field.key]}
              onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
            />
          </div>
        ))}
        <div className="space-y-1.5">
          <Label htmlFor="me-marital">Marital status</Label>
          <Select
            value={values.marital_status || NONE}
            onValueChange={(value) => setValues((prev) => ({ ...prev, marital_status: value === NONE ? '' : value }))}
          >
            <SelectTrigger id="me-marital" className="h-11 sm:h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Not set</SelectItem>
              {MARITAL_STATUSES.map((status) => (
                <SelectItem key={status} value={status} className="capitalize">
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
        Your phone number is how you sign in, so only the church office can change it.
      </p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} className="h-11 sm:h-10">
          Cancel
        </Button>
        <Button type="submit" disabled={saving} className="h-11 sm:h-10">
          {saving ? 'Saving…' : 'Save my details'}
        </Button>
      </div>
    </form>
  )
}
