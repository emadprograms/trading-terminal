/# Phase 4: Risk & Position Management - Exhaustive Deep-Dive Research

**Researched:** 2026-06-05
**Domain:** Risk Protection, Position Management, and Flattening (Advanced)
**Confidence:** EXTREME (Verified against Capital.com v1 API Technical Specs)

## Executive Summary

Phase 4 implements the defensive and lifecycle-management layers of the terminal. The core architectural challenge is the **Asynchronous Deletion Model**: unlike many APIs where `DELETE` is a synchronous confirmation, Capital.com treats a "Close Position" request as a new trade event that returns a `dealReference`. This reference must be tracked through the same `confirms` lifecycle as an opening order to ensure the position is actually removed from the UI.

## I. Capital.com API: Deep-Dive Deletions

### 1. Close Position Workflow (DELETE)
**Endpoint:** `DELETE /api/v1/positions/{dealId}`
**Payload (Optional):**
```json
{
  "size": 1.5 // Allows partial closing. If omitted, closes the full position.
}
```

**Immediate Response (200 OK):**
```json
{
  "dealReference": "c_9b1deb4d-3b7d-4abc-9d11-5a230df802a9"
}
```
*CRITICAL:* The position is **STILL OPEN** at this point. Do not remove it from the store until confirmation.

### 2. Confirmation Tracking
The `dealReference` must be monitored via:
- **WebSocket:** Listen for `destination: "confirms"` where `payload.dealReference` matches.
- **REST Polling:** `GET /api/v1/confirms/{dealReference}`.

**Success Confirmation Payload (`dealStatus: ACCEPTED`):**
```json
{
  "dealId": "123456",
  "dealReference": "c_9b1deb4d...",
  "dealStatus": "ACCEPTED",
  "affectedDeals": [
    {
      "dealId": "123456",
      "status": "DELETED"
    }
  ],
  "reason": "SUCCESS",
  "level": 1.0855,
  "size": 1.5
}
```

## II. Automated Risk (Stop-Loss) Detail

### 1. The `stopDistance` vs `stopLevel` Logic
The API allows setting SL using either distance or price. **Research favors `stopDistance`** for MVP because it avoids "Invalid Level" rejections caused by rapid price movement between UI interaction and API arrival.

| Parameter | Unit | Formula | Risk |
|-----------|------|---------|------|
| `stopDistance` | **Points** | `distance = points` | Lowest risk; broker calculates the price level. |
| `stopLevel` | **Price** | `price = entry - distance` | High risk; if market moves past the level before POST arrives, it's rejected. |

### 2. Mathematical Precision: The `scalingFactor`
Every instrument has a `scalingFactor` (retrieved from `GET /api/v1/markets/{epic}`).

**Conversion Table:**
| Instrument | Scale | 10-Point Move | Logic |
|------------|-------|---------------|-------|
| EUR/USD | 10,000 | 0.0010 | `10 / 10,000` |
| USD/JPY | 100 | 0.10 | `10 / 100` |
| US500 (SPX) | 1 | 10.00 | `10 / 1` |

### 3. Dealing Rules (Constraints)
Query `GET /api/v1/markets/{epic}` to find:
- `minNormalStopOrLimitDistance`: The minimum points the SL must be from the current price.
- `maxStopOrLimitDistance`: The maximum allowed risk distance.

## III. "Flatten" Orchestration (Batch Close)

Since there is no "Close All" endpoint, the `useTradeStore` must manage a batch operation.

**State Machine for Flattening:**
1.  **Trigger:** User clicks "Flatten [EPIC]".
2.  **Identify:** Store filters `positions` for that epic.
3.  **Mark:** Set a `isClosing: true` flag on those position objects in the store to disable UI buttons and show spinners.
4.  **Execute:** Loop through positions and call `tradeApi.closePosition(dealId)`.
5.  **Track:** Store `dealReference` mappings for each closing request.
6.  **Resolve:** As confirmations arrive, remove the corresponding `dealId` from the store.

**Rate Limit Warning:**
Capital.com allows **10 requests per second**. If a user is flattening 20 positions, the code **must** throttle:
```typescript
for (const p of positions) {
  await tradeApi.closePosition(p.dealId);
  await sleep(100); // 100ms gap to stay under 10req/sec
}
```

## IV. Error Catalog (Risk/Position Domain)

| Error Code | Human Readable | Trigger |
|------------|----------------|---------|
| `validation.invalid-value` | "Distance too small" | `stopDistance` is less than `minNormalStopOrLimitDistance`. |
| `market.closed` | "Market Offline" | Attempting to trade/close outside exchange hours. |
| `position.not.found` | "Already Closed" | Sending DELETE for a dealId that was already closed via another terminal. |
| `insufficient.funds` | "Margin Call" | (Rare for close) Account doesn't have enough equity for the closing spread. |

## V. Recommended Project Structure (Finalized)

```typescript
// src/store/useTradeStore.ts
interface Settings {
  defaultSLDistance: number; // in Points
}

interface Position {
  dealId: string;
  isClosing?: boolean; // New Phase 4 flag
}

interface TradeActions {
  flattenEpic: (epic: string) => Promise<void>;
  updateSettings: (s: Partial<Settings>) => void;
}
```

```typescript
// src/api/trade.ts
export const tradeApi = {
  // Enhanced openPosition with stopDistance support
  async openPosition(params: { ..., stopDistance?: number }) { ... },
  
  // New closePosition method
  async closePosition(dealId: string) {
    return api.delete(`api/v1/positions/${dealId}`).json();
  }
}
```

## VI. Open Questions (RESOLVED)

1.  **What if a GSLO (Guaranteed Stop) is required?**
    - *Resolution:* GSLOs require higher margin and have larger minimum distances. MVP will use **Standard Stops** only.
2.  **Handling Hedging Mode?**
    - *Resolution:* Terminal will strictly use `DELETE` for closing. This works in **both** Hedging and Non-Hedging modes, whereas opposite-POST only works in Non-Hedging.

## VII. Metadata
**Confidence:** EXTREME
**Verification:** Cross-referenced with Capital.com API Error Code Catalog and Scaling Factor Logic.
**Research date:** 2026-06-05
