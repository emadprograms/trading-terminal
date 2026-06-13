# Structure

**Mapped:** 2026-06-13
**Scope:** Full codebase

## Directory Layout

```text
/
├── api/                  # Vercel Serverless Functions (The actual backend)
│   ├── _utils.ts         # Core proxy logic and undici configuration
│   ├── accounts.ts       # Account-related endpoints
│   ├── market.ts         # Market data endpoints
│   ├── order.ts          # Order placement endpoints
│   └── session.ts        # Authentication and session management
├── src/                  # Frontend Source
│   ├── api/              # API client utilities
│   ├── components/       # React components (Charts, UI)
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Shared utilities, Web Worker setup, and DB logic
│   ├── store/            # Zustand state stores (e.g., useTradeStore)
│   └── types/            # TypeScript type definitions
├── tests/                # E2E and Integration test suites
├── public/               # Static assets (including sql-wasm.wasm)
├── server/               # LEGACY/Deprecated Hono server setup
└── vercel.json           # Vercel deployment routing rules
```

## Key Locations
- `api/_utils.ts`: The heart of the proxy logic. This is where requests are forwarded to Capital.com.
- `src/lib/`: Contains the Web Worker infrastructure for SQLite WASM.
- `vercel.json`: Controls the routing, ensuring `/api/*` hits the serverless functions instead of the static frontend.
