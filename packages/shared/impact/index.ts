/**
 * Pure, side-effect-free Impact Engine for AirNest.
 *
 * Scientific & Policy Citations:
 * - CPCB India National Air Quality Index (NAQI, 2014) breakpoints
 * - WHO Global Air Quality Guidelines (2021): PM2.5 24h AQG = 15 µg/m³
 * - IPCC AR6 / India GHG Platform: Passenger petrol car ~0.192 kg CO2e/km,
 *   public bus/metro ~0.041 kg CO2e/km, car PM2.5 tailpipe+non-exhaust ~0.065 g/km
 * - EPA / Corsi-Rosenthal Box Laboratory Testing (UC Davis 2022, UL 2023):
 *   MERV-13 4-filter CR box CADR ~450-650 m³/h; CADR = Volume (m³) × ACH
 * - Indoor/Outdoor infiltration ratio (I/O): closed windows ~0.45, HEPA/CR box ~0.18
 */

import type {
  AlternativeOption,
  AqiBand,
  AqiSnapshot,
  ConfidenceLevel,
  CookingFuel,
  CostTag,
  DailyPlan,
  DailyPlanItem,
  HouseholdMember,
  ImpactLayerResult,
  MemberRiskAssessment,
  UserProfile,
  WhatIfResult,
  WhatIfSliders,
} from '../schemas';

export interface AqiClassification {
  band: AqiBand;
  /** Color-blind-safe semantic key (always paired with icon + text label in UI) */
  colorHex: string;
  badgeBgClass: string;
  textClass: string;
  iconKey: 'leaf' | 'check' | 'alert' | 'shield-alert' | 'octagon' | 'skull';
  shortAdvice: string;
  n95Recommended: boolean;
}

/**
 * Classifies an AQI value using CPCB India NAQI bands with color-blind-safe styling.
 * Runtime: O(1), < 0.01 ms.
 */
export function classifyAqi(aqi: number): AqiClassification {
  const safeAqi = Math.max(0, Math.round(aqi));
  if (safeAqi <= 50) {
    return {
      band: 'Good',
      colorHex: '#1F7A4C',
      badgeBgClass: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800',
      textClass: 'text-emerald-900 dark:text-emerald-200',
      iconKey: 'leaf',
      shortAdvice: 'Air is clean. Ideal for outdoor exercise and natural cross-ventilation.',
      n95Recommended: false,
    };
  }
  if (safeAqi <= 100) {
    return {
      band: 'Moderate',
      colorHex: '#2D8A56',
      badgeBgClass: 'bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800',
      textClass: 'text-teal-900 dark:text-teal-200',
      iconKey: 'check',
      shortAdvice: 'Acceptable air. Sensitive family members should prefer low-traffic hours.',
      n95Recommended: false,
    };
  }
  if (safeAqi <= 200) {
    return {
      band: 'Moderate',
      colorHex: '#B45309',
      badgeBgClass: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
      textClass: 'text-amber-950 dark:text-amber-200',
      iconKey: 'alert',
      shortAdvice: 'Moderate-to-elevated pollution. Time outdoor activity to the cleanest window.',
      n95Recommended: false,
    };
  }
  if (safeAqi <= 300) {
    return {
      band: 'Poor',
      colorHex: '#C2410C',
      badgeBgClass: 'bg-orange-50 dark:bg-orange-950/60 border-orange-300 dark:border-orange-800',
      textClass: 'text-orange-950 dark:text-orange-200',
      iconKey: 'shield-alert',
      shortAdvice: 'Poor air quality. Keep windows shut during morning and night peaks.',
      n95Recommended: false,
    };
  }
  if (safeAqi <= 400) {
    return {
      band: 'Very Poor',
      colorHex: '#B91C1C',
      badgeBgClass: 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-800',
      textClass: 'text-red-950 dark:text-red-200',
      iconKey: 'octagon',
      shortAdvice: 'Very poor smog. Avoid outdoor workouts and wear a well-fitted N95/FFP2 outdoors.',
      n95Recommended: true,
    };
  }
  return {
    band: 'Severe',
    colorHex: '#7F1D1D',
    badgeBgClass: 'bg-rose-100 dark:bg-rose-950/80 border-rose-400 dark:border-rose-700',
    textClass: 'text-rose-950 dark:text-rose-100',
    iconKey: 'skull',
    shortAdvice: 'Severe winter smog emergency. Stay indoors, seal drafts, and wear N95 outdoors.',
    n95Recommended: true,
  };
}

