# Campus Gem design system

The source of truth is the code: `tailwind.config.ts`, `app/globals.css`, `components/ui/*`.
This page explains the rules so new screens match the old ones in both themes.

## Colour

Indigo brand on cool slate. `neutral`, `slate` and `gray` all resolve to the slate scale.

| Role | Light | Dark | Use |
|------|-------|------|-----|
| Canvas (header, sidebar) | `neutral-100` | `neutral-950` | Behind everything |
| Content panel | `neutral-50/70` | `neutral-900` | `.app-content-panel` |
| Card | `white` + `shadow-card` | `neutral-800/60`, `border-white/[0.06]` | `.dashboard-panel`, `Card` |
| Border | `neutral-200/80` | `white/[0.06]`–`white/10` | Cards, inputs, dividers |
| Ink: primary | `neutral-900` | `white` / `neutral-100` | Titles, values |
| Ink: secondary | `neutral-600`/`700` | `neutral-300` | Body |
| Ink: muted | `neutral-500` | `neutral-400` | Meta, labels |
| Brand action | `brand-600` | `brand-500` (button), `brand-300` (text) | Primary buttons, links |
| Accent gradient | `brand-500 → violet-600` | same | Icon tiles, logo, one title word |

- **Status colours are reserved:** emerald = good, amber = needs attention, red = problem.
  Always pair them with an icon or a label.
- **Every colour class needs a `dark:` pair.** `globals.css` has a fallback for older screens,
  but only when the element has no `dark:` class of the same kind.
- Tinted chips: `bg-{hue}-50 text-{hue}-700 ring-1 ring-inset ring-{hue}-600/20`, dark
  `bg-{hue}-400/10 text-{hue}-300 ring-{hue}-400/20` (see `Badge`).
- Categorical chart palette (fixed order, validated on white and slate-800):
  `#6366f1 #0d9488 #ea580c #db2777 #0284c7 #65a30d #a855f7 #b45309` in `lib/charts/theme.ts`.

## Type

Plus Jakarta Sans for everything (bold page titles, semibold section titles), JetBrains Mono
for IDs, codes and phone numbers in lists. Use `.app-page-title`, `.app-section-title`,
`.app-overline`, `.app-stat-label`, `.app-stat-value`, `.app-page-description`; don't invent sizes.

## Components

| Need | Use |
|------|-----|
| Page header | `PageHeader` (or `CampAdminPageHeader` inside camp) |
| Card | `.dashboard-panel` + `p-5`, title `.app-section-title` |
| Headline number | `StatCard`, or a linked KPI tile like the camp overview |
| Progress | `Meter` (`components/ui/meter.tsx`) |
| Parts of a whole | `SegmentedBar`: legend always shows label + count |
| Chip | `Badge` with `success` / `warning` / `danger` / `secondary` / `brand` / `outline` |
| Person | `PersonAvatar` (stable pastel per person) |
| Bulk actions | Floating bar at the bottom centre once rows are selected |
| Long jobs (bulk SMS) | `useBackgroundJobs().start(...)`, never block the page |
| Search | ⌘K palette (`components/command-palette.tsx`); list pages also get their own search box |

## Charts

- One series → no legend; the title names it. Bars `#4f46e5` (light) / `#6366f1` (dark),
  4px rounded tops, recessive grid (`currentColor` at 12%), tooltip on hover.
- Never a dual axis. Status colours only for status.
- Give every chart a text summary (`figcaption` or `sr-only`).
- Check palettes with the data-viz validator before adding a categorical one.

## Interaction

- Primary action top-right of the page header; destructive actions confirm.
- Optimistic updates for one-tap actions (e.g. call outcomes), with a toast and rollback on error.
- Empty states say what's missing and offer the next step.
- Keyboard: ⌘K or `/` opens search; dialogs trap focus; every icon-only button has a label.
