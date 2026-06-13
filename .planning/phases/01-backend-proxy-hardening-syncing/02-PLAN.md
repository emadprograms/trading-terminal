---
phase: 01-backend-proxy-hardening-syncing
plan: 02
type: execute
wave: 2
depends_on: ["01"]
files_modified: ["src/lib/ws-manager.ts", "src/lib/sync-coordinator.ts", "tests/unit/ws-manager.test.ts"]
autonomous: true
gap_closure: true
requirements: [PROXY-01, PROXY-03]
must_haves:
  truths:
    - "User sees 'Retrying chart data fetch...' toast when WebSocket connection drops"
    - "User sees 'Chart data fetch succeeded' toast when WebSocket connection recovers"
  artifacts:
    - path: "src/lib/ws-manager.ts"
      provides: "WebSocket connection state management and listener capabilities"
    - path: "src/lib/sync-coordinator.ts"
      provides: "UI toast notifications triggered by WebSocket state changes"
  key_links:
    - source: "src/lib/sync-coordinator.ts"
      target: "src/lib/ws-manager.ts"
      description: "sync-coordinator subscribes to onDisconnect/onReconnect listeners from ws-manager"
---

<objective>
Fix missing connection status listeners and toasts for WS disconnect/reconnect.

Purpose: Provide user feedback when the live streaming connection drops.
Output: Working toast notifications on network drop/recovery.
</objective>

<execution_context>
@~/.gemini/antigravity/gsd-core/workflows/execute-plan.md
@~/.gemini/antigravity/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/01-backend-proxy-hardening-syncing/01-01-SUMMARY.md
@.planning/phases/01-backend-proxy-hardening-syncing/01-UAT.md
@src/lib/ws-manager.ts
@src/lib/sync-coordinator.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add WS Disconnect/Reconnect Listeners and Wire Toasts</name>
  <files>src/lib/ws-manager.ts, src/lib/sync-coordinator.ts, tests/unit/ws-manager.test.ts</files>
  <action>
    - Add `onDisconnect` and `onReconnect` listener capabilities to `ws-manager.ts` (e.g., using arrays of callbacks like `onConnectListeners`).
    - Trigger `onDisconnect` callbacks in `socket.onclose` when a reconnect is scheduled (`!this.isExplicitlyDisconnected`).
    - Trigger `onReconnect` callbacks in `socket.onopen` when recovering from a disconnect (`this.reconnectAttempts > 0`).
    - In `src/lib/sync-coordinator.ts`, subscribe to the new `onDisconnect` and `onReconnect` listeners from `ws-manager`.
    - In the `onDisconnect` subscriber in `sync-coordinator.ts`, call `toast.error('Retrying chart data fetch...', { id: 'ws-retry' })`.
    - In the `onReconnect` subscriber in `sync-coordinator.ts`, call `toast.success('Chart data fetch succeeded', { id: 'ws-retry' })`.
    - Update `tests/unit/ws-manager.test.ts` to add tests verifying the `onDisconnect` and `onReconnect` callbacks are triggered appropriately.
  </action>
  <verify>
    <automated>npm run test -- tests/unit/ws-manager.test.ts</automated>
  </verify>
  <done>Toasts appear appropriately during WebSocket interruptions and listeners are wired.</done>
</task>

</tasks>

<success_criteria>
- WebSocket drops trigger an error toast.
- WebSocket reconnects trigger a success toast.
- Connection status listeners are implemented.
- Tests pass.
</success_criteria>

<output>
Create `.planning/phases/01-backend-proxy-hardening-syncing/01-02-SUMMARY.md` when done
</output>
