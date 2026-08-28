---
phase: 01-backend-proxy-hardening-syncing
plan: 03
type: execute
wave: 1
depends_on: []
files_modified: [src/lib/ws-manager.ts]
autonomous: true
requirements: [PROXY-02]
gap_closure: true

must_haves:
  truths:
    - "When the live streaming chart is active, turning off network access immediately forces the socket reconnect flow and triggers an error toast."
    - "Restoring network access immediately forces socket connection and triggers a success toast."
  artifacts:
    - path: "src/lib/ws-manager.ts"
      provides: "Network offline/online event listeners to handle ungraceful network drops."
  key_links: []
---

<objective>
Address the UAT gap where ungraceful network drops (e.g., removing the ethernet cable or turning on dev tools Offline mode) fail to trigger the WebSocket `onclose` event immediately, causing the UI to show stale data without a disconnect toast.

Purpose: Make the WebSocket connection resilient to ungraceful network drops by wiring up browser `offline` and `online` events, ensuring the UI accurately reflects network availability and reconnects promptly when access is restored.
Output: Modified `ws-manager.ts` with network event listeners.
</objective>

<execution_context>
@~/.gemini/antigravity/gsd-core/workflows/execute-plan.md
@~/.gemini/antigravity/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md

Gap reason: "WebSocket onclose event does not fire immediately on ungraceful network drops. Lacks browser 'offline' event listener to detect network drops."
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add network event listeners for ungraceful drops</name>
  <files>src/lib/ws-manager.ts</files>
  <action>
    Modify `WebSocketManager` to listen to browser `offline` and `online` events and properly manage the `reconnectTimeout`:

    1. Add `private reconnectTimeout: number | null = null;` to the class properties.
    2. Update `scheduleReconnect()`:
       - Clear `this.reconnectTimeout` using `window.clearTimeout` if it is not null.
       - Use `window.setTimeout` instead of `setTimeout` for the reconnect delay, and assign its return value to `this.reconnectTimeout`.
    3. Update the `private constructor()` to add browser network listeners inside a `if (typeof window !== 'undefined')` block:
       - Add `window.addEventListener('offline', ...)`: Log `[WSManager] Network offline detected`. If `this.socket` exists, immediately call `this.socket.close()`. This natively triggers the existing `onclose` logic which fires disconnect listeners (showing the error toast) and starts the reconnect loop.
       - Add `window.addEventListener('online', ...)`: Log `[WSManager] Network online detected`. If `!this.isExplicitlyDisconnected` and the socket state is NOT `WebSocket.OPEN` and NOT `WebSocket.CONNECTING`:
         - Clear the `this.reconnectTimeout` (and set to null).
         - Set `this.reconnectAttempts = Math.max(1, this.reconnectAttempts)`. This ensures that when the socket opens, the `onopen` listener will evaluate `this.reconnectAttempts > 0` and correctly fire the `onReconnectListeners`, showing the success toast.
         - Call `this.connect()`.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <done>
    `ws-manager.ts` builds without type errors and includes `offline` and `online` listeners that correctly manage socket state and reconnect timeouts.
  </done>
</task>

</tasks>

<verification>
No overarching phase verification needed for this atomic gap closure plan. The TypeScript compiler verifies syntax correctness. Functional testing will be done in UAT.
</verification>

<success_criteria>
`ws-manager.ts` handles browser network events to proactively close and reconnect WebSockets upon ungraceful connection drops.
</success_criteria>

<output>
Create `.planning/phases/01-backend-proxy-hardening-syncing/01-03-SUMMARY.md` when done
</output>
