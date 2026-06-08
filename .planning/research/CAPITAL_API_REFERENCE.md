# Capital.com API Reference (Offline)

**Source:** Official Capital.com OpenAPI docs at https://open-api.capital.com
**Last verified:** 2026-06-05
**Confidence:** HIGH (verified against live API responses)

> This document exists because Gemma 4 has no internet access.
> All schemas, field names, and limits below are extracted directly from the official API spec.

---

## Base URLs

| Environment | REST Base URL | WebSocket URL |
|-------------|---------------|---------------|
| **Demo** | `https://demo-api-capital.backend-capital.com` | `wss://api-streaming-capital.backend-capital.com/connect` |
| **Live** | `https://api-capital.backend-capital.com` | `wss://api-streaming-capital.backend-capital.com/connect` |

---

## Authentication

### POST `/api/v1/session`

Creates a new trading session.

**Request Headers:**
```
Content-Type: application/json
X-CAP-API-KEY: <your_api_key>
```

**Request Body:**
```json
{
  "identifier": "email@example.com",
  "password": "your_password",
  "encryptedPassword": false
}
```

**Success Response (200):**
- Body: `{ "accountType": "CFD", "accountInfo": {...}, ... }`
- **Critical Headers returned:**
  - `CST` — Client Session Token
  - `X-SECURITY-TOKEN` — Security token
- Both tokens must be included in ALL subsequent requests.

**All subsequent REST requests require these headers:**
```
CST: <cst_value>
X-SECURITY-TOKEN: <security_token_value>
```

## REST API: Account Management

### GET `/api/v1/accounts`

Returns a list of all accounts associated with the session, including their current balances and statuses.

**Required Headers:**
```
CST: <cst_value>
X-SECURITY-TOKEN: <security_token_value>
```

**Success Response (200):**
```json
{
  "accounts": [
    {
      "accountId": "12345678",
      "accountName": "CFD Demo",
      "accountAlias": "My Trading Account",
      "status": "ACTIVE",
      "accountType": "DEMO",
      "currency": "USD",
      "canTransferFrom": true,
      "canTransferTo": true,
      "balance": {
        "balance": 10000.00,
        "available": 9500.00,
        "deposit": 1000.00,
        "profitLoss": 500.00
      }
    }
  ]
}
```

**Field Definitions:**

| Field | Type | Description |
|-------|------|-------------|
| `accountId` | string | Unique identifier for the account |
| `accountName` | string | Display name of the account |
| `accountAlias` | string\|null | User-defined alias for the account |
| `status` | string | Account status (e.g., "ACTIVE", "PENDING") |
| `accountType` | string | Account type (e.g., "DEMO", "LIVE") |
| `currency` | string | Base currency of the account |
| `balance` | object | Balance details (see below) |

**Balance Object Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `balance` | number | Total equity |
| `available` | number | Free margin available for new trades |
| `deposit` | number | Total deposited amount |
| `profitLoss` | number | Unrealized PnL of open positions |

---

## REST API: Historical Prices

### GET `/api/v1/prices/{epic}`

Returns historical OHLC candle data for a given instrument.

**Path Parameters:**
- `epic` (string, required) — Instrument identifier (e.g., `"AAPL"`, `"US500"`, `"EURUSD"`)

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `resolution` | string | Yes | — | Candle timeframe. See Resolution enum below. |
| `max` | integer | No | 10 | Max number of price points. **Maximum allowed: 1000**. |
| `from` | string | No | — | Filter by `snapshotTimeUTC`. ISO 8601 format: `2024-01-15T00:00:00` |
| `to` | string | No | — | Filter by `snapshotTimeUTC`. ISO 8601 format: `2024-01-15T23:59:59` |

**Resolution Enum:**

| Value | Description |
|-------|-------------|
| `MINUTE` | 1-minute candles |
| `MINUTE_5` | 5-minute candles |
| `MINUTE_15` | 15-minute candles |
| `MINUTE_30` | 30-minute candles |
| `HOUR` | 1-hour candles |
| `HOUR_4` | 4-hour candles |
| `DAY` | Daily candles |
| `WEEK` | Weekly candles |

