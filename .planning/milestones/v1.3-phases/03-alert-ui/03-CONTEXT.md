# Phase 3: Alert UI & Notifications - Context

**Gathered:** 2026-08-18
**Status:** Ready for planning
**Mode:** Auto-generated

<domain>
## Phase Boundary
Build the visual components to create alerts and show notifications when triggered, satisfying ALERT-03 and ALERT-04. The final goal is to make the E2E test from Phase 1 pass.
</domain>

<decisions>
## Implementation Decisions
- A simple "Set Alert" button in the Sidebar (perhaps below Order History).
- An inline form or simple input box to enter the target price.
- A list `.active-alerts-list` displaying the set alerts.
- A global listener for the `alert-triggered` event that shows a toast `.alert-toast`.
</decisions>