/**
 * Assesses personalized risk per household member based on AQI, PM2.5, age group, and conditions.
 */
export function assessMemberRisks(
  aqi: number,
  pm25: number,
  members: HouseholdMember[]
): MemberRiskAssessment[] {
  return members.map((member) => {
    const hasRespiratoryOrCardio =
      member.conditions.includes('asthma') ||
      member.conditions.includes('heart_condition') ||
      member.conditions.includes('pregnancy');
    const isVulnerableAge = member.role === 'child' || member.role === 'elder';
    const sensitivityMultiplier = (hasRespiratoryOrCardio ? 1.45 : 1) * (isVulnerableAge ? 1.25 : 1);
    const effectiveIndex = aqi * sensitivityMultiplier;

    let riskLevel: MemberRiskAssessment['riskLevel'] = 'Low';
    let guidance = 'Normal outdoor routines are fine; prefer parks away from arterial roads.';
    let maskRequired = false;

    if (effectiveIndex >= 380 || aqi > 300) {
      riskLevel = hasRespiratoryOrCardio || isVulnerableAge ? 'Critical' : 'High';
      maskRequired = true;
      guidance = member.conditions.includes('asthma')
        ? 'Keep indoors with filtered air, keep reliever inhaler reachable, and use well-fitted N95 if stepping out.'
        : member.role === 'elder'
          ? 'Avoid morning/evening outdoor walks; use N95 mask for essential errands and monitor breathlessness.'
          : 'Move workouts indoors and wear a fitted N95/FFP2 respirator outdoors.';
    } else if (effectiveIndex >= 220) {
      riskLevel = 'High';
      maskRequired = aqi > 250 || hasRespiratoryOrCardio;
      guidance =
        member.role === 'child'
          ? 'Shift outdoor play to indoor spaces or the cleanest afternoon window.'
          : 'Reduce vigorous outdoor exertion and keep a clean N95 mask handy.';
    } else if (effectiveIndex >= 115) {
      riskLevel = 'Elevated';
      guidance = hasRespiratoryOrCardio
        ? 'Limit heavy outdoor exertion during traffic rush hours; keep windows closed at peak smog.'
        : 'Prefer the cleanest afternoon window for outdoor play or exercise.';
    } else if (effectiveIndex >= 65) {
      riskLevel = 'Moderate';
      guidance = 'Limit intense roadside exercise during rush hours; safe during best window.';
    }

    return {
      memberId: member.id,
      label: member.label,
      role: member.role,
      riskLevel,
      guidance: `${guidance} (PM2.5: ${Math.round(pm25)} µg/m³)`,
      maskRequired,
    };
  });
}

export interface CadrCalculation {
  roomVolumeM3: number;
  recommendedCadrM3h: number;
  recommendedCadrCfm: number;
  targetAch: number;
  crBoxCoversRoom: boolean;
  diyEstimatedCostInr: string;
  commercialEstimatedCostInr: string;
  formula: string;
}

/**
 * Computes Clean Air Delivery Rate (CADR) required for a room to achieve target Air Changes per Hour (ACH).
 * Formula: CADR (m³/h) = Room Area (m²) × Ceiling Height (m) × Target ACH (default 4.8 for AHAM/smog events).
 */
export function calculateCadr(
  roomAreaM2: number,
  ceilingHeightM = 3.0,
  targetAch = 5.0
): CadrCalculation {
  const clampedArea = Math.max(6, Math.min(300, roomAreaM2));
  const clampedHeight = Math.max(2.2, Math.min(5.0, ceilingHeightM));
  const clampedAch = Math.max(2, Math.min(8, targetAch));

  const roomVolumeM3 = round1(clampedArea * clampedHeight);
  const recommendedCadrM3h = Math.ceil((roomVolumeM3 * clampedAch) / 10) * 10;
  const recommendedCadrCfm = Math.round(recommendedCadrM3h / 1.699);

  return {
    roomVolumeM3,
    recommendedCadrM3h,
    recommendedCadrCfm,
    targetAch: clampedAch,
    crBoxCoversRoom: recommendedCadrM3h <= 600,
    diyEstimatedCostInr: '₹2,200 – ₹3,500 (box fan + MERV-13 / HEPA panels)',
    commercialEstimatedCostInr:
      recommendedCadrM3h <= 320 ? '₹6,500 – ₹11,000' : '₹12,000 – ₹22,000',
    formula: `CADR = ${clampedArea} m² × ${clampedHeight} m × ${clampedAch} ACH = ${recommendedCadrM3h} m³/h`,
  };
}

