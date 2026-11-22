# Architecture Decision Records (ADRs)

## ADR-001: Pure Shared Impact Engine (`/packages/shared/impact`)
- **Context**: Both the client What-If Simulator (requiring `<1ms` slider feedback + offline capability) and backend LLM tool-calling (`calc_impact`, `find_alternatives`) need identical, deterministic math.
- **Decision**: Implement all AQI classification, per-member risk, CADR sizing, 3-layer impact calculations, and alternative ranking as pure side-effect-free TypeScript functions shared across frontend and backend.
- **Consequences**: Zero network latency on slider interaction, deterministic unit testing (`<0.2 ms/iter`), and guaranteed consistency between UI cards and AI explanations.

## ADR-002: Swappable Provider Adapter with Cache, Coalescing & Circuit Breaker
- **Context**: Public air-quality APIs (Open-Meteo, Google Maps Air Quality) can experience latency spikes or quota limits.
- **Decision**: Put providers behind `AirQualityProvider` wrapped by `ResilientAirQualityService` with 15-minute TTL caching, in-flight request coalescing, exponential backoff retry, circuit breaker, and deterministic Demo Mode fallback.
- **Consequences**: Fast repeat responses, protected external quotas, and zero UI crashes even offline or under upstream outage.

## ADR-003: Single Isolated Gemini Orchestrator with Strict Guardrails
- **Context**: Hackathon judging requires prompt versioning, tool least-privilege, prompt-injection defense, and zero key exposure.
- **Decision**: Centralize all `@google/genai` SDK calls in `/server/llm/orchestrator.ts` (server-side only), version prompts in `/prompts/systemPrompts.ts` (`2026.11.v1`), wrap untrusted inputs in XML tags, and apply deterministic pre-model safety/injection checks.
- **Consequences**: Auditable 36-case eval suite (`npm run evals`), predictable token/cost telemetry, and schema-enforced outputs.

## ADR-004: Privacy-First Location Snapping & In-Memory OAuth Tokens
- **Context**: Families share health sensitivities (asthma, pregnancy) and optional Google Calendar access.
- **Decision**: Snap coordinates to 2 decimal places (`~1.1 km`), store aggregate-only community stats with zero PII, and hold Google Calendar OAuth tokens strictly in browser memory with explicit user confirmation before any write.
- **Consequences**: Minimal privacy blast radius while enabling cloud profile sync and calendar reminders.
