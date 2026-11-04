'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Copy, KeyRound, Link2, Lock, Search, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingSpinner } from '@/components/ui/loading'
import { AccessDenied } from '@/components/auth/access-denied'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/components/providers'
import { useAllUsers } from '@/lib/hooks/use-data'
import { dataService } from '@/lib/services/data-service'
import { linkDuplicatePerson, listDuplicatePeople, updateSecondaryPhone, updateUserAccess } from '@/lib/actions/access'
import type { DuplicatePeopleGroup } from '@/lib/people/duplicates'
import {
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  ROLE_LABELS,
  USER_ROLES,
  effectivePermissions,
  isStaffRole,
  permissionsForRole,
  sanitizePermissions,
  type Permission,
} from '@/lib/auth/roles'
import type { AppUser, UserRole } from '@/lib/types'
import { cn } from '@/lib/utils'
import { roleTone } from '@/lib/ui/chip-tones'
import { PersonAvatar } from '@/components/ui/person'
import { PhoneLink, QuickContactButtons } from '@/components/contact/phone-link'
import { isValidPhone } from '@/lib/phone'

const ROLE_SUMMARIES: Record<UserRole, string> = {
  admin: 'Everything, including managing users and administrators.',
  pastor: 'Members, groups, attendance, camp operations & payments, RLC, SMS.',
  elder: 'Visitors, groups, attendance, camp operations, RLC, SMS.',
  finance_officer: 'Finance, camp payments, read-only members and attendance.',
  member: 'Own dashboard, groups, attendance and celebrations.',
  visitor: 'Dashboard and attendance only.',
}

function hasElevatedAccess(user: AppUser): boolean {
  if (user.merged_into) return false
  return isStaffRole(user.role) || (user.permissions?.length ?? 0) > 0
}

function matchesQuery(user: AppUser, q: string): boolean {
  if (!q) return true
  const needle = q.toLowerCase()
  const digits = q.replace(/\D/g, '')
  return (
    user.full_name?.toLowerCase().includes(needle) ||
    (digits.length >= 3 && (user.secondary_phone ?? '').replace(/\D/g, '').includes(digits)) ||
    user.membership_id?.toLowerCase().includes(needle) ||
    user.email?.toLowerCase().includes(needle) ||
    (digits.length >= 3 && (user.phone ?? '').replace(/\D/g, '').includes(digits)) ||
    false
  )
}

