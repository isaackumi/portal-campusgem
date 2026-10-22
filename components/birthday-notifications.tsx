'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons'
import { useToast } from '@/hooks/use-toast'
import { useClientOnly } from '@/lib/hooks/use-client-only'
import { Badge } from '@/components/ui/badge'
import { PersonAvatar, displayName } from '@/components/ui/person'
import { ageTurningOnNextBirthday, daysUntilNextBirthday } from '@/lib/birthdays/upcoming-birthdays'

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

function PersonRow({ person, meta, onSend }: { person: BirthdayPerson; meta: string; onSend: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 py-3 last:border-0">
      <div className="flex min-w-0 items-center gap-3">
        <PersonAvatar name={person.name} seed={person.id} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {displayName(person.name)}
            </p>
            {person.role ? (
              <Badge variant="outline" className="capitalize">
                {person.role.replace(/_/g, ' ')}
              </Badge>
            ) : null}
          </div>
          <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">{meta}</p>
          {person.phone || person.email ? (
            <p className="mt-0.5 truncate text-xs text-neutral-400">
              {[person.phone, person.email].filter(Boolean).join(' · ')}
            </p>
          ) : null}
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={onSend} className="shrink-0">
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

  // Shared helpers parse date-only DOBs without the UTC shift `new Date(dob)` causes.
  /** "In 3 days · Turning 30 · CGM-0012"; the age is left out when the birth year isn't known. */
  const birthdayMeta = (person: BirthdayPerson, withCountdown: boolean): string => {
    if (!isMounted) return ''
    const days = daysUntilNextBirthday(person.dob)
    const age = ageTurningOnNextBirthday(person.dob)
    return [
      withCountdown ? (days === 0 ? 'Today' : `In ${days} day${days === 1 ? '' : 's'}`) : null,
      age ? `Turning ${age}` : null,
      person.membership_id,
    ]
      .filter(Boolean)
      .join(' · ')
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
            className="flex w-full cursor-pointer items-start justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 px-5 py-3 text-left"
            onClick={() => setIsTodayExpanded((v) => !v)}
            aria-expanded={isTodayExpanded}
          >
            <div>
              <h2 className="app-section-title">Today’s birthdays</h2>
              <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
                {todayBirthdays.length} member{todayBirthdays.length !== 1 ? 's' : ''} celebrating today
              </p>
            </div>
            {isTodayExpanded ? (
              <ChevronUpIcon className="mt-1 h-4 w-4 shrink-0 text-neutral-400" />
            ) : (
              <ChevronDownIcon className="mt-1 h-4 w-4 shrink-0 text-neutral-400" />
            )}
          </button>

          {isTodayExpanded ? (
            <div className="px-5 py-2">
              <div className="mb-2 flex justify-end">
                <Button
                  size="sm"
                  className="min-h-9 cursor-pointer bg-brand-600 text-white hover:bg-brand-700"
                  onClick={() => handleSendBulkMessage(todayBirthdays)}
                >
                  Message all
                </Button>
              </div>
              {todayBirthdays.map((person) => (
                <PersonRow
                  key={person.id}
                  person={person}
                  meta={birthdayMeta(person, false)}
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
            className="flex w-full cursor-pointer items-start justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 px-5 py-3 text-left"
            onClick={() => setIsUpcomingExpanded((v) => !v)}
            aria-expanded={isUpcomingExpanded}
          >
            <div>
              <h2 className="app-section-title">Upcoming birthdays</h2>
              <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
                Next 7 days · {upcomingBirthdays.length}
              </p>
            </div>
            {isUpcomingExpanded ? (
              <ChevronUpIcon className="mt-1 h-4 w-4 shrink-0 text-neutral-400" />
            ) : (
              <ChevronDownIcon className="mt-1 h-4 w-4 shrink-0 text-neutral-400" />
            )}
          </button>

          {isUpcomingExpanded ? (
            <div className="px-5 py-2">
              <div className="mb-2 flex justify-end">
                <Button size="sm" variant="outline" onClick={() => handleSendBulkMessage(upcomingBirthdays)}>
                  Message all
                </Button>
              </div>
              {upcomingBirthdays.map((person) => (
                <PersonRow
                  key={person.id}
                  person={person}
                  meta={birthdayMeta(person, true)}
                  onSend={() => handleSendMessage(person)}
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
