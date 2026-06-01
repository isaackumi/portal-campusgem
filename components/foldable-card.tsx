'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface FoldableCardProps {
  title: string
  description?: string
  icon?: React.ReactNode
  badge?: React.ReactNode
  defaultExpanded?: boolean
  children: React.ReactNode
  className?: string
}

export function FoldableCard({ 
  title, 
  description, 
  icon, 
  badge, 
  defaultExpanded = false, 
  children,
  className = ""
}: FoldableCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <Card className={className}>
      <CardHeader 
        className="cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {icon}
            <CardTitle>{title}</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            {badge}
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-slate-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-600" />
            )}
          </div>
        </div>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          {children}
        </CardContent>
      )}
    </Card>
  )
}
