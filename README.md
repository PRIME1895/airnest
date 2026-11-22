# AirNest — GenAI Assistant for Winter Smog & Urban Air Pollution

> **Breathe Smarter. Live Healthier.**
> Turning opaque AQI numbers into personalised, ₹0-first daily routines, indoor protection hacks, sustainable alternatives, and transparent 3-layer impact estimates for families and communities.

---

## Table of Contents

- [Why AirNest?](#why-airnest)
- [Key Features](#key-features)
- [Tech Stack & Architecture](#tech-stack--architecture)
- [Project Structure](#project-structure)
- [Running Locally (Step-by-Step)](#running-locally-step-by-step)
  - [1. Prerequisites](#1-prerequisites)
  - [2. Install Dependencies](#2-install-dependencies)
  - [3. Configure Environment Variables](#3-configure-environment-variables)
  - [4. Start the Development Server](#4-start-the-development-server)
  - [5. Quick Demo & Deep-Link URLs](#5-quick-demo--deep-link-urls)
  - [6. Build & Run in Production Mode](#6-build--run-in-production-mode)
  - [7. Run with Docker](#7-run-with-docker)
- [API Endpoints](#api-endpoints)
- [Testing, Evals & Quality Gates](#testing-evals--quality-gates)
- [Security, Privacy & Disclaimers](#security-privacy--disclaimers)
- [Additional Documentation](#additional-documentation)

---

## Why AirNest?

During severe winter smog and urban pollution peaks across India (Delhi-NCR, Indo-Gangetic Plain, Tamil Nadu, Mumbai, Bengaluru) and cities worldwide, families see a raw **AQI number**—like `AQI 420`—without knowing:

1. **What should I do right now** (especially without an expensive purifier or private car)?
2. **What does each choice actually change** for my family's lung exposure, our household emissions, and our neighbourhood?

**AirNest** answers both questions on every screen with:
- **Always-included ₹0 options** (inversion-aware ventilation timing, wet mopping, draft sealing, lid-covered cooking, DIY Corsi-Rosenthal filters).
- **Transparent 3-Layer Impact Math** showing **(a) Personal PM2.5 exposure change**, **(b) Household emissions avoided (`kg CO₂e`, `g PM2.5`)**, and **(c) Community effect if `N` households adopt**, complete with formulas, assumptions, confidence ratings (`High` / `Medium` / `Low`), and explicit **Modeled Estimate** labeling.

---

## Key Features

### Experience & Onboarding
- **Botanical Landing Page**: Sunlit eco-tech landing page with Dark Mode support, smooth scroll-spy & spotlight section transitions (`Home`, `Features`, `About`, `Impact`, `Community`, `FAQ`), interactive Coimbatore/Delhi dashboard preview, live neighbourhood-scale **Impact** simulator, and **Community Clean Air Challenge** showcase.
- **Split-Screen Login & Smooth Dashboard Transition**: Email/Password sign-in & sign-up, Google Sign-In, password reset, instant Demo Mode entry (`Coimbatore 85` / `Delhi 420`), interactive cursor glow, Dark Mode toggle, and a smooth **Breath-Wave Transition** into the Dashboard.
- **60-Second Personal Onboarding & 2 Preloaded Demo Scenarios**:
  - **Delhi-NCR (`AQI 420 · Severe`)**: Winter smog emergency, asthmatic child + elder, low budget (`₹0`-first).
  - **Coimbatore (`AQI 85 · Moderate`)**: Working couple with car, clean-window exercise & low-emission commute swaps.
  - Supports 11+ Indian & global cities out of the box.

### Core Clean-Air Intelligence
- **Live Dashboard & Daily Quick-Reflection**:
  - Color-blind-safe AQI arc gauge, dominant pollutant, best/worst outdoor window strip, 48-hour forecast chart with 1-click **Data Table** view, interactive Google Map view, and per-family-member risk cards.
  - **Daily Quick-Reflection Card**: Lets users log how they felt about their low-emission plan progress today (`Energised`, `Steady`, `Tough Air Day`, `Reset Tomorrow`), pick quick-win tags, add an optional note, track reflection streaks offline, and receive tailored ₹0 next-day encouragement.
- **Inversion-Aware AI Daily & Weekly Plan**: Uses boundary layer height (BLH) and wind speed to schedule ventilation, commutes, school runs, exercise, and cooking; includes interactive done-tracking, expandable 3-layer **Impact Explainer** cards, and explicit-confirmation **Google Calendar Sync**.
- **Indoor Air Coach**: Filterable by budget (`₹0` / `₹` / `₹₹` / `₹₹₹`), interactive **CADR-vs-Room-Volume calculator** (`CADR = Area × Height × ACH`), 5-step **DIY Corsi-Rosenthal Filter** guide, and evidence-based myth-busting (no ozone purifiers, realistic houseplant efficacy).
- **Impact Explorer & What-If Simulator**: Sustainable alternatives ranked by `Impact × Feasibility × Cost` plus live sub-millisecond sliders comparing Current vs. Optimized 7-day PM2.5 exposure and CO₂e avoided.
- **Grounded Streaming Assistant**: Server-side Gemini orchestration with read-only tools (`get_aqi`, `get_forecast`, `calc_impact`, `find_alternatives`, `retrieve_guidance`), Google Search & Maps grounding citations, clean chatbot typography (zero raw markdown tokens), **Read Aloud** (Gemini TTS + Web Speech fallback), and **Live Voice** via WebSocket.

### PWA, Push Alerts, Community & Accessibility
- **Unhealthy AQI Push Notification System**: Integrated directly into the **Vite PWA Service Worker** (`public/sw-notifications.js`) using the browser **Notification API**. Automatically alerts users whenever local AQI exceeds **Unhealthy** levels (default `AQI > 150`, configurable to `> 200` or `> 300` in Settings), with a **Test Unhealthy AQI Alert** button and click-to-open **Daily Plan** routing.
- **Offline PWA Support**: Caches the latest AQI snapshot, daily plan, task progress, and daily reflections in `localStorage` + Workbox Service Worker.
- **Aggregate-Only Community Mode**: Privacy-safe neighbourhood challenges (zero individual PII), WhatsApp share card, and printable RWA noticeboard smog safety poster.
- **WCAG 2.2 AA & Multilingual**: Full **English**, **Hindi (`हिन्दी`)**, and **Tamil (`தமிழ்`)** support; *"Explain like I'm 10"* plain-language mode, **Elder Large-Text Mode**, **Dark Mode**, **High Contrast**, `prefers-reduced-motion`, and Skip-to-Content navigation.

---

## Tech Stack & Architecture

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, TypeScript (strict, zero `any`), Vite 8, Tailwind CSS v4, Lucide Icons, `vite-plugin-pwa` (Workbox) |
| **Backend** | Node.js, Express (`server.ts`), WebSocket (`ws`) for Gemini Live Voice, Zod v4 validation, Helmet CSP, Rate Limiter |
| **AI & Grounding** | `@google/genai` (server-side Gemini orchestration, read-only tool calling, SSE streaming, Search/Maps grounding, TTS, Live Audio) |
| **Data & Auth** | Firebase Authentication (Email/Password + Google OAuth), Cloud Firestore (hardened `firestore.rules`), Google Calendar API (in-memory OAuth token), Google Maps Platform |
| **Testing & Quality** | `node:test` via `tsx`, custom 36-case LLM Safety & Grounding Eval harness, `@firebase/eslint-plugin-security-rules`, GitHub Actions CI |

```text
Browser (React 19 SPA + Vite PWA Service Worker)
  ├── LandingPage / LoginPage / Dashboard / DailyReflection / Plan / Indoor / Impact / Simulator / Community / Assistant / Settings
  ├── public/sw-notifications.js (Notification API threshold alerts + offline Workbox cache)
  ├── Firebase Auth + Firestore (users/{uid}, dailyProgress) + Google Calendar (in-memory OAuth)
  └── HTTP / SSE / WebSocket ──▶ Express Server (server.ts, Port 3000)
                                    ├── Helmet CSP + CORS Allowlist + Rate Limit + Zod Validation
                                    ├── /api/aqi, /api/plan, /api/chat (SSE), /api/quick-tip, /api/tts, /api/live (WS)
                                    ├── /api/alternatives, /api/simulate, /api/cadr, /api/community, /api/health
                                    ├── AirQualityProvider Adapters (Google AQ / Open-Meteo / Demo Fallback + 15m Cache)
                                    ├── Pure Deterministic Impact Engine (packages/shared/impact)
                                    └── Isolated Gemini Orchestrator (server/llm/orchestrator.ts + knowledge/guidance.json)
```

---

## Project Structure

```text
.
├── server.ts                         # Unified Express + Vite dev/prod server (Port 3000)
├── vite.config.ts                    # Vite + Tailwind v4 + VitePWA (importScripts sw-notifications.js)
├── public/
│   ├── sw-notifications.js           # Service Worker AQI threshold push notification handler
│   └── pwa-*.png                     # PWA app icons
├── src/
│   ├── App.tsx                       # Stage routing (Landing -> Login -> Dashboard), Breath-Wave transition, SW alerts
│   ├── index.css                     # Design tokens, dark mode, high contrast, elder mode, GPU motion keyframes
│   ├── components/
│   │   ├── LandingPage.tsx           # Botanical landing page (Hero, Features, About, Impact, Community, FAQ, Dark Mode)
│   │   ├── LoginPage.tsx             # Split-screen Email/Google/Demo auth with cursor glow & ambient effects
│   │   ├── DashboardView.tsx         # AQI gauge, 48h forecast/map, family risks, ₹0 action, DailyReflectionCard
│   │   ├── DailyReflectionCard.tsx   # Daily low-emission progress quick-reflection check-in & streak tracker
│   │   ├── DailyPlanView.tsx         # Inversion-aware Daily/Weekly plan, done-tracking, Google Calendar sync
│   │   ├── IndoorCoachView.tsx       # ₹0–₹₹₹ indoor hacks, CADR calculator, 5-step DIY CR Box guide
│   │   ├── ImpactExplorerView.tsx    # Ranked sustainable alternatives + 3-layer ImpactCard
│   │   ├── WhatIfSimulatorView.tsx   # Live sliders + 7-day exposure chart & Data Table
│   │   ├── CommunityView.tsx         # Aggregate Clean Air Challenge, WhatsApp share, printable poster
│   │   ├── AssistantView.tsx         # Grounded streaming chatbot, Search/Maps grounding, TTS & Live Voice
│   │   ├── SettingsView.tsx          # Push notification thresholds/test alert, WCAG toggles, Export/Delete data
│   │   ├── Navigation.tsx            # Responsive Sidebar, TopBar & Mobile Bottom Nav
│   │   └── OnboardingWizard.tsx      # 60-second household onboarding modal
│   └── lib/
│       ├── aqiNotifications.ts       # Service Worker Notification API client bridge (+ unit tests)
│       ├── firebase.ts               # Firebase Auth (Email/Google), Firestore helpers, in-memory Calendar token
│       ├── calendar.ts               # Google Calendar API event creation & listing
│       └── offlineStore.ts           # Offline persistence for profile, AQI, plan, tasks, reflections & export
├── packages/shared/
│   ├── schemas.ts                    # Shared Zod schemas & strict TypeScript types
│   ├── demoScenarios.ts              # Delhi 420 & Coimbatore 85 scenarios + 11 Indian/global cities
│   ├── impact/                       # Pure deterministic Impact Engine, CADR, risk & simulator (+ tests)
│   └── i18n/                         # English, Hindi & Tamil dictionaries (+ parity tests)
├── server/
│   ├── config.ts                     # Zod-validated environment configuration
│   ├── security.ts                   # Helmet CSP, CORS allowlist, per-IP rate limiter, safe logger
│   ├── cache.ts                      # TTL cache + in-flight request coalescing
│   ├── routes.ts                     # All Express REST & SSE endpoints
│   ├── liveVoice.ts                  # WebSocket bridge for Gemini Live Voice
│   ├── adapters/                     # Swappable AirQualityProvider + circuit breaker
│   └── llm/                          # Isolated Gemini orchestrator, tool runner, safety & injection guards
├── knowledge/guidance.json           # Curated CPCB, WHO 2021, US EPA & IIT clean-air knowledge base
├── prompts/systemPrompts.ts          # Versioned system prompts (2026.11.v1)
├── evals/run-evals.ts                # 36-case LLM grounding, injection, safety & zero-cost eval suite
├── tests/firestore.rules.test.ts     # Firestore security rules structural verification
├── firestore.rules                   # Hardened Firestore security rules
├── Dockerfile & cloudrun.yaml        # Multi-stage production container & Cloud Run manifest
└── docs/                             # Architecture, Impact Methodology, Security, Accessibility, ADRs
```

---

## Running Locally (Step-by-Step)

### 1. Prerequisites
- **Node.js** `v20.x` or newer (`node -v`)
- **npm** `v10.x` or newer (`npm -v`)

### 2. Install Dependencies
Clone the repository and install all packages:

```bash
git clone <your-repo-url>
cd airnest
npm install
```

### 3. Configure Environment Variables
Copy the template environment file:

```bash
cp .env.example .env
```

Edit `.env` with your keys (note that **AirNest works out-of-the-box in Demo & Offline Fallback Mode** even if optional API keys are omitted—deterministic Impact Engine, CPCB/WHO grounded guidance, Demo Scenarios, and Open-Meteo AQI still work!):

| Variable | Required? | Purpose |
| :--- | :---: | :--- |
| `GEMINI_API_KEY` | Recommended | Enables live server-side Gemini AI chat, personalized daily plans, quick tips, TTS Read Aloud, and Live Voice. Without it, AirNest degrades gracefully to deterministic tool-grounded replies. |
| `VITE_GOOGLE_MAPS_API_KEY` | Optional | Enables the interactive Google Maps air quality view in the Dashboard. |
| `GOOGLE_MAPS_API_KEY` | Optional | Enables server-side Google Maps Air Quality API readings (falls back automatically to Open-Meteo / regional models). |
| `APP_URL` | Optional | Public URL of the app (defaults to `http://localhost:3000`). |
| `PORT` | Optional | Server port (defaults to `3000`). |
| `ALLOWED_ORIGINS` | Optional | Comma-separated CORS allowlist (defaults to `http://localhost:3000` + `APP_URL`). |

> **Security Note:** Never commit `.env` to version control. `GEMINI_API_KEY` is strictly server-side and is never exposed to the browser bundle.

### 4. Start the Development Server
Run the unified Express + Vite development server on port `3000`:

```bash
npm run dev
```

Open **`http://localhost:3000`** in your browser!

- The server mounts Vite middleware for the React frontend alongside all `/api/*` endpoints and the `/api/live` WebSocket bridge on the same origin (`http://localhost:3000`).
- The Vite PWA Service Worker (`sw-notifications.js`) is also active in dev mode so you can immediately test **Unhealthy AQI Push Notifications** in **Settings**.

### 5. Quick Demo & Deep-Link URLs
You can jump directly to any view during local testing or live demos:

| URL | What It Opens |
| :--- | :--- |
| `http://localhost:3000/` | Landing Page (Light/Dark Mode, Interactive Preview, Impact & Community sections) |
| `http://localhost:3000/?view=login` | Split-Screen Login / Sign-Up screen |
| `http://localhost:3000/?view=dashboard&scenario=coimbatore` | Dashboard — Coimbatore (`AQI 85 · Moderate`) + Daily Quick-Reflection |
| `http://localhost:3000/?view=dashboard&scenario=delhi` | Dashboard — Delhi-NCR (`AQI 420 · Severe`) + automatic Unhealthy AQI Alert banner |
| `http://localhost:3000/?view=dashboard&route=assistant` | Grounded Streaming Chatbot Assistant |
| `http://localhost:3000/?view=dashboard&route=settings` | Settings — Service Worker Push Notification Thresholds & Test Alert button |

### 6. Build & Run in Production Mode
To verify the optimized production build (including minified PWA Service Worker and code-split lazy routes):

```bash
npm run build
npm run start
```

This compiles the frontend into `dist/` and serves the production bundle + API via Express on `http://localhost:3000`.

### 7. Run with Docker
A multi-stage Alpine `Dockerfile` and `cloudrun.yaml` are included for containerized or Cloud Run deployments:

```bash
docker build -t airnest:latest .
docker run --rm -p 3000:3000 --env-file .env airnest:latest
```

---

## API Endpoints

All API endpoints validate input with strict Zod schemas, sanitize logs (no PII/health flags), and enforce per-IP rate limiting:

| Method & Path | Description |
| :--- | :--- |
| `GET /api/health` | Health check with uptime and active provider/model readiness |
| `GET /api/aqi?lat=&lng=&city=&region=` | Live AQI, dominant pollutant, wind, boundary layer height (BLH), and 48h forecast (15-min TTL cache + coalescing) |
| `POST /api/plan` | Generates an inversion-aware Daily or Weekly clean-air plan (60-min cache + deterministic fallback) |
| `POST /api/quick-tip` | Low-latency ₹0 actionable tip tailored to current AQI and household profile |
| `POST /api/chat` | Streaming SSE grounded chat with tool calling (`get_aqi`, `get_forecast`, `calc_impact`, `find_alternatives`, `retrieve_guidance`), Search/Maps grounding, injection defense, and medical escalation |
| `POST /api/tts` | Generates speech audio via Gemini TTS for Read Aloud accessibility |
| `WS /api/live` | Bidirectional WebSocket proxy for Gemini Live Voice conversations |
| `POST /api/alternatives` | Ranks sustainable alternatives by `Impact × Feasibility × Cost` with 3-layer impact math |
| `POST /api/simulate` | What-If Simulator recalculating projected indoor AQI, PM2.5 exposure drop, and weekly CO₂e avoided |
| `POST /api/cadr` | Purifier sizing calculator (`CADR = Area × Height × ACH`) + DIY Corsi-Rosenthal filter comparison |
| `GET /api/community` | Privacy-safe aggregate Clean Air Challenge statistics |

---

## Testing, Evals & Quality Gates

Run the full verification suite locally:

```bash
# 1. TypeScript strict type-checking (zero errors, zero `any`)
npm run lint

# 2. Unit, i18n, AQI push notification & API integration/failure-path tests (14/14 passing)
npm test

# 3. 36-case LLM Safety, Prompt Injection, Grounding, Zero-Cost & Multilingual Evals (36/36 = 100%)
npm run evals

# 4. Firebase Security Rules ESLint + structural tests (5/5 passing)
npm run lint:rules
npx tsx --test tests/firestore.rules.test.ts

# 5. Production bundle + PWA Service Worker build (~175 kB gzipped initial JS)
npm run build
```

---

## Security, Privacy & Disclaimers

- **Privacy-First Data Minimization**: Coordinates are snapped to an approximate `~1.1 km` grid (2 decimal places). Health sensitivities are never written to server logs. Google Calendar OAuth access tokens remain strictly in browser memory (never persisted in `localStorage` or `sessionStorage`).
- **User Data Control**: Users can export all local data as JSON or delete both local and cloud Firestore profile data at any time from **Settings**.
- **Estimates & Medical Safety**: All exposure, CO₂e, and PM2.5 reductions are clearly labeled as **modeled estimates** (CPCB / WHO 2021 / IPCC AR6). AirNest never recommends ozone-generating purifiers or waste/leaf burning, and escalates emergency respiratory symptoms (chest pain, severe wheezing, bluish lips) immediately to urgent medical care.

---

## Additional Documentation

- [System Architecture & Data Flow](/docs/architecture.md)
- [Impact Engine Methodology & Formulas](/docs/impact-methodology.md)
- [Security & STRIDE Threat Model](/docs/security.md)
- [WCAG 2.2 AA Accessibility Conformance](/docs/accessibility.md)
- [Architecture Decision Records (ADRs)](/docs/ADRs.md)
- [Test & Benchmark Report](/docs/test-report.md)
