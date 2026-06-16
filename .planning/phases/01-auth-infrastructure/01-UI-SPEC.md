---
phase: 1
slug: auth-infrastructure
status: draft
shadcn_initialized: false
preset: none
created: 2026-06-03
updated: 2026-06-03
---

# Phase 1 — UI Design Contract (Revised)

> Visual and interaction contract for Auth & Infrastructure. Defines the Terminal Header, Account Handshake visuals, and Environment Toggle.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none |
| Preset | not applicable |
| Component library | none (React + Lucide) |
| Icon library | lucide-react |
| Font | Inter (Body), JetBrains Mono (Mono/Data) |

---

## Spacing Scale

Declared values (multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, inline padding |
| sm | 8px | Button padding, small gaps |
| md | 16px | Section padding, default gaps |
| lg | 24px | Layout margins |
| xl | 32px | Major component spacing |
| 2xl | 48px | Page margins, Sidebar width, Header height |
| 3xl | 64px | Hero/Splash spacing |

Exceptions: 
- `48px`: Fixed height for Terminal Header and Playback Bar (standardized to `2xl`).
- `48px`: Fixed width for Sidebar Icon Dock (standardized to `2xl`).

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body / Data | 14px (0.875rem) | 400 | 1.5 |
| Label | 12px (0.75rem) | 400 | 1.2 |
| Heading | 20px (1.25rem) | 600 | 1.2 |
| Display | 28px (1.75rem) | 600 | 1.1 |

*Note: Font weights limited to 400 (Regular) and 600 (Semi-bold) for design consistency.*

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#000000` | Global background, Terminal background |
| Secondary (30%) | `rgba(255, 255, 255, 0.05)` | Header/Bar surfaces, Card borders |
| Accent (10%) | `#26a69a` | Live mode indicator, positive PnL, success status |
| Destructive | `#ef5350` | Error status, reset actions |

Accent reserved for:
- Live Environment Toggle (active state)
- Account Equity/Margin values (when positive)
- Connection "Online" status indicator
- Primary Handshake button

---

## Visual Hierarchy & Accessibility

### Primary Focal Point
- **Disconnected State:** The "Launch Terminal" CTA (Center Screen) is the primary focal point.
- **Connected State:** The "Account Handshake Status" and "Environment Toggle" (Top Right) are the primary indicators of terminal readiness.

### Visual Hierarchy
1. **Dominant (60%):** Deep black backgrounds to minimize eye strain and establish a professional "terminal" feel.
2. **Secondary (30%):** Subtle translucent overlays for headers and bars to provide structural depth without visual noise.
3. **Accent (10%):** High-contrast Teal (`#26a69a`) reserved strictly for "System Ready" or "Action Required" states.

### Accessibility
- **Icon Labels:** All icons in the Sidebar Icon Dock must include accessible tooltips (using Lucide's title or a separate tooltip component) and `aria-label` fallbacks for screen readers.
- **Contrast:** Accent and Destructive colors must maintain a minimum 4.5:1 contrast ratio against the dominant background.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | "Launch Terminal" |
| Empty state heading | "Awaiting Handshake..." |
| Empty state body | "Connecting to ephemeral backend proxy via GitHub Actions." |
| Error state | "Handshake Failed: [Error Detail]. Ensure GHA Tunnel is active." |
| Destructive confirmation | Reset Environment: "This will terminate your current session and re-authenticate." |
| Confirmation Action | "Reset Session" (Destructive Action) |
| Cancellation Action | "Keep Session" (Safe Action) |
| Toggle Label (Demo) | "DEMO ACCOUNT" |
| Toggle Label (Live) | "LIVE ACCOUNT" |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not required |

---

## Interaction Contract: Environment Toggle

1. **State Transition:** Clicking the toggle triggers `useSession.ts` reset.
2. **Visual Feedback:** 
   - Instant visual switch of the toggle pill.
   - Global loading overlay (`Activity` spinner) while `CST` and `X-SECURITY-TOKEN` are refreshed.
   - Header Account Info fades in once synchronized.
3. **Safety:** Switching to **LIVE** mode should show a 1-second "SECURE CONNECTION" toast or indicator to confirm proxy routing.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
