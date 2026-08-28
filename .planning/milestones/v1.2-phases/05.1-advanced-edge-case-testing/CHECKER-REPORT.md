# Phase 05.1 Checker Report

## 1. Missing Requirements
- **`TEST-04` is missing from `REQUIREMENTS.md`**: `ROADMAP.md` and `05.1-CONTEXT.md` explicitly reference `TEST-04` as the core requirement for Phase 5.1, but it is not defined anywhere in `.planning/REQUIREMENTS.md`.

## 2. Unaddressed Gray Areas & Flakiness Risk
- **Task 3 (Half-Flatten Test Flakiness)**: `05.1-01-PLAN.md` tasks the agent to "open 3 separate positions for the same epic at different entry prices" against the live API. Because it is hitting the live API, the market price might not move between consecutive order placements. Relying on "different entry prices" natively from the live API could be non-deterministic and lead to test flakiness. The test design needs to account for identical entry prices or intercept and mock the position data response just for this test to reliably assert "worst leg first" logic.
- **Mismatch between Research and Plan**: `05.1-RESEARCH.md` suggests placing **two** distinct market orders for the half-flatten test, whereas Task 3 in `05.1-01-PLAN.md` specifies **three**. While testing 3 positions is better because it forces a partial closure of one leg to achieve exactly half, this discrepancy might cause confusion if not explicitly noted as an intentional expansion of the research strategy.

## 3. Structural Errors
- No major structural errors found in the `PLAN.md`. All success criteria from the roadmap are correctly mapped to tasks.
