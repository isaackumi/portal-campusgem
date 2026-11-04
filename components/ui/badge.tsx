import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * The one chip style: statuses, counts, tags. Same type (12px medium, tabular
 * figures) everywhere; only the tone changes.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-semibold leading-4 tabular-nums transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-brand-600 text-white hover:bg-brand-700 dark:bg-brand-500",
        secondary:
          "border-transparent bg-neutral-100 text-neutral-700 ring-1 ring-inset ring-neutral-500/10 dark:bg-white/[0.06] dark:text-neutral-200 dark:ring-white/10",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "border-neutral-200 text-neutral-700 dark:border-white/15 dark:text-neutral-300",
        success:
          "border-transparent bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20",
        warning:
          "border-transparent bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20",
        danger:
          "border-transparent bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/15 dark:bg-red-400/10 dark:text-red-300 dark:ring-red-400/20",
        brand:
          "border-transparent bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-600/15 dark:bg-brand-400/10 dark:text-brand-300 dark:ring-brand-400/25",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
