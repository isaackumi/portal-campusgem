'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { DashboardLayout } from '@/components/dashboard-layout'
import { KioskForm } from '@/components/kiosk-form'
import { AppUser, Dependant, ServiceType } from '@/lib/types'
import { ServiceTypeMapper } from '@/lib/constants/service-types'
import { PageHeader } from '@/components/layout/page-header'
import { PersonAvatar, displayName } from '@/components/ui/person'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingSpinner } from '@/components/ui/loading'
import { 
  Monitor, 
  ArrowLeft, 
  CheckCircle, 
  User,
  Calendar,
  Clock,
  Users,
  QrCode
} from 'lucide-react'
import { dataService } from '@/lib/services/data-service'
import { useToast } from '@/hooks/use-toast'
import { formatMembershipIdForDisplay, formatDateTime } from '@/lib/utils'

interface CheckInResult {
  member: {
    id: string
    full_name: string
    membership_id: string
    phone?: string
  }
  dependants?: Array<{
    id: string
    name: string
    relationship: string
  }>
  service_type: string
  timestamp: string
}

export default function KioskPage() {
  const { user, loading: authLoading } = useAuth()
  const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [serviceType, setServiceType] = useState('sunday_service')
  const router = useRouter()
  const { toast } = useToast()

  const serviceTypes = [
    { value: 'sunday_service', label: 'Sunday Service' },
    { value: 'midweek_service', label: 'Midweek Service' },
    { value: 'prayer_meeting', label: 'Prayer Meeting' },
    { value: 'youth_service', label: 'Youth Service' },
    { value: 'children_service', label: 'Children Service' },
    { value: 'special_event', label: 'Special Event' }
  ]

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    )
  }

  if (!user) {
    return null
  }

  // KioskForm records the attendance itself; this only shows the confirmation.
  const handleCheckIn = (member: AppUser, dependants: Dependant[] = []) => {
    setCheckInResult({
      member: {
        id: member.id,
        full_name: member.full_name,
        membership_id: member.membership_id,
        phone: member.phone,
      },
      dependants: dependants.map((d) => ({
        id: d.id,
        name: d.first_name,
        relationship: d.relationship,
      })),
      service_type: serviceType,
      timestamp: new Date().toISOString(),
    })
  }

  const handleNewCheckIn = () => {
    setCheckInResult(null)
  }

  const serviceLabel = (value: string) => serviceTypes.find((s) => s.value === value)?.label ?? value

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <PageHeader
          title="Kiosk"
          description="Self-service check-in for members"
          className="mb-4 sm:mb-6"
          actions={
            <Button variant="outline" className="hidden sm:inline-flex" onClick={() => router.push('/attendance')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Attendance
            </Button>
          }
        />

        <div className="mb-4" data-tour="kiosk-service">
          <Select value={serviceType} onValueChange={setServiceType}>
            <SelectTrigger className="h-11 w-full sm:max-w-xs" aria-label="Service type">
              <SelectValue placeholder="Select service type" />
            </SelectTrigger>
            <SelectContent>
              {serviceTypes.map((service) => (
                <SelectItem key={service.value} value={service.value}>
                  {service.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <div className="dashboard-panel min-w-0 p-4 sm:p-5" data-tour="kiosk-form">
            <div className="mb-4">
              <h2 className="app-section-title flex items-center gap-2">
                <User className="h-5 w-5 text-brand-600 dark:text-brand-300" />
                Member check-in
              </h2>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Search by membership ID, phone or name.
              </p>
            </div>
            <KioskForm
              onCheckInSuccess={handleCheckIn}
              serviceType={ServiceTypeMapper.toEnum(serviceType) as ServiceType}
              checkedInBy={user?.id}
            />
          </div>

          <div className={checkInResult ? 'order-first min-w-0 lg:order-none' : 'min-w-0'} aria-live="polite" data-tour="kiosk-result">
            {checkInResult ? (
              <div className="dashboard-panel space-y-4 p-4 ring-1 ring-inset ring-emerald-600/20 dark:ring-emerald-400/20 sm:p-5">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle className="h-5 w-5" />
                  <h2 className="app-section-title text-emerald-700 dark:text-emerald-300">Checked in</h2>
                </div>

                <div className="flex items-center gap-3">
                  <PersonAvatar name={checkInResult.member.full_name} seed={checkInResult.member.id} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-neutral-900 dark:text-neutral-100">
                      {displayName(checkInResult.member.full_name)}
                    </p>
                    <p className="truncate font-mono text-[13px] text-neutral-500 dark:text-neutral-400">
                      {formatMembershipIdForDisplay(checkInResult.member.membership_id)}
                    </p>
                  </div>
                </div>

                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
                  <dt className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                    <Calendar className="h-4 w-4" /> Service
                  </dt>
                  <dd className="font-medium text-neutral-900 dark:text-neutral-100">{serviceLabel(checkInResult.service_type)}</dd>
                  <dt className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                    <Clock className="h-4 w-4" /> Time
                  </dt>
                  <dd className="font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
                    {formatDateTime(checkInResult.timestamp)}
                  </dd>
                </dl>

                {checkInResult.dependants && checkInResult.dependants.length > 0 && (
                  <div>
                    <p className="app-overline mb-2 flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" /> Dependants
                    </p>
                    <ul className="space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
                      {checkInResult.dependants.map((dependant) => (
                        <li key={dependant.id} className="truncate">
                          {dependant.name} <span className="text-neutral-500 dark:text-neutral-400">({dependant.relationship})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button onClick={handleNewCheckIn} className="h-12 w-full">
                  Check in another member
                </Button>
              </div>
            ) : (
              <div className="dashboard-panel space-y-4 p-4 sm:p-5">
                <h2 className="app-section-title flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-brand-600 dark:text-brand-300" />
                  How it works
                </h2>
                <ol className="space-y-3 text-sm text-neutral-600 dark:text-neutral-300">
                  {[
                    ['Find yourself', 'Enter your membership ID, phone number or name.'],
                    ['Add family', 'Pick any dependants checking in with you.'],
                    ['Confirm', 'Tap check in. That is it.'],
                  ].map(([title, body], i) => (
                    <li key={title} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700 dark:bg-brand-400/10 dark:text-brand-300">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">{title}</p>
                        <p>{body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700 ring-1 ring-inset ring-neutral-200/80 dark:bg-white/[0.04] dark:text-neutral-300 dark:ring-white/[0.06]">
                  <p className="app-overline mb-1">Today</p>
                  <p>
                    {serviceLabel(serviceType)} · {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => router.push('/attendance/scanner')} className="h-12">
            <QrCode className="mr-2 h-4 w-4" />
            QR scanner
          </Button>
          <Button variant="outline" onClick={() => router.push('/attendance/manual')} className="h-12">
            <Users className="mr-2 h-4 w-4" />
            Manual check-in
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
}
