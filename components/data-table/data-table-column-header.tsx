'use client'

import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import type { Column } from '@tanstack/react-table'

import { cn } from '@/lib/utils'

interface DataTableColumnHeaderProps<TData, TValue> extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>
  title: string
}

/** Click to sort: ascending → descending → off. The arrow shows only when sorted or hovered. */
export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>
  }

  const sorted = column.getIsSorted()
  const Icon = sorted === 'desc' ? ArrowDown : sorted === 'asc' ? ArrowUp : ChevronsUpDown
  const next = sorted === 'asc' ? 'descending' : sorted === 'desc' ? 'unsorted' : 'ascending'

  return (
    <button
      type="button"
      onClick={() => (sorted === 'desc' ? column.clearSorting() : column.toggleSorting(sorted === 'asc'))}
      className={cn(
        'group -mx-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1 uppercase tracking-[inherit] transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 dark:hover:text-neutral-100',
        sorted && 'text-neutral-900 dark:text-neutral-100',
        className
      )}
      aria-label={`${title}: sort ${next}`}
    >
      {title}
      <Icon
        className={cn('h-3 w-3 transition-opacity', sorted ? 'opacity-100' : 'opacity-0 group-hover:opacity-60')}
        aria-hidden
      />
    </button>
  )
}
