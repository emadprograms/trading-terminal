---
phase: 1
slug: auth-infrastructure
status: draft
shadcn_initialized: false
preset: none
created: 2026-06-03
---

# Phase 1 — UI Design Contract

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
| 2xl | 48px | Page margins |
| 3xl | 64px | Hero/Splash spacing |

Exceptions: 
- `40px`: Fixed height for Terminal Header and Playback Bar (consistency).
- `48px`: Fixed width for Sidebar Icon Dock.

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 14px (0.875rem) | 400 | 1.5 |
| Label | 12px (0.75rem) | 600 | 1.2 |
| Data | 13px (0.812rem) | 500 (Mono) | 1.0 |
| Heading | 20px (1.25rem) | 600 | 1.2 |
| Display | 28px (1.75rem) | 700 | 1.1 |

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

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | "Launch Terminal" |
| Empty state heading | "Awaiting Handshake..." |
| Empty state body | "Connecting to ephemeral backend proxy via GitHub Actions." |
| Error state | "Handshake Failed: [Error Detail]. Ensure GHA Tunnel is active." |
| Destructive confirmation | Reset Environment: "This will terminate your current session and re-authenticate. Proceed?" |
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
