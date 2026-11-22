# AirNest Impact Methodology

All numerical outputs presented in AirNest are **modeled estimates** computed deterministically by the pure, side-effect-free Impact Engine (`/packages/shared/impact/index.ts`) and paired with explicit formulas, assumptions, confidence ratings (`High`, `Medium`, `Low`), and policy/scientific citations.

## 1. AQI Classification & Per-Member Risk
- **Bands**: Follows CPCB India National Air Quality Index (NAQI, 2014) thresholds: `0–50 Good`, `51–100 Satisfactory/Moderate`, `101–200 Moderate`, `201–300 Poor`, `301–400 Very Poor`, `401+ Severe`.
- **Sensitivity Scaling**:
  - `effectiveIndex = AQI × (hasAsthmaOrCardioOrPregnancy ? 1.45 : 1.0) × (isChildOrElder ? 1.25 : 1.0)`
  - When `AQI > 300`, N95/FFP2 respirator guidance is automatically triggered outdoors.

## 2. Three-Layer Impact Formula (`calculateChoiceImpact`)
Every choice quantifies three distinct layers:
1. **Personal Exposure Change**:
   - `personalExposureDeltaPct = round(clamp(exposureReductionFraction, 0, 0.85) × 100)`
   - `personalPm25AvoidedUgPerDay = baselinePm25 × exposureReductionFraction`
   - Closed-window vs. open-window indoor/outdoor infiltration ratio: `0.45` vs `0.80`; HEPA / Corsi-Rosenthal mechanical filtration reduces steady-state indoor PM2.5 to ~`0.18 × outdoor`.
2. **Household Emissions Avoided**:
   - **Commute Shift**: `CO2e (kg/wk) = kmShifted × (0.192 car − 0.041 transit)` and `PM2.5 (g/wk) = kmShifted × 0.065` (IPCC AR6 & WRI India GHG Program).
   - **Clean Cooking**: Kitchen exhaust + lids cuts indoor cooking PM2.5 spikes by `45–60%`; switching from solid biomass/kerosene to LPG/induction eliminates ~`90%` of indoor combustion PM2.5 (WHO Household Fuel Combustion Guidelines).
   - **Zero Waste/Leaf Burning**: Prevents `11–18 g PM2.5` per kg of dry leaves/waste burned (CPCB Municipal Emission Inventory).
3. **Community Effect (If `N` Households Adopt)**:
   - `communityCo2eTonnesPerMonth = (householdCo2eKgPerWeek × 4.33 × N) / 1000`
   - `communityPm25KgPerMonth = (householdPm25GramsPerWeek × 4.33 × N) / 1000`
   - Conservative neighborhood ambient PM2.5 reduction capped at `18%`.

## 3. Purifier Sizing & CADR (`calculateCadr`)
- Formula: `CADR (m³/h) = Room Area (m²) × Ceiling Height (m) × Target ACH` (default `4.5–5.0 ACH` during winter smog events, rounded up to nearest `10 m³/h`).
- Conversion: `CFM = round(CADR_m3h / 1.699)`.
- DIY Corsi-Rosenthal Box reference: 4× MERV-13 filters + 20" box fan yields `450–600 m³/h` CADR with **zero ozone emission** (UC Davis 2022, UL Chemical Insights 2023).

## 4. Sustainable Alternatives Ranking (`rankAlternatives`)
- Formula: `rankScore = (impactScore × feasibilityScore × min(10, costScore × budgetWeight)) / 10`
- Budget weights: `low = 1.35`, `moderate = 1.10`, `flexible = 0.90`, ensuring `₹0` actions always appear prominently and AirNest never assumes a private car or expensive purifier.
