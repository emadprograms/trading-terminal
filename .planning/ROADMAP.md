# Milestone v1.1 Roadmap: Orders Audit & Hardening

**3 phases** | **6 requirements mapped** | All covered ✓

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 4 | Order System Audit & Core Fixes | Fix known bugs and perform a deep code audit to discover and patch any state/event duplication issues. | AUDIT-01, ORDER-01, ORDER-02, ORDER-03 | 3 |
| 5 | Order Lifecycle Testing & Validation | Build a rigorous test suite to stress-test the order execution under all known and edge-case conditions. | TEST-03 | 3 |
| 5.1 | Advanced Edge Case Testing | Expand test suite to cover complex trading actions, half-flatten logic, and API error recovery. | TEST-04 | 3 |

### Phase Details

### Phase 4: Order System Audit & Core Fixes
**Goal**: Fix known bugs and perform a deep code audit to discover and patch any state/event duplication issues.
**Requirements**: AUDIT-01, ORDER-01, ORDER-02, ORDER-03
**Success criteria**:
1. Double Alt properly nets out positions based on 'PENDING' status only.
2. Limit orders can be reliably placed and cancelled without getting stuck.
3. No double orders or ghost orders are placed via UI buttons or shortcuts (like alt+q) regardless of chart count.

### Phase 5: Order Lifecycle Testing & Validation
**Goal**: Build a rigorous test suite to stress-test the order execution under all known and edge-case conditions.
**Requirements**: TEST-03
**Success criteria**:
1. Test suite completely covers standard order placement and lifecycle.
2. Test suite covers edge cases: double alt, multi-chart inputs, limit cancellations.
3. Tests consistently pass without flakiness against live endpoints or accurate mocks.

### Phase 5.1: Advanced Edge Case Testing
**Goal**: Expand the E2E test suite to cover complex trading edge cases and error recovery mechanisms.
**Requirements**: TEST-04
**Success criteria**:
1. Attached SL/TP orders can be cancelled without ghosting.
2. Half-flatten logic correctly closes bad legs first.
3. API failures do not permanently lock the execution state.
