/**
 * Small CSV helpers for spreadsheet exports that people open in Excel / Google Sheets.
 *
 * - Cells are RFC 4180 quoted when needed.
 * - Text that a spreadsheet would run as a formula (=, +, -, @ at the start) is prefixed
 *   with an apostrophe, so a member's name can't execute anything.
 * - `textCell` keeps digit strings (phone numbers, numeric IDs) exactly as written:
 *   Excel would otherwise drop the leading zero of 0244123456 or show +233… as 2.33E+11.
 */

/** Marks a value that must be shown verbatim as text (phones, IDs). */
export type CsvText = { readonly csvText: string }

export type CsvValue = string | number | boolean | null | undefined | CsvText

/** Wrap digit-like values (phones, IDs) so spreadsheets keep them as text. */
export function textCell(value: string | null | undefined): CsvText {
  return { csvText: value?.trim() ?? '' }
}

function quote(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function neutraliseFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
}

/** Only digits and common phone punctuation: safe to emit inside ="…". */
const DIGIT_LIKE = /^\+?[\d][\d\s()\-]*$/

export function csvCell(value: CsvValue): string {
  if (value == null) return ''
  if (typeof value === 'object') {
    const text = value.csvText
    if (!text) return ''
    // ="0244123456" is read by Excel and Sheets as the literal text 0244123456.
    if (DIGIT_LIKE.test(text)) return `"=""${text}"""`
    return quote(neutraliseFormula(text))
  }
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return quote(neutraliseFormula(value))
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  return [headers.map((h) => csvCell(h)), ...rows.map((row) => row.map(csvCell))]
    .map((cells) => cells.join(','))
    .join('\r\n')
}

/** yyyy-mm-dd from an ISO date/time, or '' when missing or invalid. */
export function csvDate(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

/** Lowercase, dash-separated name safe for a download filename. */
export function slugForFilename(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'export'
  )
}

/** Browser only: save a CSV (with a BOM so Excel reads UTF-8 names correctly). */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
