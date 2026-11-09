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
- **Pastoral care:** `/api/cron/pastoral-alerts` (Mon 07:30 UTC) sends each group leader one text:
  group digest + missed-church alerts (`lib/pastoral/*`, page `/admin/pastoral-care`). Sends
  nothing on a schedule until `pastoral_settings` has been saved once. `attendance.member_id` and
  `group_memberships.member_id` are `members` ids; `groups.leader_id` is a `users` id.
- **Camp reminders:** `/api/cron/camp-reminders` (daily, `CRON_SECRET`) texts 7 days and 1 day
  before the active camp year. Per-registration `reminder_7d_sent_at` / `reminder_1d_sent_at`
  stop repeats; `camp_years.auto_reminders` (unset = on) toggles it. `?dry_run=1` to preview.
- **Events / RSVP (`/e/<token>`):** `/admin/events` (`groups.manage`; texting invites also needs
  `sms.send`). Each `event_rsvps` row has a 128-bit `token`, same rules as `confirm_token`.
  Capacity and deadline are enforced in `convex/events.ts`. Members' own events:
  `components/events/my-events.tsx`.
- **SMS replies:** Hubtel posts to `/api/sms/inbound?secret=$SMS_INBOUND_SECRET` (GET or POST; it
  is refused in production when the secret is unset). Replies land in `sms_inbox`, shown on
  `/admin/inbox` (`sms.send`). A STOP reply sets `users.sms_opt_out`, and every bulk SMS path skips
  those people (`lib/comms/opt-out.ts`). Add that check to any new bulk sender.
- **Every SMS send is previewed first.** Before calling any action that texts people, call
  `useSmsPreview()` (`components/comms/sms-preview.tsx`) with the exact text (per person when
  personalised) and only send if it resolves `true`. No exceptions for "small" sends.
- **Birthday texts:** the server words them from the date of birth: "Happy Birthday" only on the
  day, otherwise the "in advance" template (`BIRTHDAY_SMS_ADVANCE_TEMPLATE` overrides it). A
  daily heads-up texts every `admin` (plus `BIRTHDAY_HEADS_UP_PHONES`) the birthdays exactly one
  week away, with phone and campus / Campus GEM / RLC / camper tags (`lib/birthdays/heads-up.ts`,
  run by `/api/cron/birthday-sms`).
- **`guard()` only checks once per request:** after it passes, nested calls are trusted, so a second
  `guard('x')` always passes. Check a second permission with `hasPermission(user.role, p, user.permissions)`.
- **Campuses:** a campus is a `groups` row with `group_type: 'campus'` (plus `short_code`, `slug`,
  `aliases`). A person's campus tag is their single active campus membership; add or move people
  only via `placeOnCampus` (`convex/lib/campusMembership.ts`). The role `campus_leader`
  (`campus.lead`) manages only campuses where the person is an active leader/co-leader (executives:
  view). Every campus action starts with `guardCampus(groupId, level)` (`lib/auth/campus-scope.ts`)
  and then uses only the verified `group.id`. `/join/<slug>` is public: it never moves anyone off
  another campus and never reveals which campus a phone number is on.
- **My GEM (`/me`):** plain members/visitors land here instead of `/dashboard`. `lib/actions/me.ts`
  always acts on the session user; members cannot change phone, role or permissions.
- **QR self check-in (`/i/<token>`):** `checkin_sessions` token, the member is always the session user.
  Households: `households` + `users.household_id` (`members.manage` to change).
- **Campus outreach (`/outreach`, public form `/o/<slug>?by=<ref>`):** `lib/actions/outreach.ts`, Convex
  `outreach_contacts` / `outreach_events`. Actions start with `guardCampusMember(campusId)` (any active campus
  member; leaders `manage`); members see and work only contacts they met or were given. The `by` ref is
  `lib/outreach/ref.ts` (user id + campus-bound HMAC): never put a membership ID or bare user id in a link.
- **Header workspace switcher:** `lib/navigation/workspaces.ts` (church, RLC, camp, Corporate GEM,
  each campus). Add new top-level areas there.
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
- **Activity log:** `logActivity()` (`lib/activity/log.ts`) records who did what, from which device and IP,
  into Convex `activity_log`; shown on `/admin/activity` (`users.manage`). It never throws or blocks the
  action. Call it after any new action that changes data, signs people in or out, or sends texts (not on
  dry runs). Mask phone numbers with `maskPhone` where nobody is signed in. `/api/cron/activity-cleanup`
  (monthly) removes entries older than `ACTIVITY_RETENTION_DAYS` (default 365).
- **Access management UI:** `/admin/admins` ("Access & roles"). Role or grant changes go
  through `updateUserAccess` / `requireAccessChange`: `users.manage` is required, and
  `admins.manage` too for anything touching admin rights.
- **Sign-in text:** `updateUserAccess(..., { notify: true })` texts the person the app link and
  their phone's last 3 digits, but only when the change gives them new permissions
  (`gainedPermissions`, `lib/auth/access-welcome.ts`). `sendSignInDetailsSms` resends it. Links use
  `siteOrigin()` (`lib/site-url.ts`); set `NEXT_PUBLIC_SITE_URL` in production.

## State machines

Status fields are explicit state machines. The rules live in `convex/lib/states/*.ts` (pure, imported
by Convex mutations, which enforce them, and by the app as `@/convex/lib/states/...`; tests in
`lib/states/`). Change a status only through these rules; add a new machine there, not inline.

- **Camp registration** (`campRegistration.ts`): registered ⇄ checked_in, either → cancelled,
  cancelled → registered (reinstate). Cancelled is never checked in directly. Call answers only while
  `registered`. Enforced in `patchCampRegistrationWithSecret`, session check-in and
  `recordCallOutcomeWithSecret`. Read paid with `isPaid`, follow-up with `followUpStatusOf`.
- **Calling session** (`callSession.ts`): live → ended (final); an ended session takes no presence or
  settings.
- **Outreach contact** (`outreachContact.ts`): the server derives status from a call outcome and
  the contact as stored now; `joined` is sticky against outcomes.
- **Sign-in codes** (`convex/authCodes.ts` header): only the newest code is checked; a failed send
  leaves the previous code working.
- **Client async flows**: one action at a time with `useSingleFlight` (`lib/hooks/use-single-flight.ts`):
  no double submits, busy always clears. Drop async results that arrive for something no longer on
  screen (session switched, query changed) instead of applying them.

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
  use `.app-page-title` (bold, tight tracking) or `PageHeader`. Titles are plain ink: no
  gradient or coloured accent words.
- **JetBrains Mono** (`font-mono`): membership IDs, check-in codes, phone numbers in call lists,
  keyboard shortcuts.
- **Colour:** indigo `brand-*` on cool slate greys. `neutral`, `slate` and `gray` all resolve to
  the same slate scale. Dark mode is navy (slate-950 canvas, slate-900 panel, slate-800/60 cards).
  Every colour class needs a `dark:` pair. Full rules: `design-system/campus-gem/MASTER.md`.

Use the type classes in `app/globals.css` (`app-section-title`, `app-overline`,
`app-stat-label`, `app-stat-value`) rather than ad-hoc sizes. Chips are `Badge` with a tone
variant; `app-overline` is the only uppercase style. Headline numbers are `StatCard` (`trend`,
`href`; it shows no icon).

**No "AI look":** no gradients, sparkle/magic/crown icons, glows, blur blobs, emoji in the UI,
tinted icon tiles or hover lifts, and no "insights / intelligence hub" copy. Details in
`design-system/campus-gem/MASTER.md` ("Keep it human").
