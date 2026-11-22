import { z } from 'zod';

export const LanguageSchema = z.enum(['en', 'hi', 'ta']);
export type Language = z.infer<typeof LanguageSchema>;

export const BudgetTierSchema = z.enum(['low', 'moderate', 'flexible']);
export type BudgetTier = z.infer<typeof BudgetTierSchema>;

export const CostTagSchema = z.enum(['₹0', '₹', '₹₹', '₹₹₹']);
export type CostTag = z.infer<typeof CostTagSchema>;

export const CommuteModeSchema = z.enum([
  'walk_cycle',
  'public_transit',
  'two_wheeler',
  'carpool',
  'private_car',
  'work_from_home',
]);
export type CommuteMode = z.infer<typeof CommuteModeSchema>;

export const CookingFuelSchema = z.enum([
  'induction_electric',
  'lpg',
  'png_piped',
  'biomass_kerosene',
]);
export type CookingFuel = z.infer<typeof CookingFuelSchema>;

export const HeatingTypeSchema = z.enum(['none', 'electric', 'lpg_gas', 'wood_coal_heater']);
export type HeatingType = z.infer<typeof HeatingTypeSchema>;

export const HomeTypeSchema = z.enum([
  'apartment_1bhk',
  'apartment_2bhk',
  'apartment_3bhk',
  'independent_house',
  'shared_room',
]);
export type HomeType = z.infer<typeof HomeTypeSchema>;

export const HealthConditionSchema = z.enum(['none', 'asthma', 'heart_condition', 'pregnancy']);
export type HealthCondition = z.infer<typeof HealthConditionSchema>;

export const MemberRoleSchema = z.enum(['adult', 'child', 'elder']);
export type MemberRole = z.infer<typeof MemberRoleSchema>;

export const HouseholdMemberSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(40),
  role: MemberRoleSchema,
  conditions: z.array(HealthConditionSchema).max(4),
});
export type HouseholdMember = z.infer<typeof HouseholdMemberSchema>;

export const UserProfileSchema = z.object({
  id: z.string().min(1).max(64),
  displayName: z.string().min(1).max(60),
  city: z.string().min(1).max(80),
  region: z.string().min(1).max(80),
  /** Approximate grid-snapped latitude (rounded to 2 decimals ~1.1km for privacy) */
  approxLat: z.number().min(-90).max(90),
  /** Approximate grid-snapped longitude (rounded to 2 decimals ~1.1km for privacy) */
  approxLng: z.number().min(-180).max(180),
  language: LanguageSchema,
  household: z.array(HouseholdMemberSchema).min(1).max(10),
  homeType: HomeTypeSchema,
  roomAreaM2: z.number().min(8).max(300),
  commuteMode: CommuteModeSchema,
  carTripsPerWeek: z.number().min(0).max(30),
  publicTransitPct: z.number().min(0).max(100),
  cookingFuel: CookingFuelSchema,
  heatingType: HeatingTypeSchema,
  hasPurifier: z.boolean(),
  budget: BudgetTierSchema,
  eli10Mode: z.boolean().default(false),
  elderMode: z.boolean().default(false),
  alertsOptIn: z.boolean().default(false),
  scenarioKey: z.enum(['coimbatore', 'delhi', 'custom']).default('coimbatore'),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const AqiBandSchema = z.enum([
  'Good',
  'Satisfactory',
  'Moderate',
  'Poor',
  'Very Poor',
  'Severe',
]);
export type AqiBand = z.infer<typeof AqiBandSchema>;

export const ForecastHourSchema = z.object({
  isoTime: z.string(),
  hourLabel: z.string(),
  aqi: z.number().min(0).max(600),
  pm25: z.number().min(0).max(1000),
  pm10: z.number().min(0).max(1500),
  windKmh: z.number().min(0).max(150),
  boundaryLayerM: z.number().min(50).max(5000),
  inversionRisk: z.enum(['low', 'moderate', 'high']),
});
export type ForecastHour = z.infer<typeof ForecastHourSchema>;

export const AqiSnapshotSchema = z.object({
  city: z.string(),
  region: z.string(),
  approxLat: z.number(),
  approxLng: z.number(),
  updatedAt: z.string(),
  source: z.string(),
  temperatureC: z.number(),
  condition: z.string(),
  aqi: z.number().min(0).max(600),
  band: AqiBandSchema,
  dominantPollutant: z.enum(['PM2.5', 'PM10', 'NO2', 'O3']),
  pm25: z.number().min(0),
  pm10: z.number().min(0),
  no2: z.number().min(0),
  o3: z.number().min(0),
  windKmh: z.number().min(0),
  boundaryLayerM: z.number().min(50),
  inversionActive: z.boolean(),
  bestWindow: z.string(),
  worstWindow: z.string(),
  forecast48h: z.array(ForecastHourSchema).min(6).max(48),
});
export type AqiSnapshot = z.infer<typeof AqiSnapshotSchema>;

export const ConfidenceLevelSchema = z.enum(['High', 'Medium', 'Low']);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;

export const ImpactLayerResultSchema = z.object({
  choiceId: z.string(),
  title: z.string(),
  personalExposureDeltaPct: z.number(),
  personalPm25AvoidedUgPerDay: z.number(),
  householdCo2eKgPerWeek: z.number(),
  householdPm25GramsPerWeek: z.number(),
  communityHouseholdsN: z.number().int().min(1),
  communityCo2eTonnesPerMonth: z.number(),
  communityPm25KgPerMonth: z.number(),
  communityAmbientReductionPct: z.number(),
  formulas: z.array(z.string()).min(1),
  assumptions: z.array(z.string()).min(1),
  confidence: ConfidenceLevelSchema,
  isEstimate: z.literal(true),
  citation: z.string(),
});
export type ImpactLayerResult = z.infer<typeof ImpactLayerResultSchema>;

export const MemberRiskAssessmentSchema = z.object({
  memberId: z.string(),
  label: z.string(),
  role: MemberRoleSchema,
  riskLevel: z.enum(['Low', 'Moderate', 'Elevated', 'High', 'Critical']),
  guidance: z.string(),
  maskRequired: z.boolean(),
});
export type MemberRiskAssessment = z.infer<typeof MemberRiskAssessmentSchema>;

export const DailyPlanItemSchema = z.object({
  id: z.string(),
  timeWindow: z.string(),
  title: z.string(),
  detail: z.string(),
  category: z.enum(['indoor', 'commute', 'exercise', 'ventilation', 'cooking', 'health']),
  costTag: CostTagSchema,
  aqiExpected: z.number(),
  inversionNote: z.string(),
  impactSummary: z.string(),
  impact: ImpactLayerResultSchema,
});
export type DailyPlanItem = z.infer<typeof DailyPlanItemSchema>;

export const DailyPlanSchema = z.object({
  planId: z.string(),
  date: z.string(),
  city: z.string(),
  aqiBand: AqiBandSchema,
  mode: z.enum(['daily', 'weekly']),
  modelUsed: z.string(),
  inversionExplanation: z.string(),
  items: z.array(DailyPlanItemSchema).min(3).max(8),
  memberTips: z.array(MemberRiskAssessmentSchema),
  medicalDisclaimer: z.string(),
});
export type DailyPlan = z.infer<typeof DailyPlanSchema>;

export const AlternativeOptionSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.enum(['commute', 'indoor', 'cooking', 'heating', 'community']),
  summary: z.string(),
  costTag: CostTagSchema,
  estimatedCostInr: z.string(),
  effort: z.enum(['Low', 'Medium', 'High']),
  timeToBenefit: z.string(),
  feasibilityScore: z.number().min(1).max(10),
  impactScore: z.number().min(1).max(10),
  costScore: z.number().min(1).max(10),
  rankScore: z.number(),
  impact: ImpactLayerResultSchema,
});
export type AlternativeOption = z.infer<typeof AlternativeOptionSchema>;

