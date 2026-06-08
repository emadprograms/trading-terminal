---
status: resolved
trigger: Account metrics (equity, margin, available) were not updating, and account selection was failing.
---

# Debug Session: Missing Account Management Infrastructure

## Symptoms
- `AccountHeader` was not showing live balance/equity updates.
- `AccountSelector` was failing to fetch the list of available accounts.
- Network tab showed 404 or routing fallbacks for `/api/accounts`.
- Any logic dependent on `selectedAccountId` was inconsistent because accounts were never successfully loaded.

## Root Cause
1. **Missing Proxy Handler**: There was no `api/accounts.ts` serverless function in the Vercel deployment to handle the `/api/accounts` route.
2. **Missing Routing Rule**: `vercel.json` did not have a rewrite rule for `/api/accounts`, causing those requests to fall back to `index.html`.
3. **Subpath Truncation**: The `api/order.ts` and `api/market.ts` handlers (and the proposed accounts handler) needed robust subpath extraction to correctly forward versioned requests (e.g., `/api/accounts/v1/...` -> `/api/v1/accounts/...`).

## Resolution
1. **Created `api/accounts.ts`**: Implemented a granular proxy handler for account-related requests.
2. **Updated `vercel.json`**: Added the `{ "source": "/api/accounts/:path*", "destination": "/api/accounts" }` rewrite rule.
3. **Refactored `api/order.ts`**: Improved the subpath mapping to ensure order execution and position fetching routes are preserved during proxying.
4. **Centralized Frontend API**: Created `src/api/account.ts` to provide a clean, typed interface for fetching accounts.
5. **UI Update**: Refactored `AccountHeader` and `AccountSelector` to use the new `accountApi` and implemented a 10-second refetch interval for live metrics.

## Validation
- **Unit Test**: Created `src/api/account.test.ts` to verify the fetch logic and error handling.
- **Manual Verification**: Confirmed that the `AccountHeader` now triggers `queryFn` and processes the `accounts` array from the API response.

## Preservation Mandate
This document records the critical requirement for matching backend paths (`/api/v1/...`) with frontend proxy routes. Do not revert the `subPath` logic in the API handlers as it is essential for multi-version support.