export default function AccessManagementPage() {
  const { user: currentUser, loading: authLoading, can, refresh } = useAuth()
  const { toast } = useToast()
  const { data: allUsers, loading, error, refetch } = useAllUsers()

  const [filter, setFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')
  const [editing, setEditing] = useState<AppUser | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [newPersonOpen, setNewPersonOpen] = useState(false)

  const staff = useMemo(
    () =>
      (allUsers ?? [])
        .filter(hasElevatedAccess)
        .filter((u) => roleFilter === 'all' || u.role === roleFilter)
        .filter((u) => matchesQuery(u, filter.trim()))
        .sort((a, b) => {
          const order = USER_ROLES.indexOf(a.role) - USER_ROLES.indexOf(b.role)
          return order !== 0 ? order : a.full_name.localeCompare(b.full_name)
        }),
    [allUsers, filter, roleFilter]
  )

  const counts = useMemo(() => {
    const out: Partial<Record<UserRole, number>> = {}
    for (const u of allUsers ?? []) {
      if (hasElevatedAccess(u)) out[u.role] = (out[u.role] ?? 0) + 1
    }
    return out
  }, [allUsers])

  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!can('users.manage')) {
    return <AccessDenied permission="users.manage" />
  }

  const canManageAdmins = can('admins.manage')

  async function handleSaved(updated: AppUser) {
    setEditing(null)
    await refetch()
    // If you changed your own access, apply it right away.
    if (updated.id === currentUser?.id) await refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="app-page-title">Access &amp; roles</h1>
          <p className="app-page-description mt-1 max-w-2xl">
            Give people a role, then add individual permissions when someone needs a little more.
            Changes apply on their next page load — no need to sign out.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button variant="outline" onClick={() => setNewPersonOpen(true)} className="h-11 sm:h-10">
            <UserPlus className="mr-2 h-4 w-4" />
            New person
          </Button>
          <Button onClick={() => setPickerOpen(true)} className="h-11 sm:h-10">
            <KeyRound className="mr-2 h-4 w-4" />
            Grant access
          </Button>
        </div>
      </div>

      <DuplicatePeoplePanel
        canManageAdmins={canManageAdmins}
        reloadKey={allUsers?.length ?? 0}
        onLinked={async () => {
          await refetch()
          await refresh()
        }}
      />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
        <RoleChip label="Everyone with access" active={roleFilter === 'all'} onClick={() => setRoleFilter('all')}
          count={Object.values(counts).reduce((a, b) => a + (b ?? 0), 0)} />
        {USER_ROLES.filter((r) => counts[r]).map((r) => (
          <RoleChip key={r} label={ROLE_LABELS[r]} count={counts[r] ?? 0} active={roleFilter === r}
            onClick={() => setRoleFilter(r)} />
        ))}
      </div>

      <div className="dashboard-panel overflow-hidden">
        <div className="border-b border-neutral-200/80 p-3 dark:border-white/[0.06] sm:p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
            <Input type="search" value={filter} onChange={(e) => setFilter(e.target.value)} className="h-11 pl-10 sm:h-10"
              aria-label="Filter people with access"
              placeholder="Name, phone or membership ID" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner /></div>
        ) : error ? (
          <p className="p-6 text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : staff.length === 0 ? (
          <div className="px-4 py-16 text-center text-sm text-neutral-500 dark:text-neutral-400">
            <Users className="mx-auto mb-3 h-10 w-10 text-neutral-300 dark:text-neutral-600" />
            No one matches. Use <strong>Grant access</strong> to give someone a role.
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
            {staff.map((person) => {
              const extra = person.permissions?.length ?? 0
              const locked = !canManageAdmins && person.role === 'admin'
              return (
                <li key={person.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <PersonAvatar name={person.full_name} seed={person.id} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="min-w-0 truncate text-sm font-medium text-neutral-900 dark:text-white">{person.full_name}</span>
                        {person.id === currentUser?.id && <Badge variant="outline">You</Badge>}
                        <Badge variant={roleTone(person.role)}>{ROLE_LABELS[person.role]}</Badge>
                        {extra > 0 && <Badge variant="warning">+{extra} extra</Badge>}
                        {person.phone && !isValidPhone(person.phone) && (
                          <Badge variant="danger" title="This number is malformed, so signing in with the real number won't reach this account">
                            Invalid phone
                          </Badge>
                        )}
                        {!person.auth_uid && (
                          <Badge variant="danger" title="Saving access will enable sign-in for this person">
                            Can&apos;t sign in yet
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
                        {person.phone ? (
                          <PhoneLink phone={person.phone} whatsapp={person.whatsapp} name={person.full_name} />
                        ) : null}
                        {person.secondary_phone && (
                          <span className="inline-flex items-center gap-1" title="Secondary phone, also works for sign-in">
                            <PhoneLink phone={person.secondary_phone} name={person.full_name} />
                            <span className="app-overline">2nd</span>
                          </span>
                        )}
                        {person.membership_id && <span className="font-mono">{person.membership_id}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-12 sm:pl-0">
                    <QuickContactButtons phone={person.phone} whatsapp={person.whatsapp} name={person.full_name} />
                    <Button variant="outline" disabled={locked} onClick={() => setEditing(person)}
                      className="h-11 flex-1 sm:h-9 sm:flex-none"
                      title={locked ? 'Only people who can manage administrators can edit an admin' : undefined}>
                      {locked ? <Lock className="mr-2 h-3.5 w-3.5" /> : <ShieldCheck className="mr-2 h-3.5 w-3.5" />}
                      Edit access
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <PersonPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        users={allUsers ?? []}
        onPick={(u) => {
          setPickerOpen(false)
          setEditing(u)
        }}
        onCreateNew={() => {
          setPickerOpen(false)
          setNewPersonOpen(true)
        }}
      />

      <NewPersonDialog
        open={newPersonOpen}
        onOpenChange={setNewPersonOpen}
        canManageAdmins={canManageAdmins}
        onCreated={async (u) => {
          setNewPersonOpen(false)
          await refetch()
          setEditing(u)
        }}
      />

      {editing && (
        <AccessEditor
          person={editing}
          canManageAdmins={canManageAdmins}
          isSelf={editing.id === currentUser?.id}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
          onError={(message) => toast({ variant: 'destructive', title: 'Could not save access', description: message })}
          onSuccess={(message) => toast({ title: 'Access updated', description: message })}
        />
      )}
    </div>
  )
}

function RoleChip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 text-sm transition-colors sm:min-h-9',
        active
          ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-500 dark:bg-brand-500'
          : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:border-white/20'
      )}
      aria-pressed={active}
    >
      {label} <span className={cn('ml-1.5 tabular-nums', active ? 'text-white/80' : 'text-neutral-400 dark:text-neutral-500')}>{count}</span>
    </button>
  )
}

function PersonPicker({
  open,
  onOpenChange,
  users,
  onPick,
  onCreateNew,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  users: AppUser[]
  onPick: (user: AppUser) => void
  onCreateNew: () => void
}) {
  const [query, setQuery] = useState('')
  const results = useMemo(() => {
    const q = query.trim()
    if (q.length < 2) return []
    return users.filter((u) => !u.merged_into && matchesQuery(u, q)).slice(0, 12)
  }, [users, query])

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setQuery('') }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Grant access</DialogTitle>
          <DialogDescription>Find the person by name, phone number or membership ID.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
          <Input autoFocus type="search" value={query} onChange={(e) => setQuery(e.target.value)} className="h-11 pl-10 sm:h-10"
            placeholder="e.g. Divine, 0541234567, CG-2024-0001" />
        </div>
        <div className="max-h-[50vh] overflow-y-auto sm:max-h-80">
          {query.trim().length < 2 ? (
            <p className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">Type at least two characters.</p>
          ) : results.length === 0 ? (
            <div className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
              No match.{' '}
              <button type="button" className="inline-flex min-h-11 items-center font-medium text-brand-700 underline dark:text-brand-300" onClick={onCreateNew}>
                Add them as a new person
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
              {results.map((u) => (
                <li key={u.id}>
                  <button type="button" onClick={() => onPick(u)}
                    className="flex min-h-14 w-full items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-neutral-900 dark:text-white">{u.full_name}</span>
                      <span className="block truncate font-mono text-xs text-neutral-500 dark:text-neutral-400">{[u.phone, u.membership_id].filter(Boolean).join(' · ')}</span>
                    </span>
                    <Badge variant={roleTone(u.role)} className="shrink-0">{ROLE_LABELS[u.role]}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function NewPersonDialog({
  open,
  onOpenChange,
  canManageAdmins,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  canManageAdmins: boolean
  onCreated: (user: AppUser) => void
}) {
  const { toast } = useToast()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<UserRole>('elder')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!fullName.trim() || !phone.trim()) {
      toast({ variant: 'destructive', title: 'Name and phone are required' })
      return
    }
    setSaving(true)
    const result = await dataService.createUser({ full_name: fullName.trim(), phone: phone.trim(), role })
    setSaving(false)
    if (result.error || !result.data) {
      toast({ variant: 'destructive', title: 'Could not add person', description: result.error ?? 'Unknown error' })
      return
    }
    toast({ title: 'Person added', description: `${result.data.full_name} can now sign in with ${phone.trim()}.` })
    setFullName('')
    setPhone('')
    onCreated(result.data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New person</DialogTitle>
          <DialogDescription>
            If this phone number already belongs to someone, their existing record is kept and only the role changes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="np-name">Full name</Label>
            <Input id="np-name" className="h-11 sm:h-10" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="np-phone">Phone number (used to sign in)</Label>
            <Input id="np-phone" type="tel" inputMode="tel" className="h-11 sm:h-10" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="024XXXXXXX" />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger className="h-11 sm:h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {USER_ROLES.filter((r) => canManageAdmins || r !== 'admin').map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{ROLE_SUMMARIES[role]}</p>
          </div>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="h-11 sm:h-10">Cancel</Button>
            <Button onClick={submit} disabled={saving} className="h-11 sm:h-10">
              {saving ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              Add person
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function AccessEditor({
  person,
  canManageAdmins,
  isSelf,
  onClose,
  onSaved,
  onError,
  onSuccess,
}: {
  person: AppUser
  canManageAdmins: boolean
  isSelf: boolean
  onClose: () => void
  onSaved: (user: AppUser) => void
  onError: (message: string) => void
  onSuccess: (message: string) => void
}) {
  const [role, setRole] = useState<UserRole>(person.role)
  const [extra, setExtra] = useState<Permission[]>(() => sanitizePermissions(person.permissions))
  const [secondaryPhone, setSecondaryPhone] = useState(person.secondary_phone ?? '')
  const [saving, setSaving] = useState(false)

  const fromRole = useMemo(() => new Set(permissionsForRole(role)), [role])
  const total = effectivePermissions(role, extra).length
  const adminOnly: Permission[] = ['users.manage', 'admins.manage']

  function toggle(permission: Permission, checked: boolean) {
    setExtra((prev) => (checked ? Array.from(new Set([...prev, permission])) : prev.filter((p) => p !== permission)))
  }

  async function save() {
    setSaving(true)
    if (secondaryPhone.trim() !== (person.secondary_phone ?? '')) {
      const phoneResult = await updateSecondaryPhone(person.id, secondaryPhone)
      if (phoneResult.error) {
        setSaving(false)
        onError(phoneResult.error)
        return
      }
    }
    const result = await updateUserAccess(person.id, role, extra.filter((p) => !fromRole.has(p)))
    setSaving(false)
    if (result.error || !result.data) {
      onError(result.error ?? 'Unknown error')
      return
    }
    onSuccess(`${person.full_name} is now ${ROLE_LABELS[role]}${extra.filter((p) => !fromRole.has(p)).length ? ' with extra permissions' : ''}.`)
    onSaved(result.data)
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Access for {person.full_name}</DialogTitle>
          <DialogDescription>
            {[person.phone, person.membership_id].filter(Boolean).join(' · ')}
          </DialogDescription>
        </DialogHeader>

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Main phone</Label>
            <p className="font-mono text-sm text-neutral-700 dark:text-neutral-300">
              {person.phone || '—'}
              {person.phone && !isValidPhone(person.phone) && <span className="ml-2 font-sans text-xs text-red-600 dark:text-red-400">invalid</span>}
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="secondary-phone">Secondary phone (also signs in)</Label>
            <Input
              id="secondary-phone"
              type="tel"
              inputMode="tel"
              className="h-11 sm:h-10"
              value={secondaryPhone}
              onChange={(e) => setSecondaryPhone(e.target.value)}
              placeholder="e.g. a new number they changed to"
            />
          </div>
        </section>

        <section className="space-y-2">
          <Label>Role</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {USER_ROLES.map((r) => {
              const disabled = (r === 'admin' && !canManageAdmins) || (isSelf && person.role === 'admin' && r !== 'admin')
              return (
                <button
                  key={r}
                  type="button"
                  disabled={disabled}
                  onClick={() => setRole(r)}
                  className={cn(
                    'rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                    role === r
                      ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600 dark:border-brand-400 dark:bg-brand-400/10 dark:ring-brand-400'
                      : 'border-neutral-200 hover:border-neutral-300 dark:border-white/10 dark:hover:border-white/20'
                  )}
                >
                  <span className="flex items-center justify-between text-sm font-medium text-neutral-900 dark:text-white">
                    {ROLE_LABELS[r]}
                    {role === r && <Check className="h-4 w-4 text-brand-700 dark:text-brand-300" />}
                  </span>
                  <span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">{ROLE_SUMMARIES[r]}</span>
                </button>
              )
            })}
          </div>
          {isSelf && person.role === 'admin' && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">You can&apos;t remove your own administrator role.</p>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <Label>Permissions</Label>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">{total} of {Object.keys(PERMISSION_LABELS).length} allowed</span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Greyed ticks come with the role. Tick anything else this person needs on top of it.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {PERMISSION_GROUPS.map((group) => (
              <fieldset key={group.label} className="rounded-xl border border-neutral-200 p-3 dark:border-white/10">
                <legend className="px-1 app-overline">{group.label}</legend>
                <div className="space-y-0.5 sm:space-y-2">
                  {group.permissions.map((permission) => {
                    const inherited = fromRole.has(permission)
                    const locked = !canManageAdmins && adminOnly.includes(permission)
                    const checked = inherited || extra.includes(permission)
                    const id = `perm-${permission}`
                    return (
                      <div key={permission} className="flex min-h-11 items-center gap-2 sm:min-h-0">
                        <Checkbox
                          id={id}
                          checked={checked}
                          disabled={inherited || locked}
                          onCheckedChange={(v) => toggle(permission, v === true)}
                        />
                        <label htmlFor={id} className={cn('flex-1 py-1 text-sm', inherited ? 'text-neutral-500 dark:text-neutral-400' : 'text-neutral-800 dark:text-neutral-200')}>
                          {PERMISSION_LABELS[permission]}
                          {inherited && <span className="ml-1 text-[11px] text-neutral-400 dark:text-neutral-500">(role)</span>}
                        </label>
                      </div>
                    )
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        </section>

        <div className="flex gap-2 border-t border-neutral-200 pt-4 dark:border-white/10 sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={saving} className="h-11 flex-1 sm:h-10 sm:flex-none">Cancel</Button>
          <Button onClick={save} disabled={saving} className="h-11 flex-1 sm:h-10 sm:flex-none">
            {saving ? <LoadingSpinner size="sm" className="mr-2" /> : null}
            Save access
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function formatDay(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Same name, different phone numbers — usually an Excel import holding an old number.
 * The admin picks the record to keep and adds the other number as its secondary phone.
 */
function DuplicatePeoplePanel({
  canManageAdmins,
  reloadKey,
  onLinked,
}: {
  canManageAdmins: boolean
  reloadKey: number
  onLinked: () => Promise<void>
}) {
  const { toast } = useToast()
  const [groups, setGroups] = useState<DuplicatePeopleGroup[] | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [keepByGroup, setKeepByGroup] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await listDuplicatePeople()
    if (error) {
      toast({ variant: 'destructive', title: 'Could not check for duplicates', description: error })
      return
    }
    setGroups(data)
  }, [toast])

  useEffect(() => {
    void load()
  }, [load, reloadKey])

  if (!groups || groups.length === 0) return null

  async function link(group: DuplicatePeopleGroup, keep: AppUser, duplicate: AppUser) {
    setBusy(duplicate.id)
    const { error } = await linkDuplicatePerson(keep.id, duplicate.id)
    setBusy(null)
    if (error) {
      toast({ variant: 'destructive', title: 'Could not link records', description: error })
      return
    }
    toast({
      title: 'Phone added',
      description: `${duplicate.phone ?? 'That number'} now signs in to ${keep.full_name} (${ROLE_LABELS[keep.role]}).`,
    })
    await load()
    await onLinked()
  }

  const visible = expanded ? groups : groups.slice(0, 3)

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-400/20 dark:bg-amber-400/[0.06] sm:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 className="app-section-title flex items-center gap-2">
          <Copy className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden />
          {groups.length} possible duplicate {groups.length === 1 ? 'person' : 'people'}
        </h2>
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          Same name, different phone. Keep one record and add the other number as a secondary phone — both numbers will sign in.
        </p>
      </div>

      <ul className="mt-4 space-y-3">
        {visible.map((group) => {
          const keepId = keepByGroup[group.key] ?? group.suggestedKeepId
          const keep = group.records.find((r) => r.id === keepId) ?? group.records[0]
          return (
            <li key={group.key} className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-white/10 dark:bg-neutral-800">
              <p className="mb-2 text-sm font-medium text-neutral-900 dark:text-white">{group.name}</p>
              <div className="grid gap-2 md:grid-cols-2">
                {group.records.map((record) => {
                  const isKeep = record.id === keep.id
                  const phoneOk = Boolean(record.phone && isValidPhone(record.phone))
                  const adminLocked = !canManageAdmins && (record.role === 'admin' || keep.role === 'admin')
                  return (
                    <div
                      key={record.id}
                      className={cn(
                        'rounded-lg border p-3 text-sm',
                        isKeep
                          ? 'border-brand-600 ring-1 ring-brand-600 dark:border-brand-400 dark:ring-brand-400'
                          : 'border-neutral-200 dark:border-white/10'
                      )}
                    >
                      <label className="flex cursor-pointer items-start gap-2">
                        <input
                          type="radio"
                          name={`keep-${group.key}`}
                          className="mt-0.5 h-5 w-5 accent-brand-600"
                          checked={isKeep}
                          onChange={() => setKeepByGroup((prev) => ({ ...prev, [group.key]: record.id }))}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <Badge variant={roleTone(record.role)}>{ROLE_LABELS[record.role]}</Badge>
                            {isKeep && <span className="text-xs font-medium text-brand-700 dark:text-brand-300">Keep</span>}
                          </span>
                          <span className="mt-1 block font-mono text-xs text-neutral-600 dark:text-neutral-300">
                            {record.phone || 'No phone'}
                            {record.phone && !phoneOk && <span className="ml-1 font-sans text-red-600 dark:text-red-400">(invalid)</span>}
                          </span>
                          {record.secondary_phone && (
                            <span className="block font-mono text-xs text-neutral-500 dark:text-neutral-400">2nd: {record.secondary_phone}</span>
                          )}
                          <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                            {record.membership_id} · added {formatDay(record.created_at)}
                          </span>
                        </span>
                      </label>
                      {!isKeep && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3 h-11 w-full sm:h-9"
                          disabled={!phoneOk || busy !== null || adminLocked}
                          title={
                            !phoneOk
                              ? 'This record has no valid number to add'
                              : adminLocked
                                ? 'Only people who can manage administrators can link admin records'
                                : undefined
                          }
                          onClick={() => void link(group, keep, record)}
                        >
                          {busy === record.id ? <LoadingSpinner size="sm" className="mr-2" /> : <Link2 className="mr-2 h-3.5 w-3.5" />}
                          Add as secondary phone
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ul>

      {groups.length > 3 && (
        <Button variant="ghost" size="sm" className="mt-3 h-11 w-full sm:h-9 sm:w-auto" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Show fewer' : `Show all ${groups.length}`}
        </Button>
      )}
    </section>
  )
}
