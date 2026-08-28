---
phase: 02
slug: lightweight-charts-visual-alerts
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-08-19
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | none |
| **Quick run command** | `npm run test tests/hooks/useChartAlerts.test.ts` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~1 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test tests/hooks/useChartAlerts.test.ts`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 1 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 02 | 1 | VISUAL-01 | — | N/A | unit | `npm run test tests/hooks/useChartAlerts.test.ts` | ✅ | ✅ green |
| 02-02-01 | 02 | 1 | VISUAL-01 | — | N/A | unit | `npm run test tests/hooks/useChartAlerts.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/hooks/useChartAlerts.test.ts` — stubs for VISUAL-01

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Chart line rendering | VISUAL-01 | Visual verification of chart line rendering requires human judgment. | 1. Add alert. Verify orange line. 2. Remove alert. Verify line disappears. 3. Switch tickers. Verify line disappears. 4. Trigger alert. Verify line disappears. |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 1s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-08-19