export interface ChoiceImpactInput {
  choiceId: string;
  title: string;
  baselinePm25: number;
  exposureReductionFraction: number;
  weeklyCo2eAvoidedKg: number;
  weeklyPm25AvoidedGrams: number;
  communityHouseholdsN?: number;
  confidence: ConfidenceLevel;
  formulas: string[];
  assumptions: string[];
  citation: string;
}

/**
 * Computes the 3-Layer Impact Explainer card:
 * (a) Personal exposure change,
 * (b) Household emissions avoided (kg CO2e, g PM2.5),
 * (c) Community effect if N households adopt.
 */
export function calculateChoiceImpact(input: ChoiceImpactInput): ImpactLayerResult {
  const n = Math.max(10, Math.round(input.communityHouseholdsN ?? 500));
  const clampedFraction = Math.max(0, Math.min(0.85, input.exposureReductionFraction));
  const personalExposureDeltaPct = Math.round(clampedFraction * 100);
  const personalPm25AvoidedUgPerDay = round1(input.baselinePm25 * clampedFraction);
  const householdCo2eKgPerWeek = round2(Math.max(0, input.weeklyCo2eAvoidedKg));
  const householdPm25GramsPerWeek = round2(Math.max(0, input.weeklyPm25AvoidedGrams));

  // Monthly scaling (4.33 weeks/month)
  const communityCo2eTonnesPerMonth = round2((householdCo2eKgPerWeek * 4.33 * n) / 1000);
  const communityPm25KgPerMonth = round2((householdPm25GramsPerWeek * 4.33 * n) / 1000);

  // Local neighborhood ambient PM2.5 reduction estimate (conservative urban dispersion scaling, capped at 18%)
  const communityAmbientReductionPct = round1(
    Math.min(18, Math.max(0.2, (communityPm25KgPerMonth / 120) * 1.8 + (n / 1000) * 0.6))
  );

  return {
    choiceId: input.choiceId,
    title: input.title,
    personalExposureDeltaPct,
    personalPm25AvoidedUgPerDay,
    householdCo2eKgPerWeek,
    householdPm25GramsPerWeek,
    communityHouseholdsN: n,
    communityCo2eTonnesPerMonth,
    communityPm25KgPerMonth,
    communityAmbientReductionPct,
    formulas: input.formulas,
    assumptions: input.assumptions,
    confidence: input.confidence,
    isEstimate: true,
    citation: input.citation,
  };
}

/**
 * Ranks sustainable alternatives by (Impact × Feasibility × CostScore).
 * Guaranteed to include multiple ₹0 (zero-cost) actions regardless of user budget.
 */
