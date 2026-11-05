import type { AttendanceWeek } from '@/lib/me/attendance-summary'
import { cn } from '@/lib/utils'

function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

/** Twelve weekly bars, oldest on the left. One series, so no legend. */
export function AttendanceWeeks({ weeks }: { weeks: AttendanceWeek[] }) {
  const max = Math.max(1, ...weeks.map((w) => w.count))
  const attended = weeks.filter((w) => w.count > 0).length
  return (
    <figure>
      <div className="flex h-24 items-end gap-1.5" aria-hidden>
        {weeks.map((week, index) => {
          const isCurrent = index === weeks.length - 1
          return (
            <div key={week.start} className="group flex h-full flex-1 flex-col justify-end" title={`Week of ${shortDate(week.start)}: ${week.count}`}>
              {week.count > 0 ? (
                <div
                  className="w-full rounded-t-[4px] bg-[#4f46e5] dark:bg-[#6366f1]"
                  style={{ height: `${Math.max(18, (week.count / max) * 100)}%` }}
                />
              ) : (
                <div
                  className={cn(
                    'h-1 w-full rounded-full bg-neutral-200 dark:bg-white/10',
                    isCurrent && 'bg-neutral-300 dark:bg-white/20'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex justify-between text-xs text-neutral-500 dark:text-neutral-400" aria-hidden>
        <span>{weeks[0] ? shortDate(weeks[0].start) : ''}</span>
        <span>This week</span>
      </div>
      <figcaption className="sr-only">
        You attended in {attended} of the last {weeks.length} weeks.
      </figcaption>
    </figure>
  )
}
