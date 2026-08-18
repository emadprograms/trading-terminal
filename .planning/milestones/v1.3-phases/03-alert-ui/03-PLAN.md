# Phase 3: Alert UI & Notifications - Execution Plan

## 1. Create Alert UI Components
- **File:** `src/components/AlertsPanel.tsx`
- **Action:** Create the panel to be placed in the sidebar.
- **Details:** Contains the "Set Alert" button, the input `name="alertPrice"`, and the list `.active-alerts-list`. Uses `useAlertStore` to add and display alerts.

## 2. Mount Alerts Panel
- **File:** `src/components/Sidebar.tsx` or `src/App.tsx`
- **Action:** Add `<AlertsPanel />` so it renders in the UI. Ensure it is visible in the E2E test (the test expects it to be available).

## 3. Create Toast Notification
- **File:** `src/components/AlertToast.tsx`
- **Action:** Create a global component that listens to `window.addEventListener('alert-triggered', ...)` and shows a toast with class `.alert-toast` containing "Alert triggered at [price]".

## 4. Run E2E Test
- **Action:** Run `npx playwright test tests/e2e/alerts.spec.ts`. Must pass!
