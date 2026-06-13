# Conventions

**Mapped:** 2026-06-13
**Scope:** Full codebase

## Code Style & Patterns
- **TypeScript First:** All files should use TypeScript (`.ts`, `.tsx`). Strict mode is enabled.
- **State Management:** Use Zustand for global UI state to prevent unnecessary React Context re-renders. Keep stores granular (e.g., `useTradeStore`).
- **Data Fetching:** Use React Query for remote data fetching, mutation, and caching on the frontend.
- **Web Workers:** Any heavy data processing, especially involving SQLite (`sql.js`), MUST be offloaded to Web Workers. The main thread must remain free for UI rendering to achieve the lightning-fast goal.
- **Styling:** Use Tailwind CSS for utility-class styling, combined with raw CSS variables in `index.css` for themes. UI components should prioritize micro-animations and a premium feel.

## Backend Proxy
- **Vercel Serverless:** All proxy endpoints must reside in `api/`. Do not build new features in the legacy `server/` directory.
- **HTTP Client:** Use `undici` for upstream requests to Capital.com, specifically configuring it with `allowH2: false` if needed for Capital.com compatibility.
- **Security:** Never expose the Capital.com API key (`X-CAP-API-KEY`) to the frontend. It must only be injected within the `api/` serverless functions.
