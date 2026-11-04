import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg border border-neutral-200 bg-white sm:h-10 px-3 py-2.5 shadow-[0_1px_2px_rgb(15_23_42/0.04)] text-base text-neutral-900 sm:text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-400 focus-visible:border-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-neutral-900/60 dark:text-white dark:shadow-none dark:placeholder:text-neutral-500 dark:focus-visible:border-brand-500",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