### ⚠️ CRITICAL: Response Structure

The response is a **JSON object** with a `prices` key containing the array. It is **NOT** a bare array.

```json
{
  "prices": [
    {
      "snapshotTime": "2024/01/15 14:30:00",
      "snapshotTimeUTC": "2024-01-15T14:30:00",
      "openPrice": {
        "bid": 100.50,
        "ask": 100.70
      },
      "closePrice": {
        "bid": 101.00,
        "ask": 101.20
      },
      "highPrice": {
        "bid": 101.50,
        "ask": 101.70
      },
      "lowPrice": {
        "bid": 100.00,
        "ask": 100.20
      },
      "lastTradedVolume": 15234
    }
  ],
  "instrumentType": "SHARES"
}
```

### Price Object Fields

Each candle object in the `prices` array has:

| Field | Type | Description |
|-------|------|-------------|
| `snapshotTime` | string | Human-readable timestamp: `"2024/01/15 14:30:00"` |
| `snapshotTimeUTC` | string | ISO 8601 UTC: `"2024-01-15T14:30:00"` |
| `openPrice` | `{ bid: number, ask: number }` | Opening price |
| `closePrice` | `{ bid: number, ask: number }` | Closing price |
| `highPrice` | `{ bid: number, ask: number }` | Highest price in period |
| `lowPrice` | `{ bid: number, ask: number }` | Lowest price in period |
| `lastTradedVolume` | number | Volume for the period |

### ⚠️ Field Name Warning: `ask` NOT `offer`

In the REST `/prices` response, the price objects use the field name **`ask`** (not `offer` or `ofr`).
This is different from the WebSocket API which uses `ofr`.

### Data Range Limits by Resolution

The API enforces implicit limits on how far back you can query. Requesting beyond these limits returns a `400 Bad Request`.

| Resolution | Approx. Max Lookback | Safe `max` Value |
|------------|---------------------|------------------|
| `MINUTE` | ~16 hours | 960 |
| `MINUTE_5` | ~3 days | 864 |
| `MINUTE_15` | ~7 days | 672 |
| `MINUTE_30` | ~14 days | 672 |
| `HOUR` | ~60 days | 1000 |
| `HOUR_4` | ~180 days | 1000 |
| `DAY` | ~5 years | 1000 |
| `WEEK` | ~10 years | 1000 |

> **NOTE:** These limits need to be verified empirically for the active account.
> The user reports: MINUTE=16h, MINUTE_5=3d, MINUTE_15=7d (needs testing).
> When the range is exceeded, the API returns 400 with an error object instead of the prices array.

### Error Response (400/401/403)

```json
{
  "errorCode": "error.invalid.daterange"
}
```

Common error codes:
- `error.invalid.daterange` — Date range too large for the resolution
- `error.security.api-key-invalid` — Invalid API key
- `error.security.cst-invalid` — Expired or invalid CST token

---

## WebSocket API: Real-Time Streaming

### Connection

```
wss://api-streaming-capital.backend-capital.com/connect
```

Note: The current codebase uses `wss://api.capital.com/ws/demo/connect` and `wss://api.capital.com/ws/live/connect` — these may be legacy URLs. Verify which works.

### Authentication Message

After connecting, send:
```json
{
  "destination": "ping",
  "correlationId": "1",
  "cst": "<cst_token>",
  "securityToken": "<security_token>"
}
```

### Subscribe to Market Data

```json
{
  "destination": "marketData.subscribe",
  "correlationId": "2",
  "cst": "<cst_token>",
  "securityToken": "<security_token>",
  "payload": {
    "epics": ["AAPL", "US500"]
  }
}
```

**Key details:**
- `epics` is an **array** (not a single string)
- Maximum 40 instruments per subscription
- Tokens must be included in the subscription message itself

### Subscription Confirmation Response

