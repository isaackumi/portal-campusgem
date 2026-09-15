'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons'
import { useToast } from '@/hooks/use-toast'
import { useClientOnly } from '@/lib/hooks/use-client-only'
import { cn } from '@/lib/utils'

interface BirthdayPerson {
  id: string
  name: string
  dob: string
  phone?: string
  email?: string
  role?: string
  membership_id?: string
}

interface BirthdayNotificationsProps {
  todayBirthdays: BirthdayPerson[]
  upcomingBirthdays: BirthdayPerson[]
  onSendMessage?: (person: BirthdayPerson) => void
}

function PersonRow({
  person,
  meta,
  onSend,
}: {
  person: BirthdayPerson
  meta: string
  onSend: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-slate-900">{person.name}</p>
          {person.role ? (
            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {person.role}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-slate-500">{meta}</p>
        {person.phone || person.email ? (
          <p className="mt-0.5 truncate text-xs text-slate-400">
            {[person.phone, person.email].filter(Boolean).join(' · ')}
          </p>
        ) : null}
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={onSend}
        className="min-h-9 shrink-0 cursor-pointer border-slate-300"
      >
        Message
      </Button>
    </div>
  )
}

export function BirthdayNotifications({
  todayBirthdays,
  upcomingBirthdays,
  onSendMessage,
}: BirthdayNotificationsProps) {
  const [isTodayExpanded, setIsTodayExpanded] = useState(true)
  const [isUpcomingExpanded, setIsUpcomingExpanded] = useState(false)
  const isMounted = useClientOnly()
  const { toast } = useToast()

  const handleSendMessage = (person: BirthdayPerson) => {
    if (onSendMessage) {
      onSendMessage(person)
      return
    }
    toast({
      title: 'Birthday message queued',
      description: `Message prepared for ${person.name}`,
      variant: 'default',
    })
  }

  const handleSendBulkMessage = (people: BirthdayPerson[]) => {
    people.forEach((person) => handleSendMessage(person))
    toast({
      title: 'Birthday messages queued',
      description: `Prepared messages for ${people.length} people`,
      variant: 'default',
    })
  }

  const getAge = (dob: string): number => {
    if (!isMounted) return 0
    const today = new Date()
    const birthDate = new Date(dob)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const daysUntilBirthday = (dob: string): number => {
    if (!isMounted) return 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const birth = new Date(dob)
    const next = new Date(today.getFullYear(), birth.getMonth(), birth.getDate())
    if (next < today) next.setFullYear(today.getFullYear() + 1)
    return Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  if (todayBirthdays.length === 0 && upcomingBirthdays.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {todayBirthdays.length > 0 ? (
        <section className="dashboard-panel overflow-hidden">
          <button
            type="button"
            className="flex w-full cursor-pointer items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 text-left sm:px-6"
            onClick={() => setIsTodayExpanded((v) => !v)}
            aria-expanded={isTodayExpanded}
          >
            <div>
              <h2 className="app-section-title text-base">Today’s birthdays</h2>
              <p className="mt-1 text-sm text-slate-500">
                {todayBirthdays.length} member{todayBirthdays.length !== 1 ? 's' : ''} celebrating today
              </p>
            </div>
            {isTodayExpanded ? (
              <ChevronUpIcon className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
            ) : (
              <ChevronDownIcon className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
            )}
          </button>

          {isTodayExpanded ? (
            <div className="px-5 py-2 sm:px-6">
              <div className="mb-2 flex justify-end">
                <Button
                  size="sm"
                  className="min-h-9 cursor-pointer bg-slate-900 text-white hover:bg-slate-800"
                  onClick={() => handleSendBulkMessage(todayBirthdays)}
                >
                  Message all
                </Button>
              </div>
              {todayBirthdays.map((person) => (
                <PersonRow
                  key={person.id}
                  person={person}
                  meta={`Turning ${getAge(person.dob)}${person.membership_id ? ` · ${person.membership_id}` : ''}`}
                  onSend={() => handleSendMessage(person)}
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {upcomingBirthdays.length > 0 ? (
        <section className="dashboard-panel overflow-hidden">
          <button
            type="button"
            className="flex w-full cursor-pointer items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 text-left sm:px-6"
            onClick={() => setIsUpcomingExpanded((v) => !v)}
            aria-expanded={isUpcomingExpanded}
          >
            <div>
              <h2 className="app-section-title text-base">Upcoming birthdays</h2>
              <p className="mt-1 text-sm text-slate-500">Next 7 days · {upcomingBirthdays.length}</p>
            </div>
            {isUpcomingExpanded ? (
              <ChevronUpIcon className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
            ) : (
              <ChevronDownIcon className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
            )}
          </button>

          {isUpcomingExpanded ? (
            <div className="px-5 py-2 sm:px-6">
              <div className="mb-2 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-9 cursor-pointer border-slate-300"
                  onClick={() => handleSendBulkMessage(upcomingBirthdays)}
                >
                  Message all
                </Button>
              </div>
              {upcomingBirthdays.map((person) => {
                const days = daysUntilBirthday(person.dob)
                return (
                  <PersonRow
                    key={person.id}
                    person={person}
                    meta={cn(
                      days === 0 ? 'Today' : `In ${days} day${days !== 1 ? 's' : ''}`,
                      `· turning ${getAge(person.dob) + 1}`,
                      person.membership_id ? `· ${person.membership_id}` : ''
                    )}
                    onSend={() => handleSendMessage(person)}
                  />
                )
              })}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
