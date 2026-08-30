'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { CommsCenterView } from '@/components/comms/comms-center-view'
import { LoadingSpinner } from '@/components/ui/loading'

export default function AdminCommunicationsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth?redirect=' + encodeURIComponent('/admin/communications'))
    }
  }, [user, loading, router])

  if (loading || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return <CommsCenterView />
}
