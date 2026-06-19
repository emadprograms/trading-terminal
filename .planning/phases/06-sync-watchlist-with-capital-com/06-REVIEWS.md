---
phase: "06"
reviewers: ["gemini", "antigravity"]
reviewed_at: "2026-06-19T10:17:12Z"
plans_reviewed: ["06-PLAN-1.md", "06-PLAN-2.md", "06-PLAN-3.md", "06-PLAN-4.md"]
---

# Cross-AI Plan Review — Phase 06

## Gemini Review

### Phase 06: Plan 1 (API Proxy & Services)
**Summary**
This plan focuses on building the backend Vercel proxy handlers (`api/watchlist.ts`) and the frontend API service (`src/services/watchlist.ts`). It correctly aims to reuse existing security patterns (`proxyRequest`) to securely route requests to the Capital.com API.

**Strengths**
- **Security:** Reusing `proxyRequest` ensures credential injection is handled securely and consistently.
- **Separation of Concerns:** Clearly separates frontend API service methods from the backend proxy implementation.

**Concerns**
- **Missing API specifics (HIGH):** The plan assumes a generic `watchlist/v1/watchlists` endpoint. If Capital.com requires adding symbols one by one rather than in a bulk update, the proxy or service logic will need to handle batching/looping. 
- **Error Handling (MEDIUM):** While it mentions using "the same error handling patterns," it doesn't specify how to handle Capital.com specific errors (e.g., invalid symbol).
- **Rate Limiting (LOW):** Does not account for potential rate limits on Capital.com's endpoints.

**Suggestions**
- Explicitly define the expected payload format and exact Capital.com endpoints before implementing to avoid rework.
- Specify how the proxy should handle scenarios where adding a specific symbol fails, and ensure these errors propagate clearly back to the frontend service.

---

### Phase 06: Plan 2 (Frontend Sync Logic & Startup)
**Summary**
This plan implements the core business logic in `useWatchlistStore`, including enforcing the master state on startup and executing the two-way manual sync logic to combine local additions with the remote state.

**Strengths**
- **Alignment with Decisions:** Strictly enforces D-01 and D-02 regarding master state and manual two-way sync.
- **Clear Acceptance Criteria:** The expectations for both `initializeWatchlist` and `syncWithRemote` are well-defined.

**Concerns**
- **Data Loss on Startup Error (HIGH):** The plan states to "directly override the local `symbols` state with the fetched symbols". If the user is offline or the API proxy fails on startup, this could result in wiping the local cache entirely, leaving the user with an empty watchlist.
- **Sync Race Conditions / Partial Failures (HIGH):** During `syncWithRemote`, the app fetches, diffs, pushes, and updates local state. If the "push" step fails due to a network error, the local state might end up in an inconsistent or out-of-sync state without the user knowing.

**Suggestions**
- Implement an offline/error fallback for `initializeWatchlist`: if the fetch fails on startup, retain the existing local cache and perhaps show a "working offline" indicator.
- Add robust error handling to `syncWithRemote`: wrap the push/pull sequence in a try/catch, and only update the local store if the push to Capital.com succeeds to ensure atomicity.

---

### Phase 06: Plan 3 (UI Implementation)
**Summary**
This plan updates the UI by adding a "Sync" button to the Watchlist sidebar header. It correctly specifies that the button should trigger the manual sync and show a loading indicator to prevent multiple rapid clicks.

**Strengths**
- **Focused Scope:** Keeps UI concerns neatly separated from the state management.
- **UX Considerations:** Addresses the user experience by including a loading state (`isSyncing`) and disabling the button while operations are in flight.

**Concerns**
- **Missing Error UI (MEDIUM):** The plan mentions the button stops spinning "when the call completes or errors out", but it does not specify showing any error notification to the user if the sync fails. 
- **Missing Success UI (LOW):** Users may not know if the sync was successful if the list doesn't visually change.

**Suggestions**
- Explicitly integrate a toast notification or error message in the UI if `syncWithRemote` throws an error.
- Consider adding a subtle success indicator (e.g., a green checkmark briefly replacing the icon or a success toast) when the sync completes successfully.

---

### Phase 06: Plan 4 (Testing & Verification)
**Summary**
This plan introduces Playwright E2E tests to verify the watchlist synchronization flow. It aligns with the project's strategy of testing against the live proxy to ensure real-world correctness.

**Strengths**
- **Testing Reality:** Avoids over-mocked tests by hitting the live API through the proxy, ensuring the integration actually works.
- **Clear User Journey:** Tests the critical path from the UI down to the network request.

**Concerns**
- **Test State Pollution (MEDIUM):** Running tests against a live environment means the test will actually add/remove symbols on the live Capital.com test account. If multiple tests run or fail mid-execution, the account state could become polluted and cause flaky tests in the future.
- **Lack of Negative Testing (LOW):** Only the "happy path" is tested.

**Suggestions**
- Add explicit teardown/cleanup logic in the Playwright test to reset the watchlist on the live account to its original state after the test completes.
- Add a test case for failure scenarios (e.g., intercepting the proxy network request to force a 500 error) to ensure the UI handles and displays the error gracefully.

---

### Risk Assessment
**Overall Risk Level: HIGH**

**Justification:**
While the architectural separation is strong, the current plan carries a **HIGH** risk due to the lack of error handling in Plan 2. Overriding the local state on startup without accounting for network failures could lead to catastrophic data loss for the user (a completely wiped watchlist). Furthermore, without atomic rollback mechanisms during the manual sync, partial network failures could easily leave the local and remote states out of sync. Finally, executing E2E tests against a live stateful API without explicit cleanup logic risks polluting the test environment, leading to persistent pipeline failures down the line. Addressed properly, these issues are easy to fix, but they are critical to the system's stability.

