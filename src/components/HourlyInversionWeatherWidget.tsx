import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CloudFog,
  CloudSun,
  Layers,
  Moon,
  Sun,
  Thermometer,
  Wind,
} from 'lucide-react';
import type { AqiSnapshot, ForecastHour } from '../../packages/shared/schemas';

interface HourlyInversionWeatherWidgetProps {
  aqiSnapshot: AqiSnapshot;
  eli10Mode: boolean;
  onOpenDailyPlan: () => void;
}

type HorizonFilter = '12h' | '24h' | 'inversion';

interface EnrichedHour extends ForecastHour {
  index: number;
  hour24: number;
  estTempC: number;
  isInversionProne: boolean;
  isBestOutdoor: boolean;
  weatherLabel: string;
}

function parseHour24(hourLabel: string, isoTime: string, fallbackIdx: number): number {
  const match = hourLabel.trim().toLowerCase().match(/^(\d{1,2})\s*(am|pm)$/);
  if (match) {
    const raw = parseInt(match[1], 10);
    const period = match[2];
    if (period === 'am') return raw === 12 ? 0 : raw;
    return raw === 12 ? 12 : raw + 12;
  }
  const dt = new Date(isoTime);
  if (!Number.isNaN(dt.getTime())) {
    return dt.getHours();
  }
  return (14 + fallbackIdx) % 24;
}

/**
 * Estimates realistic diurnal temperature swing anchored to current snapshot temperatureC
 * (cooler pre-dawn inversion hours, warmer mid-afternoon dispersion peak).
 */
function estimateHourlyTemp(baseTempC: number, hour24: number, offsetHours: number): number {
  if (offsetHours === 0) return Math.round(baseTempC);
  const diurnalDelta = Math.sin(((hour24 - 9) / 24) * Math.PI * 2) * 4.2;
  return Math.round(baseTempC + diurnalDelta);
}

function getWeatherMeta(
  hour: EnrichedHour,
  currentWeatherSummary: string
): {
  icon: React.ReactNode;
  label: string;
} {
  if (hour.index === 0) {
    const summaryLower = currentWeatherSummary.toLowerCase();
    if (summaryLower.includes('smog') || summaryLower.includes('fog') || summaryLower.includes('haze') || hour.isInversionProne || hour.aqi > 250) {
      return {
        icon: (
          <CloudFog
            className="w-5 h-5 text-amber-600 dark:text-amber-400"
            aria-hidden="true"
          />
        ),
        label: currentWeatherSummary || (hour.aqi > 300 ? 'Smog Haze' : 'Inversion Mist'),
      };
    }
    if (summaryLower.includes('cloud')) {
      return {
        icon: (
          <CloudSun
            className="w-5 h-5 text-[#1F8A4C] dark:text-[#6EE7B7]"
            aria-hidden="true"
          />
        ),
        label: currentWeatherSummary,
      };
    }
    return {
      icon: <Sun className="w-5 h-5 text-amber-500 dark:text-amber-300" aria-hidden="true" />,
      label: currentWeatherSummary || 'Clear & Open',
    };
  }

  const isNight = hour.hour24 >= 19 || hour.hour24 < 6;
  if (hour.isInversionProne || hour.aqi > 250) {
    return {
      icon: (
        <CloudFog
          className="w-5 h-5 text-amber-600 dark:text-amber-400"
          aria-hidden="true"
        />
      ),
      label: hour.aqi > 300 ? 'Smog Haze' : 'Inversion Mist',
    };
  }
  if (isNight) {
    return {
      icon: (
        <Moon
          className="w-5 h-5 text-sky-700 dark:text-sky-300"
          aria-hidden="true"
        />
      ),
      label: hour.windKmh >= 10 ? 'Clear Breeze' : 'Calm Night',
    };
  }
  if (hour.boundaryLayerM >= 550 && hour.aqi <= 120) {
    return {
      icon: <Sun className="w-5 h-5 text-amber-500 dark:text-amber-300" aria-hidden="true" />,
      label: 'Clear & Open',
    };
  }
  return {
    icon: (
      <CloudSun
        className="w-5 h-5 text-[#1F8A4C] dark:text-[#6EE7B7]"
        aria-hidden="true"
      />
    ),
    label: 'Partly Cloudy',
  };
}

