'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const OPTIONS = [
  { value: 'system', label: 'System default', Icon: Monitor },
  { value: 'light', label: 'Light mode', Icon: Sun },
  { value: 'dark', label: 'Dark mode', Icon: Moon },
] as const

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const mode = theme ?? 'system'
  const dark = resolvedTheme === 'dark'
  const TriggerIcon = !mounted || mode === 'system' ? Monitor : dark ? Sun : Moon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Theme"
          className={cn(
            'h-9 w-9 shrink-0 rounded-full bg-neutral-200 text-neutral-800 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600',
            className
          )}
        >
          <TriggerIcon className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {OPTIONS.map(({ value, label, Icon }) => {
          const selected = mounted && mode === value
          return (
            <DropdownMenuItem
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                'cursor-pointer',
                selected && 'text-brand-600 focus:text-brand-600 dark:text-brand-400 dark:focus:text-brand-400'
              )}
            >
              <Icon className={cn('mr-2 h-4 w-4', !selected && 'text-neutral-500 dark:text-neutral-400')} />
              <span className="flex-1">{label}</span>
              {selected ? <Check className="h-4 w-4" /> : null}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
