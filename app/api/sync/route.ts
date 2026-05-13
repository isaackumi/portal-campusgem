import { NextRequest, NextResponse } from 'next/server'
import type { Attendance } from '@/lib/types'

function convexConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CONVEX_URL && process.env.CAMP_CONVEX_SERVER_SECRET)
}

export async function POST(request: NextRequest) {
  try {
    if (!convexConfigured()) {
      return NextResponse.json({ error: 'Convex is not configured for sync' }, { status: 503 })
    }

    const { table_name, operation, data, client_uuid } = await request.json()

    if (!table_name || !operation || !data || !client_uuid) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (table_name !== 'attendance' || operation !== 'INSERT') {
      return NextResponse.json(
        operation !== 'INSERT'
          ? { error: 'Unsupported operation for attendance table' }
          : { error: 'Unsupported table' },
        { status: 400 }
      )
    }

    const clientUuid = String(client_uuid)
    const { recordAttendanceInConvex } = await import('@/lib/convex/core-bridge')
    const result = await recordAttendanceInConvex({
      member_id: data.member_id,
      dependant_id: data.dependant_id,
      service_date: data.service_date,
      service_type: data.service_type,
      check_in_time: data.check_in_time || new Date().toISOString(),
      method: data.method || 'mobile',
      metadata: data.metadata || {},
      client_uuid: clientUuid,
      created_by: data.created_by,
      checked_in_by: data.checked_in_by ?? data.created_by,
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Data synced successfully',
    })
  } catch (error) {
    console.error('Sync API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!convexConfigured()) {
      return NextResponse.json({ error: 'Convex is not configured for sync' }, { status: 503 })
    }

    const { searchParams } = new URL(request.url)
    const client_uuid = searchParams.get('client_uuid')

    if (!client_uuid) {
      return NextResponse.json({ error: 'client_uuid is required' }, { status: 400 })
    }

    const { findAttendanceByClientUuidFromConvex } = await import('@/lib/convex/core-bridge')
    const record = await findAttendanceByClientUuidFromConvex(client_uuid)
    const synced_at = record?.created_at ?? null

    return NextResponse.json({
      exists: Boolean(record),
      synced: Boolean(record),
      synced_at,
      data: record as Attendance | null,
    })
  } catch (error) {
    console.error('Status check API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
