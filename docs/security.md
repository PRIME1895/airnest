# AirNest Security Architecture & Threat Model

## Defense-in-Depth Controls
1. **Zero Client-Side Secret Exposure**: `GEMINI_API_KEY` and server-side Google Maps Air Quality credentials are loaded exclusively in `/server/config.ts` (Zod-validated at startup) and never bundled into client assets.
2. **HTTP Hardening (`/server/security.ts`)**:
   - `helmet` security headers with explicit Content Security Policy (`defaultSrc`, `scriptSrc`, `connectSrc`, `frameAncestors`).
   - Strict CORS origin allowlist (`APP_URL` + localhost dev origins).
   - Express JSON body limit (`120kb`), per-IP sliding-window rate limiter (`90 req/min` default, configurable for testing).
   - Centralized structured error handler (`AppError`) that never leaks stack traces or secrets.
3. **Input Validation & Sanitization**: Every `/api/*` endpoint validates query and body payloads against strict Zod schemas (`/packages/shared/schemas.ts`).
4. **LLM Prompt-Injection & Safety Isolation (`/server/llm/orchestrator.ts`)**:
   - Untrusted user prompts and retrieved knowledge text are wrapped inside `<untrusted_user_input>` / `<retrieved_reference_data>` delimiters.
   - Pre-model deterministic guard blocks prompt-injection attempts (e.g., system prompt extraction, key disclosure, jailbreaks) and immediately escalates severe medical red-flag symptoms (chest pain, bluish lips, severe breathlessness) to emergency services (`112 / 108`).
   - All LLM tools (`get_aqi`, `get_forecast`, `calc_impact`, `find_alternatives`, `retrieve_guidance`) are strictly **read-only** and least-privilege.
   - Structured AI plans are validated against `DailyPlanSchema` before returning to the client.
5. **Firebase Firestore & Auth (`/firestore.rules`, `/docs/security_spec.md`)**:
   - Eight Pillars hardened rules: default-deny fallback, owner-scoped `/users/{userId}` and `/users/{userId}/dailyProgress/{dateKey}` access, strict field allowlists (`hasOnly`), immutable `ownerId`/`createdAt`, bounded types/lengths, and read-only aggregate-only `/communityAggregates/{cityId}` documents with zero PII.
   - Google Workspace Calendar OAuth tokens are stored **exclusively in browser memory** (never `localStorage` or `sessionStorage`), and every Calendar write requires an explicit user confirmation modal.
6. **Privacy & Data Minimization**:
   - Coordinates are snapped to 2 decimal places (`~1.1 km` approximate grid).
   - Health sensitivities are never written to server logs.
   - Users can export all data (JSON) or delete local + cloud records in Settings.

## STRIDE Threat Model

| Threat Category | Attack Vector | Mitigation in AirNest | Verification Evidence |
|---|---|---|---|
| **Spoofing** | Forged user UID accessing another family's profile | Firebase Auth JWT verified in `firestore.rules` (`isOwner(userId)`) | `tests/firestore.rules.test.ts` + `npx eslint firestore.rules` |
| **Tampering** | Malicious payloads or oversized JSON sent to `/api/plan` or `/api/chat` | Strict Zod schemas + `120kb` Express body cap + immutable Firestore fields | `server/api.test.ts` (400 validation tests) |
| **Repudiation / Unsafe Action** | Silent mutation of user Google Calendar without consent | Explicit custom confirmation modal before `createPlanEventInCalendar` | `src/components/DailyPlanView.tsx` |
| **Information Disclosure** | Prompt injection asking for `GEMINI_API_KEY` or system prompt; exact GPS leakage | Pre-model injection guard + system/data separation + 2-decimal approx grid snapping | `evals/run-evals.ts` (12/12 injection suite) |
| **Denial of Service (Quota Abuse)** | Rapid-fire `/api/chat` or `/api/aqi` calls exhausting Gemini/Maps quota | Per-IP rate limiter, 15-min AQI cache + request coalescing, 60-min plan cache, circuit breaker, Maps Case A quota defense banner | `server/api.test.ts` (429 rate-limit test), `server/cache.ts`, `src/main.tsx` |
| **Elevation of Privilege** | Client writing fake totals to `/communityAggregates` or modifying `ownerId` | `allow write: if false` on `/communityAggregates`; `ownerId` immutability enforced in rules | `firestore.rules`, `tests/firestore.rules.test.ts` |
