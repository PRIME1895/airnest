import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Flame,
  Home,
  ShieldCheck,
  Wind,
  Wrench,
  X,
} from 'lucide-react';
import { t } from '../../packages/shared/i18n/index';
import { calculateCadr, calculateChoiceImpact } from '../../packages/shared/impact/index';
import type { AqiSnapshot, CostTag, UserProfile } from '../../packages/shared/schemas';
import { ImpactCard } from './ImpactCard';

interface IndoorCoachViewProps {
  profile: UserProfile;
  aqiSnapshot: AqiSnapshot;
}

interface IndoorRecommendation {
  id: string;
  title: string;
  costTag: CostTag;
  detail: string;
  reductionPct: number;
  co2eKgWk: number;
  pm25GWk: number;
}

const CR_BOX_STEPS = [
  'Gather 4 identical MERV-13 (or H13 replacement) panel filters (e.g., 20"×20"×1") and 1 standard 20-inch box fan.',
  'Arrange the 4 filters into an open cube with ALL airflow arrows pointing INWARD toward the center.',
  'Tape the filter seams airtight using duct tape and seal the bottom of the cube with the cardboard fan box.',
  'Place the box fan on top blowing UPWARD (pulling air through all 4 filter sides) and tape the fan perimeter snugly.',
  'Run on low/medium in your main bedroom with doors closed — delivers ~450–550 m³/h CADR at zero ozone emission.',
];

const MYTH_BUSTERS = [
  {
    myth: 'Myth: Ozone-generating purifiers or ionizers clean winter smog safely.',
    fact: 'Unsafe — ozone irritates airways and worsens asthma. Use only mechanical HEPA or MERV-13 filtration.',
  },
  {
    myth: 'Myth: 3–4 indoor houseplants purify a smoggy bedroom.',
    fact: 'Research shows you would need ~100–1,000 plants per m² to match one HEPA/CR box. Keep plants for joy, not PM2.5 removal.',
  },
  {
    myth: 'Myth: Opening windows at 6 AM brings fresh winter air.',
    fact: 'Winter thermal inversion peaks at 6–10 AM, trapping smog near ground level. Ventilate briefly in the afternoon instead.',
  },
];

