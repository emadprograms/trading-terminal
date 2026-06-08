---
status: investigating
trigger: User reports only demo account is visible, others are missing.
---

# Debug Session: Only Demo Account Visible

## Symptoms
- Only one account (the demo account) is visible in the application.
- Other associated accounts are missing from the list.
- The `AccountSelector` and `AccountHeader` likely only receive or display a single account.

## Current Focus
- **Hypothesis**: The API response from Capital.com returns multiple accounts, but the frontend is filtering them or only taking the first one. Alternatively, the API proxy is only requesting a specific account type or the Capital.com API requires a specific parameter to return all accounts.
- **Next Action**: Inspect the network response for `/api/accounts` to see if multiple accounts are being returned from the server.
