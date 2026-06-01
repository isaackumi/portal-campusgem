'use server'

import { CampRegistrationForm } from '@/lib/types'

export interface ParseExcelResult {
  success: boolean
  headers?: string[]
  rows?: any[][]
  error?: string
}

export interface ImportRegistrationResult {
  success: boolean
  total: number
  successful: number
  failed: number
  skipped: number
  warned: number
  errors: Array<{ row: number; errors: string[] }>
  skipped_rows: Array<{ row: number; reason: string }>
}

export async function parseExcelFile(formData: FormData): Promise<ParseExcelResult> {
  try {
    const file = formData.get('file')
    if (!(file instanceof Blob)) {
      return { success: false, error: 'No file provided' }
    }

    const fileData = await file.arrayBuffer()
    const XLSX = await import('xlsx')
    const fileName =
      file instanceof File ? file.name.toLowerCase() : ''
    const isCsv = fileName.endsWith('.csv')
    const workbook = isCsv
      ? XLSX.read(new TextDecoder('utf-8').decode(fileData), {
          type: 'string',
          raw: false,
        })
      : XLSX.read(fileData, { type: 'array' })
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][]

    if (jsonData.length === 0) {
      return { success: false, error: 'The Excel file appears to be empty' }
    }

    const headers = jsonData[0] as string[]
    const rows = jsonData.slice(1)
    return { success: true, headers, rows }
  } catch (error: unknown) {
    console.error('Error parsing Excel file:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse Excel file',
    }
  }
}

export async function importCampRegistrations(
  campYearId: string,
  registrations: Partial<CampRegistrationForm>[]
): Promise<ImportRegistrationResult> {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return {
      success: false,
      total: registrations.length,
      successful: 0,
      failed: registrations.length,
      skipped: 0,
      warned: 0,
      errors: [{ row: 0, errors: ['NEXT_PUBLIC_CONVEX_URL is not configured'] }],
      skipped_rows: [],
    }
  }

  try {
    const { importCampRegistrationsInConvex } = await import('@/lib/convex/camp-bridge')
    const result = await importCampRegistrationsInConvex(campYearId, registrations)
    return {
      success: result.failed === 0,
      total: registrations.length,
      successful: result.successful,
      failed: result.failed,
      skipped: result.skipped,
      warned: result.warned,
      errors: result.errors,
      skipped_rows: result.skipped_rows,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to import registrations'
    const deploymentHint = message.includes('Could not find public function')
      ? ' Push Convex functions with `bunx convex dev --once` (or keep `bunx convex dev` running) so the deployment in NEXT_PUBLIC_CONVEX_URL matches this repo.'
      : ''

    return {
      success: false,
      total: registrations.length,
      successful: 0,
      failed: registrations.length,
      skipped: 0,
      warned: 0,
      errors: [
        {
          row: 0,
          errors: [`${message}${deploymentHint}`],
        },
      ],
      skipped_rows: [],
    }
  }
}
