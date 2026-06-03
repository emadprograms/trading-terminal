# Architecture Research: Capital.com Live Trading

**Domain:** Live Trading Terminal (Integration)
**Researched:** 2025-06-03
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                             Frontend (React)                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  │
│  │  UI Layer   │  │ Orchestration│  │  Data Layer  │  │   State Store    │  │
│  │ (Charts/UI) │  │ (TradingHooks)│  │ (API Clients)│  │ (Zustand/Store)  │  │
│  └─────┬───────┘  └──────┬──────┘  └──────┬──────┘  └────────┬─────────┘  │
└────────│─────────────────│───────────────│───────────────────│───────────┘
         │                 │               │                   │
         │      (1) Auth   │ (2) Orders    │ (3) History       │ (4) Ticks
         ▼                 ▼               ▼                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      Ephemeral Backend (Node.js/Python)                  │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Secret Manager (API Keys)  ↔  Auth Proxy  ↔  Order Router          │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┬───────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                        Capital.com API Infrastructure                    │
│  ┌──────────────────────────┐          ┌──────────────────────────────┐  │
│  │     REST API (Auth/Hist) │          │    WebSocket API (Live Ticks)│  │
│  └──────────────────────────┘          └──────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Frontend UI** | Render charts, trade markers, and configuration bars. | React + `lightweight-charts` |
| **Trading Hooks** | Handle keyboard shortcuts (`Ctrl+1` etc.) and order logic. | Custom React Hooks (`useTradeManager`) |
| **State Store** | Persist account type (Live/Demo), default size, and active positions. | Zustand |
| **Ephemeral Backend** | Securely store API keys, exchange credentials for `cst_token`, and proxy orders. | Express/FastAPI deployed via GH Actions |
| **Capital.com REST** | Provide historical candle data and execute orders. | REST API |
| **Capital.com WS** | Stream real-time Bid/Ask tick data. | WebSocket API |

## Recommended Project Structure

```
src/
├── api/                # Capital.com API integration
│   ├── client.ts       # REST client (handles backend proxy calls)
│   ├── websocket.ts    # WebSocket manager for live ticks
│   └── types.ts        # API request/response types
├── hooks/
│   ├── trading/        # Trading-specific logic
│   │   ├── useTradeManager.ts    # Order execution and shortcut mapping
│   │   └── useLiveTicks.ts       # WebSocket tick subscription/state
│   └── chart/          # Existing chart lifecycle hooks
├── store/
│   └── useTradingStore.ts # Trade config (size, SL distance, account type)
└── components/
    └── trading/        # Trade-specific UI (Order badges, config bar)
```

### Structure Rationale

- **`src/api/`**: Isolates the "wire" logic from the "business" logic. If the API version changes, only this folder is touched.
- **`src/hooks/trading/`**: Separates trading execution from chart rendering. Trading is a distinct domain from visualization.
- **`useTradingStore.ts`**: Separate from `useWorkspaceStore` to avoid unnecessary re-renders of the whole layout when a trade config changes.

## Architectural Patterns

### Pattern 1: Secret Proxy (Backend)

**What:** The frontend never sees the API Secret. It requests a session token from the backend, which performs the auth and returns the temporary `cst_token`.
**When to use:** Always when deploying a client-side app with sensitive API keys.
**Trade-offs:** Adds one network hop for authentication, but prevents key theft.

### Pattern 2: Direct-Stream (Frontend $\leftrightarrow$ Provider)

**What:** Authentication happens via the backend, but the high-frequency WebSocket connection for ticks is established **directly** between the Frontend and Capital.com.
**When to use:** For live trading where latency is critical.
**Trade-offs:** Reduces backend load and latency; requires the provider to support token-based WS auth.

**Example Flow:**
```typescript
// 1. Auth via Backend
const token = await api.fetchSessionToken(); 

// 2. Direct connection to Capital.com
const ws = new WebSocket(`wss://api.capital.com/feed?token=${token}`);
ws.onmessage = (evt) => {
  const tick = JSON.parse(evt.data);
  useTradingStore.getState().updateLastPrice(tick);
};
```

### Pattern 3: Command Mapping for Shortcuts

**What:** A mapping object that translates keystrokes to "Trade Commands" (e.g., `BUY_FULL`, `SELL_HALF`).
**When to use:** When implementing complex shortcut systems.
**Trade-offs:** Decouples the physical key from the business action, making it easy to allow user-customization later.

## Data Flow

### Order Execution Flow (The "Fast Path")

```
[Keyboard Shortcut: Ctrl+1]
    ↓
[useTradeManager hook] → [Read Default Size from Store]
    ↓
[Backend Proxy] → [Attach API Secret] → [Capital.com REST API]
    ↓
[Success Response] → [Frontend] → [Draw Trade Marker on Chart]
```

### Live Tick Flow (The "High-Frequency Path")

```
[Capital.com WS]
    ↓ (Raw JSON Tick)
[useLiveTicks hook] → [Normalize Bid/Ask]
    ↓
[useTradingStore] → [Update Current Price]
    ↓
[ChartCanvas/PriceLine] → [Re-render Price Marker]
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1 User | Ephemeral Backend on GH Actions is sufficient. |
| 10 Users | Move to a small persistent VPS to avoid cold starts and session drops. |
| 100+ Users | Implement a Redis cache for `cst_tokens` to reduce auth calls to Capital.com. |

### Scaling Priorities

1. **First bottleneck:** WebSocket stability. If the ephemeral backend restarts, the frontend must handle silent reconnection.
2. **Second bottleneck:** API Rate limits. Grouping requests or optimizing historical data fetching.

## Anti-Patterns

### Anti-Pattern 1: Frontend Key Storage

**What people do:** Put `API_SECRET` in `.env` of a Vite/React app.
**Why it's wrong:** Any user can open DevTools and steal the secret.
**Do this instead:** Use the Ephemeral Backend as a Secret Proxy.

### Anti-Pattern 2: Proxying Ticks through Backend

**What people do:** `Capital.com WS` $ightarrow$ `Backend` $ightarrow$ `Frontend`.
**Why it's wrong:** Introduces unnecessary latency and puts immense load on a lightweight backend.
**Do this instead:** Direct-Stream pattern.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Capital.com REST | Proxy via Backend | Use for Auth, Historical Data, and Order placement. |
| Capital.com WS | Direct connection | Use for real-time Bid/Ask ticks. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Frontend $\leftrightarrow$ Backend | JSON/HTTPS | Keep payloads small for speed. |
| Hook $\leftrightarrow$ Store | Zustand actions | Use selector-based subscriptions to prevent chart lag. |

## Build Order Recommendation

The suggested implementation sequence to minimize risk and ensure a stable foundation:

1. **Auth Layer**: Implement the Ephemeral Backend and the `cst_token` exchange. (No trading possible without this).
2. **Historical Data**: Implement REST proxy for candle data to ensure charts load correctly for the active account.
3. **Live Ticks**: Implement the Direct-Stream WebSocket logic to see real-time Bid/Ask price movements.
4. **Order Execution**: Implement the `useTradeManager` hooks, keyboard shortcuts, and the Order REST proxy.

---
*Architecture research for: Capital.com Live Trading*
*Researched: 2025-06-03*