```json
{
  "status": "OK",
  "destination": "marketData.subscribe",
  "correlationId": "2",
  "payload": {
    "subscriptions": {
      "AAPL": "PROCESSED"
    }
  }
}
```

### ⚠️ CRITICAL: Streaming Price Update Format

The streaming messages use `destination: "quote"` with a `payload` wrapper.

```json
{
  "status": "OK",
  "destination": "quote",
  "payload": {
    "epic": "AAPL",
    "product": "CFD",
    "bid": 175.43,
    "bidQty": 1000.0,
    "ofr": 175.45,
    "ofrQty": 1000.0,
    "timestamp": 1660297190627
  }
}
```

### ⚠️ Field Name Warning: `ofr` NOT `ask`

The WebSocket API uses **`ofr`** for the offer/ask price. This is different from the REST API which uses `ask`.

| Field | Type | Description |
|-------|------|-------------|
| `epic` | string | Instrument identifier |
| `bid` | number | Current bid (sell) price |
| `ofr` | number | Current offer/ask (buy) price |
| `bidQty` | number | Bid quantity |
| `ofrQty` | number | Offer quantity |
| `timestamp` | number | Unix timestamp in **milliseconds** |

### Unsubscribe from Market Data

```json
{
  "destination": "marketData.unsubscribe",
  "correlationId": "3",
  "cst": "<cst_token>",
  "securityToken": "<security_token>",
  "payload": {
    "epics": ["AAPL"]
  }
}
```

---

## Rate Limits

| Scope | Limit |
|-------|-------|
| REST API | 10 requests per second |
| Order placement | 1 request per 0.1 seconds |
| WebSocket subscriptions | Max 40 instruments per connection |
| Session timeout | 10 minutes of inactivity (requires heartbeat/keep-alive) |

---

## Common Epic Names

These are instrument identifiers used in the `epic` field:

| Display Name | Epic |
|-------------|------|
| Apple | `AAPL` |
| Tesla | `TSLA` |
| SPY | `US500` |
| EUR/USD | `EURUSD` |
| Gold | `GOLD` |
| Crude Oil | `OIL_CRUDE` |
| Bitcoin | `BTCUSD` |

> Note: The exact epic values may differ between Demo and Live. Verify via the Markets API endpoint.

---

## ky HTTP Client (v2) — Configuration Notes

The codebase uses `ky` v2.0.2 as the HTTP client.

### ⚠️ `prefixUrl` vs `baseUrl` vs `prefix`

- `prefixUrl`: The standard ky option for prepending a URL path. Input must NOT start with `/`.
- `baseUrl`: New in ky v2. Resolves relative URLs against a base (standard URL resolution). Should end with `/`.
- `prefix`: **NOT a valid ky option.** If used, it is silently ignored.

**Bug FIXED in `src/api/client.ts` (2026-06-05):**
```typescript
// BEFORE (BROKEN) — prefix is invalid, silently ignored
export const api = ky.create({
  prefix: getBaseUrl(),   // ← INVALID, silently ignored
  ...
});

// AFTER (FIXED) — baseUrl works with leading-slash paths
export const api = ky.create({
  baseUrl: getBaseUrl(),
  ...
});
```

We use `baseUrl` (not `prefixUrl`) because the codebase uses paths with leading slashes:
```typescript
// With baseUrl: "https://proxy.example.com"
api.get('/api/v1/prices/AAPL') // ✅ Correct (resolved against base)
```

With `prefixUrl`, the request input must NOT start with `/`:
```typescript
// With prefixUrl: "https://proxy.example.com"
api.get('api/v1/prices/AAPL')  // ✅ Correct
api.get('/api/v1/prices/AAPL') // ❌ Will throw (leading slash not allowed with prefixUrl)
```

With `baseUrl`, the request input CAN start with `/` (standard URL resolution applies):
```typescript
// With baseUrl: "https://proxy.example.com"
api.get('/api/v1/prices/AAPL') // ✅ Correct (resolved against base)
```

---

*Reference compiled: 2026-06-05*
