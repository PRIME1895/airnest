import React, { Suspense, lazy, useMemo, useState } from 'react';
import {
  ArrowRight,
  Baby,
  CloudSun,
  Map as MapIcon,
  RefreshCw,
  Scale,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  User,
  Users,
  Wind,
} from 'lucide-react';
import { INDIAN_AND_GLOBAL_CITIES } from '../../packages/shared/demoScenarios';
import { t } from '../../packages/shared/i18n/index';
import { assessMemberRisks, classifyAqi } from '../../packages/shared/impact/index';
import type { AqiSnapshot, DailyPlan, UserProfile } from '../../packages/shared/schemas';
import { AqiGauge } from './AqiGauge';
import { DailyReflectionCard } from './DailyReflectionCard';
import { ForecastChart } from './ForecastChart';
import { HourlyInversionWeatherWidget } from './HourlyInversionWeatherWidget';
import type { AirNestRoute } from './Navigation';

const LazyAirQualityMap = lazy(() =>
  import('./AirQualityMap').then((m) => ({ default: m.AirQualityMap }))
);

interface DashboardViewProps {
  profile: UserProfile;
  aqiSnapshot: AqiSnapshot;
  dailyPlan: DailyPlan;
  doneTaskIds: string[];
  loadingAqi: boolean;
  mapsQuotaExceeded: boolean;
  onSelectCity: (city: { city: string; region: string; lat: number; lng: number }) => void;
  onSwitchScenario: (key: 'coimbatore' | 'delhi') => void;
  onNavigate: (route: AirNestRoute) => void;
  onOpenOnboarding: () => void;
}

