'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check, CheckCircle, ChevronRight, Search } from 'lucide-react'
import { PersonAvatar, displayName } from '@/components/ui/person'
import { dataService } from '@/lib/services/data-service'
import { AppUser, Member, Dependant, ServiceType } from '@/lib/types'
import { cn, formatMembershipIdForDisplay, formatPhoneNumber } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface KioskFormProps {
  /** Called after the member (and any chosen dependants) have been recorded. */
  onCheckInSuccess: (member: AppUser, dependants?: Dependant[]) => void
  className?: string
  /** When the page already picks the service, pass it here and the form hides its own picker. */
  serviceType?: ServiceType
  /** The signed-in user doing the check-in, if supervised. */
  checkedInBy?: string
}

export function KioskForm({ onCheckInSuccess, className, serviceType: serviceTypeProp, checkedInBy }: KioskFormProps) {
  const [searchInput, setSearchInput] = useState('')
  const [searchResults, setSearchResults] = useState<(AppUser & { member?: Member })[]>([])
  const [selectedMember, setSelectedMember] = useState<(AppUser & { member?: Member }) | null>(null)
  const [dependants, setDependants] = useState<Dependant[]>([])
  const [selectedDependants, setSelectedDependants] = useState<string[]>([])
  const [serviceTypeState, setServiceType] = useState<ServiceType>('sunday_service')
  const serviceType = serviceTypeProp ?? serviceTypeState
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
      const checkedInByUserId: string | null = checkedInBy ?? null

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

  const selectedIds = new Set(selectedDependants)

  return (
    <div className={cn('space-y-4', className)}>
      {!selectedMember ? (
        <div className="space-y-4">
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault()
              void handleSearch()
            }}
          >
            <Label htmlFor="kiosk-search" className="sr-only">
              Search member
            </Label>
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
              <Input
                id="kiosk-search"
                placeholder="Membership ID, phone or name"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                autoComplete="off"
                enterKeyHint="search"
                className="h-12 pl-10 text-base"
              />
            </div>
            <Button type="submit" className="h-12 sm:px-6" disabled={searching || !searchInput.trim()}>
              {searching ? 'Searching…' : 'Search'}
            </Button>
          </form>

          {searchResults.length > 0 && (
            <div>
              <p className="app-overline mb-2">
                {searchResults.length} {searchResults.length === 1 ? 'match' : 'matches'}
              </p>
              <ul className="max-h-[50vh] space-y-2 overflow-y-auto overscroll-contain">
                {searchResults.map((member) => (
                  <li key={member.id}>
                    <button
                      type="button"
                      className="flex min-h-14 w-full items-center gap-3 rounded-lg border border-neutral-200/80 p-3 text-left transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 active:bg-neutral-100 dark:border-white/[0.08] dark:hover:bg-white/[0.04] dark:active:bg-white/[0.08]"
                      onClick={() => handleSelectMember(member)}
                    >
                      <PersonAvatar name={member.full_name} seed={member.id} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                          {displayName(member.full_name)}
                        </p>
                        <p className="truncate text-[13px] text-neutral-500 dark:text-neutral-400">
                          {member.membership_id ? (
                            <span className="font-mono">{formatMembershipIdForDisplay(member.membership_id)}</span>
                          ) : null}
                          {member.membership_id && member.phone ? ' · ' : null}
                          {member.phone ? <span className="font-mono">{formatPhoneNumber(member.phone)}</span> : null}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-neutral-400 dark:text-neutral-500" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-neutral-50 p-3 ring-1 ring-inset ring-neutral-200/80 dark:bg-white/[0.04] dark:ring-white/[0.06]">
            <PersonAvatar name={selectedMember.full_name} seed={selectedMember.id} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-neutral-900 dark:text-neutral-100">
                {displayName(selectedMember.full_name)}
              </p>
              <p className="truncate text-[13px] text-neutral-500 dark:text-neutral-400">
                {selectedMember.membership_id ? (
                  <span className="font-mono">{formatMembershipIdForDisplay(selectedMember.membership_id)}</span>
                ) : null}
                {selectedMember.membership_id && selectedMember.phone ? ' · ' : null}
                {selectedMember.phone ? <span className="font-mono">{formatPhoneNumber(selectedMember.phone)}</span> : null}
              </p>
            </div>
            <Button variant="ghost" className="h-11 shrink-0" onClick={resetForm}>
              Change
            </Button>
          </div>

          {!serviceTypeProp && (
            <div className="space-y-2">
              <Label htmlFor="service-type">Service</Label>
              <select
                id="service-type"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value as ServiceType)}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-base sm:text-sm"
              >
                <option value="sunday_service">Sunday Service</option>
                <option value="midweek_service">Midweek Service</option>
                <option value="prayer_meeting">Prayer Meeting</option>
                <option value="youth_service">Youth Service</option>
                <option value="children_service">Children Service</option>
                <option value="special_event">Special Event</option>
              </select>
            </div>
          )}

          {dependants.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="app-overline mb-2">Family checking in too (optional)</legend>
              <div className="max-h-56 space-y-2 overflow-y-auto overscroll-contain">
                {dependants.map((dependant) => {
                  const on = selectedIds.has(dependant.id)
                  return (
                    <button
                      type="button"
                      key={dependant.id}
                      aria-pressed={on}
                      className={cn(
                        'flex min-h-14 w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
                        on
                          ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-400/30 dark:bg-emerald-400/10'
                          : 'border-neutral-200/80 hover:bg-neutral-50 dark:border-white/[0.08] dark:hover:bg-white/[0.04]'
                      )}
                      onClick={() => handleDependantToggle(dependant.id)}
                    >
                      <span
                        className={cn(
                          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2',
                          on
                            ? 'border-emerald-500 bg-emerald-500 dark:border-emerald-400 dark:bg-emerald-400'
                            : 'border-neutral-300 dark:border-neutral-600'
                        )}
                      >
                        {on && <Check className="h-4 w-4 text-white dark:text-neutral-900" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-neutral-900 dark:text-neutral-100">
                          {dependant.first_name}
                        </span>
                        <span className="block text-sm capitalize text-neutral-500 dark:text-neutral-400">
                          {dependant.relationship}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </fieldset>
          )}

          <div className="grid grid-cols-[auto_1fr] gap-2 pt-2">
            <Button onClick={resetForm} variant="outline" className="h-12">
              Cancel
            </Button>
            <Button onClick={handleCheckIn} disabled={loading} className="h-12 text-base">
              {loading ? (
                'Checking in…'
              ) : (
                <>
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Check in{selectedDependants.length ? ` (${selectedDependants.length + 1})` : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
