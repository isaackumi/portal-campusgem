# campusgem-chms — notes for coding agents

Next.js 15 App Router + Convex. Church management: members, groups, attendance,
camp meeting, RLC (mother church), forms, SMS.

## Auth and permissions

- **Sign-in** is phone number or membership ID (`app/api/auth/direct-login`). The session
  is the httpOnly `chms-auth-session` cookie, which holds the user's Convex `auth_uid`.
- **`auth_uid` is the session secret.** `convexUserDocToAppUser` drops it unless called with
  `{ withAuthUid: true }`, which only the sign-in lookup (`lib/auth/login-lookup.ts`) and
  `getSessionUser` use. Never return a raw Convex user doc to the browser; map it first. Use
  `has_login` to ask "can this person sign in?".
- **Sign-in codes:** people with more than member access get a 6-digit SMS code
  (`/api/auth/verify-code`). `AUTH_SIGNIN_CODES` = `staff` (default) | `all` | `off` (emergency
  switch if SMS is down). Codes are HMAC-hashed in Convex `auth_codes` (`convex/authCodes.ts`):
  10-minute expiry, 5 wrong tries, one resend per 45s, 5 per hour.
- **Access history:** every change through `lib/actions/access.ts` is written to Convex
  `access_log` (shown on `/admin/admins`). Add a `recordAccessChange` call to any new action
  that changes who can sign in or what they can do.
- **Tap-to-confirm (`/c/<token>`):** public, no sign-in; the 128-bit `confirm_token` on the
  registration is the credential (never map it to the browser). `{{confirmLink}}` in camp SMS
  fills it in. Answers record as `performed_by: 'self'`.
- **Camp reminders:** `/api/cron/camp-reminders` (daily, `CRON_SECRET`) texts 7 days and 1 day
  before the active camp year. Per-registration `reminder_7d_sent_at` / `reminder_1d_sent_at`
  stop repeats; `camp_years.auto_reminders` (unset = on) toggles it. `?dry_run=1` to preview.
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
- **Sign-in text:** `updateUserAccess(..., { notify: true })` texts the person the app link and
  their phone's last 3 digits, but only when the change gives them new permissions
  (`gainedPermissions`, `lib/auth/access-welcome.ts`). `sendSignInDetailsSms` resends it. Links use
  `siteOrigin()` (`lib/site-url.ts`); set `NEXT_PUBLIC_SITE_URL` in production.

## Convex

- Server code talks to Convex through `lib/convex/*-bridge.ts` using `*WithSecret`
  functions guarded by `CAMP_CONVEX_SERVER_SECRET`. Convex Auth is not wired, so
  `requireAuth` functions are unreachable from the browser.
- Vercel deploys Convex for you: `vercel.json` runs `ci/vercel-build.sh`, which runs
  `npx convex deploy --cmd 'bun run build'` on production builds (needs `CONVEX_DEPLOY_KEY`,
  Production scope only; the live site currently uses a dev deployment's key). Production builds fail without the key, so app code never ships
  ahead of its Convex functions; `SKIP_CONVEX_DEPLOY=1` overrides. Previews build against the
  existing deployment. Locally, use `npx convex dev`.
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
