/**
 * "One text per household": keep one person per household so a family gets one SMS.
 *
 * Per household the primary person is kept when they are in the list and reachable;
 * otherwise the first reachable person (in list order). If nobody in the household is
 * reachable the first one is kept, so the caller still counts them as skipped.
 * People with no household are always kept. Order of the kept items follows the input.
 */
export type HouseholdDedupeOptions<T> = {
  householdId: (item: T) => string | null | undefined
  userId: (item: T) => string | null | undefined
  /** e.g. "has a valid mobile number" (or "has an email" for email sends). */
  isReachable: (item: T) => boolean
  /** household id -> primary user id (missing / null when none is set). */
  primaryByHousehold?: Record<string, string | null | undefined>
}

export function onePerHousehold<T>(
  items: readonly T[],
  options: HouseholdDedupeOptions<T>
): { kept: T[]; dropped: T[] } {
  const { householdId, userId, isReachable, primaryByHousehold = {} } = options
  const chosen = new Map<string, number>()
  const byHousehold = new Map<string, number[]>()

  items.forEach((item, index) => {
    const hid = householdId(item)
    if (!hid) return
    const list = byHousehold.get(hid)
    if (list) list.push(index)
    else byHousehold.set(hid, [index])
  })

  byHousehold.forEach((indexes, hid) => {
    const primary = primaryByHousehold[hid]
    const primaryIndex = primary
      ? indexes.find((i) => userId(items[i]) === primary && isReachable(items[i]))
      : undefined
    const pick = primaryIndex ?? indexes.find((i) => isReachable(items[i])) ?? indexes[0]
    chosen.set(hid, pick)
  })

  const kept: T[] = []
  const dropped: T[] = []
  items.forEach((item, index) => {
    const hid = householdId(item)
    if (!hid || chosen.get(hid) === index) kept.push(item)
    else dropped.push(item)
  })
  return { kept, dropped }
}

/** Household ids present in a list, for looking up primaries. */
export function householdIdsOf<T>(items: readonly T[], householdId: (item: T) => string | null | undefined): string[] {
  const ids = new Set<string>()
  for (const item of items) {
    const id = householdId(item)
    if (id) ids.add(id)
  }
  return Array.from(ids)
}
