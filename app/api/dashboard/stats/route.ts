import { NextResponse } from 'next/server'
import type { DashboardStats } from '@/lib/types'

const CACHE_TTL_MS = 15_000

let cachedStats: { stats: DashboardStats; expiresAt: number } | null = null

function emptyDashboardStats(): DashboardStats {
  return {
    total_members: 0,
    active_members: 0,
    visitors: 0,
    today_attendance: 0,
    weekly_attendance: 0,
    monthly_donations: 0,
    pending_pledges: 0,
    prayer_requests: 0,
    upcoming_birthdays: 0,
    upcoming_anniversaries: 0,
    groups_count: 0,
    recent_visitors: 0,
    attendance_rate: 0,
    visitor_conversion_rate: 0,
    male_attendance: 0,
    female_attendance: 0,
    adult_attendance: 0,
    children_attendance: 0,
    total_attendance: 0,
  }
}

export async function GET() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL || !process.env.CAMP_CONVEX_SERVER_SECRET) {
    return NextResponse.json({ error: 'Convex is not configured' }, { status: 503 })
  }

  const now = Date.now()
  if (cachedStats && cachedStats.expiresAt > now) {
    return NextResponse.json({ stats: cachedStats.stats, cached: true })
  }

  try {
    const { fetchDashboardStatsFromConvex } = await import('@/lib/convex/core-bridge')
    const stats = await fetchDashboardStatsFromConvex()
    cachedStats = { stats, expiresAt: now + CACHE_TTL_MS }
    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Dashboard stats error:', error)

    if (cachedStats) {
      return NextResponse.json({ stats: cachedStats.stats, cached: true, stale: true })
    }

    const message = error instanceof Error ? error.message : ''
    const cause =
      error instanceof Error
        ? (error as Error & { cause?: { code?: string } }).cause
        : undefined
    if (message.includes('fetch failed') || cause?.code === 'ETIMEDOUT') {
      return NextResponse.json(
        {
          stats: emptyDashboardStats(),
          degraded: true,
          error: 'Convex is temporarily unreachable. Showing empty dashboard stats.',
        },
        { status: 200 }
      )
    }

    return NextResponse.json({ error: 'Failed to load dashboard stats' }, { status: 500 })
  }
}
