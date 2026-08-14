---
phase: 04
slug: order-system-audit-core-fixes
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-20T12:00:00Z
---

# Phase 04 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Client UI to State Store | User input triggering multiple API calls rapidly (Double Alt) | `epic`, `direction`, `size` |
| UI Rendering | Short ID generation from raw backend IDs | `dealId`, `dealReference` |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-04-01 | Race Conditions / UI Freeze | `useTradeStore.ts` | mitigate | `executingOperations` lock explicitly mitigates API abuse and prevents unintended position netting by rejecting subsequent rapid calls for the same epic. | closed |
| T-04-02 | Denial of Service | `useTradeStore.ts` | mitigate | Explicitly clearing `executingOperations` lock in `finally` blocks ensures the UI does not become permanently frozen upon an API failure. | closed |
| T-04-03 | Spoofing / Tampering | Keyboard Shortcuts | mitigate | Centralized Keyboard Shortcut Isolation (via `activeChartEpic`) ensures only the actively focused chart accepts trade commands, preventing multiple ghost orders across instances. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-04-01 | - | None identified for this phase | System | 2026-06-20 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-20 | 3 | 3 | 0 | gsd-secure-phase |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-20
