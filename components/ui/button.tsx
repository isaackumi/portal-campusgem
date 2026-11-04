import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-brand-600 text-white shadow-[0_1px_2px_rgb(15_23_42/0.1),inset_0_1px_0_rgb(255_255_255/0.12)] hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400",
        destructive:
          "bg-red-600 text-white hover:bg-red-700",
        outline:
          "border border-neutral-200 bg-white text-neutral-800 shadow-[0_1px_2px_rgb(15_23_42/0.04)] hover:bg-neutral-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-100 dark:shadow-none dark:hover:bg-white/[0.07]",
        secondary:
          "border-transparent bg-neutral-100 text-neutral-800 hover:bg-neutral-200/70 dark:bg-white/[0.06] dark:text-neutral-100 dark:hover:bg-white/10",
        ghost: "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-white/[0.07] dark:hover:text-white",
        link: "text-brand-600 underline-offset-4 hover:underline dark:text-brand-300",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-[13px]",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
