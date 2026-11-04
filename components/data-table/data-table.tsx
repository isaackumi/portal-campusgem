'use client'

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type FilterFn,
  type SortingState,
} from '@tanstack/react-table'
import { useState, type ReactNode } from 'react'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/** Every searchable string on a row (one level into arrays and objects). */
function rowText(value: unknown, depth = 0): string {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (depth > 1 || typeof value !== 'object') return ''
  const parts = Array.isArray(value) ? value : Object.values(value as Record<string, unknown>)
  return parts.map((v) => rowText(v, depth + 1)).join(' ')
}

/**
 * Matches every word of the query anywhere in the row: name, phone, email, year…
 * Phone numbers match with or without spaces and the 0 / +233 prefix.
 */
const anyFieldFilter: FilterFn<unknown> = (row, _columnId, query: string) => {
  const q = String(query ?? '').trim().toLowerCase()
  if (!q) return true
  const text = rowText(row.original).toLowerCase()
  const digits = text.replace(/\D/g, '')
  return q.split(/\s+/).every((word) => {
    if (text.includes(word)) return true
    const d = word.replace(/\D/g, '').replace(/^233/, '').replace(/^0/, '')
    return d.length >= 3 && digits.includes(d)
  })
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  /** Show the search box. Search covers every field on the row, not just this column. */
  searchKey?: string
  searchPlaceholder?: string
  /**
   * Phone layout: when given, screens below `md` show one card per row instead of
   * the table. Search, sorting and paging are shared with the table.
   */
  renderMobileRow?: (row: TData) => ReactNode
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search...',
  renderMobileRow,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: anyFieldFilter as FilterFn<TData>,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  })

  return (
    <div className="space-y-4">
      {searchKey ? (
        <Input
          type="search"
          placeholder={searchPlaceholder}
          value={globalFilter}
          onChange={(event) => {
            setGlobalFilter(event.target.value)
            table.setPageIndex(0)
          }}
          aria-label={searchPlaceholder}
          className="h-11 w-full sm:h-10 sm:max-w-sm"
        />
      ) : null}

      {renderMobileRow ? (
        <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200/80 bg-white shadow-card dark:divide-white/[0.06] dark:border-white/[0.06] dark:bg-neutral-800/60 dark:shadow-none md:hidden">
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <li key={row.id} className="min-h-11 px-4 py-3">
                {renderMobileRow(row.original)}
              </li>
            ))
          ) : (
            <li className="px-3 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">No results.</li>
          )}
        </ul>
      ) : null}

      <div
        className={cn(
          'overflow-hidden rounded-xl border border-neutral-200/80 bg-white shadow-card dark:border-white/[0.06] dark:bg-neutral-800/60 dark:shadow-none',
          renderMobileRow && 'hidden md:block'
        )}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] tabular-nums text-neutral-500 dark:text-neutral-400">
          {table.getFilteredRowModel().rows.length} total
          {table.getPageCount() > 1
            ? ` · page ${table.getState().pagination.pageIndex + 1} of ${table.getPageCount()}`
            : ''}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-10 sm:h-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-10 sm:h-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
