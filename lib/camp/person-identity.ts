/** Normalize a person's name for duplicate matching across camp imports. */
export function normalizePersonNameKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

type YearChip = {
  year_id: string
  year: number
  status: string
  registration_id: string
}

export type CamperDirectoryBucket = {
  phone_key: string
  full_name: string
  first_name?: string
  last_name?: string
  email?: string
  phone: string
  years: YearChip[]
  registration_count: number
}

export function mergeCamperDirectoryBuckets(
  buckets: Map<string, CamperDirectoryBucket>
): CamperDirectoryBucket[] {
  const withPhone: CamperDirectoryBucket[] = []
  const missingPhone: CamperDirectoryBucket[] = []

  for (const bucket of Array.from(buckets.values())) {
    if (bucket.phone_key.startsWith('missing:')) {
      missingPhone.push(bucket)
    } else {
      withPhone.push(bucket)
    }
  }

  const phoneByName = new Map<string, CamperDirectoryBucket>()
  for (const bucket of withPhone) {
    const nameKey = normalizePersonNameKey(bucket.full_name)
    if (nameKey) phoneByName.set(nameKey, bucket)
  }

  const mergedMissing = new Map<string, CamperDirectoryBucket>()

  for (const bucket of missingPhone) {
    const nameKey = normalizePersonNameKey(bucket.full_name)
    if (!nameKey) {
      mergedMissing.set(bucket.phone_key, bucket)
      continue
    }

    const phoneMatch = phoneByName.get(nameKey)
    if (phoneMatch) {
      mergeBucketInto(phoneMatch, bucket)
      continue
    }

    const existing = mergedMissing.get(nameKey)
    if (existing) {
      mergeBucketInto(existing, bucket)
    } else {
      mergedMissing.set(nameKey, {
        ...bucket,
        phone_key: `name:${nameKey}`,
      })
    }
  }

  return [...withPhone, ...Array.from(mergedMissing.values())]
}

function mergeBucketInto(target: CamperDirectoryBucket, source: CamperDirectoryBucket) {
  target.registration_count += source.registration_count
  for (const chip of source.years) {
    if (!target.years.some((item) => item.registration_id === chip.registration_id)) {
      target.years.push(chip)
    }
  }
  target.full_name = target.full_name || source.full_name
  target.first_name = target.first_name ?? source.first_name
  target.last_name = target.last_name ?? source.last_name
  target.email = target.email || source.email
  target.phone = target.phone || source.phone
}
