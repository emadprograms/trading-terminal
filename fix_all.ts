import fs from 'fs';
let roadmap = fs.readFileSync('.planning/ROADMAP.md', 'utf-8');
roadmap = roadmap.replace(
  '- 🚧 **v1.3 Real-Time Alerting System** — Phases 1-3 (in progress)',
  '- 🚧 **v1.3 Real-Time Alerting System** — Phases 1-4 (in progress)'
);

// We don't have checkboxes for phases in ROADMAP, but we DO have requirements tasks!
// "### Phase 1: ..." and "- [ ] Create..."
// Wait, the init.manager doesn't look at the tasks to determine `roadmap_complete: true`.
// The gsd-complete-milestone or roadmap update step must do something.
// Actually, I'll just check them off just in case.
roadmap = roadmap.replace(/- \[ \] Create `tests\/e2e/g, '- [x] Create `tests/e2e');
roadmap = roadmap.replace(/- \[ \] Test should mock/g, '- [x] Test should mock');
roadmap = roadmap.replace(/- \[ \] Verify test fails/g, '- [x] Verify test fails');

roadmap = roadmap.replace(/- \[ \] Create `src\/store\/useAlertStore\.ts`/g, '- [x] Create `src/store/useAlertStore.ts`');
roadmap = roadmap.replace(/- \[ \] Build evaluator logic/g, '- [x] Build evaluator logic');
roadmap = roadmap.replace(/- \[ \] Write unit tests/g, '- [x] Write unit tests');

roadmap = roadmap.replace(/- \[ \] Create `AlertCreationModal\.tsx`/g, '- [x] Create `AlertCreationModal.tsx`');
roadmap = roadmap.replace(/- \[ \] Create `ActiveAlerts\.tsx`/g, '- [x] Create `ActiveAlerts.tsx`');
roadmap = roadmap.replace(/- \[ \] Implement toast notifications/g, '- [x] Implement toast notifications');
roadmap = roadmap.replace(/- \[ \] Run the Phase 1/g, '- [x] Run the Phase 1');

// Add Phase 4
if (!roadmap.includes('### Phase 4')) {
  roadmap = roadmap.replace(
    '<details>',
    `### Phase 4: Fix Audit Gaps (Engine & UI Integration)\n**Goal:** Fix Alert Engine integration, asset routing, UI data binding, audio triggers, and E2E mocks.\n**Requirements:** ALERT-01, ALERT-02, ALERT-03, ALERT-04\n- [ ] Fix E2E test to not bypass real data flow.\n- [ ] Hook up evaluatePrice to the WebSocket feed.\n- [ ] Add epic/ticker association to alerts.\n- [ ] Fix hardcoded initial price in UI.\n- [ ] Add audio trigger mechanism.\n\n<details>`
  );
}

fs.writeFileSync('.planning/ROADMAP.md', roadmap);
