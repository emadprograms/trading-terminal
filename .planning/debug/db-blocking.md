---
status: investigating
trigger: app_start
---

# Debug Session: db-blocking

## Symptoms
The application is blocked by a "Please upload your database file on the left to begin" screen.

## Expected Behavior
The application should proceed to the session configuration or workspace after authentication, using live API data from Phase 2, without requiring a local .db file upload.

## Hypothesis
Legacy blocking logic in `App.tsx` checks `!isDbLoaded` from `useDatabase()`, which is a remnant of the 'market-replay' functionality.

## Current Focus
- **Hypothesis**: `App.tsx` blocks rendering based on `useDatabase().isDbLoaded`.
- **Next Action**: Verify `App.tsx` and `useDatabase.ts` logic.

## Evidence
- timestamp: 2026-06-05T00:15:00Z - Bug report received.
