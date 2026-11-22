import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import {
  assessMemberRisks,
  buildDeterministicDailyPlan,
  calculateCadr,
  calculateChoiceImpact,
  classifyAqi,
  rankAlternatives,
  simulateWhatIf,
} from './index';
import { DEMO_SCENARIOS } from '../demoScenarios';
import { AqiSnapshotSchema, DailyPlanSchema, UserProfileSchema } from '../schemas';

test('classifyAqi maps CPCB NAQI bands and N95 thresholds accurately', () => {
  assert.equal(classifyAqi(35).band, 'Good');
  assert.equal(classifyAqi(35).n95Recommended, false);
  assert.equal(classifyAqi(85).band, 'Moderate');
  assert.equal(classifyAqi(240).band, 'Poor');
  assert.equal(classifyAqi(340).band, 'Very Poor');
  assert.equal(classifyAqi(340).n95Recommended, true);
  assert.equal(classifyAqi(420).band, 'Severe');
  assert.equal(classifyAqi(420).n95Recommended, true);
});

test('assessMemberRisks escalates risk for asthmatic children and elders under severe smog', () => {
  const delhi = DEMO_SCENARIOS.delhi;
  const risks = assessMemberRisks(delhi.aqiSnapshot.aqi, delhi.aqiSnapshot.pm25, delhi.profile.household);
  assert.equal(risks.length, 3);
  const childRisk = risks.find((r) => r.role === 'child');
  assert.ok(childRisk);
  assert.equal(childRisk.riskLevel, 'Critical');
  assert.equal(childRisk.maskRequired, true);
  assert.match(childRisk.guidance, /N95|inhaler/i);
});

test('calculateCadr enforces CADR = Area * Height * ACH formula', () => {
  const res = calculateCadr(20, 3.0, 5.0);
  assert.equal(res.roomVolumeM3, 60);
  assert.equal(res.recommendedCadrM3h, 300);
  assert.equal(res.crBoxCoversRoom, true);
  assert.match(res.formula, /300 m³\/h/);
});

test('calculateChoiceImpact computes 3-layer impact with estimates, formulas, and community scaling', () => {
  const result = calculateChoiceImpact({
    choiceId: 'transit',
    title: 'Switch to Metro',
    baselinePm25: 120,
    exposureReductionFraction: 0.25,
    weeklyCo2eAvoidedKg: 2.0,
    weeklyPm25AvoidedGrams: 1.5,
    communityHouseholdsN: 500,
    confidence: 'High',
    formulas: ['2.0 kg/wk * 4.33 * 500'],
    assumptions: ['Metro replaces petrol car'],
    citation: 'IPCC AR6',
  });
  assert.equal(result.isEstimate, true);
  assert.equal(result.personalExposureDeltaPct, 25);
  assert.equal(result.personalPm25AvoidedUgPerDay, 30);
  assert.equal(result.communityHouseholdsN, 500);
  assert.ok(result.communityCo2eTonnesPerMonth > 4.0);
  assert.ok(result.formulas.length >= 1);
});

test('rankAlternatives always includes zero-cost (₹0) options for low-budget households', () => {
  const delhi = DEMO_SCENARIOS.delhi;
  const ranked = rankAlternatives(delhi.profile, delhi.aqiSnapshot.aqi, delhi.aqiSnapshot.pm25);
  assert.ok(ranked.length >= 5);
  const freeOptions = ranked.filter((item) => item.costTag === '₹0');
  assert.ok(freeOptions.length >= 3, 'Must provide multiple ₹0 options');
  // Verify descending sort by rankScore
  for (let i = 1; i < ranked.length; i++) {
    assert.ok(ranked[i - 1].rankScore >= ranked[i].rankScore);
  }
});

test('simulateWhatIf reduces projected indoor AQI and increases CO2e saved when shifting away from car', () => {
  const coimbatore = DEMO_SCENARIOS.coimbatore;
  const baseline = simulateWhatIf(
    coimbatore.profile,
    {
      carTripsPerWeek: 5,
      publicTransitPct: 10,
      outdoorExerciseMinutes: 30,
      exerciseDuringBestWindow: false,
      cookingFuel: 'lpg',
      useIndoorFiltration: false,
      communityHouseholdsN: 500,
    },
    85,
    28
  );
  const improved = simulateWhatIf(
    coimbatore.profile,
    {
      carTripsPerWeek: 1,
      publicTransitPct: 70,
      outdoorExerciseMinutes: 30,
      exerciseDuringBestWindow: true,
      cookingFuel: 'induction_electric',
      useIndoorFiltration: true,
      communityHouseholdsN: 800,
    },
    85,
    28
  );
  assert.ok(improved.projectedIndoorAqi < baseline.projectedIndoorAqi);
  assert.ok(improved.co2eSavedKgPerWeek > baseline.co2eSavedKgPerWeek);
  assert.equal(improved.trend7d.length, 7);
});

test('Demo scenarios and deterministic daily plan pass strict Zod schema validation', () => {
  for (const key of ['coimbatore', 'delhi'] as const) {
    const scenario = DEMO_SCENARIOS[key];
    assert.doesNotThrow(() => UserProfileSchema.parse(scenario.profile));
    assert.doesNotThrow(() => AqiSnapshotSchema.parse(scenario.aqiSnapshot));
    const plan = buildDeterministicDailyPlan(scenario.profile, scenario.aqiSnapshot, 'daily');
    assert.doesNotThrow(() => DailyPlanSchema.parse(plan));
    assert.ok(plan.items.some((i) => i.costTag === '₹0'));
  }
});

test('Efficiency micro-benchmark: AQI banding + Impact Engine runs in under 5 ms', () => {
  const coimbatore = DEMO_SCENARIOS.coimbatore;
  const iterations = 100;
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    classifyAqi(85 + (i % 350));
    calculateCadr(24, 3, 5);
    rankAlternatives(coimbatore.profile, 220, 95);
    simulateWhatIf(
      coimbatore.profile,
      {
        carTripsPerWeek: 2,
        publicTransitPct: 60,
        outdoorExerciseMinutes: 30,
        exerciseDuringBestWindow: true,
        cookingFuel: 'lpg',
        useIndoorFiltration: true,
        communityHouseholdsN: 500,
      },
      220,
      95
    );
  }
  const avgMs = (performance.now() - start) / iterations;
  assert.ok(avgMs < 5, `Expected average impact engine cycle < 5ms, got ${avgMs.toFixed(3)}ms`);
});
