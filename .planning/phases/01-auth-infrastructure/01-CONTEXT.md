# Phase 1: Auth & Infrastructure - Context

**Gathered:** 2026-06-03
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the secure connection bridge between the frontend terminal and the Capital.com API. This includes an ephemeral backend proxy (Hono) to protect secrets, the implementation of the dual-token handshake, and a global toggle for environment management (Demo vs. Live).

</domain>

<decisions>
## Implementation Decisions

### Backend Infrastructure
- **D-01: Action-as-Server Hosting.** The Hono proxy will run inside a GitHub Action runner using a tunnel (e.g., `cloudflared`). This provides a truly ephemeral, zero-cost, and private backend that only exists during an active trading session.
- **D-02: Tunnel Discovery.** The frontend must be able to discover the tunnel URL. This will likely involve a handshake or a known ephemeral endpoint established when the GHA starts.

### Security & Secrets
- **D-03: Static GHA Secrets.** Capital.com credentials (API Key, Identifier, Password) will be stored as GitHub Repository Secrets. The proxy will automatically use these to perform the handshake, enabling a "Launch and Trade" experience without manual login.
- **D-04: Secure Pass-through.** The Hono proxy acts as a secure pass-through, appending necessary headers (CST, X-SECURITY-TOKEN) and managing the "Identifier" and "Password" during the initial login without exposing them to the client.

### Session Policy
- **D-05: In-memory Session Policy.** Session tokens (`CST`, `X-SECURITY-TOKEN`) will be held strictly in-memory (RAM) on the client side (Zustand). No tokens will be persisted to disk (LocalStorage), ensuring high security.
- **D-06: Refresh Behavior.** A page refresh will clear the session, triggering a brief (~1s) re-handshake with the proxy to restore the authenticated state.

### Environment Management
- **D-07: Cold Toggle Reset.** Switching between "Demo" and "Live" environments will perform a clean reset and re-login.
- **D-08: Unified Credentials.** Since Capital.com uses identical credentials for both environments, the toggle simply changes the target API endpoint and re-runs the login sequence.

### Claude's Discretion
- **D-09: Proxy Middleware.** Claude can decide on the specific Hono middleware for logging and error handling.
- **D-10: GHA Trigger.** Claude can design the GHA trigger (e.g., manual dispatch vs. specific branch push) that best fits the workflow.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### External APIs & Frameworks
- `https://open-api.capital.com/` — Capital.com REST & WebSocket API Documentation.
- `https://hono.dev/` — Hono web framework documentation.
- `https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/` — Cloudflared (Argo Tunnel) documentation for ephemeral connectivity.

### Project Specs
- `.planning/REQUIREMENTS.md` — Specifically AUTH-01, AUTH-02, AUTH-03.
- `.planning/ROADMAP.md` — Phase 1 milestones and goals.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `zustand`: Used for the in-memory session store (see `src/store/` for patterns).
- `Lucide-react`: For the Demo/Live toggle UI icons.

### Established Patterns
- **Layered Orchestration**: New auth logic should live in the Orchestration Layer (`src/hooks/useSession.ts`).
- **Stability Tracing**: Use `[StabilityTrace]` logs for proxy/auth handshake events.

### Integration Points
- `src/hooks/useSession.ts`: Primary integration point for managing the authenticated state.
- `src/App.tsx`: Top-level orchestration of the session lifecycle.

</code_context>

<specifics>
## Specific Ideas
- The "Action-as-Server" approach is a "hacker" style choice to avoid permanent hosting overhead.
- "Launch and Trade": The user wants to start the GHA, open the app, and be ready to trade without typing passwords.

</specifics>

<deferred>
## Deferred Ideas
- **Multi-Account Monitoring**: Currently out of scope; only one active account session (Demo or Live) at a time.
- **Auto-Refresh**: If session tokens expire mid-session, manual re-login (or simple refresh) is the v1 path.

</deferred>

---

*Phase: 01-Auth & Infrastructure*
*Context gathered: 2026-06-03*
