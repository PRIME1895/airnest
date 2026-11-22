import React, { useMemo, useState } from 'react';
import { BarChart3, Table as TableIcon } from 'lucide-react';
import { t } from '../../packages/shared/i18n/index';
import type { ForecastHour, Language } from '../../packages/shared/schemas';

interface ForecastChartProps {
  forecast: ForecastHour[];
  language: Language;
  city: string;
}

export const ForecastChart: React.FC<ForecastChartProps> = ({ forecast, language, city }) => {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [activeIdx, setActiveIdx] = useState<number>(0);

  const sampled = useMemo(() => {
    const step = Math.max(1, Math.floor(forecast.length / 8));
    return forecast.filter((_, idx) => idx % step === 0).slice(0, 9);
  }, [forecast]);

  const peak = useMemo(
    () => sampled.reduce((max, h) => (h.aqi > max.aqi ? h : max), sampled[0]),
    [sampled]
  );

  const maxVal = useMemo(() => {
    const top = Math.max(...sampled.map((h) => Math.max(h.aqi, h.pm25)), 100);
    return Math.ceil(top / 50) * 50;
  }, [sampled]);

  const width = 420;
  const height = 152;
  const padL = 34;
  const padR = 14;
  const padT = 16;
  const padB = 26;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const getX = (idx: number) =>
    padL + (sampled.length > 1 ? (idx / (sampled.length - 1)) * plotW : plotW / 2);
  const getY = (val: number) => padT + plotH - (Math.min(maxVal, val) / maxVal) * plotH;

  const aqiPath = sampled
    .map((h, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(h.aqi).toFixed(1)}`)
    .join(' ');
  const pm25Path = sampled
    .map((h, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(h.pm25).toFixed(1)}`)
    .join(' ');
  const areaPath =
    sampled.length > 1
      ? `${aqiPath} L ${getX(sampled.length - 1).toFixed(1)} ${(padT + plotH).toFixed(1)} L ${getX(0).toFixed(1)} ${(padT + plotH).toFixed(1)} Z`
      : '';

  const activePoint = sampled[Math.min(activeIdx, Math.max(0, sampled.length - 1))];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-[#122620] dark:text-[#EDF7F2]">
            {t(language, 'forecast48h')}
          </h3>
          {peak && (
            <p className="text-xs text-[#49635A] dark:text-[#A6C2B6] font-mono-tabular">
              Peak ~{peak.aqi} AQI at {peak.hourLabel} · BLH {peak.boundaryLayerM}m
            </p>
          )}
        </div>
        <div
          role="group"
          aria-label="Forecast display mode"
          className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#EAF4EE] dark:bg-[#192E25]"
        >
          <button
            type="button"
            onClick={() => setViewMode('chart')}
            aria-pressed={viewMode === 'chart'}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold min-h-[34px] transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'chart'
                ? 'bg-white dark:bg-[#13221C] text-[#122620] dark:text-[#EDF7F2] shadow-xs'
                : 'text-[#49635A] dark:text-[#A6C2B6]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
            {t(language, 'chartView')}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            aria-pressed={viewMode === 'table'}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold min-h-[34px] transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'table'
                ? 'bg-white dark:bg-[#13221C] text-[#122620] dark:text-[#EDF7F2] shadow-xs'
                : 'text-[#49635A] dark:text-[#A6C2B6]'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" aria-hidden="true" />
            {t(language, 'tableView')}
          </button>
        </div>
      </div>

      {viewMode === 'chart' ? (
        <div className="space-y-2">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={`48-hour AQI and PM2.5 forecast chart for ${city}. Peak AQI ${peak?.aqi ?? 0} around ${peak?.hourLabel ?? 'morning'}. Switch to Data Table for exact hourly figures.`}
            className="w-full h-40 overflow-visible"
          >
            <defs>
              <linearGradient id="airnest-area-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2D8A56" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#2D8A56" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Horizontal grid lines */}
            {[0, 0.5, 1].map((frac) => {
              const y = padT + plotH * (1 - frac);
              const labelVal = Math.round(maxVal * frac);
              return (
                <g key={frac}>
                  <line
                    x1={padL}
                    x2={width - padR}
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
                    {labelVal}
                  </text>
                </g>
              );
            })}

            {areaPath && <path d={areaPath} fill="url(#airnest-area-fill)" />}
            <path d={aqiPath} fill="none" stroke="#2D8A56" strokeWidth="2.5" strokeLinejoin="round" />
            <path
              d={pm25Path}
              fill="none"
              stroke="#2563EB"
              strokeWidth="2"
              strokeDasharray="4 3"
              strokeLinejoin="round"
            />

            {/* Interactive data points & X labels */}
            {sampled.map((h, i) => {
              const cx = getX(i);
              const cyAqi = getY(h.aqi);
              const cyPm = getY(h.pm25);
              const isSelected = i === activeIdx;
              return (
                <g
                  key={h.isoTime}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => setActiveIdx(i)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={cx}
                    cy={cyAqi}
                    r={isSelected ? 5 : 3.2}
                    fill="#2D8A56"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  <circle cx={cx} cy={cyPm} r={isSelected ? 4 : 2.4} fill="#2563EB" />
                  {i % 2 === 0 && (
                    <text
                      x={cx}
                      y={height - 6}
                      textAnchor="middle"
                      fontSize="10"
                      fill="currentColor"
                      className="text-[#49635A] dark:text-[#A6C2B6]"
                    >
                      {h.hourLabel}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Compact Legend + Active Hour Readout */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-tabular text-[#49635A] dark:text-[#A6C2B6]">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2D8A56]" aria-hidden="true" />
                AQI
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" aria-hidden="true" />
                PM2.5 (µg/m³)
              </span>
            </div>
            {activePoint && (
              <span className="font-semibold text-[#122620] dark:text-[#EDF7F2]">
                {activePoint.hourLabel}: AQI {activePoint.aqi} · PM2.5 {activePoint.pm25} µg/m³ ·
                Wind {activePoint.windKmh} km/h
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto max-h-48 border border-[#D8E8DF] dark:border-[#253F34] rounded-xl">
          <table className="w-full text-left text-xs font-mono-tabular">
            <thead className="bg-[#EAF4EE] dark:bg-[#192E25] text-[#122620] dark:text-[#EDF7F2]">
              <tr>
                <th scope="col" className="px-3 py-2">Time</th>
                <th scope="col" className="px-3 py-2 text-right">AQI</th>
                <th scope="col" className="px-3 py-2 text-right">PM2.5</th>
                <th scope="col" className="px-3 py-2 text-right">Wind</th>
                <th scope="col" className="px-3 py-2 text-right">BLH (m)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4EFE9] dark:divide-[#21382E]">
              {sampled.map((h) => (
                <tr key={h.isoTime}>
                  <td className="px-3 py-1.5">{h.hourLabel}</td>
                  <td className="px-3 py-1.5 text-right font-semibold">{h.aqi}</td>
                  <td className="px-3 py-1.5 text-right">{h.pm25} µg/m³</td>
                  <td className="px-3 py-1.5 text-right">{h.windKmh} km/h</td>
                  <td className="px-3 py-1.5 text-right">{h.boundaryLayerM}m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
