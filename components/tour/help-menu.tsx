'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, HelpCircle, PlayCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTour } from '@/components/tour/tour-provider'
import { toursForPath } from '@/lib/tour/logic'
import { cn } from '@/lib/utils'

/**
 * Header help button: the tour for this page (when there is one) and the list of all tours.
 * Self-contained so the header only renders `<HelpMenu />`.
 */
export function HelpMenu({ className }: { className?: string }) {
  const pathname = usePathname() ?? '/'
  const { tours, startTour, isCompleted } = useTour()
  const pageTours = toursForPath(tours, pathname)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Help and guided tours"
          title="Help"
          data-tour="help-menu"
          className={cn(
            'h-9 w-9 shrink-0 rounded-lg text-neutral-600 hover:bg-neutral-200/70 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white',
            className
          )}
        >
          <HelpCircle className="h-[18px] w-[18px]" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="app-overline">Help</DropdownMenuLabel>
        {pageTours.map((tour) => (
          <DropdownMenuItem key={tour.id} className="min-h-10 cursor-pointer" onSelect={() => startTour(tour.id)}>
            <PlayCircle className="mr-2 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block">Take the tour for this page</span>
              {pageTours.length > 1 || isCompleted(tour.id) ? (
                <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
                  {tour.title}
                  {isCompleted(tour.id) ? ' · done' : ''}
                </span>
              ) : null}
            </span>
          </DropdownMenuItem>
        ))}
        {pageTours.length > 0 ? <DropdownMenuSeparator /> : null}
        <DropdownMenuItem asChild className="min-h-10 cursor-pointer">
          <Link href="/help">
            <BookOpen className="mr-2 h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" aria-hidden />
            All guided tours
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
