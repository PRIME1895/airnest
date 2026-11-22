# AirNest Verification, Eval & Benchmark Report

## 1. Automated Test Suite (`npm test`)
- **Result**: **11 / 11 Passed** (`0` failures, `0` skipped)
- Covered suites:
  - `packages/shared/i18n/i18n.test.ts`: Complete key parity across English, Hindi (Devanagari), and Tamil.
  - `packages/shared/impact/impact.test.ts`: CPCB NAQI banding & N95 triggers, per-member risk escalation (asthmatic child + elder), CADR = Area × Height × ACH calculation, 3-layer ImpactCard math & community scaling, zero-cost (`₹0`) alternative guarantee for low-budget households, What-If simulator directional checks, strict Zod schema validation of Demo Scenarios & Daily Plan, and sub-5ms efficiency micro-benchmark (`~0.11 ms/iteration`).
  - `server/api.test.ts`: End-to-end tests for `/api/health`, `/api/aqi`, `/api/alternatives`, `/api/simulate`, `/api/cadr`, `/api/community`, plus failure paths (upstream provider failure -> graceful fallback, invalid Zod -> HTTP `400`, prompt injection -> blocked, excess requests -> HTTP `429`).

## 2. LLM Safety, Prompt-Injection & Grounding Evals (`npm run evals`)
| Category | Passed | Total | Pass Rate |
| :--- | :---: | :---: | :---: |
| Schema & Grounding | 12 | 12 | 100.0% |
| Prompt Injection Defense | 12 | 12 | 100.0% |
| Safety & Medical Escalation | 6 | 6 | 100.0% |
| Zero-Cost (`₹0`) & Multilingual (EN/HI/TA) | 6 | 6 | 100.0% |
| **TOTAL** | **36** | **36** | **100.0%** |

## 3. Firestore Security Rules Verification
- `npx tsx --test tests/firestore.rules.test.ts`: **5 / 5 Passed** (Eight Pillars default-deny, PII isolation & `hasOnly`, Master Gate & secure list queries on `dailyProgress`, read-only `/communityAggregates`, blueprint `maxLength` synchronicity).
- `npm run lint:rules` (`eslint firestore.rules`): **0 errors, 0 warnings**.
- Deployed to provisioned Firebase project via `DeployRules` RPC.

## 4. Production Bundle & Performance Metrics (`npm run build`)
- Build time: **`1.00 s`** (Vite 8 + PWA Service Worker `dist/sw.js` generated with 31 precached entries).
- **Initial Critical JS Bundle (preloaded in `dist/index.html`)**:
  - `rolldown-runtime`: `0.36 kB` gzipped
  - `index`: `30.49 kB` gzipped
  - `react-vendor`: `135.94 kB` gzipped
  - **Total Initial JS**: **`166.79 kB` gzipped** (passes `< 200 KB` gzipped target).
- Initial CSS: `9.39 kB` gzipped.
- Lazy-loaded view chunks: `2.80–5.00 kB` gzipped each (`firebase-vendor` deferred asynchronously until post-paint / sign-in).

## 5. Real-Browser Verification (Playwright CLI)
- **Desktop `1440×900` (Light Mode)**: Verified Home Dashboard (Coimbatore AQI 85 & Delhi-NCR AQI 420 switch), AI Daily Plan (done-tracking toggle + 3-layer ImpactCard), Indoor Air Coach (CADR calculator + cost filters + myth-busting), Impact Explorer (ranked alternatives + 7-day rings), What-If Simulator (sliders + instant SVG Current vs. Optimized trend), Community (aggregate stats + WhatsApp share + printable poster), Assistant (live prompt-injection refusal), and Settings (EN/HI/TA, ELI10, Elder mode, Export/Delete).
- **Mobile `390×844` (Dark Mode)**: Verified dark palette, zero horizontal overflow, and sticky 5-tab mobile bottom navigation.
- **Console Errors**: **0 errors, 0 warnings** after fixing Vite React deduplication and replacing Recharts with instant-rendering accessible SVG charts.

## 6. Environment Notes
- Automated Playwright browser checks and Node test/eval runners executed cleanly inside the container.
- Live Firebase Firestore Emulator binary and Lighthouse CLI are not pre-installed in this container; Firestore rules were verified via static ESLint (`@firebase/eslint-plugin-security-rules`), 5 structural security assertions, and live deployment via `DeployRules`, while bundle size and WCAG DOM/visual checks were verified via Vite build metrics and Playwright CLI.
