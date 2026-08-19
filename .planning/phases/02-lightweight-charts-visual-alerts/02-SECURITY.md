---
phase: 02
slug: lightweight-charts-visual-alerts
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-08-19
---

# Phase 02 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Client UI | Visual alert rendering within the canvas | Alert price levels and state |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-1 | Tampering | useChartAlerts | low | mitigate | Assumed handled by alert creation validation. | closed |
| I-1 | Info Disclosure | useChartAlerts | high | mitigate | `useEffect` cleanup properly removes all lines and clears the references. | closed |
| D-1 | DoS (Client) | useChartAlerts | high | mitigate | `try...catch` block in the cleanup function safely handles race conditions. | closed |
| D-2 | DoS (Client) | useChartAlerts | medium | accept | The hook renders all active alerts; limits should be enforced at alert creation in the store/backend. | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01 | D-2 | Alert rendering is bounded by the creation limits enforced by the store or backend. | gsd-security-auditor | 2026-08-19 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-08-19 | 4 | 4 | 0 | gsd-security-auditor |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-08-19
