# campusgem-chms — notes for coding agents

Next.js 15 App Router + Convex. Church management: members, groups, attendance,
camp meeting, RLC (mother church), forms, SMS.

## Auth and permissions

- **Sign-in** is phone number or membership ID (`app/api/auth/direct-login`). The session
  is the httpOnly `chms-auth-session` cookie, which holds the user's Convex `auth_uid`.
- **Permissions** live in `lib/auth/roles.ts`. A user has a role (`ROLE_PERMISSIONS`) plus
  optional per-user extra grants (`users.permissions` in Convex). Always check with
  `hasPermission(role, permission, user.permissions)` / `canAccessPath(...)`, never
  `role === 'admin'`.
- **Client:** `useAuth()` gives `user`, `loading`, `can(permission)` and `refresh()`. The
  provider re-reads the user from `/api/auth/session` on load, so role changes apply
  without signing out. Use `<AccessDenied permission=... />` for gated pages.
- **Middleware** gates routes from the `chms-role` / `chms-perms` cookies. On a denial it
  goes through `/api/auth/refresh`, which re-checks the DB before refusing.
- **Server actions are public endpoints.** Every exported function in `lib/actions/*`
  starts with `await guard('<permission>')` (`lib/auth/action-guard.ts`). Intentionally
  public entry points (camp registration, public forms, RLC visit/join) wrap their body
  in `asSystem(...)`. Add one or the other to every new action.
- **Callers:** `camp.calls` lets a volunteer open `/admin/camp-meeting/calls` and see only
  the registrants assigned to them (`assigned_to`). Assigning, and texting call lists, needs
  `camp.manage` (+ `sms.send` for SMS). Logic lives in `lib/camp/call-campaign.ts`.
- **Access management UI:** `/admin/admins` ("Access & roles"). Role or grant changes go
  through `updateUserAccess` / `requireAccessChange`: `users.manage` is required, and
  `admins.manage` too for anything touching admin rights.

## Convex

- Server code talks to Convex through `lib/convex/*-bridge.ts` using `*WithSecret`
  functions guarded by `CAMP_CONVEX_SERVER_SECRET`. Convex Auth is not wired, so
  `requireAuth` functions are unreachable from the browser.
- After changing `convex/schema.ts` or functions, deploy with `npx convex deploy`
  (or `npx convex dev`).
- `patchCampRegistrationWithSecret` treats a `null` value as "remove this field".

## Checks

- `npx tsc --noEmit -p .` — test files have known pre-existing type errors.
- `bun test lib` — unit tests.
- `npm run build`

## UI typography and colour

Set up in `app/layout.tsx` and `tailwind.config.ts`:

- **Plus Jakarta Sans** (`font-sans`, also `font-display`): the whole interface. Page titles
  use `.app-page-title` (bold, tight tracking) or `PageHeader`; `.app-display-accent` gives one
  word an indigo→violet gradient.
- **JetBrains Mono** (`font-mono`): membership IDs, check-in codes, phone numbers in call lists,
  keyboard shortcuts.
- **Colour:** indigo `brand-*` on cool slate greys. `neutral`, `slate` and `gray` all resolve to
  the same slate scale. Dark mode is navy (slate-950 canvas, slate-900 panel, slate-800/60 cards).
  Every colour class needs a `dark:` pair. Full rules: `design-system/campus-gem/MASTER.md`.

Use the type classes in `app/globals.css` (`app-section-title`, `app-overline`,
`app-stat-label`, `app-stat-value`) rather than ad-hoc sizes. Chips are `Badge` with a tone
variant; `app-overline` is the only uppercase style. Headline numbers are `StatCard` (optional
`icon`, `trend`, `href`).
