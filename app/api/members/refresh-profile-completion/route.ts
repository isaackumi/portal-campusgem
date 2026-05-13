import { NextRequest, NextResponse } from 'next/server'

/** Legacy endpoint: profile completion is driven by Convex; no Firebase ID tokens. */
export async function POST(_request: NextRequest) {
  return NextResponse.json({
    success: true,
    updated_count: 0,
    message: 'Profile completion refresh is a no-op (Convex-backed directory).',
  })
}
