# E2E Testing Strategy

This repository uses Playwright for End-to-End (E2E) testing. 

## Local Mocks vs. Live API Validation

Historically, our E2E tests relied heavily on `page.route` to mock broker API responses (e.g., returning `{ status: 'ACCEPTED' }` instantly). While useful for testing UI state updates and basic frontend logic, **this approach is insufficient for verifying Capital.com's strict matching engine validations**.

We have experienced false positives where our frontend sent payloads that passed our local mocks perfectly, but were rejected silently by Capital.com's live matching engine due to strict validation rules (resulting in 'Unknown reason' WebSocket failures).

### The Live E2E Testing Mandate
To combat false positives, **all future broker API interactions must be verified using the live suite**, not just local mocks.

The file `live-api.spec.ts` is our dedicated live validation suite. It:
1. Strictly bypasses all local mocks (`page.route`).
2. Authenticates with the real Capital.com Demo API using `.env.local` credentials.
3. Places a real micro-order.
4. Asserts that the live WebSocket `confirms` event registers an `ACCEPTED` status.
5. Uses a robust `afterEach` teardown to immediately flatten the position, guaranteeing the demo account is not polluted, even if the test fails.

## Running the Tests

To run the standard mocked suite (fast, offline-capable):
```bash
npx playwright test tests/e2e/order-lifecycle.spec.ts
```

To run the live validation suite (requires `.env.local` credentials):
```bash
npx playwright test tests/e2e/live-api.spec.ts
```

### Environment Variables for Live Tests
Ensure your `.env.local` file contains valid demo account credentials:
```env
CAPITAL_USER=your_email
CAPITAL_PASSWORD=your_password
CAPITAL_API_KEY=your_api_key
```
These are automatically picked up by `playwright.config.ts`.
