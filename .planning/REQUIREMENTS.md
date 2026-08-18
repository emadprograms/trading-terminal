# Milestone v1.3 Requirements

## Active Requirements

### Alerting E2E Benchmark
- [ ] **ALERT-01**: Build a comprehensive Playwright E2E test suite *first* that opens the application, sets a real-time alert via the UI, advances or waits for time/condition, and verifies the alert triggers visually or audibly exactly as expected. This test must fail initially and serve as the final gateway.

### Alerting Engine & UI
- [ ] **ALERT-02**: Implement the core Alert Engine logic (e.g., in Zustand or a Web Worker) to evaluate incoming market data against user-defined price or time targets. Must include comprehensive unit tests.
- [ ] **ALERT-03**: Build the Alert creation UI components (modals, forms) and the active Alerts list in the sidebar/dashboard.
- [ ] **ALERT-04**: Implement the visual/audio trigger mechanism in the UI when an alert condition is met (toast notifications, sounds).

## Future Requirements
- Advanced complex alerts (e.g. crossing moving averages).
- SMS or Email delivery of alerts via backend.

## Out of Scope
- Backend alert processing (we are starting with client-side evaluating via the WebSockets to save on latency and server costs).
