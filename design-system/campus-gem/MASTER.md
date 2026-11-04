# Campus Gem design system

The source of truth is the code: `tailwind.config.ts`, `app/globals.css`, `components/ui/*`.
This page explains the rules so new screens match the old ones in both themes.

## Colour

| Role | Light | Dark | Use |
|------|-------|------|-----|
| Canvas (header, sidebar) | `neutral-100` | `neutral-950` | Behind everything |
| Content panel | `white` | `neutral-900` | `.app-content-panel` |
| Card | `white` | `neutral-800` | `.dashboard-panel`, `.app-card` |
| Inset well | `neutral-50` | `neutral-900/40` | Code boxes, stat wells |
| Border | `neutral-200` | `neutral-700` | Cards, inputs, dividers |
| Ink: primary | `neutral-900` | `neutral-50`/`100` | Titles, values |
| Ink: secondary | `neutral-600`/`700` | `neutral-300` | Body |
| Ink: muted | `neutral-500` | `neutral-400` | Meta, labels |
| Brand action | `brand-600` | `brand-700` (button), `brand-400` (text) | Primary buttons, links, active nav |

- **One grey.** `slate` and `gray` are aliased to the neutral scale. Write `neutral-*` in new code.
- **Status colours are reserved:** emerald = good, amber = needs attention, red = problem.
  Always pair them with an icon or a label. Never use them for decoration or "series 4".
- **Every colour class needs a `dark:` pair.** `globals.css` has a safety net for older
  screens (light-only `text-slate-900`, `bg-blue-50`, etc.), but it only applies when the
  element has no `dark:` class of the same kind. Explicit `dark:` classes always win.
- Tinted panels: `bg-{hue}-50 text-{hue}-800 border-{hue}-200` in light,
  `dark:bg-{hue}-950/30 dark:text-{hue}-200 dark:border-{hue}-900/60` in dark.

## Type

See AGENTS.md. In short: Instrument Serif only for page titles (`.app-page-title`,
`.app-display-accent`); Geist for everything else; Geist Mono for IDs, check-in codes and
phone numbers in call lists. Use `.app-section-title`, `.app-overline`, `.app-stat-label`,
`.app-stat-value`, `.app-page-description`; don't invent sizes.

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

- One series → no legend; the title names it. Bars `brand-600` (light) / `brand-500` (dark),
  4px rounded tops, recessive grid (`currentColor` at 12%), tooltip on hover.
- Never a dual axis. Status colours only for status.
- Give every chart a text summary (`figcaption` or `sr-only`).
- Check palettes with the data-viz validator before adding a categorical one.

## Interaction

- Primary action top-right of the page header; destructive actions confirm.
- Optimistic updates for one-tap actions (e.g. call outcomes), with a toast and rollback on error.
- Empty states say what's missing and offer the next step.
- Keyboard: ⌘K or `/` opens search; dialogs trap focus; every icon-only button has a label.
