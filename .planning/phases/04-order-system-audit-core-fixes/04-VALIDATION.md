---
phase: 04
slug: order-system-audit-core-fixes
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-17
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | package.json / vitest.config.ts |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | AUDIT-01 | N/A | N/A | unit | `npx vitest run src/store/useTradeStore.audit.test.ts` | ✅ | ✅ green |
| 04-01-02 | 01 | 1 | ORDER-01 | N/A | N/A | unit | `npx vitest run src/hooks/useKeyboardShortcuts.audit.test.tsx` | ✅ | ✅ green |
| 04-01-03 | 01 | 1 | ORDER-02 | N/A | N/A | unit | `npx vitest run src/store/useTradeStore.audit.test.ts` | ✅ | ✅ green |
| 04-01-04 | 01 | 1 | ORDER-03 | N/A | N/A | unit | `npx vitest run src/store/useTradeStore.audit.test.ts` | ✅ | ✅ green |
| 04-01-05 | 01 | 1 | Task 5 | N/A | N/A | unit | `npx vitest run src/store/useTradeStore.audit.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-17

## Validation Audit 2026-06-17
| Metric | Count |
|--------|-------|
| Gaps found | 5 |
| Resolved | 5 |
| Escalated | 0 |
