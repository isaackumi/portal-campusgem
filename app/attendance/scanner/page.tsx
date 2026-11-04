'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { QRScanner } from '@/components/qr-scanner'
import { DashboardLayout } from '@/components/dashboard-layout'
import { PageHeader } from '@/components/layout/page-header'
import { PersonAvatar, displayName } from '@/components/ui/person'
import { PhoneLink, QuickContactButtons } from '@/components/contact/phone-link'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  QrCode, 
  ArrowLeft, 
  CheckCircle, 
  User,
  Calendar,
  Clock,
  Users
} from 'lucide-react'
import { dataService } from '@/lib/services/data-service'
import { useToast } from '@/hooks/use-toast'
import { formatMembershipIdForDisplay, formatDateTime } from '@/lib/utils'
import { LoadingSpinner } from '@/components/ui/loading'

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

export default function ScannerPage() {
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

  const handleScanSuccess = async (decodedText: string) => {
    setLoading(true)
    try {
      // Parse QR code data (assuming it contains membership ID or member data)
      let membershipId = decodedText.trim()
      
      // If QR contains JSON data, parse it
      try {
        const qrData = JSON.parse(decodedText)
        membershipId = qrData.membership_id || qrData.id || decodedText
      } catch {
        // If not JSON, treat as direct membership ID
        membershipId = decodedText
      }

      // Look up member by membership ID (search via getMembers)
      const today = new Date().toISOString().split('T')[0]
      const res = await dataService.getMembers(1, 500, membershipId)
      if (res.error) {
        toast({
          title: "Error",
          description: "Failed to look up member.",
          variant: "destructive"
        })
        return
      }
      const list = res.data ?? []
      const memberMatch = list.find(m => (m.user?.membership_id ?? '').toLowerCase() === membershipId.toLowerCase())
      if (!memberMatch?.user) {
        toast({
          title: "Member Not Found",
          description: "This QR code doesn't match any member in our system.",
          variant: "destructive"
        })
        return
      }

      const memberId = memberMatch.id
      const { data: existingList } = await dataService.getAttendanceRecords({
        member_id: memberId,
        service_date: today,
        limit: 1
      })
      if (existingList && existingList.length > 0) {
        toast({
          title: "Already Checked In",
          description: `${memberMatch.user.full_name} has already been checked in today.`,
          variant: "destructive"
        })
        return
      }

      const { error: checkInError } = await dataService.recordAttendance({
        member_id: memberId,
        service_date: today,
        service_type: serviceType,
        check_in_time: new Date().toISOString(),
        status: 'present',
        checked_in_by: user?.id ?? undefined
      })

      if (checkInError) {
        console.error('Check-in error:', checkInError)
        toast({
          title: "Check-in Failed",
          description: "Failed to check in member. Please try again.",
          variant: "destructive"
        })
        return
      }

      setCheckInResult({
        member: {
          id: memberMatch.user.id ?? memberId,
          full_name: memberMatch.user.full_name,
          membership_id: memberMatch.user.membership_id,
          phone: memberMatch.user.phone
        },
        dependants: (memberMatch.dependants ?? []).map(d => ({ id: d.id, name: `${d.first_name ?? ''} ${d.last_name ?? ''}`.trim() || 'Dependant', relationship: d.relationship })),
        service_type: serviceType,
        timestamp: new Date().toISOString()
      })

      toast({
        title: "Check-in Successful",
        description: `${memberMatch.user.full_name} has been checked in successfully!`,
      })

    } catch (error) {
      console.error('Scan processing error:', error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while processing the QR code.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleScanError = (error: string) => {
    console.error('Scan error:', error)
    toast({
      title: "Scan Error",
      description: "Failed to scan QR code. Please try again.",
      variant: "destructive"
    })
  }

  const handleNewScan = () => {
    setCheckInResult(null)
  }

  const serviceLabel = (value: string) => serviceTypes.find((s) => s.value === value)?.label ?? value

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title="Scanner"
          description="Scan member QR codes to check them in"
          className="mb-4 sm:mb-6"
          actions={
            <Button variant="outline" className="hidden sm:inline-flex" onClick={() => router.push('/attendance')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Attendance
            </Button>
          }
        />

        <div className="mb-4">
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
          <div className="min-w-0">
            <QRScanner onScanSuccess={handleScanSuccess} onScanError={handleScanError} />
          </div>

          <div className="min-w-0" aria-live="polite">
            {checkInResult ? (
              <div className="dashboard-panel space-y-4 p-4 sm:p-5">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle className="h-5 w-5" />
                  <h2 className="app-section-title text-emerald-700 dark:text-emerald-300">Checked in</h2>
                </div>

                <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-3 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-400/10 dark:ring-emerald-400/20">
                  <PersonAvatar name={checkInResult.member.full_name} seed={checkInResult.member.id} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                      {displayName(checkInResult.member.full_name)}
                    </p>
                    <p className="truncate font-mono text-[13px] text-neutral-600 dark:text-neutral-300">
                      {formatMembershipIdForDisplay(checkInResult.member.membership_id)}
                    </p>
                    {checkInResult.member.phone ? (
                      <PhoneLink
                        phone={checkInResult.member.phone}
                        name={checkInResult.member.full_name}
                        className="text-[13px] text-neutral-600 dark:text-neutral-300"
                      />
                    ) : null}
                  </div>
                  <QuickContactButtons phone={checkInResult.member.phone} name={checkInResult.member.full_name} />
                </div>

                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
                  <dt className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                    <Calendar className="h-4 w-4" /> Service
                  </dt>
                  <dd className="text-neutral-900 dark:text-neutral-100">{serviceLabel(checkInResult.service_type)}</dd>
                  <dt className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                    <Clock className="h-4 w-4" /> Time
                  </dt>
                  <dd className="tabular-nums text-neutral-900 dark:text-neutral-100">{formatDateTime(checkInResult.timestamp)}</dd>
                </dl>

                {checkInResult.dependants && checkInResult.dependants.length > 0 && (
                  <div>
                    <p className="app-overline mb-2 flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" /> Family
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

                <div className="flex flex-col gap-2 border-t border-neutral-200/80 pt-4 dark:border-white/[0.06] sm:flex-row">
                  <Button onClick={handleNewScan} className="h-11 flex-1">
                    <QrCode className="mr-2 h-4 w-4" />
                    Scan another
                  </Button>
                  <Button variant="outline" onClick={() => router.push('/attendance')} className="h-11 flex-1">
                    View attendance
                  </Button>
                </div>
              </div>
            ) : (
              <div className="dashboard-panel flex items-center gap-4 p-4 sm:flex-col sm:p-6 sm:text-center">
                <QrCode className="h-10 w-10 shrink-0 text-neutral-400 dark:text-neutral-500 sm:h-16 sm:w-16" />
                <div className="min-w-0">
                  <h2 className="app-section-title">{loading ? 'Processing…' : 'Ready to scan'}</h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {loading ? 'Looking up the member.' : 'Hold the QR code inside the scanner view.'}
                  </p>
                </div>
                {loading && <LoadingSpinner />}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => router.push('/attendance/kiosk')} className="h-12">
            <Users className="mr-2 h-4 w-4" />
            Kiosk mode
          </Button>
          <Button variant="outline" onClick={() => router.push('/attendance/manual')} className="h-12">
            <User className="mr-2 h-4 w-4" />
            Manual check-in
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
}
