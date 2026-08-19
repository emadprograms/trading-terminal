---
phase: 01-chart-alerts-e2e-benchmark-tdd
reviewed: 2026-08-19T09:28:29Z
depth: standard
files_reviewed: 1
files_reviewed_list:
  - tests/e2e/chart-alerts.spec.ts
findings:
  critical: 0
  warning: 3
  info: 1
  total: 4
status: issues_found
---

## Summary
The end-to-end test correctly mocks API requests and simulates user interactions to create a chart alert. However, there are a few issues related to hardcoded values, fragile locators, and non-deterministic assertions that could lead to flaky tests.

## Critical Issues
None

## Warnings

### WR-01: Hardcoded URL
**File:** tests/e2e/chart-alerts.spec.ts:29
**Issue:** The test navigates to a hardcoded URL (`http://localhost:3001`). This prevents the test suite from being easily executed against different environments (e.g., CI, staging).
**Fix:** Use Playwright's `baseURL` configuration or an environment variable instead of a hardcoded string.

### WR-02: Broad or Fragile Canvas Locator
**File:** tests/e2e/chart-alerts.spec.ts:47
**Issue:** Selecting the first canvas element (`page.locator('canvas').first()`) can be fragile if the application uses multiple canvases for rendering different layers or UI components.
**Fix:** Add a specific `data-testid` to the chart canvas and use `page.getByTestId('main-chart-canvas')` to ensure the correct element is selected.

### WR-03: Non-deterministic Locator
**File:** tests/e2e/chart-alerts.spec.ts:65
**Issue:** The locator `.alert-modal, .watchlist-panel` with the comment `// depending on where it opens` indicates non-deterministic behavior or uncertainty in the test flow. E2E tests should have predictable outcomes.
**Fix:** Clarify the intended behavior and use a single, specific locator that matches the expected result of clicking the plus button.

## Info

### IN-01: Hardcoded Mouse Coordinates
**File:** tests/e2e/chart-alerts.spec.ts:55
**Issue:** The hover interaction relies on hardcoded pixel offsets (`box.width - 20`). If the layout of the y-axis changes (e.g., resizing or scaling), this test may fail.
**Fix:** Consider creating a dedicated locator for the y-axis area if possible, or extract the offset into a well-named constant.
