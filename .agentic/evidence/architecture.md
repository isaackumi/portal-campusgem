# Architecture — Active-year scoping for camp rooms & assignments

Work item: `WI-1`  
Agent: `solution-architect`  
Command: `ARCHITECTURE.CREATE`  
Date: 2026-09-18

## Context

Camp rooms (`camp_rooms`) and registrations (`camp_registrations`) are already year-scoped in Convex via `camp_year_id`. Room assignment already rejects cross-year rooms. The gap is **UI/workflow focus**: rooms admin always loads only `getActiveCampYear()`, registration detail cannot assign a room in-place, and year hub / follow-up do not deep-link rooms for the selected year.

## Decision

Keep the existing data model. Scope **admin surfaces** so rooms and follow-up assignment default to the **active camp year**, with an optional `?year=` override for historical seasons.

## Components

| Surface | Responsibility |
|---|---|
| `/admin/camp-meeting/rooms` | List/create/assign rooms for selected year; default active |
| `CampRegistrationRoomCard` | Assign/change/unassign room from that registration’s `camp_year_id` rooms |
| `/admin/camp-meeting/years/[yearId]` | Deep-link Rooms + Follow-up for that year |
| `/admin/camp-meeting/follow-up` | Already year-scoped; keep active default; link back to rooms |

## Data flow

1. Resolve year: `?year=` → else active year → else newest year.
2. Load `getCampRooms(yearId)` + `getCampRegistrations(yearId)` only.
3. Assign via existing `assignCampRegistrationRoomWithSecret` (already validates year match).
4. Follow-up `assigned_to` patches stay on registrations of the resolved year only.

## Security

- No new secrets.
- Server already enforces room/year match; UI must not offer rooms from other years.
- Staff assignee list remains directory staff (not year-scoped); assignments attach to year-scoped registrations.

## Failure modes

- No active year: empty state + link to years admin.
- Full / gender-mismatched room: surface existing Convex errors.
- Historical year selected: show non-active badge; “Jump to active year” action.

## Alternatives rejected

See ADR-001.
