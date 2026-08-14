---
phase: 01-backend-proxy-hardening-syncing
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - api/_utils.ts
  - api/order.ts
  - src/lib/sync-coordinator.ts
  - src/services/client.ts
  - src/services/trade.ts
  - api/order.test.ts
  - src/services/trade.test.ts
autonomous: false
requirements: [PROXY-01, PROXY-02, PROXY-03]
must_haves:
  truths:
    - "Malformed orders are blocked at the proxy level and return 400"
    - "Order execution never automatically retries upon failure"
    - "User sees clear toast notifications if chart data fetches retry or succeed after a retry"
    - "User sees precise error messages indicating whether validation failed at the proxy or was rejected by Capital.com"
  artifacts:
    - path: "api/order.ts"
      provides: "Zod schemas and validation logic"
      contains: "marketOrderSchema"
    - path: "package.json"
      provides: "zod dependency"
  key_links:
    - from: "src/services/trade.ts"
      to: "UI"
      via: "Throws formatted error message"
      pattern: "Proxy Validation Error:"
---

<objective>
Implement strict Zod validation for proxy requests, enforce explicit retry policies, and improve error formatting.

Purpose: Close the 4 critical gaps identified in research, ensuring no malformed payloads reach Capital.com, order executions never double-fire due to retries, and errors are clearly distinguishable.
Output: Hardened proxy layer, resilient sync coordinator, and accurate API client tests.
</objective>

<execution_context>
@~/.gemini/antigravity/gsd-core/workflows/execute-plan.md
@~/.gemini/antigravity/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@api/_utils.ts
@api/order.ts
@src/lib/sync-coordinator.ts
@src/services/client.ts
@src/services/trade.ts
</context>

<tasks>

<task type="checkpoint:human-verify" gate="blocking-human">
  <what-built>Package Legitimacy Audit Fallback</what-built>
  <how-to-verify>
    The RESEARCH.md lacked a Package Legitimacy Audit table. Applying fallback policy: treating `zod` as [ASSUMED].
    Verify the legitimacy of `zod` via https://npmjs.com/package/zod before approving installation.
  </how-to-verify>
  <resume-signal>Type "approved" to proceed with installation</resume-signal>
</task>

<task type="auto">
  <name>Task 1: Add Zod and Implement Proxy Validation (PROXY-02)</name>
  <files>package.json, api/_utils.ts, api/order.ts</files>
  <action>
    Per D-05:
    1. Run `npm install zod`.
    2. In `api/_utils.ts`, export the `readBody` function.
    3. In `api/_utils.ts`, modify `proxyRequest` signature to `export async function proxyRequest(req: IncomingMessage, res: ServerResponse, path: string, preParsedBody?: Buffer)`. Use `preParsedBody` instead of awaiting `readBody(req)` if it is provided.
    4. In `api/order.ts`, import `zod` and define `marketOrderSchema`, `limitOrderSchema`, and `updatePositionSchema` based on `src/types/trade.ts`.
    5. In `api/order.ts` handler, if `req.method` is POST or PUT, await `readBody(req)`. Parse it to JSON and validate against the correct schema (POST to workingorders = limitOrderSchema, POST to positions = marketOrderSchema, PUT to positions = updatePositionSchema).
    6. If validation fails, return 400 Bad Request: `res.end(JSON.stringify({ errorCode: 'PROXY_VALIDATION_ERROR', developerMessage: err.errors.map(e => e.message).join(', ') }))`.
    7. If validation passes, call `proxyRequest(req, res, finalPath, bodyBuffer)`.
  </action>
  <verify>
    <automated>grep -q "PROXY_VALIDATION_ERROR" api/order.ts</automated>
  </verify>
  <done>Malformed payloads return 400 PROXY_VALIDATION_ERROR instead of reaching Capital.com.</done>
</task>

<task type="auto">
  <name>Task 2: Resiliency, Retries &amp; Error Precision (PROXY-01, PROXY-03, D-03, D-04, D-06, D-07)</name>
  <files>src/lib/sync-coordinator.ts, src/services/client.ts, src/services/trade.ts</files>
  <action>
    Per D-03, D-04, D-06, and D-07:
    1. In `src/lib/sync-coordinator.ts`, import `toast` from `sonner`. Update `fetchWithRetry` to attempt up to 3 retries (4 total attempts). On the first failure, trigger `toast.error('Retrying chart data fetch...')`. Wait 1000ms before retrying. If a subsequent retry succeeds, trigger `toast.success('Chart data fetch succeeded')`.
    2. In `src/services/client.ts`, add `retry: 0` to the `ky.create` options to definitively prevent automatic retries on order mutations.
    3. In `src/services/trade.ts` inside `fetchTradeApi`, when formatting the error message (`if (!response.ok)`), intercept the Zod error: `if (code === 'PROXY_VALIDATION_ERROR') { msg = \`Proxy Validation Error: \${desc}\`; }`. For other errors, format as `Capital.com Rejection: \${code}: \${desc}` or `Capital.com Rejection: \${desc}`.
  </action>
  <verify>
    <automated>grep -q "retry: 0" src/services/client.ts</automated>
  </verify>
  <done>Client never retries mutations, sync-coordinator surfaces toast notifications, and trade.ts formats errors precisely.</done>
</task>

<task type="auto">
  <name>Task 3: Extensive Tests Coverage (PROXY-02, PROXY-03)</name>
  <files>api/order.test.ts, src/services/trade.test.ts</files>
  <action>
    1. Create `api/order.test.ts` using Vitest. Mock `req` (as an AsyncIterable emitting buffer chunks) and `res` (mocking `setHeader`, `statusCode`, `end`). Write specific tests verifying that malformed payloads for Market, Limit, and Update orders are strictly rejected with `400 PROXY_VALIDATION_ERROR`.
    2. In `src/services/trade.test.ts`, fix the mocked `ky` error for the `should throw human-readable error` test. The mock should resolve to `{ ok: false, status: 400, text: () => Promise.resolve(JSON.stringify({ errorCode: 'PROXY_VALIDATION_ERROR', developerMessage: 'Invalid parameters' })) }` (since `throwHttpErrors: false` is used). Assert that it rejects with `Proxy Validation Error: Invalid parameters`.
  </action>
  <verify>
    <automated>npm run test -- api/order.test.ts src/services/trade.test.ts</automated>
  </verify>
  <done>Specific Zod validation tests are implemented and trade tests accurately reflect the new error formatting.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Client → Vercel Proxy | Untrusted client payload reaches serverless function |
| Vercel Proxy → Capital.com | Validated payload is sent to broker API |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-01 | Tampering | `api/order.ts` | mitigate | Strict Zod validation applied to all order payloads (PROXY-02) |
| T-01-SC | Tampering | npm installs | mitigate | slopcheck + blocking human checkpoint for [ASSUMED] / [SUS] |
</threat_model>

<verification>
- `npm run test` passes without errors.
- `package.json` includes `zod`.
- Order proxy correctly intercepts and validates POST/PUT bodies, enforcing accurate rejection logic.
</verification>

<success_criteria>
All 4 research gaps are closed: Zod validation is live, retries are disabled for orders and expanded for syncing, error messages are precise, and testing is accurate and extensive.
</success_criteria>

<output>
Create `.planning/phases/01-backend-proxy-hardening-syncing/01-01-SUMMARY.md` when done
</output>
