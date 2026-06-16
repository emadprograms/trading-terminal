# Milestone v1.1 Roadmap: Orders Audit & Hardening

**2 phases** | **5 requirements mapped** | All covered ✓

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 4 | Order System Audit & Core Fixes | Fix known bugs and perform a deep code audit to discover and patch any state/event duplication issues. | AUDIT-01, ORDER-01, ORDER-02, ORDER-03 | 3 |
| 5 | Order Lifecycle Testing & Validation | Build a rigorous test suite to stress-test the order execution under all known and edge-case conditions. | TEST-03 | 3 |

### Phase Details

**Phase 4: Order System Audit & Core Fixes**
Goal: Fix known bugs and perform a deep code audit to discover and patch any state/event duplication issues.
Requirements: AUDIT-01, ORDER-01, ORDER-02, ORDER-03
Success criteria:
1. Double Alt properly nets out positions based on 'PENDING' status only.
2. Limit orders can be reliably placed and cancelled without getting stuck.
3. No double orders or ghost orders are placed via UI buttons or shortcuts (like alt+q) regardless of chart count.

**Phase 5: Order Lifecycle Testing & Validation**
Goal: Build a rigorous test suite to stress-test the order execution under all known and edge-case conditions.
Requirements: TEST-03
Success criteria:
1. Test suite completely covers standard order placement and lifecycle.
2. Test suite covers edge cases: double alt, multi-chart inputs, limit cancellations.
3. Tests consistently pass without flakiness against live endpoints or accurate mocks.
