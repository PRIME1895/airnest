# AirNest Accessibility Conformance (WCAG 2.2 AA)

## Implemented Accessibility Features
- **Semantic Structure & Landmarks**: Proper `<header>`, `<aside>`, `<nav aria-label="...">`, `<main id="main-content" tabIndex={-1}>`, `<section aria-labelledby="...">`, and ordered heading hierarchy (`h1` -> `h2` -> `h3`).
- **Skip Navigation**: Keyboard-accessible "Skip to main content" link at the top of the DOM (`focus:not-sr-only`).
- **Keyboard & Focus Management**: All interactive elements use native `<button>`, `<a>`, `<input>`, and `<select>` with visible `3px` high-contrast `:focus-visible` outlines (`#1B4D3E` light / `#4ADE80` dark) and minimum `40–44px` touch targets.
- **Color-Blind-Safe AQI Encoding**: Every AQI band pairs color with a distinct semantic Lucide icon (`leaf`, `check`, `alert`, `shield-alert`, `octagon`) AND an explicit text label (`Good`, `Moderate`, `Poor`, `Very Poor`, `Severe`).
- **Accessible Charts**: Both the 48-hour Forecast chart (`ForecastChart.tsx`) and the 7-day Exposure Trend chart (`WhatIfSimulatorView.tsx`) include `role="img"` descriptive `aria-label`s AND a 1-click **Data Table** toggle with proper `<th scope="col">` headers.
- **Live Regions**: `aria-live="polite"` regions announce AQI scenario changes, live simulator recalculations, and streaming assistant replies.
- **Multilingual Support (EN / HI / TA)**: Full UI dictionary in English, Hindi (`Noto Sans Devanagari`), and Tamil (`Noto Sans Tamil`), updating `<html lang="en|hi|ta">` dynamically.
- **Cognitive & Visual Modes**:
  - **"Explain like I'm 10"** plain-language toggle.
  - **Elder-Friendly Large Text Mode** (`html.elder-mode` scales root font size to `118.75%`).
  - **Dark Mode** & **High Contrast Borders** (`html.high-contrast`).
  - **`prefers-reduced-motion`** CSS media query respects OS motion reduction settings.
- **Voice Input & Output**: Text-to-Speech via Gemini `gemini-3.8-flash-tts` (with Web Speech API fallback) and hands-free Gemini Live Voice conversation.

## Tested Viewports & Modes
- Desktop `1440×900` (Light & Dark modes)
- Mobile `390×844` and compact `360×800` (zero horizontal overflow, sticky 5-tab mobile bottom nav)
- Print view (`@media print` hides navigation chrome for crisp RWA noticeboard poster printing)
