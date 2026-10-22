import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * The one chip style: statuses, counts, tags. Same type (12px medium, tabular
 * figures) everywhere; only the tone changes.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-[6px] border px-2 py-0.5 text-xs font-medium leading-4 tabular-nums transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "border-neutral-200 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300",
        success:
          "border-transparent bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
        warning:
          "border-transparent bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
        danger:
          "border-transparent bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300",
        brand:
          "border-transparent bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300",
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
