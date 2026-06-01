'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { DashboardLayout } from '@/components/dashboard-layout'
import { KioskForm } from '@/components/kiosk-form'
import { AppUser, Dependant } from '@/lib/types'
import { ServiceTypeMapper } from '@/lib/constants/service-types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  Users
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

  const handleCheckIn = async (member: AppUser, dependants: Dependant[] = []) => {
    setLoading(true)
    try {
      const memberDocId = (member as AppUser & { member?: { id: string } }).member?.id ?? member.id
      const serviceDate = new Date().toISOString().split('T')[0]
      const checkInTime = new Date().toISOString()

      const { error: memberError } = await dataService.recordAttendance({
        member_id: memberDocId,
        service_date: serviceDate,
        service_type: ServiceTypeMapper.toEnum(serviceType),
        check_in_time: checkInTime,
        status: 'present',
        checked_in_by: user?.id
      })
      if (memberError) throw new Error(memberError)

      for (const dependant of dependants) {
        const { error: dependantsError } = await dataService.recordAttendance({
          member_id: dependant.id,
          service_date: serviceDate,
          service_type: ServiceTypeMapper.toEnum(serviceType),
          check_in_time: checkInTime,
          status: 'present',
          checked_in_by: user?.id
        })
        if (dependantsError) throw new Error(dependantsError)
      }

      // Set check-in result with the provided data
      setCheckInResult({
        member: {
          id: member.id,
          full_name: member.full_name,
          membership_id: member.membership_id,
          phone: member.phone
        },
        dependants: dependants.map(d => ({
          id: d.id,
          name: d.first_name,
          relationship: d.relationship
        })),
        service_type: serviceType,
        timestamp: new Date().toISOString()
      })

      toast({
        title: "Check-in Successful",
        description: `${member.full_name} has been checked in successfully.`,
        variant: "default"
      })
    } catch (error) {
      console.error('Error checking in member:', error)
      toast({
        title: "Check-in Failed",
        description: "There was an error checking in the member. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleNewCheckIn = () => {
    setCheckInResult(null)
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2 flex items-center">
                <Monitor className="h-8 w-8 mr-3 text-primary" />
                Kiosk Mode
              </h1>
              <p className="text-slate-600">Self-service attendance check-in for members</p>
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
          {/* Kiosk Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2 text-primary" />
                  Member Check-in
                </CardTitle>
                <CardDescription>
                  Search for a member by membership ID, phone, or name to check them in
                </CardDescription>
              </CardHeader>
              <CardContent>
                <KioskForm 
                  onCheckInSuccess={handleCheckIn}
                />
              </CardContent>
            </Card>
          </div>

          {/* Check-in Result */}
          <div>
            {checkInResult ? (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="flex items-center text-green-800">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Check-in Successful
                  </CardTitle>
                  <CardDescription className="text-green-600">
                    Member has been successfully checked in
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {checkInResult.member.full_name}
                        </h3>
                        <p className="text-sm text-slate-600">
                          {formatMembershipIdForDisplay(checkInResult.member.membership_id)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="text-slate-600">Service:</span>
                        <span className="ml-2 font-medium">{checkInResult.service_type}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="text-slate-600">Time:</span>
                        <span className="ml-2 font-medium">
                          {formatDateTime(checkInResult.timestamp)}
                        </span>
                      </div>
                    </div>

                    {checkInResult.dependants && checkInResult.dependants.length > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center mb-2">
                          <Users className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="text-sm font-medium text-slate-600">Dependants:</span>
                        </div>
                        <div className="space-y-1">
                          {checkInResult.dependants.map((dependant) => (
                            <div key={dependant.id} className="text-sm text-slate-600">
                              • {dependant.name} ({dependant.relationship})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <Button 
                    onClick={handleNewCheckIn}
                    className="w-full"
                    variant="outline"
                  >
                    Check In Another Member
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Monitor className="h-5 w-5 mr-2 text-primary" />
                    Instructions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 text-sm text-slate-600">
                    <div className="flex items-start">
                      <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                        <span className="text-xs font-semibold text-primary">1</span>
                      </div>
                      <div>
                        <p className="font-medium">Search for Member</p>
                        <p>Enter membership ID, phone number, or name to find the member</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                        <span className="text-xs font-semibold text-primary">2</span>
                      </div>
                      <div>
                        <p className="font-medium">Select Dependants</p>
                        <p>Choose any family members to check in together</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                        <span className="text-xs font-semibold text-primary">3</span>
                      </div>
                      <div>
                        <p className="font-medium">Confirm Check-in</p>
                        <p>Review details and confirm the attendance</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <h4 className="font-medium text-slate-900 mb-2">Service Information</h4>
                    <div className="text-sm text-slate-700">
                      <p><strong>Service:</strong> {serviceTypes.find(s => s.value === serviceType)?.label}</p>
                      <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                      <p><strong>Time:</strong> {new Date().toLocaleTimeString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Navigate to other attendance features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                onClick={() => router.push('/attendance/scanner')}
                className="h-20 flex-col space-y-2"
              >
                <User className="h-6 w-6" />
                <span>QR Scanner</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/attendance/manual')}
                className="h-20 flex-col space-y-2"
              >
                <Users className="h-6 w-6" />
                <span>Manual Check-in</span>
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
    </DashboardLayout>
  )
}