export function rankAlternatives(
  profile: UserProfile,
  aqi: number,
  pm25: number,
  communityN = 500
): AlternativeOption[] {
  const budgetWeight = profile.budget === 'low' ? 1.35 : profile.budget === 'moderate' ? 1.1 : 0.9;
  const carKmSavedPerWeek = Math.max(12, profile.carTripsPerWeek * 8);

  const candidates: Array<Omit<AlternativeOption, 'rankScore'>> = [
    {
      id: 'alt-ventilation-window',
      title: 'Close Windows During Peaks & Cross-Ventilate at Cleanest Hour',
      category: 'indoor',
      summary:
        'Seal outdoor drafts during morning/night thermal inversions and air out rooms for 20 minutes when boundary layer rises.',
      costTag: '₹0',
      estimatedCostInr: '₹0 (Free habit)',
      effort: 'Low',
      timeToBenefit: 'Immediate (within 1 hour)',
      feasibilityScore: 9.5,
      impactScore: aqi > 200 ? 9.2 : 7.8,
      costScore: 10,
      impact: calculateChoiceImpact({
        choiceId: 'alt-ventilation-window',
        title: 'Peak-Aware Ventilation Timing',
        baselinePm25: pm25,
        exposureReductionFraction: aqi > 250 ? 0.42 : 0.3,
        weeklyCo2eAvoidedKg: 0.4,
        weeklyPm25AvoidedGrams: 0.8,
        communityHouseholdsN: communityN,
        confidence: 'High',
        formulas: [
          'Indoor PM2.5 = Outdoor PM2.5 × I/O_ratio (0.45 closed vs 0.80 open)',
          'Personal Exposure Reduction = (0.80 - 0.45) / 0.80 ≈ 42% during smog peaks',
        ],
        assumptions: [
          'Average apartment window sealing with wet-cloth/door-draft stoppers.',
          'Ventilation shifted to afternoon peak boundary layer height (>800m).',
        ],
        citation: 'EPA Indoor Air Quality & CPCB Winter Smog Advisories (2023)',
      }),
    },
    {
      id: 'alt-public-transit',
      title: 'Switch 3 Weekly Commutes to Metro / Bus / Carpool',
      category: 'commute',
      summary:
        'Replacing solo car or two-wheeler trips cuts tailpipe + brake-dust PM2.5 and lowers commuter roadside exposure.',
      costTag: '₹0',
      estimatedCostInr: '₹0 (Saves ₹450–₹900/week in fuel)',
      effort: 'Medium',
      timeToBenefit: 'First commute',
      feasibilityScore: profile.commuteMode === 'public_transit' ? 9.0 : 8.2,
      impactScore: 8.8,
      costScore: 9.8,
      impact: calculateChoiceImpact({
        choiceId: 'alt-public-transit',
        title: 'Switch to Public Transport / Carpool',
        baselinePm25: pm25,
        exposureReductionFraction: 0.25,
        weeklyCo2eAvoidedKg: round2(carKmSavedPerWeek * (0.192 - 0.041)),
        weeklyPm25AvoidedGrams: round2(carKmSavedPerWeek * 0.065),
        communityHouseholdsN: communityN,
        confidence: 'High',
        formulas: [
          `CO2e Avoided = ${carKmSavedPerWeek} km/wk × (0.192 car − 0.041 transit) kg/km`,
          `PM2.5 Avoided = ${carKmSavedPerWeek} km/wk × 0.065 g/km (tailpipe + road dust)`,
        ],
        assumptions: [
          `Assumes ${carKmSavedPerWeek} km/week shifted from petrol car to metro/bus or 3-person carpool.`,
          'AC cabin / metro carriage lowers in-transit PM2.5 inhalation by ~25% vs open roadside travel.',
        ],
        citation: 'IPCC AR6 Transport Factors & India GHG Program (WRI India)',
      }),
    },
    {
      id: 'alt-no-waste-burning',
      title: 'Zero Leaf/Waste Burning & Wet-Mop Dust Control',
      category: 'community',
      summary:
        'Compost dry garden leaves instead of burning and switch from dry brooming to wet mopping to stop PM2.5 resuspension.',
      costTag: '₹0',
      estimatedCostInr: '₹0 (Free household & RWA practice)',
      effort: 'Low',
      timeToBenefit: 'Immediate',
      feasibilityScore: 9.2,
      impactScore: 8.6,
      costScore: 10,
      impact: calculateChoiceImpact({
        choiceId: 'alt-no-waste-burning',
        title: 'Zero Waste Burning & Wet Mopping',
        baselinePm25: pm25,
        exposureReductionFraction: 0.18,
        weeklyCo2eAvoidedKg: 3.1,
        weeklyPm25AvoidedGrams: 18.5,
        communityHouseholdsN: communityN,
        confidence: 'Medium',
        formulas: [
          'Open biomass burning emits ~11–18 g PM2.5 per kg dry leaf/waste burned',
          'Wet mopping reduces indoor settled PM10/PM2.5 resuspension by 40–60%',
        ],
        assumptions: [
          'Prevents ~1.5 kg/week of neighborhood leaf/trash burning per participating household.',
          'Daily wet mop replaces dry sweeping in living/sleeping rooms.',
        ],
        citation: 'CPCB Municipal Solid Waste Emission Inventory & IIT Kanpur Source Apportionment',
      }),
    },
    {
      id: 'alt-clean-cooking',
      title: 'Use Exhaust Fan + Lids & Shift High-Heat Meals to Induction/LPG',
      category: 'cooking',
      summary:
        'Cooking with lids and exhaust ventilation cuts indoor kitchen PM2.5 spikes by up to 55%; shifting from biomass/kerosene saves huge emissions.',
      costTag: profile.cookingFuel === 'biomass_kerosene' ? '₹₹' : '₹0',
      estimatedCostInr:
        profile.cookingFuel === 'biomass_kerosene' ? '₹1,800 (Ujjwala LPG / Induction)' : '₹0 (Use existing exhaust + lids)',
      effort: 'Low',
      timeToBenefit: 'Immediate (next meal)',
      feasibilityScore: 8.7,
      impactScore: profile.cookingFuel === 'biomass_kerosene' ? 9.8 : 7.6,
      costScore: profile.cookingFuel === 'biomass_kerosene' ? 7.0 : 9.6,
      impact: calculateChoiceImpact({
        choiceId: 'alt-clean-cooking',
        title: 'Clean Cooking & Kitchen Exhaust Control',
        baselinePm25: pm25,
        exposureReductionFraction: profile.cookingFuel === 'biomass_kerosene' ? 0.55 : 0.22,
        weeklyCo2eAvoidedKg: profile.cookingFuel === 'biomass_kerosene' ? 9.4 : 1.3,
        weeklyPm25AvoidedGrams: profile.cookingFuel === 'biomass_kerosene' ? 42.0 : 4.2,
        communityHouseholdsN: communityN,
        confidence: 'High',
        formulas: [
          'Kitchen PM2.5 spike drops 45–60% with exhaust fan running + 10 min post-cooking',
          'Induction/LPG vs solid fuel eliminates ~90% of indoor combustion PM2.5',
        ],
        assumptions: [
          '2 cooked meals per day; exhaust vented outdoors rather than recirculated.',
        ],
        citation: 'WHO Indoor Air Quality Guidelines: Household Fuel Combustion',
      }),
    },
    {
      id: 'alt-diy-cr-box',
      title: 'Build a DIY Corsi-Rosenthal Air Filter Box (5 Steps)',
      category: 'indoor',
      summary:
        'Tape MERV-13 or replacement HEPA filters to a standard box fan for commercial-grade CADR (450+ m³/h) at a third of the cost.',
      costTag: '₹',
      estimatedCostInr: '₹2,200 – ₹3,500',
      effort: 'Medium',
      timeToBenefit: 'Under 30 minutes to assemble',
      feasibilityScore: 7.8,
      impactScore: aqi > 150 ? 9.5 : 7.4,
      costScore: 8.4,
      impact: calculateChoiceImpact({
        choiceId: 'alt-diy-cr-box',
        title: 'DIY Corsi-Rosenthal Box Filter',
        baselinePm25: pm25,
        exposureReductionFraction: 0.62,
        weeklyCo2eAvoidedKg: 0.2,
        weeklyPm25AvoidedGrams: 1.4,
        communityHouseholdsN: communityN,
        confidence: 'High',
        formulas: [
          'Effective CADR ≈ 480 m³/h -> 5.0 ACH in a 32 m² bedroom (96 m³)',
          'Steady-state indoor PM2.5 drops by 60–75% within 45 minutes',
        ],
        assumptions: [
          'Operated 8–10 hours/day in primary bedroom with doors/windows closed.',
          'Uses genuine MERV-13/H13 mechanical filtration (zero ozone emission).',
        ],
        citation: 'UC Davis & UL Chemical Insights Corsi-Rosenthal CADR Testing (2022–2023)',
      }),
    },
    {
      id: 'alt-electric-heating',
      title: 'Avoid Coal/Wood Heating; Use Layered Clothing & Electric Oil Heater',
      category: 'heating',
      summary:
        'Replace indoor wood/charcoal braziers (angithi) with thermal layering (₹0) or low-watt radiant/oil heaters to prevent lethal CO & PM2.5.',
      costTag: profile.heatingType === 'wood_coal_heater' ? '₹₹' : '₹0',
      estimatedCostInr: '₹0 (layering) or ₹3,500 (oil heater)',
      effort: 'Low',
      timeToBenefit: 'Tonight',
      feasibilityScore: 8.4,
      impactScore: profile.heatingType === 'wood_coal_heater' ? 9.9 : 6.8,
      costScore: 8.5,
      impact: calculateChoiceImpact({
        choiceId: 'alt-electric-heating',
        title: 'Smoke-Free Winter Heating',
        baselinePm25: pm25,
        exposureReductionFraction: profile.heatingType === 'wood_coal_heater' ? 0.65 : 0.14,
        weeklyCo2eAvoidedKg: profile.heatingType === 'wood_coal_heater' ? 14.2 : 1.1,
        weeklyPm25AvoidedGrams: profile.heatingType === 'wood_coal_heater' ? 58.0 : 2.5,
        communityHouseholdsN: communityN,
        confidence: 'High',
        formulas: [
          'Eliminating 3 kg/day biomass/coal heating avoids ~2 kg CO2e/day and >8 g PM2.5/day',
        ],
        assumptions: [
          'Thermal layering + sealing door drafts cuts heating demand by 30% at ₹0.',
        ],
        citation: 'WHO Household Energy Database & CPCB Winter Action Plan',
      }),
    },
  ];

  return candidates
    .map((item) => {
      const weightedCost = Math.min(10, item.costScore * budgetWeight);
      const rankScore = round1((item.impactScore * item.feasibilityScore * weightedCost) / 10);
      return { ...item, rankScore };
    })
    .sort((a, b) => b.rankScore - a.rankScore);
}

