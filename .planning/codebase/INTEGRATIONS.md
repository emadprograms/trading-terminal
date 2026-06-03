# External Integrations

**Analysis Date:** 2025-05-14

## APIs & External Services

**Market Data:**
- Polygon.io - Used for historical 1-minute OHLCV data.
  - SDK/Client: `polygon-api-client` (used in `backend/historical_archiver/main.py`)
  - Auth: API keys managed via Infisical.

**Secrets Management:**
- Infisical - Centralized secret management for API keys and database credentials.
  - SDK/Client: `infisicalsdk` (used in `backend/historical_archiver/infisical_client.py`)

## Data Storage

**Databases:**
- Turso (LibSQL) - Primary backend database for historical market data.
  - Connection: Managed via `libsql-client` in Python and `libsql` in `backend/app_db_sync/sync.py`.
  - Client: `TursoWriter` implementation in `backend/historical_archiver/turso_writer.py`.

**Client-Side Storage:**
- SQLite (WASM) - Used for high-performance client-side querying of market data.
  - Client: `sql.js` (initialized in `src/lib/db.ts`).
  - WASM File: `public/sql-wasm.wasm`.

**File Storage:**
- Local filesystem only (for temporary data archival scripts).

**Caching:**
- Not detected.

## Authentication & Identity

**Auth Provider:**
- Custom/Not implemented - The app focuses on market data visualization and playback.

## Monitoring & Observability

**Error Tracking:**
- Not detected.

**Logs:**
- Console logging (Frontend) and Standard output (Backend scripts).

## CI/CD & Deployment

**Hosting:**
- Vercel - Frontend deployment.

**CI Pipeline:**
- GitHub Actions (indicated by `.github/workflows/` files).

## Environment Configuration

**Required env vars:**
- Polygon API Keys (multiple keys used for parallel archival).
- Turso Database URL and Token.
- Infisical Token/Client ID for secret retrieval.

**Secrets location:**
- Infisical (production/staging).
- `.env` files (local development).

## Webhooks & Callbacks

**Incoming:**
- None.

**Outgoing:**
- None.

---

*Integration audit: 2025-05-14*
