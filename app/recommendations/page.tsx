'use client'

import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Gift, ArrowLeft, Users, Heart } from 'lucide-react'

export default function RecommendationsPage() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <Card className="border-rose-100 bg-gradient-to-br from-rose-50/50 to-white shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gift className="h-6 w-6 text-rose-600" />
              <CardTitle>Recommendations</CardTitle>
            </div>
            <CardDescription>Pastoral care prompts and follow-up ideas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Use <strong>Members</strong> and <strong>Visitors</strong> lists for now; camp follow-ups live under
              Camp admin.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/members">
                  <Users className="mr-2 h-4 w-4" />
                  Members
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/celebrations">
                  <Heart className="mr-2 h-4 w-4" />
                  Birthdays &amp; anniversaries
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
