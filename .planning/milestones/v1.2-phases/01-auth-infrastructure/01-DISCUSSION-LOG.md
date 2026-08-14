# Phase 1: Auth & Infrastructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-03
**Phase:** 1-Auth & Infrastructure
**Areas discussed:** Backend Hosting, Secret Management, Session Policy, Account Toggle Behavior

---

## Backend Hosting

| Option | Description | Selected |
|--------|-------------|----------|
| Serverless (Workers) | Always on, fast, deployed by GHA. | |
| Action-as-Server | Runner + Tunnel. Truly ephemeral, no extra accounts. | ✓ |

**User's choice:** Action-as-Server
**Notes:** The user wants a truly ephemeral backend that lives within the GHA runner.

---

## Secret Management

| Option | Description | Selected |
|--------|-------------|----------|
| Static GHA Secrets | Save in Repository Secrets, auto-login. | ✓ |
| Manual UI Entry | Enter login/pass in UI every session. | |

**User's choice:** Static GHA Secrets
**Notes:** Preferred for convenience and a "Launch and Trade" experience.

---

## Session Policy

| Option | Description | Selected |
|--------|-------------|----------|
| LocalStorage (Persistent) | Survives refresh, stored on disk. | |
| In-memory (Ephemeral) | Clears on refresh, RAM only. | ✓ |

**User's choice:** In-memory (Ephemeral)
**Notes:** Chosen for security. page refresh will require a re-handshake.

---

## Account Toggle Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Hot Toggle (Seamless) | Switch instantly (both sessions active). | |
| Cold Toggle (Reset) | Clean reset/re-login on switch. | ✓ |

**User's choice:** Cold Toggle (Reset)
**Notes:** The user clarified that credentials (API key, identifier, password) are the same for both demo and live, but the endpoints differ. A clean reset and re-handshake is preferred when switching.

---

## Claude's Discretion
- Implementation of the tunnel discovery mechanism.
- Hono middleware configuration.
- GHA workflow design for the ephemeral server.

## Deferred Ideas
- Multi-account simultaneous monitoring (deferred to future versions or out of scope for MVP).
