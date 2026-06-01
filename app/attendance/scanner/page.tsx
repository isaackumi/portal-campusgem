'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { QRScanner } from '@/components/qr-scanner'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2 flex items-center">
                <QrCode className="h-8 w-8 mr-3 text-primary" />
                Attendance Scanner
              </h1>
              <p className="text-slate-600">Scan member QR codes to check them in for service</p>
            </div>
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>

          {/* Service Type Selection */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Service Type</CardTitle>
              <CardDescription>Select the type of service for attendance</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger className="w-full">
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
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Scanner */}
          <div>
            <QRScanner 
              onScanSuccess={handleScanSuccess}
              onScanError={handleScanError}
            />
          </div>

          {/* Check-in Result */}
          <div>
            {checkInResult ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span>Check-in Successful</span>
                  </CardTitle>
                  <CardDescription>
                    Member has been checked in for today's service.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Member Info */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-lg">{checkInResult.member.full_name}</h3>
                        <p className="text-sm text-slate-600">
                          {formatMembershipIdForDisplay(checkInResult.member.membership_id)}
                        </p>
                        {checkInResult.member.phone && (
                          <p className="text-sm text-slate-600">
                            {checkInResult.member.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Service Details */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-slate-500" />
                      <span className="text-sm font-medium">Service:</span>
                      <span className="text-sm">{checkInResult.service_type}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-slate-500" />
                      <span className="text-sm font-medium">Time:</span>
                      <span className="text-sm">{formatDateTime(checkInResult.timestamp)}</span>
                    </div>
                  </div>

                  {/* Dependants */}
                  {checkInResult.dependants && checkInResult.dependants.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-slate-500" />
                        <span className="text-sm font-medium">Family Members:</span>
                      </div>
                      <div className="space-y-1">
                        {checkInResult.dependants.map((dependant) => (
                          <div key={dependant.id} className="text-sm text-slate-600 ml-6">
                            • {dependant.name} ({dependant.relationship})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-4 border-t">
                    <div className="flex space-x-2">
                      <Button onClick={handleNewScan} className="flex-1">
                        <QrCode className="h-4 w-4 mr-2" />
                        Scan Another
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => router.push('/attendance')}
                        className="flex-1"
                      >
                        View Attendance
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Ready to Scan</CardTitle>
                  <CardDescription>
                    Position the QR code within the scanner view to check in a member.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4">
                    <QrCode className="h-16 w-16 text-gray-400 mx-auto" />
                    <div className="space-y-2">
                      <p className="text-slate-600">
                        {loading ? 'Processing QR code...' : 'Waiting for QR code...'}
                      </p>
                      {loading && (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900 mx-auto"></div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Alternative ways to manage attendance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/attendance/kiosk')}
                  className="h-20 flex-col space-y-2"
                >
                  <Users className="h-6 w-6" />
                  <span>Kiosk Mode</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/attendance')}
                  className="h-20 flex-col space-y-2"
                >
                  <Calendar className="h-6 w-6" />
                  <span>View Attendance</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/dashboard')}
                  className="h-20 flex-col space-y-2"
                >
                  <ArrowLeft className="h-6 w-6" />
                  <span>Dashboard</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
