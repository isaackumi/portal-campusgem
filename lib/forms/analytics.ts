import type { ChurchFormField, ChurchFormResponse } from '@/lib/types'
import type { FormPrefillKey } from '@/lib/forms/prefill'

export const CHART_COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#ec4899',
  '#64748b',
]

export type AnalyticsSlice = { label: string; count: number; percent: number; color: string }

export type FieldAnalytics = {
  fieldId: string
  label: string
  type: ChurchFormField['field_type']
  answered: number
  total: number
  slices: AnalyticsSlice[]
}

export type DemographicChart = {
  key: string
  title: string
  slices: AnalyticsSlice[]
  answered: number
}

export type CumulativePoint = {
  date: string
  label: string
  count: number
  cumulative: number
}

export type FormAnalyticsReport = {
  totalResponses: number
  uniquePhones: number
  averageCompletion: number
  last7Days: number
  fieldAnalytics: FieldAnalytics[]
  demographics: DemographicChart[]
  cumulative: CumulativePoint[]
}

const DEMOGRAPHIC_KEYS: Array<{ key: FormPrefillKey; title: string }> = [
  { key: 'sex', title: 'Sex' },
  { key: 'age_bracket', title: 'Age bracket' },
  { key: 'education_level', title: 'Education level' },
  { key: 'highest_qualification', title: 'Qualification' },
  { key: 'residence', title: 'Residence' },
  { key: 'role', title: 'Role' },
]

function formatValue(value: unknown): string {
  if (value == null || value === '') return ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.map(String).join(', ')
  return String(value).trim()
}

function buildSlices(buckets: Map<string, number>, denominator: number): AnalyticsSlice[] {
  return Array.from(buckets.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([label, count], index) => ({
      label,
      count,
      percent: denominator > 0 ? Math.round((count / denominator) * 100) : 0,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }))
}

function countBucketsForField(
  field: ChurchFormField,
  responses: ChurchFormResponse[]
): { buckets: Map<string, number>; answered: number } {
  const buckets = new Map<string, number>()
  let answered = 0

  for (const response of responses) {
    const value = response.values[field.id]
    if (value == null || value === '') continue
    answered += 1

    if (Array.isArray(value)) {
      for (const item of value) {
        const key = String(item).trim()
        if (!key) continue
        buckets.set(key, (buckets.get(key) ?? 0) + 1)
      }
      continue
    }

    const key = formatValue(value)
    if (!key) continue
    buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }

  return { buckets, answered }
}

function fieldForPrefillKey(fields: ChurchFormField[], key: FormPrefillKey): ChurchFormField | undefined {
  return fields.find((f) => f.prefill_key === key)
}

export function buildFormAnalyticsReport(
  fields: ChurchFormField[],
  responses: ChurchFormResponse[]
): FormAnalyticsReport {
  const totalResponses = responses.length
  const uniquePhones = new Set(
    responses.map((r) => r.respondent_phone?.trim()).filter(Boolean)
  ).size

  const fieldAnalytics: FieldAnalytics[] = fields.map((field) => {
    const { buckets, answered } = countBucketsForField(field, responses)
    const denominator =
      field.field_type === 'checkbox' ? Math.max(answered, 1) : Math.max(totalResponses, 1)
    return {
      fieldId: field.id,
      label: field.label,
      type: field.field_type,
      answered,
      total: totalResponses,
      slices: buildSlices(buckets, denominator),
    }
  })

  const demographics: DemographicChart[] = []
  for (const { key, title } of DEMOGRAPHIC_KEYS) {
    const field = fieldForPrefillKey(fields, key)
    if (!field) continue
    const { buckets, answered } = countBucketsForField(field, responses)
    if (answered === 0) continue
    demographics.push({
      key,
      title,
      answered,
      slices: buildSlices(buckets, answered),
    })
  }

  const dayCounts = new Map<string, number>()
  for (const response of responses) {
    const day = response.submitted_at.slice(0, 10)
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1)
  }
  const sortedDays = Array.from(dayCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  let running = 0
  const cumulative: CumulativePoint[] = sortedDays.map(([date, count]) => {
    running += count
    const label = new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    })
    return { date, label, count, cumulative: running }
  })

  const now = Date.now()
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000
  const last7Days = responses.filter((r) => new Date(r.submitted_at).getTime() >= weekAgo).length

  const averageCompletion =
    totalResponses === 0
      ? 0
      : Math.round(
          fieldAnalytics.reduce((sum, item) => sum + (item.answered / Math.max(item.total, 1)) * 100, 0) /
            Math.max(fieldAnalytics.length, 1)
        )

  return {
    totalResponses,
    uniquePhones,
    averageCompletion,
    last7Days,
    fieldAnalytics,
    demographics,
    cumulative,
  }
}

export function formatResponseValue(value: unknown): string {
  return formatValue(value) || '—'
}
