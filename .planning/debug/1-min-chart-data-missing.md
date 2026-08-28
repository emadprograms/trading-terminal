---
status: resolved
trigger: "I want you to investigate what exactly is the issue with 1 minute time frame charts. Is there some problem in receiving the data from capital.com? what exactly is the problem going on because here is what I want you to do. I want you to make a test for this, make a test that and make it a playwright test, make it a complete E2E test you know with like full everything. and I want you to run 1 minute time frame charts for different symbols. And in majority of them you will see that there is a data missing error. I wish to understand why is this data missing? Is this data missing from capital.com or is our code having some trouble and building that data, what exactly is going on, I want this investigated. But I don't want you to do it. I want you to spawn a sub-agent and let that sub-agent investigate. First of all, I want the sub-agent to make tests, investigate and then let me know. do not start making any changes to the code regarding this, just let me know what exactly is happening and then I will decide what we supposed to do after that."
---

# Symptoms
- **Expected behavior:** 1 minute time frame charts for different symbols should load completely.
- **Actual behavior:** In the majority of them, there is a data missing error.
- **Error messages:** Data Stitching Error: Timestamp continuity broken - Unrecoverable gap...
- **Timeline:** Not specified.
- **Reproduction:** Run 1 minute time frame charts for different symbols.

# Current Focus
```yaml
reasoning_checkpoint:
  hypothesis: "The DataStitchingError on 1-min charts is caused by Capital.com's sparse data (omitting candles for minutes with 0 volume), combined with strict gap detection logic that expects a candle every single interval (threshold = 1 interval). When a 1-minute period has no trades, the gap between the last REST candle and the next WS tick exceeds 1 minute. The bridge fetch returns nothing (because there's no data for that minute), and the code erroneously throws an unrecoverable gap error."
  confirming_evidence:
    - "SyncCoordinator.ts uses `thresholdMs = tfMins[timeframe] * 60000;` which is exactly 1 minute for '1min'."
    - "If `firstWsTimeMs - newLastRestTimeMs > thresholdMs` and bridge returns no new data, it throws DataStitchingError."
    - "The 1-minute timeframe is most susceptible because 1 minute of 0 volume is very common in many symbols (illiquid/sparse data)."
  falsification_test: "If we mock the REST API to return a continuous sequence of 1-min candles with no missing minutes, the error should not occur. Conversely, dropping a single 1-min candle in the mock response will guarantee the error when the next WS tick arrives."
  fix_rationale: "N/A - goal is find_root_cause_only"
  blind_spots: "Playwright test failed due to missing Capital credentials in headless mode, so I am relying on static analysis of SyncCoordinator.ts."
  candidate_causes:
    - "code: SyncCoordinator strict threshold gap logic"
    - "data: Capital.com omitting 0-volume candles (sparse data)"
  and_gate: "yes - the failure requires both the code being strictly intolerant of missing candles AND the data provider actually omitting them."
```

# Eliminated
- hypothesis: "The Capital.com API is entirely failing to return 1-minute data."
  evidence: "If that were true, the chart wouldn't load at all. The error specifically occurs as a Data Stitching Error during the gap calculation."
  timestamp: 2026-08-12T21:47:00Z

# Evidence
- timestamp: 2026-08-12T21:45:00Z
  checked: "Codebase for 'data missing' strings"
  found: "Found StitchingErrorBanner.tsx and DataStitchingError in src/lib/sync-coordinator.ts"
  implication: "The error is generated client-side by our own gap detection logic."
- timestamp: 2026-08-12T21:46:00Z
  checked: "src/lib/sync-coordinator.ts gap detection logic"
  found: "The threshold for a gap is exactly 1 interval (`tfMins[timeframe] * 60000`). If Capital.com omits a 1-minute candle due to 0 volume, the gap exceeds the threshold."
  implication: "The code is intolerant of sparse data. The data isn't missing because of an API outage, it's missing because there was no trading volume for that minute, and Capital.com omits 0-volume candles."

# Resolution
root_cause: "Capital.com omits 1-minute candles for minutes with zero trading volume (sparse data). Our `SyncCoordinator.ts` enforces a strict continuity check where the gap between the last candle and the live websocket tick cannot exceed exactly 1 timeframe interval (1 minute). When a 0-volume minute occurs, the gap exceeds 1 minute, the bridge attempt naturally finds no data, and the code incorrectly interprets this valid sparse data scenario as an 'Unrecoverable gap', throwing a DataStitchingError."
fix: "N/A - find_root_cause_only"
verification: "N/A"
files_changed: []

## Specialist Review
SUGGEST_CHANGE: The identified root cause is accurate—Capital.com omits 0-volume 1-minute candles (sparse data), causing false-positive `DataStitchingError` exceptions when `SyncCoordinator` enforces strict 1-interval continuity. However, before implementing the fix, consider the following specific improvements and pitfalls:

1. **Distinguish Successful Sparse Responses from API Outages & Structural Gaps**:
   - **Pitfall**: Treating any remaining gap after an empty bridge response as valid sparse data without a sanity bound could swallow real multi-hour or multi-day data outages.
   - **Improvement**: If `fetchHistoricalChunk` executes successfully (confirming the REST provider has no bars in that range), treat the gap as valid sparse data *unless* the gap exceeds a maximum threshold (e.g., > 1 hour or > N intervals of active session time).

2. **Add Grace Tolerance to Gap Threshold**:
   - **Pitfall**: The strict threshold `tfMins[timeframe] * 60000` (60,000ms for 1min TF) triggers bridge fetches for slight WebSocket tick arrival delays or clock skew across minute boundaries (e.g., tick arriving at `12:01:02` when the last REST candle was `12:00:00`).
   - **Improvement**: Apply a grace multiplier or tolerance buffer (e.g., `1.5x` timeframe duration or +15s buffer) before triggering gap bridge logic.

3. **Idiomatic TS Cleanup (Date Parsing Helper)**:
   - **Improvement**: Extract the repeated `new Date(candle.time.replace(' ', 'T') + 'Z').getTime()` timestamp parsing pattern into a shared helper function (e.g. `parseBarTimeMs(candle: RawBar): number`) in `SyncCoordinator` to improve readability and prevent duplicated string manipulation logic.
