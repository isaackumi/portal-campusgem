# Dashboard Page Overrides

> **PROJECT:** Campus Gem
> **Updated:** 2026-08-24
> **Page Type:** Dashboard / Ops

> Rules here **override** `design-system/campus-gem/MASTER.md` for admin dashboards.

---

## Typography (implemented)

Use the CSS utilities in `app/globals.css` — do **not** invent ad-hoc sizes on dashboards.

| Role | Token / class | Size |
|------|----------------|------|
| Page title (H1) | `.app-page-title` | 24 → 30 (`text-2xl` / `sm:text-3xl`) |
| Page subtitle | `.app-page-description` | 14 (`text-sm`) |
| Section title | `.app-section-title` | 18 (`text-lg`) |
| Card title | `CardTitle` default / `.app-card-title` | 16 (`text-base`) |
| Stat number | `.app-stat-value` | 30 (`text-3xl`) + `tabular-nums` |
| Stat / meta label | `.app-stat-label` / `.app-meta` | 12 (`text-xs`) |
| Body | default | 14 (`text-sm`) |

### Do
- Put **metric numbers** in `.app-stat-value` (never on `CardTitle`)
- Put **card headings** on `CardTitle` (default `text-base`)
- Put **page H1** on `.app-page-title` or `<PageHeader>` / `<RlcPageHeader>`

### Don't
- Mix `text-xl` / `text-2xl` / `text-3xl` / `font-bold` arbitrarily on the same level
- Use `CardTitle` for KPI numbers
- Skip heading levels for styling

---

## Layout

- Dense ops density: 8–24px component spacing, 16–32px section gaps
- Status colors for SLA (rose overdue / amber due / emerald healthy)
- Keep light surfaces on slate/white (existing Campus Gem brand); do not switch dashboards to dark mode

---

## Components

- Shared headers: `components/layout/page-header.tsx`, `components/rlc/rlc-page-header.tsx`
- Shared card primitive: `components/ui/card.tsx` (`CardTitle` = `text-base`)