export const WhatIfSlidersSchema = z.object({
  carTripsPerWeek: z.number().min(0).max(20),
  publicTransitPct: z.number().min(0).max(100),
  outdoorExerciseMinutes: z.number().min(0).max(120),
  exerciseDuringBestWindow: z.boolean(),
  cookingFuel: CookingFuelSchema,
  useIndoorFiltration: z.boolean(),
  communityHouseholdsN: z.number().int().min(10).max(10000),
});
export type WhatIfSliders = z.infer<typeof WhatIfSlidersSchema>;

export const WhatIfResultSchema = z.object({
  projectedIndoorAqi: z.number(),
  exposureReductionPct: z.number(),
  co2eSavedKgPerWeek: z.number(),
  pm25AvoidedGramsPerWeek: z.number(),
  communityHouseholdsEquivalent: z.number(),
  treesEquivalentMonthly: z.number(),
  trend7d: z.array(
    z.object({
      day: z.string(),
      currentExposure: z.number(),
      optimizedExposure: z.number(),
    })
  ),
  impactDetail: ImpactLayerResultSchema,
});
export type WhatIfResult = z.infer<typeof WhatIfResultSchema>;

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatRequestSchema = z.object({
  message: z.string().min(1).max(1200),
  history: z.array(ChatMessageSchema).max(12).default([]),
  profile: UserProfileSchema,
  currentAqi: AqiSnapshotSchema.optional(),
  useSearchGrounding: z.boolean().default(false),
  useMapsGrounding: z.boolean().default(false),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const CitationSchema = z.object({
  title: z.string(),
  uri: z.string(),
  sourceType: z.enum(['knowledge', 'web', 'maps', 'tool']),
});
export type Citation = z.infer<typeof CitationSchema>;

export const CommunityAggregateSchema = z.object({
  city: z.string(),
  goalText: z.string(),
  goalProgressPct: z.number().min(0).max(100),
  participants: z.number().int().min(0),
  co2eAvoidedTonnes: z.number().min(0),
  cleanerAirHoursMillions: z.number().min(0),
  neighborhoodGroups: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      co2eTonnes: z.number(),
      households: z.number().int(),
    })
  ),
});
export type CommunityAggregate = z.infer<typeof CommunityAggregateSchema>;
