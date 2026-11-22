# AirNest System Architecture

## Overview
AirNest is a full-stack TypeScript web application (React + Vite + Tailwind PWA frontend, Express + WebSocket Node.js backend, pure shared Impact Engine, and Firebase/Google Maps/Gemini integrations). All AI keys stay strictly server-side; the frontend communicates exclusively with `/api/*` and `/api/live`.

## System Diagram

```mermaid
flowchart TB
  subgraph Client["Client (React 19 + Vite + Tailwind PWA)"]
    UI["Dashboard · Plan · Indoor Coach · Impact · Simulator · Community · Assistant · Settings"]
    IEClient["Pure Impact Engine (packages/shared/impact)"]
    PWA["Service Worker + Offline Store"]
    FBClient["Firebase Auth + Firestore SDK"]
    CalClient["Google Calendar API v3 (In-Memory Bearer)"]
    MapsClient["@vis.gl/react-google-maps (DEMO_MAP_ID)"]
  end

  subgraph Server["Backend Proxy (server.ts · Express + WS)"]
    Sec["Helmet CSP · CORS Allowlist · Zod · Rate Limiter"]
    Routes["/api/aqi · /api/plan · /api/chat (SSE) · /api/tts · /api/quick-tip · /api/live (WS)"]
    AQAdapter["ResilientAirQualityService (15m Cache · Coalescing · Retry · Circuit Breaker)"]
    Orch["GeminiOrchestrator (Prompt Injection & Medical Guard · Read-Only Tools · Plan Cache)"]
    KB["Verified Knowledge Base (knowledge/guidance.json)"]
  end

  subgraph External["External APIs & Cloud Services"]
    OpenMeteo["Open-Meteo Air Quality & Weather (BLH + Wind)"]
    MapsAQ["Google Maps Air Quality API v1"]
    Gemini["Gemini API (@google/genai: Flash, Lite, TTS, Live, Search/Maps Grounding)"]
    Firestore["Cloud Firestore (Hardened Eight Pillars Rules)"]
  end

  UI --> IEClient
  UI --> PWA
  UI --> MapsClient
  UI --> FBClient --> Firestore
  UI --> CalClient
  UI --> Sec --> Routes
  Routes --> AQAdapter
  AQAdapter --> OpenMeteo
  AQAdapter --> MapsAQ
  Routes --> Orch
  Orch --> KB
  Orch --> IEClient
  Orch --> Gemini
```

## Module Boundaries
- `/packages/shared`: Strict Zod schemas, pure deterministic Impact Engine (`< 1 ms`), Demo Mode scenarios (Coimbatore AQI 85, Delhi AQI 420), and EN/HI/TA i18n dictionary.
- `/server/adapters`: Swappable `AirQualityProvider` interface (`OpenMeteoProvider`, `GoogleMapsAirQualityProvider`) wrapped by `ResilientAirQualityService`.
- `/server/llm/orchestrator.ts`: Single isolated LLM module enforcing system/data separation, read-only function calling, schema-validated plan output, prompt versioning (`2026.11.v1`), and token/cost telemetry.
- `/prompts/systemPrompts.ts`: Versioned prompt templates and injection/medical safety pattern tables.
- `/knowledge/guidance.json`: Grounded CPCB/WHO/EPA/Corsi-Rosenthal reference entries.
