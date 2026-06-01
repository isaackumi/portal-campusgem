'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Monitor, 
  User, 
  Search, 
  CheckCircle, 
  Users,
  Clock,
  Calendar
} from 'lucide-react'
import { dataService } from '@/lib/services/data-service'
import { AppUser, Member, Dependant, ServiceType } from '@/lib/types'
import { formatMembershipIdForDisplay, formatPhoneNumber } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface KioskFormProps {
  onCheckInSuccess: (member: AppUser, dependants?: Dependant[]) => void
  className?: string
}

export function KioskForm({ onCheckInSuccess, className }: KioskFormProps) {
  const [searchInput, setSearchInput] = useState('')
  const [searchResults, setSearchResults] = useState<(AppUser & { member?: Member })[]>([])
  const [selectedMember, setSelectedMember] = useState<(AppUser & { member?: Member }) | null>(null)
  const [dependants, setDependants] = useState<Dependant[]>([])
  const [selectedDependants, setSelectedDependants] = useState<string[]>([])
  const [serviceType, setServiceType] = useState<ServiceType>('sunday_service')
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  
  const { toast } = useToast()

  const handleSearch = async () => {
    if (!searchInput.trim()) return

    setSearching(true)
    try {
      const query = searchInput.trim()
      const res = await dataService.getMembers(1, 20, query)
      if (res.error) {
        toast({
          title: "Search Error",
          description: "Failed to search for members. Please try again.",
          variant: "destructive"
        })
        return
      }
      const list = res.data ?? []
      const transformedResults = list
        .filter(m => m.user)
        .map(m => ({
          ...m.user!,
          member: m
        }))
      setSearchResults(transformedResults)
    } catch (error) {
      console.error('Search error:', error)
      toast({
        title: "Search Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSearching(false)
    }
  }

  const handleSelectMember = async (member: AppUser & { member?: Member }) => {
    setSelectedMember(member)
    setSearchResults([])
    setSearchInput('')

    // Dependants from member if available
    if (member.member?.dependants) {
      setDependants(member.member.dependants)
    } else {
      setDependants([])
    }
  }

  const handleDependantToggle = (dependantId: string) => {
    setSelectedDependants(prev => 
      prev.includes(dependantId) 
        ? prev.filter(id => id !== dependantId)
        : [...prev, dependantId]
    )
  }

  const handleCheckIn = async () => {
    if (!selectedMember || !selectedMember.member) return

    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const checkedInByUserId: string | null = null // Kiosk self-service; could use useAuth() if supervised

      const { error: memberError } = await dataService.recordAttendance({
        member_id: selectedMember.member.id,
        service_date: today,
        service_type: serviceType,
        check_in_time: new Date().toISOString(),
        status: 'present',
        checked_in_by: checkedInByUserId ?? undefined
      })

      if (memberError) {
        console.error('Check-in error:', memberError)
        toast({
          title: "Check-in Error",
          description: "Failed to check in member. Please try again.",
          variant: "destructive"
        })
        return
      }

      for (const dependantId of selectedDependants) {
        const { error: dependantsError } = await dataService.recordAttendance({
          member_id: dependantId,
          service_date: today,
          service_type: serviceType,
          check_in_time: new Date().toISOString(),
          status: 'present',
          checked_in_by: checkedInByUserId ?? undefined
        })
        if (dependantsError) {
          console.error('Dependant check-in error:', dependantsError)
          toast({
            title: "Partial Check-in",
            description: "Member checked in, but some family members failed to check in.",
            variant: "destructive"
          })
        }
      }

      toast({
        title: "Check-in Successful",
        description: `${selectedMember.full_name} has been checked in successfully.`,
      })

      onCheckInSuccess(selectedMember, dependants.filter(d => selectedDependants.includes(d.id)))

      // Reset form
      setSelectedMember(null)
      setDependants([])
      setSelectedDependants([])
      setSearchInput('')

    } catch (error) {
      console.error('Check-in error:', error)
      toast({
        title: "Check-in Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedMember(null)
    setDependants([])
    setSelectedDependants([])
    setSearchInput('')
    setSearchResults([])
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Monitor className="h-5 w-5" />
          <span>Kiosk Check-in</span>
        </CardTitle>
        <CardDescription>
          Search for a member and check them in for today's service.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {!selectedMember ? (
            // Search Phase
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search Member</Label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Enter membership ID, phone, or name..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={handleSearch} disabled={searching || !searchInput.trim()}>
                    {searching ? 'Searching...' : 'Search'}
                  </Button>
                </div>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-slate-700">Search Results:</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {searchResults.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 cursor-pointer"
                        onClick={() => handleSelectMember(member)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{member.full_name}</p>
                            <div className="text-sm text-slate-500 space-x-2">
                              {member.membership_id && (
                                <span>{formatMembershipIdForDisplay(member.membership_id)}</span>
                              )}
                              {member.phone && (
                                <span>{formatPhoneNumber(member.phone)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Select
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Check-in Phase
            <div className="space-y-4">
              {/* Selected Member */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-lg">{selectedMember.full_name}</h3>
                      <div className="text-sm text-slate-600 space-x-2">
                        {selectedMember.membership_id && (
                          <span>{formatMembershipIdForDisplay(selectedMember.membership_id)}</span>
                        )}
                        {selectedMember.phone && (
                          <span>{formatPhoneNumber(selectedMember.phone)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={resetForm}>
                    Change
                  </Button>
                </div>
              </div>

              {/* Service Type */}
              <div className="space-y-2">
                <Label htmlFor="service-type">Service Type</Label>
                <select
                  id="service-type"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value as ServiceType)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="sunday_service">Sunday Service</option>
                  <option value="midweek_service">Midweek Service</option>
                  <option value="prayer_meeting">Prayer Meeting</option>
                  <option value="youth_service">Youth Service</option>
                  <option value="children_service">Children Service</option>
                  <option value="special_event">Special Event</option>
                </select>
              </div>

              {/* Dependants */}
              {dependants.length > 0 && (
                <div className="space-y-3">
                  <Label>Family Members (Optional)</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {dependants.map((dependant) => (
                      <div
                        key={dependant.id}
                        className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer ${
                          selectedDependants.includes(dependant.id)
                            ? 'bg-green-50 border-green-200'
                            : 'hover:bg-slate-50'
                        }`}
                        onClick={() => handleDependantToggle(dependant.id)}
                      >
                        <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${
                          selectedDependants.includes(dependant.id)
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300'
                        }`}>
                          {selectedDependants.includes(dependant.id) && (
                            <CheckCircle className="h-4 w-4 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{dependant.first_name}</p>
                          <p className="text-sm text-slate-500 capitalize">{dependant.relationship}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Check-in Button */}
              <div className="flex space-x-2 pt-4">
                <Button onClick={resetForm} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleCheckIn} 
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    'Checking In...'
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Check In
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h4 className="font-medium text-slate-900 mb-2">Instructions:</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• Search for a member by ID, phone, or name</li>
              <li>• Select the member from search results</li>
              <li>• Choose service type and optional family members</li>
              <li>• Click "Check In" to complete the process</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
