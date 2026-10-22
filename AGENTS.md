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
- **Access management UI:** `/admin/admins` ("Access & roles"). Role or grant changes go
  through `updateUserAccess` / `requireAccessChange`: `users.manage` is required, and
  `admins.manage` too for anything touching admin rights.

## Convex

- Server code talks to Convex through `lib/convex/*-bridge.ts` using `*WithSecret`
  functions guarded by `CAMP_CONVEX_SERVER_SECRET`. Convex Auth is not wired, so
  `requireAuth` functions are unreachable from the browser.
- After changing `convex/schema.ts` or functions, deploy with `npx convex deploy`
  (or `npx convex dev`).

## Checks

- `npx tsc --noEmit -p .` — test files have known pre-existing type errors.
- `bun test lib` — unit tests.
- `npm run build`
