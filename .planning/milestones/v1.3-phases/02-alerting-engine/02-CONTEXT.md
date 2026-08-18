# Phase 2: Alerting Engine Implementation - Context

**Gathered:** 2026-08-18
**Status:** Ready for planning
**Mode:** Auto-generated

<domain>
## Phase Boundary
Build the core logic to evaluate market data against alert conditions (ALERT-02).
</domain>

<decisions>
## Implementation Decisions
- **Store:** Zustand store (`useAlertStore`) to hold active alerts.
- **Data Model:**
  ```typescript
  type Alert = {
    id: string;
    targetPrice: number;
    direction: 'above' | 'below';
    triggered: boolean;
    createdAt: number;
  };
  ```
- **Evaluator Logic:** A function that receives the latest tick (price) and marks alerts as triggered if the price crosses the threshold.
- **Unit Tests:** `src/store/useAlertStore.test.ts` to mock tick injections and verify state changes.
</decisions>
