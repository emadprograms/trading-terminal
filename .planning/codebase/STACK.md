# Technology Stack

**Analysis Date:** 2026-08-12

## Languages

**Primary:**
- TypeScript 6.0.3 - Application code
- React / TSX 18.3.1 - UI components

**Secondary:**
- HTML - Entry point

## Runtime

**Environment:**
- Browser (Frontend application)
- Node.js (Build and tooling)

**Package Manager:**
- npm
- Lockfile: present (`package-lock.json`)

## Frameworks

**Core:**
- React 18.3.1 - UI Framework
- Vite 5.4.10 - Bundler and dev server

**Testing:**
- Vitest 4.1.7 - Unit/Integration Testing
- Playwright 1.60.0 - E2E Testing
- React Testing Library 16.3.2 - Component testing

**Build/Dev:**
- Vite 5.4.10 - Build tool
- TypeScript 6.0.3 - Type checking

## Key Dependencies

**Critical:**
- @tanstack/react-query 5.101.0 - Data fetching and cache management
- zustand 5.0.14 - Global state management
- lightweight-charts 4.2.1 - Trading charts visualization
- ky 2.0.2 - HTTP Client

**Infrastructure:**
- zod 4.4.3 - Schema validation
- sonner 2.0.7 - Toast notifications
- lucide-react 0.453.0 - Icons
- undici 8.4.0 - HTTP/1.1 client for Node.js

## Configuration

**Environment:**
- Local configuration in `.env.local`
- Environment variables managed via dotenv

**Build:**
- `vite.config.ts` (Vite bundler configuration)
- `tsconfig.json`, `tsconfig.node.json` (TypeScript configuration)
- `vitest.config.ts` (Vitest test runner configuration)
- `playwright.config.ts` (Playwright E2E configuration)
- `vercel.json` (Vercel deployment configuration)

## Platform Requirements

**Development:**
- Node.js

**Production:**
- Vercel (Deployment target)

---

*Stack analysis: 2026-08-12*