export const HourlyInversionWeatherWidget: React.FC<HourlyInversionWeatherWidgetProps> = ({
  aqiSnapshot,
  eli10Mode,
  onOpenDailyPlan,
}) => {
  const [filter, setFilter] = useState<HorizonFilter>('12h');
  const [selectedIso, setSelectedIso] = useState<string | null>(null);

  const enrichedHours = useMemo<EnrichedHour[]>(() => {
    const slice = aqiSnapshot.forecast48h.slice(0, 24);
    if (slice.length === 0) return [];

    const minAqi = Math.min(...slice.map((h) => h.aqi));

    return slice.map((h, idx) => {
      const hour24 = parseHour24(h.hourLabel, h.isoTime, idx);
      const isInversionProne =
        h.inversionRisk === 'high' || (h.boundaryLayerM <= 320 && h.windKmh <= 7.5);
      const isBestOutdoor =
        !isInversionProne &&
        h.inversionRisk === 'low' &&
        h.aqi <= Math.max(minAqi + 15, 110) &&
        h.boundaryLayerM >= 500;
      const estTempC = estimateHourlyTemp(aqiSnapshot.temperatureC, hour24, idx);
      const item: EnrichedHour = {
        ...h,
        index: idx,
        hour24,
        estTempC,
        isInversionProne,
        isBestOutdoor,
        weatherLabel: '',
      };
      item.weatherLabel = getWeatherMeta(item, aqiSnapshot.condition).label;
      return item;
    });
  }, [aqiSnapshot.forecast48h, aqiSnapshot.temperatureC, aqiSnapshot.condition]);

  const inversionCount24h = useMemo(
    () => enrichedHours.filter((h) => h.isInversionProne).length,
    [enrichedHours]
  );

  const visibleHours = useMemo(() => {
    if (filter === '12h') return enrichedHours.slice(0, 12);
    if (filter === 'inversion') {
      const strictTrap = enrichedHours.filter((h) => h.isInversionProne);
      if (strictTrap.length > 0) return strictTrap;
      const moderateHaze = enrichedHours.filter((h) => h.inversionRisk === 'moderate');
      return moderateHaze.length > 0 ? moderateHaze : enrichedHours.slice(0, 12);
    }
    return enrichedHours;
  }, [enrichedHours, filter]);

  const activeHour = useMemo(() => {
    if (selectedIso) {
      const foundInVisible = visibleHours.find((h) => h.isoTime === selectedIso);
      if (foundInVisible) return foundInVisible;
    }
    return visibleHours[0] ?? enrichedHours[0];
  }, [enrichedHours, selectedIso, visibleHours]);

  if (!activeHour) return null;

  const blhPct = Math.max(12, Math.min(100, Math.round((activeHour.boundaryLayerM / 1100) * 100)));

  const activityRecommendation = activeHour.isInversionProne
    ? eli10Mode
      ? `Cool trapped air acts like a blanket only ${activeHour.boundaryLayerM}m high, holding smoke near the ground. Stay indoors, keep windows closed (₹0), and save outdoor play for ${aqiSnapshot.bestWindow}.`
      : `Thermal inversion alert: Boundary layer drops to ${activeHour.boundaryLayerM}m with ${activeHour.windKmh} km/h wind, trapping PM2.5 near street level. Keep windows sealed (₹0) and shift outdoor exercise to ${aqiSnapshot.bestWindow} (~35–48% lower inhalation estimate).`
    : activeHour.inversionRisk === 'moderate'
      ? eli10Mode
        ? `Air is mixing slowly right now (${activeHour.boundaryLayerM}m lid). Short errands are okay, but ${aqiSnapshot.bestWindow} is cleaner for running or cycling.`
        : `Moderate atmospheric mixing (BLH ${activeHour.boundaryLayerM}m, wind ${activeHour.windKmh} km/h). Light errands are fine; avoid heavy roadside exertion and prefer ${aqiSnapshot.bestWindow} for outdoor workouts.`
      : eli10Mode
        ? `Great time to go outside! Warm air and ${activeHour.windKmh} km/h breeze lift pollution away—open windows for 15–20 minutes (₹0) to freshen your rooms.`
        : `Open dispersion window (BLH ${activeHour.boundaryLayerM}m, wind ${activeHour.windKmh} km/h). Ideal hour for outdoor walks, school runs, and ₹0 cross-ventilation to flush indoor CO₂ & cooking PM2.5 (~28% cleaner indoor air estimate).`;

  return (
    <section
      aria-labelledby="hourly-weather-inversion-heading"
      className="rounded-2xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] p-5 shadow-sm space-y-4"
    >
      {/* Header + Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="hourly-weather-inversion-heading"
              className="text-base sm:text-lg font-bold text-[#122620] dark:text-[#EDF7F2]"
            >
              Hourly Weather &amp; Inversion Window Forecast
            </h2>
            {inversionCount24h > 0 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-700 text-[11px] font-bold text-rose-800 dark:text-rose-200 tabular-nums">
                <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                {inversionCount24h} inversion-prone hr{inversionCount24h === 1 ? '' : 's'} in next 24h
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-[11px] font-bold text-emerald-900 dark:text-emerald-200">
                <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                Good dispersion next 24h
              </span>
            )}
          </div>
          <p className="text-xs text-[#49635A] dark:text-[#A6C2B6]">
            Highlights low boundary-layer height (BLH) &amp; calm-wind thermal inversions that trap
            smog near ground level.
          </p>
        </div>

        {/* Horizon Filter Tabs */}
        <div
          role="group"
          aria-label="Hourly weather horizon filter"
          className="inline-flex items-center p-1 rounded-xl bg-[#EAF4EE] dark:bg-[#192E25] self-start lg:self-auto"
        >
          {(
            [
              { id: '12h', label: 'Next 12h' },
              { id: '24h', label: 'Next 24h' },
              { id: 'inversion', label: 'Inversion Hours' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              aria-pressed={filter === tab.id}
              className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-white dark:bg-[#13221C] text-[#122620] dark:text-[#EDF7F2] shadow-xs'
                  : 'text-[#49635A] dark:text-[#A6C2B6] hover:text-[#122620] dark:hover:text-[#EDF7F2]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Color-Blind-Safe Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[#49635A] dark:text-[#A6C2B6]">
        <span className="inline-flex items-center gap-1.5 font-semibold text-rose-800 dark:text-rose-300">
          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
          Inversion Trap (Avoid outdoor exercise)
        </span>
        <span className="inline-flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
          <CloudFog className="w-3.5 h-3.5" aria-hidden="true" />
          Building Haze (Limit heavy exertion)
        </span>
        <span className="inline-flex items-center gap-1.5 font-semibold text-[#1B4D3E] dark:text-[#6EE7B7]">
          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
          Open Air Window (Best for walks &amp; ₹0 ventilation)
        </span>
      </div>

      {/* Scrollable Hourly Weather & Inversion Cards */}
      <div
        role="listbox"
        aria-label="Hourly weather and inversion risk forecast"
        className="flex gap-2.5 overflow-x-auto pb-2 snap-x"
      >
        {visibleHours.map((hour) => {
          const isSelected = hour.isoTime === activeHour.isoTime;
          const weather = getWeatherMeta(hour, aqiSnapshot.condition);
          const blhBarPct = Math.max(14, Math.min(100, Math.round((hour.boundaryLayerM / 1100) * 100)));

          const cardStyle = hour.isInversionProne
            ? isSelected
              ? 'bg-rose-100/90 dark:bg-rose-950/80 border-rose-500 dark:border-rose-400 ring-2 ring-rose-400/40'
              : 'bg-rose-50/75 dark:bg-rose-950/35 border-rose-200 dark:border-rose-800/80 hover:border-rose-400'
            : hour.inversionRisk === 'moderate'
              ? isSelected
                ? 'bg-amber-100/90 dark:bg-amber-950/70 border-amber-500 dark:border-amber-400 ring-2 ring-amber-400/35'
                : 'bg-amber-50/65 dark:bg-amber-950/25 border-amber-200 dark:border-amber-800/70 hover:border-amber-400'
              : isSelected
                ? 'bg-[#E3F4EA] dark:bg-[#1B3A2C] border-[#1F8A4C] dark:border-[#4ADE80] ring-2 ring-[#2D8A56]/35'
                : 'bg-[#F5FAF7] dark:bg-[#162820] border-[#DCEBE2] dark:border-[#243B31] hover:border-[#2D8A56]';

          return (
            <button
              key={hour.isoTime}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => setSelectedIso(hour.isoTime)}
              className={`snap-start shrink-0 w-[118px] rounded-xl border p-3 text-left flex flex-col justify-between gap-2 transition-all ${cardStyle}`}
            >
              {/* Top Row: Hour + Status Tag */}
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-[#122620] dark:text-[#EDF7F2] tabular-nums">
                  {hour.hourLabel}
                </span>
                {hour.isInversionProne ? (
                  <span className="px-1.5 py-0.5 rounded bg-rose-700 text-white text-[9.5px] font-bold uppercase tracking-wide">
                    Trap
                  </span>
                ) : hour.inversionRisk === 'moderate' ? (
                  <span className="px-1.5 py-0.5 rounded bg-amber-600 text-white text-[9.5px] font-bold uppercase tracking-wide">
                    Haze
                  </span>
                ) : hour.isBestOutdoor ? (
                  <span className="px-1.5 py-0.5 rounded bg-[#1B4D3E] dark:bg-[#2D8A56] text-white text-[9.5px] font-bold uppercase tracking-wide">
                    Best
                  </span>
                ) : null}
              </div>

              {/* Weather Icon + Temp */}
              <div className="flex items-center justify-between">
                {weather.icon}
                <span className="text-base font-extrabold font-mono-tabular text-[#122620] dark:text-[#EDF7F2]">
                  {hour.estTempC}°C
                </span>
              </div>

              {/* AQI + Wind */}
              <div className="space-y-0.5 text-[11px] font-mono-tabular">
                <div className="flex items-center justify-between">
                  <span className="text-[#49635A] dark:text-[#A6C2B6]">AQI</span>
                  <span
                    className={`font-bold ${
                      hour.aqi > 300
                        ? 'text-rose-700 dark:text-rose-300'
                        : hour.aqi > 150
                          ? 'text-amber-700 dark:text-amber-300'
                          : 'text-[#1B4D3E] dark:text-[#6EE7B7]'
                    }`}
                  >
                    {hour.aqi}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#49635A] dark:text-[#A6C2B6]">
                  <span>Wind</span>
                  <span>{hour.windKmh} km/h</span>
                </div>
              </div>

              {/* Mini Boundary Layer Height (BLH) Visual Meter */}
              <div className="space-y-1 pt-1 border-t border-black/5 dark:border-white/10">
                <div className="flex items-center justify-between text-[10px] font-mono-tabular text-[#49635A] dark:text-[#A6C2B6]">
                  <span>BLH</span>
                  <span>{hour.boundaryLayerM}m</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      hour.isInversionProne
                        ? 'bg-rose-600 dark:bg-rose-400'
                        : hour.inversionRisk === 'moderate'
                          ? 'bg-amber-500'
                          : 'bg-[#2D8A56] dark:bg-[#4ADE80]'
                    }`}
                    style={{ width: `${blhBarPct}%` }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Hour Detail & Outdoor Activity Guidance Strip */}
      <div
        className={`rounded-xl border p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
          activeHour.isInversionProne
            ? 'bg-rose-50/75 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
            : activeHour.inversionRisk === 'moderate'
              ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
              : 'bg-[#F4FAF6] dark:bg-[#162921] border-[#DCEBE2] dark:border-[#243B31]'
        }`}
      >
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-[#122620] dark:text-[#EDF7F2]">
            <span>
              {activeHour.hourLabel} · {activeHour.weatherLabel}
            </span>
            <span className="inline-flex items-center gap-1 font-mono-tabular text-[#49635A] dark:text-[#A6C2B6]">
              <Thermometer className="w-3.5 h-3.5" aria-hidden="true" />
              {activeHour.estTempC}°C
            </span>
            <span className="inline-flex items-center gap-1 font-mono-tabular text-[#49635A] dark:text-[#A6C2B6]">
              <Wind className="w-3.5 h-3.5" aria-hidden="true" />
              {activeHour.windKmh} km/h
            </span>
            <span className="inline-flex items-center gap-1 font-mono-tabular text-[#49635A] dark:text-[#A6C2B6]">
              <Layers className="w-3.5 h-3.5" aria-hidden="true" />
              BLH {activeHour.boundaryLayerM}m ({blhPct}% open)
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#1E3930] dark:text-[#D8ECE2] leading-relaxed">
            {activityRecommendation}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenDailyPlan}
          className="min-h-[40px] px-4 rounded-xl bg-[#1B4D3E] hover:bg-[#143D30] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 shrink-0 transition-colors"
        >
          <span>Time My Day</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
};
