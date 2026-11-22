import React, { useState } from 'react';
import {
  Check,
  Clock,
  Copy,
  Globe2,
  Leaf,
  Printer,
  Share2,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react';
import { DEMO_SCENARIOS } from '../../packages/shared/demoScenarios';
import { t } from '../../packages/shared/i18n/index';
import type { AqiSnapshot, UserProfile } from '../../packages/shared/schemas';

interface CommunityViewProps {
  profile: UserProfile;
  aqiSnapshot: AqiSnapshot;
}

export const CommunityView: React.FC<CommunityViewProps> = ({ profile, aqiSnapshot }) => {
  const baseCommunity =
    profile.scenarioKey === 'delhi'
      ? DEMO_SCENARIOS.delhi.community
      : DEMO_SCENARIOS.coimbatore.community;

  const [joined, setJoined] = useState(false);
  const [copied, setCopied] = useState(false);

  const participants = baseCommunity.participants + (joined ? 1 : 0);
  const shareMessage = [
    `AirNest Clean Air Challenge — ${aqiSnapshot.city}`,
    `Today's AQI: ${aqiSnapshot.aqi} (${aqiSnapshot.band}) · Cleanest Outdoor Window: ${aqiSnapshot.bestWindow}`,
    `Zero-Cost Action (₹0): Close windows during ${aqiSnapshot.worstWindow}, skip leaf/waste burning, and carpool or take transit.`,
    `Together ${participants.toLocaleString()} neighbors have avoided ~${baseCommunity.co2eAvoidedTonnes} tonnes CO2e this month (Modeled Estimate).`,
  ].join('\n');

  const handleCopyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="no-print airnest-sky-backdrop rounded-2xl border border-[#D8E8DF] dark:border-[#253F34] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#122620] dark:text-[#EDF7F2]">
            {t(profile.language, 'communityTitle')}
          </h1>
          <p className="text-sm text-[#49635A] dark:text-[#A6C2B6] mt-0.5">
            {t(profile.language, 'communitySubtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setJoined((v) => !v)}
          aria-pressed={joined}
          className={`min-h-[44px] px-5 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors ${
            joined
              ? 'bg-[#EAF4EE] dark:bg-[#192E25] text-[#143D30] dark:text-[#6EE7B7] border border-[#1B4D3E]'
              : 'bg-[#1B4D3E] hover:bg-[#143D30] text-white'
          }`}
        >
          {joined ? (
            <>
              <Check className="w-4 h-4" aria-hidden="true" />
              Pledged for {aqiSnapshot.city}
            </>
          ) : (
            <>
              <Trophy className="w-4 h-4" aria-hidden="true" />
              Join Clean Air Challenge
            </>
          )}
        </button>
      </section>

      {/* Main 3-Column Aggregate Challenge Row */}
      <div className="no-print grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Goal Banner */}
        <section className="lg:col-span-5 rounded-2xl bg-gradient-to-br from-[#EAF5EE] to-[#D4ECE0] dark:from-[#162C23] dark:to-[#0F1F18] border border-[#CBE4D5] dark:border-[#243E32] p-5 flex flex-col justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#1B4D3E] text-[#6EE7B7] flex items-center justify-center shrink-0">
              <Globe2 className="w-7 h-7" aria-hidden="true" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#1B4D3E] dark:text-[#4ADE80]">
                {baseCommunity.city} Monthly Target
              </span>
              <h2 className="text-lg font-bold text-[#122620] dark:text-[#EDF7F2] mt-0.5">
                {baseCommunity.goalText}
              </h2>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-[#122620] dark:text-[#EDF7F2]">
              <span>Collective Progress (Estimate)</span>
              <span className="font-mono-tabular">{baseCommunity.goalProgressPct}% of goal</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={baseCommunity.goalProgressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-3 rounded-full bg-white/80 dark:bg-[#0B1612] overflow-hidden"
            >
              <div
                className="h-full bg-[#1B4D3E] dark:bg-[#4ADE80] rounded-full"
                style={{ width: `${baseCommunity.goalProgressPct}%` }}
              />
            </div>
          </div>

          <p className="text-xs text-[#49635A] dark:text-[#A6C2B6] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#2D8A56] shrink-0" aria-hidden="true" />
            Privacy-first: Only anonymous neighborhood totals are shown — zero personal data or
            addresses.
          </p>
        </section>

        {/* Aggregate Community Stats */}
        <section
          aria-labelledby="community-stats-heading"
          className="lg:col-span-4 rounded-2xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] p-5 shadow-sm space-y-3"
        >
          <h2 id="community-stats-heading" className="text-base font-bold text-[#122620] dark:text-[#EDF7F2]">
            Community Stats (Aggregate)
          </h2>
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="rounded-xl bg-[#F4FAF6] dark:bg-[#172A22] p-3 space-y-1">
              <Users className="w-4 h-4 mx-auto text-[#2D8A56]" aria-hidden="true" />
              <div className="text-lg font-bold font-mono-tabular text-[#122620] dark:text-[#EDF7F2]">
                {(participants / 1000).toFixed(1)}K
              </div>
              <div className="text-[11px] text-[#49635A] dark:text-[#A6C2B6]">Participants</div>
            </div>
            <div className="rounded-xl bg-[#F4FAF6] dark:bg-[#172A22] p-3 space-y-1">
              <Leaf className="w-4 h-4 mx-auto text-[#2D8A56]" aria-hidden="true" />
              <div className="text-lg font-bold font-mono-tabular text-[#122620] dark:text-[#EDF7F2]">
                {baseCommunity.co2eAvoidedTonnes} T
              </div>
              <div className="text-[11px] text-[#49635A] dark:text-[#A6C2B6]">CO2e Avoided</div>
            </div>
            <div className="rounded-xl bg-[#F4FAF6] dark:bg-[#172A22] p-3 space-y-1">
              <Clock className="w-4 h-4 mx-auto text-[#2D8A56]" aria-hidden="true" />
              <div className="text-lg font-bold font-mono-tabular text-[#122620] dark:text-[#EDF7F2]">
                {baseCommunity.cleanerAirHoursMillions}M
              </div>
              <div className="text-[11px] text-[#49635A] dark:text-[#A6C2B6]">Cleaner Hours</div>
            </div>
          </div>
          <p className="text-xs text-[#49635A] dark:text-[#A6C2B6]">
            Every household shifting 3 commutes/week and avoiding leaf burning saves ~18.5 g PM2.5
            and ~3–5 kg CO2e weekly (Modeled Estimate).
          </p>
        </section>

        {/* Aggregate Neighborhood Groups (Zero PII) */}
        <section
          aria-labelledby="neighborhood-groups-heading"
          className="lg:col-span-3 rounded-2xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] p-5 shadow-sm space-y-3"
        >
          <h2
            id="neighborhood-groups-heading"
            className="text-base font-bold text-[#122620] dark:text-[#EDF7F2]"
          >
            Top Neighborhood Circles
          </h2>
          <ol className="space-y-2.5">
            {baseCommunity.neighborhoodGroups.map((grp, idx) => (
              <li
                key={grp.id}
                className="rounded-xl bg-[#F4FAF6] dark:bg-[#172A22] border border-[#DCEBE2] dark:border-[#243B31] px-3 py-2.5 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#122620] dark:text-[#EDF7F2] truncate">
                    #{idx + 1} {grp.name}
                  </div>
                  <div className="text-[11px] text-[#49635A] dark:text-[#A6C2B6]">
                    {grp.households.toLocaleString()} households
                  </div>
                </div>
                <span className="text-xs font-bold font-mono-tabular text-[#1B4D3E] dark:text-[#4ADE80] shrink-0">
                  {grp.co2eTonnes} t
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* WhatsApp Share Card + Printable Community Poster */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section
          aria-labelledby="whatsapp-card-heading"
          className="no-print lg:col-span-6 rounded-2xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] p-5 shadow-sm space-y-3"
        >
          <h2
            id="whatsapp-card-heading"
            className="text-base font-bold text-[#122620] dark:text-[#EDF7F2] flex items-center gap-2"
          >
            <Share2 className="w-4 h-4 text-[#2D8A56]" aria-hidden="true" />
            WhatsApp Neighborhood Share Card
          </h2>
          <pre className="whitespace-pre-wrap rounded-xl bg-[#EAF4EE] dark:bg-[#192E25] p-3.5 text-xs text-[#122620] dark:text-[#EDF7F2] font-sans leading-relaxed">
            {shareMessage}
          </pre>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopyShare}
              className="min-h-[42px] px-4 rounded-xl bg-[#1B4D3E] hover:bg-[#143D30] text-white text-xs font-semibold inline-flex items-center gap-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied for WhatsApp!' : t(profile.language, 'shareWhatsApp')}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[42px] px-4 rounded-xl bg-[#F4FAF6] dark:bg-[#172A22] border border-[#D8E8DF] dark:border-[#253F34] text-xs font-semibold text-[#122620] dark:text-[#EDF7F2] inline-flex items-center gap-2"
            >
              Open WhatsApp Link
            </a>
          </div>
        </section>

        {/* Printable Clean-Air Poster (renders cleanly on window.print()) */}
        <section
          aria-labelledby="poster-heading"
          className="lg:col-span-6 rounded-2xl bg-white dark:bg-[#13221C] border-2 border-dashed border-[#2D8A56] p-5 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wide text-[#2D8A56]">
                RWA & School Noticeboard Poster
              </span>
              <h2 id="poster-heading" className="text-lg font-bold text-[#122620] dark:text-[#EDF7F2]">
                Breathe Smarter in {aqiSnapshot.city}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="no-print min-h-[42px] px-4 rounded-xl bg-[#1B4D3E] hover:bg-[#143D30] text-white text-xs font-semibold inline-flex items-center gap-2"
            >
              <Printer className="w-4 h-4" aria-hidden="true" />
              {t(profile.language, 'printPoster')}
            </button>
          </div>

          <ul className="space-y-2 text-xs text-[#122620] dark:text-[#EDF7F2]">
            <li>
              <strong>1. Zero Leaf & Waste Burning (₹0):</strong> Compost dry leaves instead — avoids
              ~18 g PM2.5 per household every week.
            </li>
            <li>
              <strong>2. Time Your Windows ({aqiSnapshot.bestWindow}):</strong> Keep windows closed
              during morning/night inversions; cross-ventilate in the afternoon.
            </li>
            <li>
              <strong>3. Share Rides & Skip Idling:</strong> Carpool or take transit 3 days/week —
              500 households save ~5+ tonnes CO2e/month (Estimate).
            </li>
            <li>
              <strong>4. Protect Children & Elders:</strong> Move play indoors when AQI &gt; 200 and
              wear a well-fitted N95 mask outdoors when AQI &gt; 300.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
};
