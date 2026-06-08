---
status: investigating
trigger: User reports no accounts are visible (regression from only demo account visible).
---

# Debug Session: Account Visibility Regression

## Symptoms
- User originally saw only one demo account.
- After a fix attempt, the user now sees NO accounts (regression).
- The 'AccountHeader' and 'AccountSelector' are empty or failing.

## Evidence/Clues
1. 'src/api/account.ts' was updated to call 'v1/accounts'.
2. 'vercel.json' has a rewrite for '/api/accounts/:path*' to '/api/accounts'.
3. A request to '/api/v1/accounts' (triggered by the new frontend code) likely misses the Vercel rewrite and falls back to 'index.html', causing a JSON parse error or empty response.
4. The proxy handler in 'api/accounts.ts' expects 'subPath' to start with '/v1' to prepend '/api', otherwise it uses '/accounts'.

## Current Focus
- **Hypothesis**: The routing between the frontend call to `/api/v1/accounts` and the Vercel proxy `/api/accounts.ts` is broken due to a mismatch in the `vercel.json` rewrites or the frontend path.
- **Next Action**: Verify the frontend request path and the `vercel.json` rewrite configuration.