function getRiskBadgeStyle(risk: string): string {
  switch (risk) {
    case 'Critical':
      return 'bg-rose-100 text-rose-900 dark:bg-rose-950/70 dark:text-rose-200 border-rose-300 dark:border-rose-700';
    case 'High':
      return 'bg-orange-100 text-orange-900 dark:bg-orange-950/70 dark:text-orange-200 border-orange-300 dark:border-orange-700';
    case 'Elevated':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 border-amber-300 dark:border-amber-700';
    case 'Moderate':
      return 'bg-teal-50 text-teal-900 dark:bg-teal-950/60 dark:text-teal-200 border-teal-200 dark:border-teal-800';
    default:
      return 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800';
  }
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  profile,
  aqiSnapshot,
  dailyPlan,
  doneTaskIds,
  loadingAqi,
  mapsQuotaExceeded,
  onSelectCity,
  onSwitchScenario,
  onNavigate,
  onOpenOnboarding,
}) => {
  const [rightPanelMode, setRightPanelMode] = useState<'forecast' | 'map'>('forecast');
  const [quickTip, setQuickTip] = useState<string | null>(null);
  const [tipLoading, setTipLoading] = useState(false);

  const memberRisks = useMemo(
    () => assessMemberRisks(aqiSnapshot.aqi, aqiSnapshot.pm25, profile.household),
    [aqiSnapshot.aqi, aqiSnapshot.pm25, profile.household]
  );

  const cls = classifyAqi(aqiSnapshot.aqi);
  const defaultFreeTip =
    aqiSnapshot.aqi > 300
      ? `Severe smog alert: Keep windows closed with damp door towels (₹0) and wear a fitted N95 outdoors. Cuts indoor PM2.5 by ~48% (Estimate).`
      : `Keep windows closed during ${aqiSnapshot.worstWindow} and cross-ventilate at ${aqiSnapshot.bestWindow} (₹0). Reduces indoor PM2.5 by ~35–42% (Estimate).`;

  const fetchAiQuickTip = async () => {
    setTipLoading(true);
    try {
      const res = await fetch('/api/quick-tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, aqiData: aqiSnapshot }),
      });
      if (res.ok) {
        const data = (await res.json()) as { tip: string };
        setQuickTip(data.tip);
      }
    } catch {
      setQuickTip(defaultFreeTip);
    } finally {
      setTipLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Screen-reader polite announcement on AQI / scenario updates */}
      <div aria-live="polite" className="sr-only">
        {`Air quality in ${aqiSnapshot.city} is ${aqiSnapshot.aqi}, classified as ${cls.band}. Best outdoor window ${aqiSnapshot.bestWindow}.`}
      </div>

      {/* Serene Botanical Greeting Hero */}
      <section className="airnest-sky-backdrop rounded-2xl border border-[#D8E8DF] dark:border-[#253F34] p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#122620] dark:text-[#EDF7F2]">
            {t(profile.language, 'greetingPrefix')}, {profile.displayName}
          </h1>
          <p className="text-sm text-[#49635A] dark:text-[#A6C2B6]">
            {profile.eli10Mode
              ? t(profile.language, 'greetingSubtitleEli10')
              : t(profile.language, 'greetingSubtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onSwitchScenario('coimbatore')}
            className={`md:hidden min-h-[40px] px-3 rounded-xl text-xs font-semibold border ${
              profile.scenarioKey === 'coimbatore'
                ? 'bg-[#1B4D3E] text-white border-[#1B4D3E]'
                : 'bg-white dark:bg-[#13221C] text-[#122620] dark:text-[#EDF7F2] border-[#D8E8DF] dark:border-[#253F34]'
            }`}
          >
            Coimbatore 85
          </button>
          <button
            type="button"
            onClick={() => onSwitchScenario('delhi')}
            className={`md:hidden min-h-[40px] px-3 rounded-xl text-xs font-semibold border ${
              profile.scenarioKey === 'delhi'
                ? 'bg-rose-700 text-white border-rose-700'
                : 'bg-white dark:bg-[#13221C] text-[#122620] dark:text-[#EDF7F2] border-[#D8E8DF] dark:border-[#253F34]'
            }`}
          >
            Delhi 420
          </button>
          <button
            type="button"
            onClick={onOpenOnboarding}
            className="min-h-[40px] px-3.5 rounded-xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] text-xs font-semibold text-[#122620] dark:text-[#EDF7F2] hover:border-[#1B4D3E] transition-colors"
          >
            {t(profile.language, 'onboardingStart')}
          </button>
        </div>
      </section>

      {/* Primary 2-Column Hero Row: AQI Gauge + Weather/48h Forecast/Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6">
          <AqiGauge
            snapshot={aqiSnapshot}
            language={profile.language}
            eli10Mode={profile.eli10Mode}
          />
        </div>

        <section
          aria-label="Local weather, 48-hour forecast, and air quality map"
          className="lg:col-span-6 rounded-2xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] p-5 shadow-sm flex flex-col justify-between gap-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#EAF4EE] dark:bg-[#192E25] flex items-center justify-center text-[#1B4D3E] dark:text-[#4ADE80]">
                <CloudSun className="w-6 h-6" aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold font-mono-tabular text-[#122620] dark:text-[#EDF7F2]">
                    {aqiSnapshot.temperatureC}°C
                  </span>
                  <span className="text-xs text-[#49635A] dark:text-[#A6C2B6]">
                    {aqiSnapshot.condition}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <label className="sr-only" htmlFor="dashboard-city-picker">
                    Choose city
                  </label>
                  <select
                    id="dashboard-city-picker"
                    value={aqiSnapshot.city}
                    disabled={loadingAqi}
                    onChange={(e) => {
                      const match = INDIAN_AND_GLOBAL_CITIES.find((c) => c.city === e.target.value);
                      if (match) onSelectCity(match);
                    }}
                    className="text-xs font-semibold text-[#1B4D3E] dark:text-[#4ADE80] bg-transparent pr-1 cursor-pointer"
                  >
                    {INDIAN_AND_GLOBAL_CITIES.map((c) => (
                      <option key={c.city} value={c.city} className="text-[#122620]">
                        {c.city} ({c.region})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div
              role="group"
              aria-label="Switch between forecast and map"
              className="inline-flex items-center p-1 rounded-lg bg-[#EAF4EE] dark:bg-[#192E25]"
            >
              <button
                type="button"
                onClick={() => setRightPanelMode('forecast')}
                aria-pressed={rightPanelMode === 'forecast'}
                className={`px-2.5 py-1.5 min-h-[36px] rounded-md text-xs font-semibold transition-colors ${
                  rightPanelMode === 'forecast'
                    ? 'bg-white dark:bg-[#13221C] text-[#122620] dark:text-[#EDF7F2] shadow-xs'
                    : 'text-[#49635A] dark:text-[#A6C2B6]'
                }`}
              >
                {t(profile.language, 'forecast48h')}
              </button>
              <button
                type="button"
                onClick={() => setRightPanelMode('map')}
                aria-pressed={rightPanelMode === 'map'}
                className={`px-2.5 py-1.5 min-h-[36px] rounded-md text-xs font-semibold inline-flex items-center gap-1 transition-colors ${
                  rightPanelMode === 'map'
                    ? 'bg-white dark:bg-[#13221C] text-[#122620] dark:text-[#EDF7F2] shadow-xs'
                    : 'text-[#49635A] dark:text-[#A6C2B6]'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" aria-hidden="true" />
                {t(profile.language, 'mapView')}
              </button>
            </div>
          </div>

          {rightPanelMode === 'forecast' ? (
            <ForecastChart
              forecast={aqiSnapshot.forecast48h}
              language={profile.language}
              city={aqiSnapshot.city}
            />
          ) : (
            <Suspense
              fallback={
                <div className="h-48 rounded-xl bg-[#EAF4EE] dark:bg-[#192E25] animate-pulse" />
              }
            >
              <LazyAirQualityMap
                snapshot={aqiSnapshot}
                language={profile.language}
                quotaExceeded={mapsQuotaExceeded}
              />
            </Suspense>
          )}
        </section>
      </div>

      {/* Hourly Weather Forecast & Thermal Inversion Window Strip */}
      <HourlyInversionWeatherWidget
        aqiSnapshot={aqiSnapshot}
        eli10Mode={profile.eli10Mode}
        onOpenDailyPlan={() => onNavigate('plan')}
      />

      {/* Second Row: 3-Column Bento Grid matching AirNest visual layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Your Family Today */}
        <section
          aria-labelledby="family-today-heading"
          className="md:col-span-5 rounded-2xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] p-5 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2
              id="family-today-heading"
              className="text-base font-bold text-[#122620] dark:text-[#EDF7F2]"
            >
              {t(profile.language, 'yourFamilyToday')}
            </h2>
            <span className="text-xs text-[#49635A] dark:text-[#A6C2B6]">Per-member risk</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {memberRisks.map((member) => (
              <div
                key={member.memberId}
                className="rounded-xl bg-[#F4FAF6] dark:bg-[#172A22] border border-[#DCEBE2] dark:border-[#243B31] p-3 flex flex-col justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-[#E4F1EA] dark:bg-[#223B2F] text-[#1B4D3E] dark:text-[#4ADE80] flex items-center justify-center shrink-0">
                    {member.role === 'child' ? (
                      <Baby className="w-4 h-4" aria-hidden="true" />
                    ) : member.role === 'elder' ? (
                      <ShieldAlert className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <User className="w-4 h-4" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#122620] dark:text-[#EDF7F2] truncate">
                      {member.label}
                    </div>
                    <span
                      className={`inline-block mt-0.5 px-1.5 py-0.5 rounded border text-[11px] font-semibold ${getRiskBadgeStyle(member.riskLevel)}`}
                    >
                      {member.riskLevel}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-[#49635A] dark:text-[#A6C2B6] leading-snug">
                  {member.maskRequired ? 'N95 outdoors · ' : ''}
                  {member.guidance.split('(')[0].trim()}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Recommended for You (₹0 Action + Low-Latency Gemini Lite Tip) */}
        <section
          aria-labelledby="recommended-heading"
          className="md:col-span-4 rounded-2xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] p-5 shadow-sm flex flex-col justify-between gap-4"
        >
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h2
                id="recommended-heading"
                className="text-base font-bold text-[#122620] dark:text-[#EDF7F2]"
              >
                {t(profile.language, 'recommendedForYou')}
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-[#E5F3EC] dark:bg-[#1C382B] text-[#143D30] dark:text-[#6EE7B7] text-xs font-bold">
                ₹0 Action
              </span>
            </div>

            <p className="text-sm text-[#122620] dark:text-[#EDF7F2] leading-relaxed">
              {quickTip ?? defaultFreeTip}
            </p>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => onNavigate('plan')}
              className="w-full min-h-[44px] px-4 rounded-xl bg-[#1B4D3E] hover:bg-[#143D30] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
            >
              {t(profile.language, 'viewDailyPlan')}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={fetchAiQuickTip}
              disabled={tipLoading}
              className="w-full min-h-[38px] px-3 rounded-xl bg-[#F4FAF6] dark:bg-[#172A22] border border-[#D8E8DF] dark:border-[#253F34] text-xs font-semibold text-[#1B4D3E] dark:text-[#4ADE80] inline-flex items-center justify-center gap-1.5 hover:bg-[#EAF4EE] dark:hover:bg-[#1F352B]"
            >
              {tipLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              {tipLoading ? 'Refreshing tip...' : 'Get Fresh AI Quick Tip'}
            </button>
          </div>
        </section>

        {/* Explore AirNest Quick Jump 2x2 Grid */}
        <section
          aria-labelledby="explore-heading"
          className="md:col-span-3 rounded-2xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] p-5 shadow-sm space-y-3"
        >
          <h2 id="explore-heading" className="text-base font-bold text-[#122620] dark:text-[#EDF7F2]">
            {t(profile.language, 'exploreAirNest')}
          </h2>

          <div className="grid grid-cols-2 gap-2.5">
            {(
              [
                {
                  route: 'indoor' as AirNestRoute,
                  label: t(profile.language, 'navIndoor'),
                  icon: <Wind className="w-5 h-5" aria-hidden="true" />,
                },
                {
                  route: 'impact' as AirNestRoute,
                  label: t(profile.language, 'navImpact'),
                  icon: <Scale className="w-5 h-5" aria-hidden="true" />,
                },
                {
                  route: 'simulator' as AirNestRoute,
                  label: t(profile.language, 'navSimulator'),
                  icon: <SlidersHorizontal className="w-5 h-5" aria-hidden="true" />,
                },
                {
                  route: 'community' as AirNestRoute,
                  label: t(profile.language, 'navCommunity'),
                  icon: <Users className="w-5 h-5" aria-hidden="true" />,
                },
              ] as const
            ).map((tile) => (
              <button
                key={tile.route}
                type="button"
                onClick={() => onNavigate(tile.route)}
                className="min-h-[82px] rounded-xl bg-[#F4FAF6] dark:bg-[#172A22] hover:bg-[#E5F3EC] dark:hover:bg-[#1F352B] border border-[#DCEBE2] dark:border-[#243B31] p-3 flex flex-col items-center justify-center gap-1.5 text-center transition-colors"
              >
                <span className="text-[#1B4D3E] dark:text-[#4ADE80]">{tile.icon}</span>
                <span className="text-xs font-semibold text-[#122620] dark:text-[#EDF7F2] leading-tight">
                  {tile.label}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Daily Quick-Reflection Check-In */}
      <DailyReflectionCard
        aqiSnapshot={aqiSnapshot}
        dailyPlan={dailyPlan}
        doneTaskIds={doneTaskIds}
        onOpenDailyPlan={() => onNavigate('plan')}
      />
    </div>
  );
};
