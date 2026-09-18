# ADR-001 — Scope rooms & follow-up assignment UI to camp year (active by default)

- Status: Proposed
- Date: 2026-09-18
- Work item: WI-1
- Deciders: solution-architect

## Context

Operators need rooms and follow-up assignment for the current (active) camp season without mixing historical years. Backend already stores `camp_year_id` on rooms and registrations.

## Decision

1. **No schema change.** Reuse `camp_rooms.camp_year_id` and registration `room_id` / `assigned_to`.
2. **Rooms page** supports `?year=` and defaults to active year; year picker + active badge.
3. **Registration room card** loads rooms for `registration.camp_year_id` and allows assign/change/unassign.
4. **Year hub** links to rooms and follow-up with that year’s id.
5. **Follow-up** remains active-by-default with optional `?year=`.

## Consequences

- Positive: Correct season isolation in admin UX; fewer wrong-room assignments.
- Positive: Historical seasons remain inspectable via year selector.
- Negative: Slightly more UI state (year resolution); must keep active-year CTA clear.

## Alternatives considered (do not repeat)

| Alternative | Why rejected |
|---|---|
| Global rooms table shared across years | Breaks capacity/gender evidence per season; conflicts with existing Convex year check |
| Duplicate room rows into “active snapshot” table | Unnecessary complexity; same data already year-keyed |
| Hide year picker entirely (active only) | Blocks historical lodging review and prior-season ops |

## Do Not Repeat

- Do not invent a second rooms collection for “active only”.
- Do not allow assigning a room whose `camp_year_id` differs from the registration.
