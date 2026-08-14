# Phase 2 Discussion Log

**Date:** 2026-06-13

## Discussed Areas

### Mocking vs. Real API Strategy, Data Stitching Assertions, E2E Environment Setup, Test Order Cleanup
**Options presented:** 
1. Mocking vs. Real API Strategy
2. Data Stitching Assertions
3. E2E Environment Setup
4. Test Order Cleanup

**User selected:** Provided comprehensive freeform answers covering all areas.

**Notes:** 
- The user stressed the importance of hitting the real demo Capital.com API and explicitly writing stress test scripts to discover rate limits and unpredictable conditions.
- E2E tests must be run against a real Vercel deployment, not local dev.
- Stitching assertions must check for timestamp gaps, and failures must trigger user-visible errors (no silent failures).
- No cleanup needed for demo account orders.