export const IndoorCoachView: React.FC<IndoorCoachViewProps> = ({ profile, aqiSnapshot }) => {
  const [costFilter, setCostFilter] = useState<'ALL' | CostTag>('ALL');
  const [roomArea, setRoomArea] = useState<number>(Math.min(60, Math.max(12, Math.round(profile.roomAreaM2 / 3))));
  const [ceilingHeight, setCeilingHeight] = useState<number>(3.0);
  const [showCrModal, setShowCrModal] = useState(false);

  const cadr = useMemo(
    () => calculateCadr(roomArea, ceilingHeight, aqiSnapshot.aqi > 250 ? 5.0 : 4.5),
    [roomArea, ceilingHeight, aqiSnapshot.aqi]
  );

  const indoorAqiEstimate = useMemo(() => {
    const ratio = profile.hasPurifier ? 0.28 : 0.52;
    return Math.max(15, Math.round(aqiSnapshot.aqi * ratio));
  }, [aqiSnapshot.aqi, profile.hasPurifier]);

  const indoorPm25Estimate = Math.max(6, Math.round(aqiSnapshot.pm25 * (profile.hasPurifier ? 0.26 : 0.48)));

  const recommendations: IndoorRecommendation[] = [
    {
      id: 'rec-seal-vent',
      title: `Close windows during ${aqiSnapshot.worstWindow} & cross-ventilate at ${aqiSnapshot.bestWindow}`,
      costTag: '₹0',
      detail: 'Use damp cloth draft stoppers under entry doors during inversion spikes. Zero cost, immediate drop.',
      reductionPct: 42,
      co2eKgWk: 0.3,
      pm25GWk: 0.9,
    },
    {
      id: 'rec-wet-mop',
      title: 'Wet-mop floors daily & skip indoor incense / mosquito coils',
      costTag: '₹0',
      detail: 'Dry brooming kicks settled PM2.5 back into breathing height; one mosquito coil equals dozens of cigarettes in PM2.5.',
      reductionPct: 24,
      co2eKgWk: 0.5,
      pm25GWk: 3.1,
    },
    {
      id: 'rec-cr-box',
      title: 'Build a DIY Corsi-Rosenthal Filter Box (MERV-13 / HEPA + box fan)',
      costTag: '₹',
      detail: 'Achieves 450+ m³/h CADR for ₹2,200–₹3,500 — ideal for bedrooms during Delhi/North India smog.',
      reductionPct: 62,
      co2eKgWk: 0.2,
      pm25GWk: 1.4,
    },
    {
      id: 'rec-kitchen-exhaust',
      title: 'Cook with pot lids + run exhaust fan 10 min after meals',
      costTag: '₹0',
      detail: 'High-heat tadka and frying spike indoor PM2.5 above 300 µg/m³ in minutes without exhaust.',
      reductionPct: 30,
      co2eKgWk: 1.1,
      pm25GWk: 4.2,
    },
    {
      id: 'rec-true-hepa',
      title: `Use a True HEPA (H13) purifier sized ≥ ${cadr.recommendedCadrM3h} m³/h CADR`,
      costTag: '₹₹₹',
      detail: 'Verify zero-ozone certification and check replacement filter cost before purchasing.',
      reductionPct: 68,
      co2eKgWk: 0.1,
      pm25GWk: 1.5,
    },
  ];

  const filteredRecs =
    costFilter === 'ALL'
      ? recommendations
      : recommendations.filter((r) => r.costTag === costFilter);

  const selectedImpact = useMemo(
    () =>
      calculateChoiceImpact({
        choiceId: 'indoor-coach-combined',
        title: 'Clean-Room Protocol + Filtration',
        baselinePm25: aqiSnapshot.pm25,
        exposureReductionFraction: profile.hasPurifier ? 0.65 : 0.48,
        weeklyCo2eAvoidedKg: 1.4,
        weeklyPm25AvoidedGrams: 5.1,
        communityHouseholdsN: 500,
        confidence: 'High',
        formulas: [
          cadr.formula,
          'Indoor PM2.5 ≈ Outdoor PM2.5 × Infiltration_Ratio (0.45 sealed, 0.18 with HEPA/CR box)',
        ],
        assumptions: [
          `Room area ${roomArea} m² × ${ceilingHeight} m height (${cadr.roomVolumeM3} m³).`,
          'Zero indoor incense, coils, or solid-fuel burning.',
        ],
        citation: 'US EPA Indoor Air & UC Davis Corsi-Rosenthal Lab Studies',
      }),
    [aqiSnapshot.pm25, cadr.formula, cadr.roomVolumeM3, ceilingHeight, profile.hasPurifier, roomArea]
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="airnest-sky-backdrop rounded-2xl border border-[#D8E8DF] dark:border-[#253F34] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#122620] dark:text-[#EDF7F2]">
            {t(profile.language, 'indoorCoachTitle')}
          </h1>
          <p className="text-sm text-[#49635A] dark:text-[#A6C2B6] mt-0.5">
            {t(profile.language, 'indoorCoachSubtitle')}
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] px-3.5 py-2 text-xs font-semibold">
          <Home className="w-4 h-4 text-[#2D8A56]" aria-hidden="true" />
          <span>
            Your Home: {profile.homeType.replace('_', ' ').toUpperCase()} · {profile.roomAreaM2} m²
          </span>
        </div>
      </section>

      {/* Top Row: Indoor AQI Estimate + Recommendations + CADR Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Indoor AQI Estimate Card */}
        <section className="lg:col-span-4 rounded-2xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] p-5 shadow-sm flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#122620] dark:text-[#EDF7F2]">
                Indoor Air Quality
              </h2>
              <span className="text-xs font-semibold text-[#49635A] dark:text-[#A6C2B6]">
                Estimate
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#EAF4EE] dark:bg-[#192E25] flex items-center justify-center text-[#1B4D3E] dark:text-[#4ADE80]">
                <ShieldCheck className="w-9 h-9" aria-hidden="true" />
              </div>
              <div>
                <div className="text-3xl font-bold font-mono-tabular text-[#122620] dark:text-[#EDF7F2]">
                  {indoorAqiEstimate}{' '}
                  <span className="text-sm font-semibold text-[#2D8A56] dark:text-[#4ADE80]">
                    {indoorAqiEstimate <= 100 ? 'Healthy' : 'Needs Filtration'}
                  </span>
                </div>
                <div className="text-xs font-mono-tabular text-[#49635A] dark:text-[#A6C2B6]">
                  Est. Indoor PM2.5: {indoorPm25Estimate} µg/m³ (vs {aqiSnapshot.pm25} outdoors)
                </div>
              </div>
            </div>

            <p className="text-xs text-[#49635A] dark:text-[#A6C2B6] leading-relaxed">
              Closing street-facing windows and sealing door gaps keeps 45–55% of outdoor winter
              smog out at ₹0. Adding a DIY Corsi-Rosenthal filter cuts indoor PM2.5 by another ~62%.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCrModal(true)}
            className="w-full min-h-[44px] px-4 rounded-xl bg-[#1B4D3E] hover:bg-[#143D30] text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors"
          >
            <Wrench className="w-4 h-4" aria-hidden="true" />
            {t(profile.language, 'diyGuideTitle')}
          </button>
        </section>

        {/* CADR-vs-Room-Volume Purifier Sizing Calculator */}
        <section
          aria-labelledby="cadr-heading"
          className="lg:col-span-4 rounded-2xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] p-5 shadow-sm space-y-4"
        >
          <h2 id="cadr-heading" className="text-base font-bold text-[#122620] dark:text-[#EDF7F2]">
            {t(profile.language, 'purifierCalculator')}
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1 text-xs font-semibold">
              <span>Room Size (m²)</span>
              <input
                type="number"
                min={6}
                max={250}
                value={roomArea}
                onChange={(e) => setRoomArea(Math.max(6, Math.min(250, Number(e.target.value) || 12)))}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#D8E8DF] dark:border-[#253F34] bg-[#F8FCF9] dark:bg-[#0F1D17] font-mono-tabular text-sm"
              />
            </label>
            <label className="block space-y-1 text-xs font-semibold">
              <span>Ceiling Height (m)</span>
              <input
                type="number"
                step={0.1}
                min={2.2}
                max={4.5}
                value={ceilingHeight}
                onChange={(e) =>
                  setCeilingHeight(Math.max(2.2, Math.min(4.5, Number(e.target.value) || 3)))
                }
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#D8E8DF] dark:border-[#253F34] bg-[#F8FCF9] dark:bg-[#0F1D17] font-mono-tabular text-sm"
              />
            </label>
          </div>

          <div className="rounded-xl bg-[#EAF4EE] dark:bg-[#192E25] p-3.5 space-y-1">
            <div className="text-xs text-[#49635A] dark:text-[#A6C2B6]">
              {t(profile.language, 'recommendedCadr')} ({cadr.targetAch} ACH · {cadr.roomVolumeM3} m³)
            </div>
            <div className="text-2xl font-bold font-mono-tabular text-[#1B4D3E] dark:text-[#4ADE80]">
              {cadr.recommendedCadrM3h} m³/h{' '}
              <span className="text-xs font-normal text-[#49635A] dark:text-[#A6C2B6]">
                ({cadr.recommendedCadrCfm} CFM)
              </span>
            </div>
            <div className="text-[11px] font-mono-tabular text-[#49635A] dark:text-[#A6C2B6]">
              {cadr.formula}
            </div>
          </div>

          <div className="text-xs text-[#49635A] dark:text-[#A6C2B6] space-y-1">
            <div>
              <strong>DIY CR Box:</strong> {cadr.diyEstimatedCostInr}{' '}
              {cadr.crBoxCoversRoom ? '(Covers this room!)' : '(Use 2 units for this large room)'}
            </div>
            <div>
              <strong>Commercial H13 HEPA:</strong> {cadr.commercialEstimatedCostInr}
            </div>
          </div>
        </section>

        {/* Top Recommendations with Cost Guide Filter (₹0 / ₹ / ₹₹ / ₹₹₹) */}
        <section
          aria-labelledby="indoor-recs-heading"
          className="lg:col-span-4 rounded-2xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] p-5 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <h2
              id="indoor-recs-heading"
              className="text-base font-bold text-[#122620] dark:text-[#EDF7F2]"
            >
              Top Recommendations
            </h2>
            <Wind className="w-4 h-4 text-[#2D8A56]" aria-hidden="true" />
          </div>

          {/* Cost Guide Filter */}
          <div role="group" aria-label="Filter recommendations by cost" className="flex flex-wrap gap-1.5">
            {(['ALL', '₹0', '₹', '₹₹', '₹₹₹'] as const).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setCostFilter(tag)}
                aria-pressed={costFilter === tag}
                className={`px-2.5 py-1 min-h-[34px] rounded-lg text-xs font-bold border transition-colors ${
                  costFilter === tag
                    ? 'bg-[#1B4D3E] text-white border-[#1B4D3E]'
                    : 'bg-[#F4FAF6] dark:bg-[#172A22] text-[#122620] dark:text-[#EDF7F2] border-[#D8E8DF] dark:border-[#253F34]'
                }`}
              >
                {tag === 'ALL' ? 'All Costs' : tag}
              </button>
            ))}
          </div>

          <ul className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {filteredRecs.map((rec) => (
              <li
                key={rec.id}
                className="rounded-xl bg-[#F4FAF6] dark:bg-[#172A22] border border-[#DCEBE2] dark:border-[#243B31] p-3 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#122620] dark:text-[#EDF7F2]">
                    {rec.title}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white dark:bg-[#13221C] text-[#1B4D3E] dark:text-[#4ADE80] text-[11px] font-bold shrink-0">
                    {rec.costTag}
                  </span>
                </div>
                <p className="text-[11px] text-[#49635A] dark:text-[#A6C2B6]">{rec.detail}</p>
                <div className="text-[11px] font-semibold text-[#1B4D3E] dark:text-[#4ADE80]">
                  Est. Exposure ↓{rec.reductionPct}%
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Impact Card + Cooking/Myth-Busting Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6">
          <ImpactCard impact={selectedImpact} language={profile.language} />
        </div>

        <section
          aria-labelledby="myth-busting-heading"
          className="lg:col-span-6 rounded-2xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] p-5 shadow-sm space-y-3"
        >
          <h2
            id="myth-busting-heading"
            className="text-base font-bold text-[#122620] dark:text-[#EDF7F2] flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4 text-[#2D8A56]" aria-hidden="true" />
            Indoor Air Myth-Busting & Kitchen Safety
          </h2>

          <div className="space-y-2.5">
            {MYTH_BUSTERS.map((item, i) => (
              <div
                key={i}
                className="rounded-xl bg-[#F4FAF6] dark:bg-[#172A22] border border-[#DCEBE2] dark:border-[#243B31] p-3 space-y-1 text-xs"
              >
                <div className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{item.myth}</span>
                </div>
                <div className="text-[#122620] dark:text-[#EDF7F2] flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2D8A56] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{item.fact}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-[#EAF4EE] dark:bg-[#192E25] p-3 text-xs flex items-start gap-2">
            <Flame className="w-4 h-4 text-[#1B4D3E] dark:text-[#4ADE80] shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              <strong>Cooking Habit (₹0):</strong> Always cover boiling/frying pans and run the
              kitchen exhaust for 10 minutes post-cooking. Avoid indoor wood/charcoal braziers.
            </span>
          </div>
        </section>
      </div>

      {/* 5-Step DIY Corsi-Rosenthal Modal */}
      {showCrModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cr-modal-title"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="max-w-lg w-full rounded-2xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 id="cr-modal-title" className="text-lg font-bold text-[#122620] dark:text-[#EDF7F2]">
                {t(profile.language, 'diyGuideTitle')}
              </h2>
              <button
                type="button"
                onClick={() => setShowCrModal(false)}
                aria-label="Close DIY filter guide"
                className="min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center hover:bg-[#EAF4EE] dark:hover:bg-[#192E25]"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <ol className="space-y-2.5 text-sm text-[#122620] dark:text-[#EDF7F2]">
              {CR_BOX_STEPS.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#1B4D3E] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <div className="rounded-xl bg-[#EAF4EE] dark:bg-[#192E25] p-3 text-xs text-[#122620] dark:text-[#EDF7F2]">
              <strong>Estimated Impact:</strong> Cuts bedroom PM2.5 by ~62% in 45 minutes · Total
              cost ₹2,200–₹3,500 · Zero ozone emission.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
