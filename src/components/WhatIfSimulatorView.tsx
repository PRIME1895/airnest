import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Car,
  Flame,
  Footprints,
  Leaf,
  RotateCcw,
  ShieldCheck,
  Table as TableIcon,
  TrainFront,
  Users,
  Wind,
} from 'lucide-react';
import { t } from '../../packages/shared/i18n/index';
import { simulateWhatIf } from '../../packages/shared/impact/index';
import type { AqiSnapshot, CookingFuel, UserProfile, WhatIfSliders } from '../../packages/shared/schemas';
import { ImpactCard } from './ImpactCard';

interface WhatIfSimulatorViewProps {
  profile: UserProfile;
  aqiSnapshot: AqiSnapshot;
}

export const WhatIfSimulatorView: React.FC<WhatIfSimulatorViewProps> = ({
  profile,
  aqiSnapshot,
}) => {
  const defaultSliders: WhatIfSliders = {
    carTripsPerWeek: Math.max(0, profile.carTripsPerWeek - 2),
    publicTransitPct: Math.min(100, Math.max(40, profile.publicTransitPct + 20)),
    outdoorExerciseMinutes: 30,
    exerciseDuringBestWindow: true,
    cookingFuel: profile.cookingFuel,
    useIndoorFiltration: true,
    communityHouseholdsN: 800,
  };

  const [sliders, setSliders] = useState<WhatIfSliders>(defaultSliders);
  const [chartMode, setChartMode] = useState<'chart' | 'table'>('chart');
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(0);

  const result = useMemo(
    () => simulateWhatIf(profile, sliders, aqiSnapshot.aqi, aqiSnapshot.pm25),
    [profile, sliders, aqiSnapshot.aqi, aqiSnapshot.pm25]
  );

  // Instant-rendering accessible SVG chart coordinates
  const svgW = 420;
  const svgH = 224;
  const padL = 36;
  const padR = 16;
  const padT = 18;
  const padB = 30;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;
  const maxVal = Math.max(
    100,
    Math.ceil(Math.max(...result.trend7d.map((d) => d.currentExposure)) / 50) * 50
  );
  const getX = (i: number) =>
    padL + (result.trend7d.length > 1 ? (i / (result.trend7d.length - 1)) * plotW : plotW / 2);
  const getY = (v: number) => padT + plotH - (Math.min(maxVal, v) / maxVal) * plotH;

  const currentLine = result.trend7d
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d.currentExposure).toFixed(1)}`)
    .join(' ');
  const optimizedLine = result.trend7d
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d.optimizedExposure).toFixed(1)}`)
    .join(' ');
  const reductionBand =
    result.trend7d.length > 1
      ? `${currentLine} ${[...result.trend7d]
          .reverse()
          .map((d, idx) => {
            const origIdx = result.trend7d.length - 1 - idx;
            return `L ${getX(origIdx).toFixed(1)} ${getY(d.optimizedExposure).toFixed(1)}`;
          })
          .join(' ')} Z`
      : '';

  const activeDay = result.trend7d[selectedDayIdx] ?? result.trend7d[0];

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="airnest-sky-backdrop rounded-2xl border border-[#D8E8DF] dark:border-[#253F34] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#122620] dark:text-[#EDF7F2]">
            {t(profile.language, 'whatIfTitle')}
          </h1>
          <p className="text-sm text-[#49635A] dark:text-[#A6C2B6] mt-0.5">
            {t(profile.language, 'whatIfSubtitle')} (Instant recalculation · Modeled Estimates)
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSliders(defaultSliders)}
          className="min-h-[40px] px-3.5 rounded-xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] text-xs font-semibold inline-flex items-center gap-1.5 hover:border-[#1B4D3E]"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          Reset Sliders
        </button>
      </section>

      {/* Main 3-Column Layout matching AirNest What-If Simulator reference */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Adjust Your Choices (Sliders) */}
        <section
          aria-labelledby="adjust-choices-heading"
          className="lg:col-span-4 rounded-2xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] p-5 shadow-sm space-y-4"
        >
          <h2 id="adjust-choices-heading" className="text-base font-bold text-[#122620] dark:text-[#EDF7F2]">
            Adjust Your Choices
          </h2>

          <label className="block space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5">
                <Car className="w-4 h-4 text-[#2D8A56]" aria-hidden="true" />
                Car Trips per Week
              </span>
              <span className="font-mono-tabular font-bold text-[#1B4D3E] dark:text-[#4ADE80]">
                {sliders.carTripsPerWeek}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={15}
              value={sliders.carTripsPerWeek}
              onChange={(e) =>
                setSliders((s) => ({ ...s, carTripsPerWeek: Number(e.target.value) }))
              }
              className="w-full accent-[#1B4D3E] min-h-[32px]"
            />
          </label>

          <label className="block space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5">
                <TrainFront className="w-4 h-4 text-[#2D8A56]" aria-hidden="true" />
                Public Transport / Carpool
              </span>
              <span className="font-mono-tabular font-bold text-[#1B4D3E] dark:text-[#4ADE80]">
                {sliders.publicTransitPct}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={sliders.publicTransitPct}
              onChange={(e) =>
                setSliders((s) => ({ ...s, publicTransitPct: Number(e.target.value) }))
              }
              className="w-full accent-[#1B4D3E] min-h-[32px]"
            />
          </label>

          <label className="block space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5">
                <Footprints className="w-4 h-4 text-[#2D8A56]" aria-hidden="true" />
                Outdoor Exercise (min/day)
              </span>
              <span className="font-mono-tabular font-bold text-[#1B4D3E] dark:text-[#4ADE80]">
                {sliders.outdoorExerciseMinutes} min
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={90}
              step={10}
              value={sliders.outdoorExerciseMinutes}
              onChange={(e) =>
                setSliders((s) => ({ ...s, outdoorExerciseMinutes: Number(e.target.value) }))
              }
              className="w-full accent-[#1B4D3E] min-h-[32px]"
            />
          </label>

          <label className="block space-y-1 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-[#2D8A56]" aria-hidden="true" />
              Cooking Fuel
            </span>
            <select
              value={sliders.cookingFuel}
              onChange={(e) =>
                setSliders((s) => ({ ...s, cookingFuel: e.target.value as CookingFuel }))
              }
              className="w-full min-h-[42px] px-3 rounded-xl border border-[#D8E8DF] dark:border-[#253F34] bg-[#F8FCF9] dark:bg-[#0F1D17] text-sm"
            >
              <option value="induction_electric">Induction / Electric</option>
              <option value="png_piped">Piped Natural Gas (PNG)</option>
              <option value="lpg">LPG Cylinder</option>
              <option value="biomass_kerosene">Biomass / Kerosene</option>
            </select>
          </label>

          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer min-h-[36px]">
              <input
                type="checkbox"
                checked={sliders.exerciseDuringBestWindow}
                onChange={(e) =>
                  setSliders((s) => ({ ...s, exerciseDuringBestWindow: e.target.checked }))
                }
                className="w-4 h-4 accent-[#1B4D3E]"
              />
              <span>Exercise only in cleanest window (₹0)</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer min-h-[36px]">
              <input
                type="checkbox"
                checked={sliders.useIndoorFiltration}
                onChange={(e) =>
                  setSliders((s) => ({ ...s, useIndoorFiltration: e.target.checked }))
                }
                className="w-4 h-4 accent-[#1B4D3E]"
              />
              <span>Use DIY CR Box / HEPA + window sealing</span>
            </label>
          </div>

          <label className="block space-y-1.5 pt-1 border-t border-[#E4EFE9] dark:border-[#21382E]">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#2D8A56]" aria-hidden="true" />
                If N Households Adopt
              </span>
              <span className="font-mono-tabular font-bold text-[#1B4D3E] dark:text-[#4ADE80]">
                {sliders.communityHouseholdsN.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min={100}
              max={5000}
              step={100}
              value={sliders.communityHouseholdsN}
              onChange={(e) =>
                setSliders((s) => ({ ...s, communityHouseholdsN: Number(e.target.value) }))
              }
              className="w-full accent-[#1B4D3E] min-h-[32px]"
            />
          </label>
        </section>

        {/* Live Impact Summary Column */}
        <section
          aria-labelledby="sim-impact-heading"
          aria-live="polite"
          className="lg:col-span-3 rounded-2xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] p-5 shadow-sm flex flex-col justify-between gap-3"
        >
          <h2 id="sim-impact-heading" className="text-base font-bold text-[#122620] dark:text-[#EDF7F2]">
            Your Simulated Impact
          </h2>

          <div className="space-y-2.5 flex-1">
            <div className="rounded-xl bg-[#EAF4EE] dark:bg-[#192E25] p-3.5 flex items-center gap-3">
              <Wind className="w-6 h-6 text-[#1B4D3E] dark:text-[#4ADE80] shrink-0" aria-hidden="true" />
              <div>
                <div className="text-xs text-[#49635A] dark:text-[#A6C2B6]">Projected Indoor AQI</div>
                <div className="text-2xl font-bold font-mono-tabular text-[#122620] dark:text-[#EDF7F2]">
                  {result.projectedIndoorAqi}
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-[#F4FAF6] dark:bg-[#172A22] border border-[#DCEBE2] dark:border-[#243B31] p-3.5 flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-[#2D8A56] dark:text-[#4ADE80] shrink-0" aria-hidden="true" />
              <div>
                <div className="text-xs text-[#49635A] dark:text-[#A6C2B6]">Personal Exposure</div>
                <div className="text-xl font-bold font-mono-tabular text-[#1B4D3E] dark:text-[#4ADE80]">
                  ↓ {result.exposureReductionPct}%
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-[#F4FAF6] dark:bg-[#172A22] border border-[#DCEBE2] dark:border-[#243B31] p-3.5 flex items-center gap-3">
              <Leaf className="w-6 h-6 text-[#2D8A56] dark:text-[#4ADE80] shrink-0" aria-hidden="true" />
              <div>
                <div className="text-xs text-[#49635A] dark:text-[#A6C2B6]">CO2e & PM2.5 Saved</div>
                <div className="text-lg font-bold font-mono-tabular text-[#122620] dark:text-[#EDF7F2]">
                  {result.co2eSavedKgPerWeek} kg/wk
                </div>
                <div className="text-[11px] font-mono-tabular text-[#49635A] dark:text-[#A6C2B6]">
                  {result.pm25AvoidedGramsPerWeek} g PM2.5/wk · ~{result.treesEquivalentMonthly} trees/mo
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-[#F4FAF6] dark:bg-[#172A22] border border-[#DCEBE2] dark:border-[#243B31] p-3.5 flex items-center gap-3">
              <Users className="w-6 h-6 text-[#2D8A56] dark:text-[#4ADE80] shrink-0" aria-hidden="true" />
              <div>
                <div className="text-xs text-[#49635A] dark:text-[#A6C2B6]">Community Scale</div>
                <div className="text-base font-bold font-mono-tabular text-[#122620] dark:text-[#EDF7F2]">
                  {result.impactDetail.communityCo2eTonnesPerMonth} t CO2e/mo
                </div>
                <div className="text-[11px] text-[#49635A] dark:text-[#A6C2B6]">
                  Across {result.communityHouseholdsEquivalent.toLocaleString()} households
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Current vs Optimized Exposure Trend SVG Chart + Accessible Data Table */}
        <section
          aria-labelledby="exposure-trend-heading"
          className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] p-5 shadow-sm flex flex-col justify-between gap-4"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2
                id="exposure-trend-heading"
                className="text-base font-bold text-[#122620] dark:text-[#EDF7F2]"
              >
                7-Day Exposure Trend
              </h2>
              <p className="text-xs text-[#49635A] dark:text-[#A6C2B6]">
                Current routine vs. Optimized clean-air routine
              </p>
            </div>
            <div className="inline-flex items-center p-1 rounded-lg bg-[#EAF4EE] dark:bg-[#192E25]">
              <button
                type="button"
                onClick={() => setChartMode('chart')}
                aria-pressed={chartMode === 'chart'}
                className={`px-2 py-1 min-h-[34px] rounded-md text-xs font-semibold inline-flex items-center gap-1 ${
                  chartMode === 'chart'
                    ? 'bg-white dark:bg-[#13221C] text-[#122620] dark:text-[#EDF7F2]'
                    : 'text-[#49635A] dark:text-[#A6C2B6]'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
                Chart
              </button>
              <button
                type="button"
                onClick={() => setChartMode('table')}
                aria-pressed={chartMode === 'table'}
                className={`px-2 py-1 min-h-[34px] rounded-md text-xs font-semibold inline-flex items-center gap-1 ${
                  chartMode === 'table'
                    ? 'bg-white dark:bg-[#13221C] text-[#122620] dark:text-[#EDF7F2]'
                    : 'text-[#49635A] dark:text-[#A6C2B6]'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" aria-hidden="true" />
                Table
              </button>
            </div>
          </div>

          {chartMode === 'chart' ? (
            <div className="space-y-3">
              <svg
                viewBox={`0 0 ${svgW} ${svgH}`}
                role="img"
                aria-label={`7-day exposure comparison chart showing ${result.exposureReductionPct}% reduction in personal exposure.`}
                className="w-full h-56 overflow-visible"
              >
                {[0, 0.33, 0.66, 1].map((frac) => {
                  const y = padT + plotH * (1 - frac);
                  return (
                    <g key={frac}>
                      <line
                        x1={padL}
                        x2={svgW - padR}
                        y1={y}
                        y2={y}
                        stroke="#CBE4D5"
                        strokeDasharray="3 3"
                        opacity={0.55}
                      />
                      <text
                        x={padL - 6}
                        y={y + 3.5}
                        textAnchor="end"
                        fontSize="10"
                        fill="currentColor"
                        className="text-[#49635A] dark:text-[#A6C2B6]"
                      >
                        {Math.round(maxVal * frac)}
                      </text>
                    </g>
                  );
                })}

                {reductionBand && <path d={reductionBand} fill="#2D8A56" opacity="0.12" />}
                <path
                  d={currentLine}
                  fill="none"
                  stroke="#64748B"
                  strokeWidth="2.2"
                  strokeDasharray="5 4"
                  strokeLinejoin="round"
                />
                <path
                  d={optimizedLine}
                  fill="none"
                  stroke="#2D8A56"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />

                {result.trend7d.map((row, idx) => {
                  const cx = getX(idx);
                  const isSel = idx === selectedDayIdx;
                  return (
                    <g
                      key={row.day}
                      onMouseEnter={() => setSelectedDayIdx(idx)}
                      onClick={() => setSelectedDayIdx(idx)}
                      className="cursor-pointer"
                    >
                      <circle
                        cx={cx}
                        cy={getY(row.currentExposure)}
                        r={isSel ? 5 : 3.5}
                        fill="#64748B"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                      <circle
                        cx={cx}
                        cy={getY(row.optimizedExposure)}
                        r={isSel ? 5.5 : 4}
                        fill="#2D8A56"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                      <text
                        x={cx}
                        y={svgH - 8}
                        textAnchor="middle"
                        fontSize="11"
                        fill="currentColor"
                        className="text-[#49635A] dark:text-[#A6C2B6]"
                      >
                        {row.day}
                      </text>
                    </g>
                  );
                })}
              </svg>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tabular text-[#49635A] dark:text-[#A6C2B6] rounded-xl bg-[#F4FAF6] dark:bg-[#172A22] px-3 py-2">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-[#64748B] inline-block" aria-hidden="true" />
                    Current
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-1 bg-[#2D8A56] rounded inline-block" aria-hidden="true" />
                    Optimized
                  </span>
                </div>
                {activeDay && (
                  <span className="font-semibold text-[#122620] dark:text-[#EDF7F2]">
                    {activeDay.day}: {activeDay.currentExposure} → {activeDay.optimizedExposure} AQI
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#D8E8DF] dark:border-[#253F34] rounded-xl">
              <table className="w-full text-xs font-mono-tabular text-left">
                <thead className="bg-[#EAF4EE] dark:bg-[#192E25]">
                  <tr>
                    <th scope="col" className="px-3 py-2">Day</th>
                    <th scope="col" className="px-3 py-2 text-right">Current Est. AQI</th>
                    <th scope="col" className="px-3 py-2 text-right">Optimized Est. AQI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4EFE9] dark:divide-[#21382E]">
                  {result.trend7d.map((row) => (
                    <tr key={row.day}>
                      <td className="px-3 py-2">{row.day}</td>
                      <td className="px-3 py-2 text-right">{row.currentExposure}</td>
                      <td className="px-3 py-2 text-right font-bold text-[#1B4D3E] dark:text-[#4ADE80]">
                        {row.optimizedExposure}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Full Formula & Assumptions Transparency Card */}
      <ImpactCard impact={result.impactDetail} language={profile.language} />
    </div>
  );
};
