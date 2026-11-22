import React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Leaf,
  ShieldAlert,
  Wind,
} from 'lucide-react';
import { classifyAqi } from '../../packages/shared/impact/index';
import { t } from '../../packages/shared/i18n/index';
import type { AqiSnapshot, Language } from '../../packages/shared/schemas';

interface AqiGaugeProps {
  snapshot: AqiSnapshot;
  language: Language;
  eli10Mode?: boolean;
}

function StatusIcon({ iconKey, className }: { iconKey: string; className?: string }) {
  switch (iconKey) {
    case 'leaf':
      return <Leaf className={className} aria-hidden="true" />;
    case 'check':
      return <CheckCircle2 className={className} aria-hidden="true" />;
    case 'alert':
      return <AlertTriangle className={className} aria-hidden="true" />;
    case 'shield-alert':
      return <ShieldAlert className={className} aria-hidden="true" />;
    case 'octagon':
    case 'skull':
    default:
      return <AlertOctagon className={className} aria-hidden="true" />;
  }
}

export const AqiGauge: React.FC<AqiGaugeProps> = ({ snapshot, language, eli10Mode }) => {
  const cls = classifyAqi(snapshot.aqi);
  const clampedPct = Math.min(1, Math.max(0.24, snapshot.aqi / 500));
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.72;
  const dashOffset = arcLength * (1 - clampedPct);

  return (
    <section
      aria-label={`Air Quality Index ${snapshot.aqi}, ${cls.band}`}
      className="rounded-2xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] p-5 sm:p-6 shadow-sm flex flex-col justify-between gap-4"
    >
      <div className="flex flex-col sm:flex-row items-center gap-5">
        {/* Circular Spectrum Gauge Arc matching AirNest reference */}
        <div className="relative w-40 h-36 shrink-0 flex items-center justify-center">
          <svg
            viewBox="0 0 160 148"
            className="w-full h-full overflow-visible"
            role="img"
            aria-label={`AQI gauge showing ${snapshot.aqi} out of 500, classified as ${cls.band}`}
          >
            <circle
              cx="80"
              cy="82"
              r={radius}
              fill="none"
              stroke="currentColor"
              className="text-[#E3EFE8] dark:text-[#1F352B]"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${arcLength} ${circumference}`}
              transform="rotate(140 80 82)"
            />
            <circle
              cx="80"
              cy="82"
              r={radius}
              fill="none"
              stroke={cls.colorHex}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${arcLength} ${circumference}`}
              strokeDashoffset={dashOffset}
              transform="rotate(140 80 82)"
              style={{ transition: 'stroke-dashoffset 450ms ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-3">
            <span className="text-xs font-medium text-[#49635A] dark:text-[#A6C2B6]">AQI</span>
            <span className="text-4xl font-bold tracking-tight font-mono-tabular text-[#122620] dark:text-[#EDF7F2]">
              {snapshot.aqi}
            </span>
            <span className="text-xs font-medium text-[#49635A] dark:text-[#A6C2B6]">
              {snapshot.dominantPollutant}
            </span>
          </div>
        </div>

        {/* Status Text + Color-Blind-Safe Icon + Pollutant Details */}
        <div className="flex-1 min-w-0 text-center sm:text-left space-y-2.5">
          <div className="flex items-center justify-center sm:justify-start gap-2.5">
            <span
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-base font-bold ${cls.badgeBgClass} ${cls.textClass}`}
            >
              <StatusIcon iconKey={cls.iconKey} className="w-4 h-4 shrink-0" />
              <span>{cls.band}</span>
            </span>
            {snapshot.inversionActive && (
              <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                Inversion trapped ({snapshot.boundaryLayerM}m)
              </span>
            )}
          </div>

          <p className="text-sm text-[#49635A] dark:text-[#A6C2B6] leading-relaxed">
            {eli10Mode
              ? snapshot.aqi > 300
                ? 'The outside air has lots of tiny invisible smoke specks today. Stay indoors and wear a snug N95 mask if you must step out!'
                : 'The air is mostly okay, with a little dust during busy traffic times. Afternoon is the best time to play outside!'
              : cls.shortAdvice}
          </p>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-xs text-[#49635A] dark:text-[#A6C2B6] font-mono-tabular">
            <span>
              {snapshot.dominantPollutant} dominant · <strong className="text-[#122620] dark:text-[#EDF7F2]">{snapshot.pm25} µg/m³</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>PM10 {snapshot.pm10} µg/m³</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <Wind className="w-3.5 h-3.5" aria-hidden="true" />
              {snapshot.windKmh} km/h
            </span>
          </div>
        </div>
      </div>

      {/* Best & Worst Window Strip matching reference */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        <div className="rounded-xl bg-[#EAF4EE] dark:bg-[#192E25] px-3.5 py-2.5 flex items-center gap-3">
          <Clock className="w-4 h-4 text-[#1B4D3E] dark:text-[#4ADE80] shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <div className="text-xs text-[#49635A] dark:text-[#A6C2B6]">
              {t(language, 'bestOutdoorWindow')}
            </div>
            <div className="text-sm font-bold font-mono-tabular text-[#122620] dark:text-[#EDF7F2] truncate">
              {snapshot.bestWindow}
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-amber-50/90 dark:bg-amber-950/35 px-3.5 py-2.5 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-800 dark:text-amber-300 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <div className="text-xs text-amber-900 dark:text-amber-200">
              {t(language, 'worstWindow')}
            </div>
            <div className="text-sm font-bold font-mono-tabular text-amber-950 dark:text-amber-100 truncate">
              {snapshot.worstWindow}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
