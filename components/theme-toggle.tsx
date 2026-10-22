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
            'h-9 w-9 shrink-0 rounded-lg text-neutral-600 hover:bg-neutral-200/70 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white',
            className
          )}
        >
          <TriggerIcon className="h-[18px] w-[18px]" />
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
