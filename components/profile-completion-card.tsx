'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { CheckCircle, Circle, User, Phone, Mail, MapPin, Calendar, Users, FileText, Camera } from 'lucide-react'
import { AppUser, Member } from '@/lib/types'
import Link from 'next/link'

interface ProfileCompletionCardProps {
  user: AppUser
  member?: Member
}

interface CompletionItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  completed: boolean
  weight: number
  href?: string
}

export function ProfileCompletionCard({ user, member }: ProfileCompletionCardProps) {
  const completionItems: CompletionItem[] = [
    {
      id: 'phone',
      label: 'Phone Number',
      icon: Phone,
      completed: !!(user.phone && user.phone.trim()),
      weight: 15,
      href: '/profile/edit'
    },
    {
      id: 'email',
      label: 'Email Address',
      icon: Mail,
      completed: !!(user.email && user.email.trim()),
      weight: 10,
      href: '/profile/edit'
    },
    {
      id: 'photo',
      label: 'Profile Photo',
      icon: Camera,
      completed: !!(member?.profile_photo && member.profile_photo.trim()),
      weight: 15,
      href: '/profile/edit'
    },
    {
      id: 'emergency',
      label: 'Emergency Contacts',
      icon: Users,
      completed: !!(member?.emergency_contacts && member.emergency_contacts.length > 0),
      weight: 15,
      href: '/profile/family'
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: FileText,
      completed: !!(member?.documents && member.documents.length > 0),
      weight: 20,
      href: '/profile/documents'
    },
    {
      id: 'dob',
      label: 'Date of Birth',
      icon: Calendar,
      completed: !!(member?.dob),
      weight: 10,
      href: '/profile/edit'
    },
    {
      id: 'gender',
      label: 'Gender',
      icon: User,
      completed: !!(member?.gender),
      weight: 5,
      href: '/profile/edit'
    },
    {
      id: 'address',
      label: 'Address',
      icon: MapPin,
      completed: !!(member?.address && member.address.trim()),
      weight: 10,
      href: '/profile/edit'
    }
  ]

  const totalWeight = completionItems.reduce((sum, item) => sum + item.weight, 0)
  const completedWeight = completionItems
    .filter(item => item.completed)
    .reduce((sum, item) => sum + item.weight, 0)
  
  const completionPercentage = Math.round((completedWeight / totalWeight) * 100)

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 80) return 'text-emerald-600 dark:text-emerald-400'
    if (percentage >= 60) return 'text-amber-600 dark:text-amber-400'
    if (percentage >= 40) return 'text-amber-700 dark:text-amber-300'
    return 'text-red-600 dark:text-red-400'
  }

  const getCompletionMessage = (percentage: number) => {
    if (percentage >= 90) return "Excellent! Your profile is nearly complete."
    if (percentage >= 80) return "Great! Your profile is looking good."
    if (percentage >= 60) return "Good progress! A few more details to go."
    if (percentage >= 40) return "Getting there! Complete more fields to improve your profile."
    return "Complete your profile to get the most out of the system."
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Profile Completion</span>
            </CardTitle>
            <CardDescription>
              {getCompletionMessage(completionPercentage)}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${getCompletionColor(completionPercentage)}`}>
              {completionPercentage}%
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="space-y-2">
            <Progress value={completionPercentage} className="h-2" />
            <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400">
              <span>{completedWeight}/{totalWeight} points</span>
              <span>{completionItems.filter(item => item.completed).length}/{completionItems.length} completed</span>
            </div>
          </div>

          {/* Completion checklist */}
          <div className="space-y-2">
            {completionItems.map((item) => (
              <div key={item.id} className="flex min-h-11 items-center justify-between gap-2 sm:min-h-8">
                <div className="flex items-center space-x-3">
                  {item.completed ? (
                    <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Circle className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
                  )}
                  <item.icon className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                  <span className={`text-sm ${item.completed ? 'text-neutral-700 dark:text-neutral-300' : 'text-neutral-500 dark:text-neutral-400'}`}>
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-neutral-400 dark:text-neutral-500">{item.weight}pts</span>
                  {!item.completed && item.href && (
                    <Button variant="ghost" size="sm" className="h-10 px-3 text-xs sm:h-7 sm:px-2" asChild>
                      <Link href={item.href}>Complete</Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="border-t border-neutral-200/80 pt-4 dark:border-white/[0.06]">
            <div className="flex flex-col sm:flex-row gap-2">
              <Button className="h-11 flex-1 sm:h-10" variant="outline" asChild>
                <Link href="/profile/edit">Edit profile</Link>
              </Button>
              <Button className="h-11 flex-1 sm:h-10" variant="outline" asChild>
                <Link href="/profile/family">Manage family</Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