/**
 * Runs deterministic What-If Simulation for real-time slider interaction (<1 ms).
 */
export function simulateWhatIf(
  profile: UserProfile,
  sliders: WhatIfSliders,
  baselineAqi: number,
  baselinePm25: number
): WhatIfResult {
  const baselineCarTrips = Math.max(profile.carTripsPerWeek, 5);
  const tripsAvoided = Math.max(0, baselineCarTrips - sliders.carTripsPerWeek);
  const kmPerTrip = 11;
  const transitBonusKm = (sliders.publicTransitPct / 100) * 18;

  const commuteCo2e = (tripsAvoided * kmPerTrip + transitBonusKm) * (0.192 - 0.041);
  const commutePm25G = (tripsAvoided * kmPerTrip + transitBonusKm) * 0.065;

  const fuelDeltaMap: Record<CookingFuel, { co2: number; pm25: number; expFrac: number }> = {
    induction_electric: { co2: 2.2, pm25: 6.5, expFrac: 0.16 },
    png_piped: { co2: 1.4, pm25: 4.5, expFrac: 0.12 },
    lpg: { co2: 0.9, pm25: 3.2, expFrac: 0.08 },
    biomass_kerosene: { co2: 0, pm25: 0, expFrac: 0 },
  };
  const fuelEffect = fuelDeltaMap[sliders.cookingFuel];

  const filtrationExpFrac = sliders.useIndoorFiltration ? 0.34 : 0.12;
  const windowExpFrac = sliders.exerciseDuringBestWindow ? 0.14 : 0.02;
  const transitExpFrac = Math.min(0.14, (sliders.publicTransitPct / 100) * 0.14);
  const totalExposureReductionFrac = Math.min(
    0.78,
    filtrationExpFrac + windowExpFrac + transitExpFrac + fuelEffect.expFrac
  );

  const exposureReductionPct = Math.round(totalExposureReductionFrac * 100);
  const projectedIndoorAqi = Math.max(
    18,
    Math.round(baselineAqi * (1 - totalExposureReductionFrac * 0.72))
  );
  const co2eSavedKgPerWeek = round2(Math.max(0.2, commuteCo2e + fuelEffect.co2));
  const pm25AvoidedGramsPerWeek = round2(Math.max(0.4, commutePm25G + fuelEffect.pm25));
  const treesEquivalentMonthly = Math.max(1, Math.round((co2eSavedKgPerWeek * 4.33) / 1.8));

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayMultipliers = [1.04, 1.0, 0.96, 0.94, 0.98, 0.9, 0.86];
  const trend7d = days.map((day, idx) => {
    const cur = Math.round(baselineAqi * 0.78 * dayMultipliers[idx]);
    const opt = Math.max(15, Math.round(cur * (1 - totalExposureReductionFrac * 0.72)));
    return { day, currentExposure: cur, optimizedExposure: opt };
  });

  const impactDetail = calculateChoiceImpact({
    choiceId: 'what-if-bundle',
    title: 'Your Simulated Clean-Air Routine',
    baselinePm25,
    exposureReductionFraction: totalExposureReductionFrac,
    weeklyCo2eAvoidedKg: co2eSavedKgPerWeek,
    weeklyPm25AvoidedGrams: pm25AvoidedGramsPerWeek,
    communityHouseholdsN: sliders.communityHouseholdsN,
    confidence: 'Medium',
    formulas: [
      `Personal Exposure ↓ = Filtration(${Math.round(filtrationExpFrac * 100)}%) + Timing(${Math.round(windowExpFrac * 100)}%) + Transit(${Math.round(transitExpFrac * 100)}%) + Cooking(${Math.round(fuelEffect.expFrac * 100)}%)`,
      `Weekly CO2e Saved = (${tripsAvoided} trips × 11 km + ${round1(transitBonusKm)} transit km) × 0.151 kg/km + ${fuelEffect.co2} kg fuel`,
      `Community Effect = ${sliders.communityHouseholdsN} households × ${co2eSavedKgPerWeek} kg/wk × 4.33 wks`,
    ],
    assumptions: [
      `Baseline ambient AQI ${baselineAqi} (PM2.5 ${Math.round(baselinePm25)} µg/m³).`,
      'Exercise window shifted to highest daytime boundary-layer dispersion hour.',
      'All values are modeled estimates, not medical guarantees.',
    ],
    citation: 'CPCB NAQI, IPCC AR6, WHO 2021 AQG & UC Davis CR-Box Studies',
  });

  return {
    projectedIndoorAqi,
    exposureReductionPct,
    co2eSavedKgPerWeek,
    pm25AvoidedGramsPerWeek,
    communityHouseholdsEquivalent: sliders.communityHouseholdsN,
    treesEquivalentMonthly,
    trend7d,
    impactDetail,
  };
}

