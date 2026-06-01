"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const tabsListBaseClass =
  'inline-flex items-center justify-center rounded-md bg-muted p-1 text-muted-foreground'

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn('h-10 w-full sm:w-auto', tabsListBaseClass, className)}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

/** Tab row that scrolls horizontally on narrow viewports (use inside Tabs). */
const ScrollableTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <div className="relative -mx-1">
    <div
      className="pointer-events-none absolute inset-y-0 left-0 z-10 w-4 rounded-l-md bg-gradient-to-r from-muted to-transparent"
      aria-hidden
    />
    <div
      className="pointer-events-none absolute inset-y-0 right-0 z-10 w-4 rounded-r-md bg-gradient-to-l from-muted to-transparent"
      aria-hidden
    />
    <div className="overflow-x-auto overscroll-x-contain px-1 pb-0.5 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <TabsPrimitive.List
        ref={ref}
        className={cn(
          'inline-flex h-auto min-h-11 w-max min-w-full items-stretch justify-start gap-1',
          tabsListBaseClass,
          className
        )}
        {...props}
      />
    </div>
  </div>
))
ScrollableTabsList.displayName = 'ScrollableTabsList'

const tabsTriggerBaseClass =
  'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm shrink-0 snap-start min-h-10 touch-manipulation'

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger ref={ref} className={cn(tabsTriggerBaseClass, className)} {...props} />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, ScrollableTabsList, TabsTrigger, TabsContent }
