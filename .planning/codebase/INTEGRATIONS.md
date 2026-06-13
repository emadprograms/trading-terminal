# External Integrations

**Analysis Date:** 2026-06-13

## APIs & External Services

**Trading/Market Data API:**
- **Capital.com API** - Primary broker API for session creation, real-time prices, charts data, and order execution.
  - SDK/Client: REST API and WebSocket integration handled via custom client (`src/api/client.ts`, `src/lib/ws-manager.ts`).
  - Auth: API key injected via `X-CAP-API-KEY` header, user login via session creation returning `CST` and `X-SECURITY-TOKEN` headers.
  - Endpoints:
    - `/api/v1/session` - Create trading session.
    - `/api/v1/prices` - Fetch market candles/data.
    - `/api/v1/accounts` - Retrieve account balances.
    - `/api/v1/positions` - Create, view, and close positions.
  - Rate Limits: Enforced by Capital.com API endpoints.

## Data Storage

**Databases:**
- **sql.js (SQLite WebAssembly)** - Local client-side database used to query and run play-by-play playback data.
  - Connection: Web Worker proxy model (`src/lib/db.ts` communicating with `src/lib/workers/db.worker.ts`).
  - Storage: Persisted locally in browser via **Origin Private File System (OPFS)**.
  - Key File: `market_data.db` stored under OPFS directory root.
  - Migrations: Database schemas loaded inline or dynamically when database file is imported.

## Authentication & Identity

**Auth Provider:**
- **Capital.com Session Management** - Direct login using username (`CAPITAL_USER`) and password (`CAPITAL_PASSWORD`).
  - Token storage: CST & X-SECURITY-TOKEN stored in Zustand store (`src/store/useSessionStore.ts`) and forwarded as headers in downstream requests.
  - Session lifecycle: Handled in `src/hooks/useSession.ts`.

## CI/CD & Deployment

**Hosting:**
- **Vercel** - Frontend hosting and routing config (`vercel.json`) to serve built assets and api routes.
- **Node.js Serve** - Development proxy server (`server/index.ts`) running Hono on port 3000 to bypass CORS restrictions.

**CI Pipeline:**
- **GitHub Actions** - Workflows configured for automatic build, lint, and test execution.

## Environment Configuration

**Development:**
- Required Env Vars:
  - `ENV` - Configures Environment ('DEMO' or 'LIVE').
  - `PORT` - Port of the Hono proxy server (default: 3000).
  - `CAPITAL_USER` - Smart fallback credentials if frontend doesn't send username.
  - `CAPITAL_PASSWORD` - Smart fallback credentials if frontend doesn't send password.
  - `CAPITAL_API_KEY_DEMO` / `CAPITAL_API_KEY_LIVE` - API keys matching the chosen mode.
- Secrets Location: `.env.local` (gitignored).

**Production:**
- Secrets Management: Vercel environment variables or container variables.
- Mode Restrictions: LIVE mode can be explicitly disabled globally (`process.env.ENV === 'DEMO'` blocks LIVE target routing).

---

*Integration audit: 2026-06-13*
*Update when adding/removing external services*