/**
 * Generates a deterministic, inversion-aware Daily Plan used both as instant baseline
 * and as grounded fallback when offline or rate-limited.
 */
export function buildDeterministicDailyPlan(
  profile: UserProfile,
  aqiData: AqiSnapshot,
  mode: 'daily' | 'weekly' = 'daily'
): DailyPlan {
  const severe = aqiData.aqi > 300;
  const poor = aqiData.aqi > 200;
  const memberTips = assessMemberRisks(aqiData.aqi, aqiData.pm25, profile.household);

  const items: DailyPlanItem[] = [
    {
      id: 'plan-morning-inversion',
      timeWindow: '7:00 AM – 9:30 AM',
      title: severe
        ? 'Keep Windows Sealed & Run Indoor Air Filtration'
        : 'Keep Windows Closed During Morning Smog Peak',
      detail: severe
        ? `Morning thermal inversion traps PM2.5 near ground (BLH ${aqiData.boundaryLayerM}m). Wear a well-fitted N95/FFP2 mask if stepping outside; place damp towels along door gaps (₹0).`
        : `Morning traffic plus shallow mixing layer (${aqiData.boundaryLayerM}m) raises roadside PM2.5. Keep windows shut and prefer indoor morning stretching.`,
      category: 'indoor',
      costTag: '₹0',
      aqiExpected: Math.min(500, Math.round(aqiData.aqi * 1.12)),
      inversionNote: `Boundary layer ~${aqiData.boundaryLayerM}m, wind ${aqiData.windKmh} km/h`,
      impactSummary: `Cuts morning indoor PM2.5 exposure by ~${severe ? 48 : 35}% (Estimate)`,
      impact: calculateChoiceImpact({
        choiceId: 'plan-morning-inversion',
        title: 'Morning Inversion Window Sealing',
        baselinePm25: aqiData.pm25,
        exposureReductionFraction: severe ? 0.48 : 0.35,
        weeklyCo2eAvoidedKg: 0.3,
        weeklyPm25AvoidedGrams: 0.9,
        communityHouseholdsN: 500,
        confidence: 'High',
        formulas: ['Closed-window infiltration ratio ~0.45 vs open-window ~0.82 during inversion'],
        assumptions: ['Windows kept closed 7:00–9:30 AM; door draft sealed with cloth.'],
        citation: 'CPCB & US EPA Indoor Particulate Infiltration Guidance',
      }),
    },
    {
      id: 'plan-commute',
      timeWindow: '9:30 AM – 5:00 PM',
      title:
        profile.commuteMode === 'private_car'
          ? 'Use Metro / Bus or Carpool for Work & School Run'
          : 'Choose Low-Traffic Side Streets & Wear N95 if AQI > 300',
      detail: severe
        ? 'Avoid idling vehicles and open-air auto rides if possible; wear a fitted N95 respirator when commuting and keep car AC on recirculation mode.'
        : 'Shift at least 1–2 trips to public transit or carpool to cut tailpipe PM2.5 and lower personal exposure along main corridors.',
      category: 'commute',
      costTag: '₹0',
      aqiExpected: Math.round(aqiData.aqi * 0.92),
      inversionNote: 'Midday solar heating gradually lifts trapped pollutants',
      impactSummary: 'Avoids ~1.8 kg CO2e & cuts commute PM2.5 by ~25% (Estimate)',
      impact: calculateChoiceImpact({
        choiceId: 'plan-commute',
        title: 'Low-Emission Commute & Recirculation',
        baselinePm25: aqiData.pm25,
        exposureReductionFraction: 0.25,
        weeklyCo2eAvoidedKg: 1.8,
        weeklyPm25AvoidedGrams: 1.6,
        communityHouseholdsN: 500,
        confidence: 'High',
        formulas: ['12 km transit vs car = 12 × 0.151 kg = 1.81 kg CO2e saved'],
        assumptions: ['AC on recirculate or enclosed metro/bus travel.'],
        citation: 'IPCC AR6 & WRI India Transport Emission Factors',
      }),
    },
    {
      id: 'plan-best-window',
      timeWindow: aqiData.bestWindow,
      title: severe
        ? 'Brief 10-Min Cross-Ventilation Only — Keep Exercise Indoors'
        : 'Safe Window for Outdoor Exercise & Fresh Air Exchange',
      detail: severe
        ? `Even at today's best window (${aqiData.bestWindow}), AQI remains ${aqiData.band}. Keep workouts indoors, run a HEPA or DIY Corsi-Rosenthal filter, and avoid outdoor play for children.`
        : `Solar warming raises the mixing height and wind (${aqiData.windKmh} km/h), dispersing PM2.5. Ideal window for a brisk walk, kids' outdoor play, and 20-minute cross-ventilation.`,
      category: 'exercise',
      costTag: '₹0',
      aqiExpected: Math.max(30, Math.round(aqiData.aqi * 0.78)),
      inversionNote: 'Peak daytime dispersion lowers ground-level PM2.5',
      impactSummary: severe
        ? 'Prevents ~55% spike in deep-lung PM2.5 intake (Estimate)'
        : 'Reduces workout PM2.5 dose by ~32% vs morning rush (Estimate)',
      impact: calculateChoiceImpact({
        choiceId: 'plan-best-window',
        title: 'Dispersion-Window Activity Timing',
        baselinePm25: aqiData.pm25,
        exposureReductionFraction: severe ? 0.55 : 0.32,
        weeklyCo2eAvoidedKg: 0.5,
        weeklyPm25AvoidedGrams: 0.6,
        communityHouseholdsN: 500,
        confidence: 'High',
        formulas: ['Inhaled dose = Concentration × Ventilation Rate (4× higher during jogging)'],
        assumptions: ['Shifting 30 min moderate activity from peak smog to cleanest window.'],
        citation: 'WHO Physical Activity & Air Pollution Trade-off Studies',
      }),
    },
    {
      id: 'plan-evening-cooking',
      timeWindow: '7:30 PM – 10:00 PM',
      title: 'Ventilate Kitchen During Cooking & Seal Home Before Night Inversion',
      detail: poor
        ? 'Use lids while cooking, run kitchen exhaust for 10 min after meals, skip incense/mosquito coils, and run bedroom filtration overnight.'
        : 'Use exhaust fan during high-heat tadka/frying, wet-mop dusty floors, and close street-facing windows as evening traffic rises.',
      category: 'cooking',
      costTag: '₹0',
      aqiExpected: Math.min(500, Math.round(aqiData.aqi * 1.08)),
      inversionNote: 'Cooling air after sunset rebuilds shallow inversion layer',
      impactSummary: 'Cuts indoor dinner PM2.5 spike by ~45% (Estimate)',
      impact: calculateChoiceImpact({
        choiceId: 'plan-evening-cooking',
        title: 'Low-Smoke Cooking & Night Seal',
        baselinePm25: aqiData.pm25,
        exposureReductionFraction: 0.45,
        weeklyCo2eAvoidedKg: 1.3,
        weeklyPm25AvoidedGrams: 4.2,
        communityHouseholdsN: 500,
        confidence: 'High',
        formulas: ['Exhaust + lid lowers cooking PM2.5 plume by 45–60%'],
        assumptions: ['Zero indoor incense/coil/biomass burning during evening inversion.'],
        citation: 'WHO Household Fuel Combustion Guidelines',
      }),
    },
  ];

  return {
    planId: `plan-${profile.scenarioKey}-${aqiData.band.toLowerCase().replace(/\s+/g, '-')}-${mode}`,
    date: new Date().toISOString().slice(0, 10),
    city: aqiData.city,
    aqiBand: aqiData.band,
    mode,
    modelUsed: mode === 'weekly' ? 'gemini-4-hydrogen (High Reasoning)' : 'deterministic-baseline',
    inversionExplanation: aqiData.inversionActive
      ? `Thermal inversion active in ${aqiData.city}: boundary layer height is low (${aqiData.boundaryLayerM}m) with ${aqiData.windKmh} km/h winds, trapping fine PM2.5 particles near breathing height until afternoon sunlight breaks the cap.`
      : `Boundary layer height (${aqiData.boundaryLayerM}m) and ${aqiData.windKmh} km/h winds allow moderate pollutant dispersion in ${aqiData.city}, with cleanest air around ${aqiData.bestWindow}.`,
    items,
    memberTips,
    medicalDisclaimer:
      'AirNest provides informational air-quality guidance and estimates, not medical diagnosis. If anyone experiences severe shortness of breath, chest pain, persistent wheezing, or bluish lips, seek emergency medical care immediately.',
  };
}

export function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

export function round2(val: number): number {
  return Math.round(val * 100) / 100;
}
