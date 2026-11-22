import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Leaf, ShieldCheck, Users } from 'lucide-react';
import { t } from '../../packages/shared/i18n/index';
import type { ImpactLayerResult, Language } from '../../packages/shared/schemas';

interface ImpactCardProps {
  impact: ImpactLayerResult;
  language: Language;
  compact?: boolean;
}

export const ImpactCard: React.FC<ImpactCardProps> = ({ impact, language, compact = false }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="rounded-xl bg-[#F4FAF6] dark:bg-[#172A22] border border-[#D8E8DF] dark:border-[#253F34] p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#49635A] dark:text-[#A6C2B6]">
        <span className="font-semibold text-[#122620] dark:text-[#EDF7F2]">
          {t(language, 'estimateLabel')} · Confidence: {impact.confidence}
        </span>
        <span>{impact.citation}</span>
      </div>

      {/* 3-Layer Impact Grid */}
      <div className={`grid ${compact ? 'grid-cols-3 gap-2' : 'grid-cols-1 sm:grid-cols-3 gap-3'}`}>
        <div className="rounded-xl bg-white dark:bg-[#13221C] border border-[#DCEBE2] dark:border-[#243B31] p-3 text-center">
          <div className="flex justify-center mb-1">
            <ShieldCheck className="w-4 h-4 text-[#2D8A56] dark:text-[#4ADE80]" aria-hidden="true" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono-tabular text-[#1B4D3E] dark:text-[#4ADE80]">
            ↓ {impact.personalExposureDeltaPct}%
          </div>
          <div className="text-xs font-medium text-[#122620] dark:text-[#EDF7F2]">
            {t(language, 'personalExposure')}
          </div>
          {!compact && (
            <div className="text-[11px] text-[#49635A] dark:text-[#A6C2B6] font-mono-tabular mt-0.5">
              −{impact.personalPm25AvoidedUgPerDay} µg/m³ PM2.5/day
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white dark:bg-[#13221C] border border-[#DCEBE2] dark:border-[#243B31] p-3 text-center">
          <div className="flex justify-center mb-1">
            <Leaf className="w-4 h-4 text-[#2D8A56] dark:text-[#4ADE80]" aria-hidden="true" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono-tabular text-[#1B4D3E] dark:text-[#4ADE80]">
            {impact.householdCo2eKgPerWeek} kg
          </div>
          <div className="text-xs font-medium text-[#122620] dark:text-[#EDF7F2]">
            CO2e / week
          </div>
          {!compact && (
            <div className="text-[11px] text-[#49635A] dark:text-[#A6C2B6] font-mono-tabular mt-0.5">
              {impact.householdPm25GramsPerWeek} g PM2.5 avoided/wk
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white dark:bg-[#13221C] border border-[#DCEBE2] dark:border-[#243B31] p-3 text-center">
          <div className="flex justify-center mb-1">
            <Users className="w-4 h-4 text-[#2D8A56] dark:text-[#4ADE80]" aria-hidden="true" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono-tabular text-[#1B4D3E] dark:text-[#4ADE80]">
            {impact.communityHouseholdsN}
          </div>
          <div className="text-xs font-medium text-[#122620] dark:text-[#EDF7F2]">
            Households Impact
          </div>
          {!compact && (
            <div className="text-[11px] text-[#49635A] dark:text-[#A6C2B6] font-mono-tabular mt-0.5">
              {impact.communityCo2eTonnesPerMonth} t CO2e/mo · ↓{impact.communityAmbientReductionPct}% local PM2.5
            </div>
          )}
        </div>
      </div>

      {/* Expandable Formulas & Assumptions */}
      <div>
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          aria-expanded={showDetails}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B4D3E] dark:text-[#4ADE80] hover:underline min-h-[36px]"
        >
          {showDetails ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
              {t(language, 'hideFormulas')}
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              {t(language, 'showFormulas')}
            </>
          )}
        </button>

        {showDetails && (
          <div className="mt-2 pt-2.5 border-t border-[#D8E8DF] dark:border-[#253F34] text-xs space-y-2 text-[#49635A] dark:text-[#A6C2B6]">
            <div>
              <strong className="text-[#122620] dark:text-[#EDF7F2]">Formulas:</strong>
              <ul className="list-disc pl-4 mt-1 space-y-0.5 font-mono-tabular">
                {impact.formulas.map((f, idx) => (
                  <li key={idx}>{f}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong className="text-[#122620] dark:text-[#EDF7F2]">Assumptions (Estimates):</strong>
              <ul className="list-disc pl-4 mt-1 space-y-0.5">
                {impact.assumptions.map((a, idx) => (
                  <li key={idx}>{a}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
