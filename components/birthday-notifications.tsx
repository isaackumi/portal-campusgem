'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Cake, 
  Bell, 
  MessageSquare, 
  Users, 
  Calendar,
  ChevronDown,
  ChevronUp,
  Send,
  Phone,
  Mail
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useClientOnly } from '@/lib/hooks/use-client-only'

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

export function BirthdayNotifications({ 
  todayBirthdays, 
  upcomingBirthdays, 
  onSendMessage 
}: BirthdayNotificationsProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isTodayExpanded, setIsTodayExpanded] = useState(true)
  const [isUpcomingExpanded, setIsUpcomingExpanded] = useState(false)
  const isMounted = useClientOnly()
  const { toast } = useToast()

  const handleSendMessage = (person: BirthdayPerson) => {
    if (onSendMessage) {
      onSendMessage(person)
    } else {
      // Dummy SMS functionality
      toast({
        title: "Birthday Message Sent! 🎉",
        description: `Happy birthday message sent to ${person.name}`,
        variant: "default"
      })
    }
  }

  const handleSendBulkMessage = (people: BirthdayPerson[]) => {
    people.forEach(person => {
      handleSendMessage(person)
    })
    
    toast({
      title: "Bulk Birthday Messages Sent! 🎉",
      description: `Sent birthday messages to ${people.length} people`,
      variant: "default"
    })
  }

  const getAge = (dob: string): number => {
    if (!isMounted) return 0 // Prevent hydration mismatch
    
    const today = new Date()
    const birthDate = new Date(dob)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    
    return age
  }

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'pastor': return 'bg-purple-100 text-purple-800'
      case 'elder': return 'bg-slate-100 text-slate-700'
      case 'member': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (todayBirthdays.length === 0 && upcomingBirthdays.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Today's Birthdays */}
      {todayBirthdays.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader 
            className="cursor-pointer"
            onClick={() => setIsTodayExpanded(!isTodayExpanded)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-orange-800">
                  Today's Birthdays ({todayBirthdays.length})
                </CardTitle>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  {todayBirthdays.length} birthday{todayBirthdays.length !== 1 ? 's' : ''}
                </Badge>
                {isTodayExpanded ? (
                  <ChevronUp className="h-4 w-4 text-orange-600" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-orange-600" />
                )}
              </div>
            </div>
            <CardDescription className="text-orange-700">
              {todayBirthdays.length === 1 
                ? "Someone is celebrating their birthday today!" 
                : "Multiple people are celebrating their birthdays today!"
              }
            </CardDescription>
          </CardHeader>
          
          {isTodayExpanded && (
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 mb-4">
                <Button 
                  size="sm" 
                  onClick={() => handleSendBulkMessage(todayBirthdays)}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send All Messages
                </Button>
              </div>
              
              <div className="grid gap-3">
                {todayBirthdays.map((person) => (
                  <div 
                    key={person.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <Cake className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-slate-900">{person.name}</h4>
                          <Badge className={getRoleColor(person.role)}>
                            {person.role || 'member'}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">
                          Turning {getAge(person.dob)} today • {person.membership_id}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-slate-500 mt-1">
                          {person.phone && (
                            <span className="flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {person.phone}
                            </span>
                          )}
                          {person.email && (
                            <span className="flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {person.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleSendMessage(person)}
                        className="border-orange-300 text-orange-700 hover:bg-orange-50"
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Send Message
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Upcoming Birthdays */}
      {upcomingBirthdays.length > 0 && (
        <Card>
          <CardHeader 
            className="cursor-pointer"
            onClick={() => setIsUpcomingExpanded(!isUpcomingExpanded)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle>
                  Upcoming Birthdays ({upcomingBirthdays.length})
                </CardTitle>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">
                  {upcomingBirthdays.length} upcoming
                </Badge>
                {isUpcomingExpanded ? (
                  <ChevronUp className="h-4 w-4 text-slate-600" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-600" />
                )}
              </div>
            </div>
            <CardDescription>
              Birthdays coming up in the next 7 days
            </CardDescription>
          </CardHeader>
          
          {isUpcomingExpanded && (
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 mb-4">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleSendBulkMessage(upcomingBirthdays)}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send All Messages
                </Button>
              </div>
              
              <div className="grid gap-3">
                {upcomingBirthdays.map((person) => {
                  const daysUntil = Math.ceil(
                    (new Date(person.dob).setFullYear(new Date().getFullYear()) - new Date().getTime()) / (1000 * 60 * 60 * 24)
                  )
                  
                  return (
                    <div 
                      key={person.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                          <Cake className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-slate-900">{person.name}</h4>
                            <Badge className={getRoleColor(person.role)}>
                              {person.role || 'member'}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600">
                            {daysUntil === 0 ? 'Today' : `In ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`} • 
                            Turning {getAge(person.dob) + 1} • {person.membership_id}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleSendMessage(person)}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Send Message
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}
