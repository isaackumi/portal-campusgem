import type { AgeRange } from '@/lib/types'

const RANGE_MAX: Record<AgeRange, number> = {
  '0_12': 12,
  '13_17': 17,
  '18_35': 35,
  '36_59': 59,
  '60_plus': 200,
}

export function ageYearsFromDob(dob?: string, asOf = new Date()): number | undefined {
  const raw = dob?.trim()
  if (!raw) return undefined
  const birth = new Date(raw)
  if (Number.isNaN(birth.getTime())) return undefined
  let age = asOf.getFullYear() - birth.getFullYear()
  const monthDiff = asOf.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < birth.getDate())) age -= 1
  if (age < 0 || age > 120) return undefined
  return age
}

export function ageRangeFromYears(age: number): AgeRange {
  if (age <= 12) return '0_12'
  if (age <= 17) return '13_17'
  if (age <= 35) return '18_35'
  if (age <= 59) return '36_59'
  return '60_plus'
}

export function resolveAgeRange(args: {
  age_range?: AgeRange
  dob?: string
  asOf?: Date
}): AgeRange | undefined {
  if (args.age_range) return args.age_range
  const years = ageYearsFromDob(args.dob, args.asOf)
  if (years == null) return undefined
  return ageRangeFromYears(years)
}

export function isChildAgeRange(range?: AgeRange): boolean {
  return range === '0_12'
}

export function ageRangeIncludes(range: AgeRange, age: number): boolean {
  if (range === '0_12') return age <= RANGE_MAX['0_12']
  if (range === '13_17') return age >= 13 && age <= 17
  if (range === '18_35') return age >= 18 && age <= 35
  if (range === '36_59') return age >= 36 && age <= 59
  return age >= 60
}
