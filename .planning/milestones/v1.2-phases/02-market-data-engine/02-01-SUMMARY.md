# Summary: Plan 02-01 - Historical Data Integration

## Goal
Replace the local SQLite-based historical data fetching with live REST API calls to Capital.com, ensuring charts populate immediately upon ticker selection.

## Completed Tasks
- [x] **Data Adapter**: Created `src/lib/data-adapter.ts` to transform `CapitalCandle` responses into the internal `RawBar` format.
- [x] **Data Fetching Refactor**: Updated `src/lib/db.ts` to replace SQLite-based historical data fetching with live REST API calls via `marketApi`.
- [x] **Hook Integration**: Updated `src/hooks/useChartData.ts` to pass the current `timeframe` to the API fetching functions.

## Verification Results
- The redirection of data flow from SQLite to the REST API is implemented.
- Hook dependencies are correctly updated to trigger fetches on timeframe changes.

## Remaining Work
- Integration tests in `tests/integration/market-data.test.ts` (not yet created/run by subagent).
- Manual validation of chart population and infinite scroll.
