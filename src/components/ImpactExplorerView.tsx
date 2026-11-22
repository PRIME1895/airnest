import React, { useMemo, useState } from 'react';
import { Award, CheckCircle2, Clock, Leaf, Scale, Sparkles, TrendingDown } from 'lucide-react';
import { t } from '../../packages/shared/i18n/index';
import { rankAlternatives } from '../../packages/shared/impact/index';
import type { AqiSnapshot, UserProfile } from '../../packages/shared/schemas';
import { ImpactCard } from './ImpactCard';

interface ImpactExplorerViewProps {
  profile: UserProfile;
  aqiSnapshot: AqiSnapshot;
  doneTaskIds: string[];
}

export const ImpactExplorerView: React.FC<ImpactExplorerViewProps> = ({
  profile,
  aqiSnapshot,
  doneTaskIds,
}) => {
  const [communityN, setCommunityN] = useState(500);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const alternatives = useMemo(
    () => rankAlternatives(profile, aqiSnapshot.aqi, aqiSnapshot.pm25, communityN),
    [profile, aqiSnapshot.aqi, aqiSnapshot.pm25, communityN]
  );

  const [selectedId, setSelectedId] = useState<string>(alternatives[0]?.id ?? 'alt-ventilation-window');

  const featured =
    alternatives.find((a) => a.id === selectedId) ?? alternatives[0];

  const visibleAlternatives =
    categoryFilter === 'all'
      ? alternatives
      : alternatives.filter((a) => a.category === categoryFilter);

  // 7-day overall progress rings scaled from completed tasks + baseline
  const taskBoost = doneTaskIds.length;
  const co2Saved7d = Math.round((8.4 + taskBoost * 1.4) * 10) / 10;
  const lowerExposurePct = Math.min(62, 18 + taskBoost * 6);
  const treesEq = Math.round(co2Saved7d * 4);

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="airnest-sky-backdrop rounded-2xl border border-[#D8E8DF] dark:border-[#253F34] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#122620] dark:text-[#EDF7F2]">
            {t(profile.language, 'impactExplorerTitle')}
          </h1>
          <p className="text-sm text-[#49635A] dark:text-[#A6C2B6] mt-0.5">
            {t(profile.language, 'impactExplorerSubtitle')}
          </p>
        </div>

        <label className="flex items-center gap-2 rounded-xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] px-3 py-2 text-xs font-semibold">
          <span>Community scale (N):</span>
          <select
            value={communityN}
            onChange={(e) => setCommunityN(Number(e.target.value))}
            className="bg-transparent font-mono-tabular font-bold text-[#1B4D3E] dark:text-[#4ADE80]"
          >
            <option value={100}>100 households</option>
            <option value={500}>500 households</option>
            <option value={1000}>1,000 households</option>
            <option value={5000}>5,000 households</option>
          </select>
        </label>
      </section>

      {/* Top Row: Featured 3-Layer Impact Explainer + 7-Day Overall Impact Rings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section
          aria-labelledby="featured-choice-heading"
          className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] p-5 shadow-sm space-y-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#1B4D3E] dark:text-[#4ADE80]">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                Featured Choice · {featured.costTag} · {featured.effort} Effort
              </span>
              <h2
                id="featured-choice-heading"
                className="text-lg font-bold text-[#122620] dark:text-[#EDF7F2] mt-0.5"
              >
                {featured.title}
              </h2>
              <p className="text-xs text-[#49635A] dark:text-[#A6C2B6] mt-1">{featured.summary}</p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-[#EAF4EE] dark:bg-[#192E25] text-xs font-mono-tabular font-bold text-[#143D30] dark:text-[#6EE7B7]">
              Rank Score {featured.rankScore}
            </span>
          </div>

          <ImpactCard impact={featured.impact} language={profile.language} />
        </section>

        {/* Your Overall Impact (Last 7 Days) */}
        <section
          aria-labelledby="overall-impact-heading"
          className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] p-5 shadow-sm flex flex-col justify-between gap-4"
        >
          <div className="flex items-center justify-between">
            <h2
              id="overall-impact-heading"
              className="text-base font-bold text-[#122620] dark:text-[#EDF7F2]"
            >
              Your Overall Impact (Last 7 Days)
            </h2>
            <span className="text-xs text-[#49635A] dark:text-[#A6C2B6]">Estimate</span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-[#F4FAF6] dark:bg-[#172A22] border border-[#DCEBE2] dark:border-[#243B31] p-3.5 space-y-1.5">
              <div className="w-12 h-12 mx-auto rounded-full border-4 border-[#2D8A56] flex items-center justify-center">
                <Leaf className="w-5 h-5 text-[#1B4D3E] dark:text-[#4ADE80]" aria-hidden="true" />
              </div>
              <div className="text-lg font-bold font-mono-tabular text-[#122620] dark:text-[#EDF7F2]">
                {co2Saved7d} kg
              </div>
              <div className="text-[11px] text-[#49635A] dark:text-[#A6C2B6]">CO2e Saved</div>
            </div>

            <div className="rounded-xl bg-[#F4FAF6] dark:bg-[#172A22] border border-[#DCEBE2] dark:border-[#243B31] p-3.5 space-y-1.5">
              <div className="w-12 h-12 mx-auto rounded-full border-4 border-[#1B4D3E] dark:border-[#4ADE80] flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-[#1B4D3E] dark:text-[#4ADE80]" aria-hidden="true" />
              </div>
              <div className="text-lg font-bold font-mono-tabular text-[#122620] dark:text-[#EDF7F2]">
                {lowerExposurePct}%
              </div>
              <div className="text-[11px] text-[#49635A] dark:text-[#A6C2B6]">Lower Exposure</div>
            </div>

            <div className="rounded-xl bg-[#F4FAF6] dark:bg-[#172A22] border border-[#DCEBE2] dark:border-[#243B31] p-3.5 space-y-1.5">
              <div className="w-12 h-12 mx-auto rounded-full border-4 border-teal-600 flex items-center justify-center">
                <Award className="w-5 h-5 text-teal-700 dark:text-teal-300" aria-hidden="true" />
              </div>
              <div className="text-lg font-bold font-mono-tabular text-[#122620] dark:text-[#EDF7F2]">
                {treesEq}
              </div>
              <div className="text-[11px] text-[#49635A] dark:text-[#A6C2B6]">Trees Eq. (mo)</div>
            </div>
          </div>

          <div className="rounded-xl bg-[#EAF4EE] dark:bg-[#192E25] p-3 text-xs text-[#122620] dark:text-[#EDF7F2] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#2D8A56] shrink-0" aria-hidden="true" />
            <span>
              You&apos;re on track to make {aqiSnapshot.city} cleaner! Complete tasks in{' '}
              <strong>My Plan</strong> to grow your weekly estimate.
            </span>
          </div>
        </section>
      </div>

      {/* Full Sustainable Alternatives Ranking */}
      <section
        aria-labelledby="alternatives-heading"
        className="rounded-2xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] p-5 shadow-sm space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2
              id="alternatives-heading"
              className="text-base font-bold text-[#122620] dark:text-[#EDF7F2] flex items-center gap-2"
            >
              <Scale className="w-4 h-4 text-[#2D8A56]" aria-hidden="true" />
              Sustainable Alternatives Ranked by Impact × Feasibility × Cost
            </h2>
            <p className="text-xs text-[#49635A] dark:text-[#A6C2B6]">
              Tailored for your {profile.budget} budget — click any alternative to inspect its full
              3-layer Impact Explainer above.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
            {['all', 'indoor', 'commute', 'cooking', 'heating', 'community'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                aria-pressed={categoryFilter === cat}
                className={`px-2.5 py-1.5 min-h-[34px] rounded-lg text-xs font-semibold capitalize border transition-colors ${
                  categoryFilter === cat
                    ? 'bg-[#1B4D3E] text-white border-[#1B4D3E]'
                    : 'bg-[#F4FAF6] dark:bg-[#172A22] text-[#49635A] dark:text-[#A6C2B6] border-[#D8E8DF] dark:border-[#253F34]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {visibleAlternatives.map((alt, idx) => {
            const active = alt.id === featured.id;
            return (
              <button
                key={alt.id}
                type="button"
                onClick={() => setSelectedId(alt.id)}
                className={`text-left rounded-xl border p-4 space-y-2 transition-colors ${
                  active
                    ? 'bg-[#EAF4EE] dark:bg-[#1A3328] border-[#1B4D3E] dark:border-[#4ADE80]'
                    : 'bg-[#F8FCF9] dark:bg-[#0F1D17] border-[#DCEBE2] dark:border-[#243B31] hover:border-[#1B4D3E]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-[#1B4D3E] text-white text-xs font-bold flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="text-sm font-bold text-[#122620] dark:text-[#EDF7F2]">
                      {alt.title}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-white dark:bg-[#13221C] text-xs font-bold text-[#1B4D3E] dark:text-[#4ADE80] shrink-0">
                    {alt.costTag}
                  </span>
                </div>

                <p className="text-xs text-[#49635A] dark:text-[#A6C2B6]">{alt.summary}</p>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono-tabular text-[#122620] dark:text-[#EDF7F2] pt-1">
                  <span className="font-bold text-[#1B4D3E] dark:text-[#4ADE80]">
                    ↓{alt.impact.personalExposureDeltaPct}% exposure
                  </span>
                  <span>·</span>
                  <span>{alt.impact.householdCo2eKgPerWeek} kg CO2e/wk</span>
                  <span>·</span>
                  <span>{alt.effort} effort</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" aria-hidden="true" />
                    {alt.timeToBenefit}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
