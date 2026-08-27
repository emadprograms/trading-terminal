# Phase 6: Sync watchlist with capital.com - Discussion Log

**Gathered:** 2026-06-19T12:44:03+03:00

## Area: Sync Direction & Truth Source
- **Question:** Should the synchronization be two-way, or should the terminal just treat Capital.com as the read-only source of truth?
- **Options presented:** Two-way sync vs Read-only from Capital.com
- **User selection:** Two-way sync: Adding a symbol in the terminal immediately pushes it to capital.com, and vice-versa.

## Area: Conflict Handling
- **Question:** Since we are doing a two-way sync, what should happen on startup if your terminal has locally cached symbols that aren't currently on your Capital.com watchlist?
- **Options presented:** Merge them vs Override local vs Prompt the user
- **User selection:** Override local: Treat Capital.com as the master state on startup and wipe any local symbols not present there.

## Area: Data Fetching Frequency
- **Question:** While the terminal is open, how should it handle changes made externally (like if you add a symbol directly on the Capital.com web UI)?
- **Options presented:** Real-time sync vs Fetch once on startup vs Background polling
- **User selection:** "a sync button should be on top that allows the user to push the newly added symbols to the capital.com account. it syncs the capital.com watchlist with his current watchlist."

## Clarification: Sync button behavior
- **Question:** If you click the Sync button, does it push your local terminal watchlist up to Capital.com, updating their servers to match what you see in the terminal?
- **Options presented:** Push local vs Merge vs Pull vs Both
- **User selection:** It should do both: Pull from Capital.com and Push local additions so they perfectly match.
