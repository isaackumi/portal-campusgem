'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Mail, Phone, Shield, UserRound } from 'lucide-react'

import { ContactRowActions } from '@/components/contacts/contact-row-actions'
import type { CampCamperDirectoryRow } from '@/lib/types'
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
          <div className="font-medium text-gray-900">{row.original.full_name}</div>
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
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 text-blue-600" />
          <span>{row.original.phone}</span>
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-slate-500" />
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
      id: 'account',
      accessorFn: (row) => row.user_role ?? '',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Account" />,
      cell: ({ row }) =>
        row.original.user_id ? (
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-600" />
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
