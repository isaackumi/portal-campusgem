export interface BirthdayParts {
  birth_month?: number
  birth_day?: number
}

export function extractBirthdayParts(value: unknown): BirthdayParts {
  if (value == null || value === '') return {}

  const raw = String(value).trim()
  if (!raw) return {}

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (iso) {
    return {
      birth_month: Number(iso[2]),
      birth_day: Number(iso[3]),
    }
  }

  const slash = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (slash) {
    return {
      birth_month: Number(slash[2]),
      birth_day: Number(slash[1]),
    }
  }

  const text = raw.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)(?:,?\s+(\d{2,4}))?/i)
  if (text) {
    const month = monthNameToNumber(text[2])
    if (month) {
      return { birth_month: month, birth_day: Number(text[1]) }
    }
  }

  return {}
}

function monthNameToNumber(name: string): number | undefined {
  const months = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
  ]
  const index = months.findIndex((month) => name.toLowerCase().startsWith(month.slice(0, 3)))
  return index >= 0 ? index + 1 : undefined
}

export function birthdayPartsFromIsoDate(dateOfBirth?: string): BirthdayParts {
  if (!dateOfBirth) return {}
  return extractBirthdayParts(dateOfBirth)
}