---

## Antigravity Review

### 1. Summary
The implementation plans provide a solid, logically sequenced approach to building the manual two-way sync feature. The breakdown into 4 independent waves (API proxy, state management, UI, and testing) is well-structured and aligns nicely with the established project patterns. However, while the "happy path" is clearly defined, the plans currently overlook critical edge cases regarding data resolution (specifically around local deletions), lack error handling feedback in the UI, and propose live E2E tests that risk polluting the real user's account state. 

### 2. Strengths
- **Logical Phasing:** The wave-based approach minimizes dependencies and ensures that backend services are fully functional before the UI and tests attempt to consume them.
- **Architecture Consistency:** Plan 1 effectively reuses existing patterns (`api/_utils.ts` and `proxyRequest`), which ensures security and credential injection are handled without reinventing the wheel.
- **UI State Feedback:** Plan 3 correctly anticipates the need for an `isSyncing` state to handle rapid clicking and provide visual feedback during potentially slow network operations.
- **Direct Alignment with Decisions:** Plan 2 accurately enforces the decision to use the Capital.com API as the absolute master state upon startup (D-02).

### 3. Concerns
- **HIGH: Sync Logic Ambiguity (Local Deletions):** Plan 2 specifies pushing "local additions" to the remote, but it fails to define what happens to symbols the user *deleted* locally before clicking sync. If the logic simply fetches the remote and merges local additions, it will permanently re-add locally deleted symbols, making local deletion impossible unless synced immediately. 
- **HIGH: Live API Mutation in Tests:** Plan 4 proposes E2E tests against the live Capital.com API. Mutating live watchlists (adding/removing symbols) in tests can pollute the user's real account and cause flaky tests if multiple runs execute concurrently.
- **MEDIUM: Lack of Error Handling UI:** Plan 3 manages the disabled/spinning state but ignores failure states. If the sync fails (e.g., due to a network error, Capital.com outage, or rate limit), the user is left without any error toast, notification, or feedback indicating the failure.
- **LOW: React Strict Mode Double-Fetch:** Plan 2 hooks up `initializeWatchlist` inside `App.tsx`'s `useEffect`. In development (React Strict Mode), this will fire twice, potentially causing race conditions or hitting rate limits immediately on startup.
- **LOW: Half-Failed Sync State:** In Plan 2, if `syncWithRemote` successfully fetches from the remote but fails when pushing local additions via `updateWatchlist`, the plan does not specify if the local state should revert, merge the pulled changes anyway, or clear everything.

### 4. Suggestions
- **Refine Sync Resolution (Plan 2):** Explicitly define the behavior for local deletions. You may need to maintain a "dirty" list of local removals to push to Capital.com during the sync, or clarify to the user that local deletions are temporary until pushed. 
- **Add Error Feedback (Plan 3):** Update the UI plan to include a toast notification or error state variable so users are explicitly informed if the synchronization fails.
- **E2E Test Teardown (Plan 4):** Update the test plan to explicitly include a teardown step that cleans up any symbols added during the test, or mandate the use of a dedicated test market/asset to avoid polluting the main watchlist.
- **Robust Startup Hook (Plan 2):** Add a boolean guard (e.g., `hasInitialized.current`) in the `useEffect` or utilize the store to prevent duplicate fetches on mount, avoiding unnecessary duplicate Capital.com API calls.
- **Atomic State Updates (Plan 2):** Ensure `syncWithRemote` in `useWatchlistStore.ts` does not mutate the local state until the entire remote transaction (both fetch and push) resolves successfully.

### 5. Risk Assessment
**MEDIUM**  
**Justification:** While the architectural integration is low risk and well-thought-out, the state synchronization logic has critical functional gaps regarding user-driven deletions and failure states. Furthermore, mutating live production state in E2E tests introduces potential flakiness and account pollution that needs to be addressed before execution begins. Implementing the suggested edge-case handling will easily lower this to a LOW risk profile.

---

## Consensus Summary

Both reviewers noted significant concerns with the state synchronization logic, missing error UI, and the impact of the live E2E tests.

### Agreed Strengths
- **Logical Phasing & Separation of Concerns:** Wave-based plans clearly separate API, state management, and UI logic.
- **Security & Consistency:** Relying on `proxyRequest` handles credential injection cleanly.
- **Alignment with Decisions:** The master state rule (D-02) and two-way sync (D-01) are well understood and represented in the plans.

### Agreed Concerns
- **State Inconsistencies on Failure (HIGH):** If the network request fails mid-sync or during startup, local cache data could be wiped out completely, or end up out of sync with the remote without user awareness. 
- **Test State Pollution (HIGH):** E2E tests mutating the live Capital.com API must have explicit cleanup/teardown steps, otherwise they risk polluting the test account and causing flaky pipelines.
- **Missing Error UI (MEDIUM):** There is no explicit feedback provided to the user when a synchronization operation fails. 

### Divergent Views
- **Local Deletions:** Antigravity Reviewer raised a critical point about what happens to "local deletions" during the two-way sync, which is an overlooked edge case in the original requirements. 
- **React Strict Mode:** Antigravity Reviewer brought up the double-execution of `useEffect` in React Strict Mode which might hit API rate limits on startup. 
- **Data Loss on Startup:** Gemini Reviewer specifically noted that `initializeWatchlist` overriding the local state on startup could wipe the cache if the user is offline or the proxy fails.
