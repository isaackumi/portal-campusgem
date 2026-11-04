'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Mail, Shield, UserRound } from 'lucide-react'

import { PhoneLink, QuickContactButtons } from '@/components/contact/phone-link'
import { ContactRowActions } from '@/components/contacts/contact-row-actions'
import type { CampCamperDirectoryRow } from '@/lib/types'
import { RLC_ROLE_LABELS } from '@/lib/constants/rlc'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'

export function createCamperDirectoryColumns(
  onOpenRegistration: (registrationId: string) => void,
  onRefresh?: () => void
): ColumnDef<CampCamperDirectoryRow>[] {
  return [
    {
      accessorKey: 'full_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => (
        <div className="min-w-[180px]">
          <div className="font-medium text-neutral-900 dark:text-neutral-100">{row.original.full_name}</div>
          {row.original.first_name || row.original.last_name ? (
            <div className="text-xs text-muted-foreground">
              {[row.original.first_name, row.original.last_name].filter(Boolean).join(' ')}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: 'phone',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Phone" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 whitespace-nowrap text-sm">
          <PhoneLink phone={row.original.phone} name={row.original.full_name} />
          <QuickContactButtons phone={row.original.phone} name={row.original.full_name} />
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
          <span>{row.original.email || '—'}</span>
        </div>
      ),
    },
    {
      id: 'years',
      accessorFn: (row) => row.years.map((year) => year.year).join(', '),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Camp years" />,
      cell: ({ row }) => (
        <div className="flex max-w-[320px] flex-wrap gap-1.5">
          {row.original.years.map((year) => (
            <Badge
              key={`${row.original.phone_key}-${year.year_id}`}
              variant={year.status === 'checked_in' ? 'default' : 'secondary'}
              className="cursor-pointer"
              onClick={() => onOpenRegistration(year.registration_id)}
            >
              {year.year}
            </Badge>
          ))}
        </div>
      ),
      filterFn: (row, _id, value) => {
        const query = String(value).toLowerCase()
        return row.original.years.some((year) => String(year.year).includes(query))
      },
    },
    {
      accessorKey: 'registration_count',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Registrations" />,
      cell: ({ row }) => <span className="text-sm">{row.original.registration_count}</span>,
    },
    {
      id: 'rlc',
      accessorFn: (row) => row.rlc_roles?.join(', ') ?? '',
      header: ({ column }) => <DataTableColumnHeader column={column} title="RLC" />,
      cell: ({ row }) =>
        row.original.rlc_roles && row.original.rlc_roles.length > 0 ? (
          <div className="flex max-w-[220px] flex-wrap gap-1">
            {row.original.rlc_roles.slice(0, 3).map((role) => (
              <Badge key={role} variant="outline" className="border-rose-200 text-rose-800 dark:border-rose-400/20 dark:text-rose-300">
                {RLC_ROLE_LABELS[role as keyof typeof RLC_ROLE_LABELS] ?? role}
              </Badge>
            ))}
            {row.original.rlc_roles.length > 3 ? (
              <Badge variant="secondary">+{row.original.rlc_roles.length - 3}</Badge>
            ) : null}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      id: 'account',
      accessorFn: (row) => row.user_role ?? '',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Account" />,
      cell: ({ row }) =>
        row.original.user_id ? (
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <Badge variant="outline" className="capitalize">
              {row.original.user_role ?? 'member'}
            </Badge>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserRound className="h-4 w-4" />
            Camp only
          </div>
        ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const latest = row.original.years[0]
        return (
          <ContactRowActions
            contactName={row.original.full_name}
            phone={row.original.phone}
            email={row.original.email}
            userId={row.original.user_id}
            userRole={row.original.user_role}
            memberId={row.original.member_id}
            rlcRoles={row.original.rlc_roles}
            latestRegistrationId={latest?.registration_id}
            showFollowUp={false}
            showPromotions
            onPromoted={onRefresh}
          />
        )
      },
    },
  ]
}

/** Card row for the directory on phones (DataTable `renderMobileRow`). */
export function CamperDirectoryMobileRow({
  row,
  onOpenRegistration,
  onRefresh,
}: {
  row: CampCamperDirectoryRow
  onOpenRegistration: (registrationId: string) => void
  onRefresh?: () => void
}) {
  const latest = row.years[0]
  return (
    <div className="flex min-h-11 items-start gap-3">
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={() => latest && onOpenRegistration(latest.registration_id)}
        disabled={!latest}
      >
        <span className="block truncate font-medium text-neutral-900 dark:text-neutral-100">{row.full_name}</span>
        <span className="mt-0.5 block truncate text-xs text-neutral-500 dark:text-neutral-400">
          {[row.phone, row.email].filter(Boolean).join(' · ') || 'No contact details'}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-1">
          {row.years.slice(0, 4).map((year) => (
            <Badge key={`${row.phone_key}-${year.year_id}`} variant={year.status === 'checked_in' ? 'success' : 'secondary'}>
              {year.year}
            </Badge>
          ))}
          {row.years.length > 4 ? <Badge variant="outline">+{row.years.length - 4}</Badge> : null}
          {row.user_id ? (
            <Badge variant="outline" className="capitalize">
              <Shield className="h-3 w-3" aria-hidden />
              {row.user_role ?? 'member'}
            </Badge>
          ) : null}
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-1">
        <QuickContactButtons phone={row.phone} name={row.full_name} />
        <ContactRowActions
          contactName={row.full_name}
          phone={row.phone}
          email={row.email}
          userId={row.user_id}
          userRole={row.user_role}
          memberId={row.member_id}
          rlcRoles={row.rlc_roles}
          latestRegistrationId={latest?.registration_id}
          showFollowUp={false}
          showPromotions
          onPromoted={onRefresh}
        />
      </div>
    </div>
  )
}
