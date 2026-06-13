# Stack

**Mapped:** 2026-06-13
**Scope:** Full codebase

## Core Technologies
- **Runtime:** Node.js (Vercel Serverless environment), Browser (WebAssembly)
- **Language:** TypeScript
- **Framework:** React 18
- **Build Tool:** Vite

## Frontend
- **State Management:** Zustand (global UI/app state), TanStack React Query (server state & caching)
- **Styling:** Vanilla CSS / Tailwind (in `index.css`)
- **Charting:** Lightweight Charts (`lightweight-charts`)
- **Icons:** Lucide React
- **Notifications:** Sonner

## Backend & API
- **Architecture:** Vercel Serverless Functions (`api/` directory)
- **HTTP Client:** `undici` (configured to force HTTP/1.1 for proxying Capital.com requests)
- **Local Dev Server:** Vercel CLI (`vercel dev`)

## Data & Persistence
- **Database:** SQLite compiled to WebAssembly (`sql.js`)
- **Execution:** Runs inside Web Workers to keep the main thread unblocked during heavy market data processing.

## Testing & Quality
- **Unit/Integration:** Vitest, React Testing Library
- **E2E:** Playwright
- **Mocking:** MSW (Mock Service Worker)
