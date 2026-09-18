# Implementation evidence — WI-1 active-year rooms & assignments

Agent: `backend-engineering`  
Command: `CODE.CREATE`  
Date: 2026-09-18T16:00:00Z

## Changes

| File | Purpose |
|---|---|
| `app/admin/camp-meeting/rooms/page.tsx` | Year-scoped rooms UI; default active; `?year=` + picker |
| `components/camp/camp-registration-room-card.tsx` | Assign/change room from registration’s camp year rooms |
| `app/admin/camp-meeting/follow-up/page.tsx` | Year picker for assignments; link to rooms |
| `app/admin/camp-meeting/years/[yearId]/page.tsx` | Deep links to Rooms + Assignments for that year |
| `app/admin/camp-meeting/registrations/[id]/page.tsx` | Clarify follow-up assignment is for this registration’s year |

## Verification notes

- Convex already rejects cross-year room assignment.
- Rooms/registrations loaded only for the resolved year id.
- No new secrets introduced.
