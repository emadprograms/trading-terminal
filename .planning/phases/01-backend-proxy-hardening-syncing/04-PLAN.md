---
phase: 01-backend-proxy-hardening-syncing
plan: 04
type: execute
wave: 1
depends_on: []
files_modified: [src/lib/sync-coordinator.ts, src/components/AccountHeader.tsx, src/store/useSessionStore.ts, src/lib/ws-manager.ts]
autonomous: true
requirements: []
gap_closure: true

must_haves:
  truths:
    - "Instead of toasts, network disconnection and reconnection update the existing 'Online' button in the top left header."
  artifacts:
    - path: "src/lib/sync-coordinator.ts"
      provides: "No toasts on disconnect/reconnect."
    - path: "src/components/AccountHeader.tsx"
      provides: "Reflects WebSocket connection status."
    - path: "src/store/useSessionStore.ts"
      provides: "Stores `isWsConnected` state."
    - path: "src/lib/ws-manager.ts"
      provides: "Updates `isWsConnected` state on connect/disconnect."
  key_links:
    - from: "src/lib/ws-manager.ts"
      to: "src/store/useSessionStore.ts"
      via: "calls setIsWsConnected"
      pattern: "setIsWsConnected"
    - from: "src/components/AccountHeader.tsx"
      to: "src/store/useSessionStore.ts"
      via: "consumes isWsConnected"
      pattern: "isWsConnected"
---

<objective>
Fix the UI disruption caused by toast notifications during network connection and disconnection.
Instead of toasts, surface the WebSocket connection status directly in the `AccountHeader`'s "Online" indicator.

Purpose: Improve UX by replacing intrusive toasts with a persistent, non-blocking UI state.
Output: Modified `sync-coordinator.ts`, `ws-manager.ts`, `useSessionStore.ts`, and `AccountHeader.tsx` to handle connection state via the store.
</objective>

<execution_context>
@~/.gemini/antigravity/gsd-core/workflows/execute-plan.md
@~/.gemini/antigravity/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@src/lib/sync-coordinator.ts
@src/components/AccountHeader.tsx
@src/store/useSessionStore.ts
@src/lib/ws-manager.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add WebSocket connection state to Session Store</name>
  <files>src/store/useSessionStore.ts</files>
  <action>
    - Add `isWsConnected: boolean` to `SessionState`.
    - Add `setIsWsConnected: (status: boolean) => void` to `SessionState` interface and its implementation in `create<SessionState>`.
    - Default `isWsConnected` to `false`.
  </action>
  <verify>
    <automated>grep -c 'isWsConnected' src/store/useSessionStore.ts | awk '{if ($1 > 0) exit 0; else exit 1}'</automated>
  </verify>
  <done>Session store exposes WebSocket connection status.</done>
</task>

<task type="auto">
  <name>Task 2: Update WebSocket connection state from WS Manager</name>
  <files>src/lib/ws-manager.ts</files>
  <action>
    - In `socket.onopen`, call `useSessionStore.getState().setIsWsConnected(true)`.
    - In `socket.onclose`, call `useSessionStore.getState().setIsWsConnected(false)`.
    - Ensure this matches the `WebSocketManager` event lifecycle correctly.
  </action>
  <verify>
    <automated>grep -c 'setIsWsConnected' src/lib/ws-manager.ts | awk '{if ($1 > 0) exit 0; else exit 1}'</automated>
  </verify>
  <done>wsManager correctly synchronizes connection status to the session store.</done>
</task>

<task type="auto">
  <name>Task 3: Remove toast notifications from Sync Coordinator</name>
  <files>src/lib/sync-coordinator.ts</files>
  <action>
    - Remove the `toast.error` and `toast.success` calls from the `SyncCoordinator` constructor related to `wsManager.onDisconnect` and `wsManager.onReconnect`.
    - You can leave the constructor completely empty or remove the `onDisconnect` / `onReconnect` callbacks entirely.
    - Inside `fetchWithRetry`, remove the toast calls: `toast.success('Chart data fetch succeeded')` and `toast.error('Retrying chart data fetch...')`.
  </action>
  <verify>
    <automated>grep -E -c 'Retrying chart data fetch...|Chart data fetch succeeded' src/lib/sync-coordinator.ts | awk '{if ($1 == 0) exit 0; else exit 1}'</automated>
  </verify>
  <done>SyncCoordinator no longer emits toast notifications for connection statuses.</done>
</task>

<task type="auto">
  <name>Task 4: Bind AccountHeader to connection status</name>
  <files>src/components/AccountHeader.tsx</files>
  <action>
    - Consume `isWsConnected` from `useSessionStore`.
    - Update the `status-indicator` section: 
      - The `dot` should have `status-online` ONLY IF `isAuthenticated && isWsConnected` is true.
      - The `status-text` should display `ONLINE` ONLY IF `isAuthenticated && isWsConnected` is true. Otherwise it displays `DISCONNECTED`.
  </action>
  <verify>
    <automated>grep -c 'isWsConnected' src/components/AccountHeader.tsx | awk '{if ($1 > 0) exit 0; else exit 1}'</automated>
  </verify>
  <done>AccountHeader correctly reflects the true connection state of the WebSocket instead of just authentication status.</done>
</task>

</tasks>

<success_criteria>
- No toast notifications appear upon network disconnect/reconnect.
- The 'ONLINE' indicator in the top-left turns 'DISCONNECTED' immediately upon WebSocket failure or network loss, and recovers when reconnected.
</success_criteria>

<output>
Create `.planning/phases/01-backend-proxy-hardening-syncing/01-04-SUMMARY.md` when done
</output>
