# Technology Stack

**Analysis Date:** 2025-05-14

## Languages

**Primary:**
- TypeScript 6.0.3 - Frontend application logic and types

**Secondary:**
- Python - Backend data archival and synchronization scripts (`backend/`)

## Runtime

**Environment:**
- Node.js (Frontend/Build)
- Python 3.x (Backend)

**Package Manager:**
- npm (Frontend)
- pip (Backend - `requirements.txt`)
- Lockfile: `package-lock.json` (implied by npm)

## Frameworks

**Core:**
- React 18.3.1 - UI Framework
- Vite 5.4.10 - Build tool and development server

**Testing:**
- Vitest 4.1.7 - Unit and integration testing
- Playwright 1.60.0 - E2E testing
- MSW 2.14.6 - API mocking for tests

**Build/Dev:**
- TypeScript 6.0.3 - Static typing

## Key Dependencies

**Critical:**
- `lightweight-charts` 4.2.1 - Financial charting engine
- `zustand` 5.0.14 - Lightweight state management
- `sql.js` 1.10.3 - SQLite compiled to WebAssembly for client-side data querying
- `lucide-react` 0.453.0 - Icon set

**Infrastructure (Backend):**
- `polygon-api-client` - Accessing Polygon.io market data
- `infisicalsdk` - Secret and environment variable management
- `libsql-client` / `libsql` - Connection to Turso (LibSQL) databases

## Configuration

**Environment:**
- Frontend: Managed via Vite environment variables.
- Backend: Managed via Infisical and `.env` files (using `python-dotenv`).

**Build:**
- `vite.config.ts` - Vite configuration
- `tsconfig.json` - TypeScript compiler options

## Platform Requirements

**Development:**
- Node.js
- Python 3.x

**Production:**
- Vercel (Frontend deployment)
- Turso (Database hosting)

---

*Stack analysis: 2025-05-14*
