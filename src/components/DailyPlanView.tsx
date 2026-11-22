import React, { useState } from 'react';
import {
  CalendarPlus,
  CheckCircle2,
  Circle,
  Clock,
  Info,
  Lightbulb,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import { t } from '../../packages/shared/i18n/index';
import type { AqiSnapshot, DailyPlan, DailyPlanItem, UserProfile } from '../../packages/shared/schemas';
import { createPlanEventInCalendar } from '../lib/calendar';
import { getInMemoryCalendarToken } from '../lib/firebase';
import { ImpactCard } from './ImpactCard';

interface DailyPlanViewProps {
  profile: UserProfile;
  aqiSnapshot: AqiSnapshot;
  plan: DailyPlan;
  doneTaskIds: string[];
  loadingPlan: boolean;
  onToggleDone: (taskId: string) => void;
  onRefreshPlan: (mode: 'daily' | 'weekly') => void;
  onRequestGoogleSignIn: () => Promise<string | null>;
}

export const DailyPlanView: React.FC<DailyPlanViewProps> = ({
  profile,
  aqiSnapshot,
  plan,
  doneTaskIds,
  loadingPlan,
  onToggleDone,
  onRefreshPlan,
  onRequestGoogleSignIn,
}) => {
  const [expandedImpactId, setExpandedImpactId] = useState<string | null>(plan.items[0]?.id ?? null);
  const [confirmItem, setConfirmItem] = useState<DailyPlanItem | null>(null);
  const [calendarBusy, setCalendarBusy] = useState(false);
  const [calendarFeedback, setCalendarFeedback] = useState<string | null>(null);

  const completedCount = plan.items.filter((i) => doneTaskIds.includes(i.id)).length;
  const progressPct = Math.round((completedCount / Math.max(1, plan.items.length)) * 100);

  const handleConfirmCalendarSync = async () => {
    if (!confirmItem) return;
    setCalendarBusy(true);
    setCalendarFeedback(null);
    try {
      let token = getInMemoryCalendarToken();
      if (!token) {
        token = await onRequestGoogleSignIn();
      }
      if (!token) {
        setCalendarFeedback('Sign in with Google and grant Calendar permission to add reminders.');
        return;
      }
      const created = await createPlanEventInCalendar(token, plan.city, confirmItem);
      setCalendarFeedback(`Added to Google Calendar: "${created.summary}".`);
      setConfirmItem(null);
    } catch (err) {
      setCalendarFeedback(
        err instanceof Error ? err.message : 'Unable to sync event to Google Calendar right now.'
      );
    } finally {
      setCalendarBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <section className="airnest-sky-backdrop rounded-2xl border border-[#D8E8DF] dark:border-[#253F34] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#122620] dark:text-[#EDF7F2]">
            {t(profile.language, 'dailyPlanTitle')}
          </h1>
          <p className="text-sm text-[#49635A] dark:text-[#A6C2B6] mt-0.5">
            Personalized for {plan.city} · {aqiSnapshot.temperatureC}°C · {plan.aqiBand} AQI (
            {aqiSnapshot.aqi}) · Always includes ₹0 steps
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={loadingPlan}
            onClick={() => onRefreshPlan('daily')}
            className={`min-h-[42px] px-3.5 rounded-xl text-xs font-semibold border transition-colors ${
              plan.mode === 'daily'
                ? 'bg-[#1B4D3E] text-white border-[#1B4D3E]'
                : 'bg-white dark:bg-[#13221C] text-[#122620] dark:text-[#EDF7F2] border-[#D8E8DF] dark:border-[#253F34]'
            }`}
          >
            Today&apos;s Plan
          </button>
          <button
            type="button"
            disabled={loadingPlan}
            onClick={() => onRefreshPlan('weekly')}
            className={`min-h-[42px] px-3.5 rounded-xl text-xs font-semibold border inline-flex items-center gap-1.5 transition-colors ${
              plan.mode === 'weekly'
                ? 'bg-[#1B4D3E] text-white border-[#1B4D3E]'
                : 'bg-white dark:bg-[#13221C] text-[#122620] dark:text-[#EDF7F2] border-[#D8E8DF] dark:border-[#253F34]'
            }`}
          >
            {loadingPlan ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            Deep AI Weekly Plan
          </button>
        </div>
      </section>

      {calendarFeedback && (
        <div
          role="status"
          className="rounded-xl bg-[#EAF4EE] dark:bg-[#192E25] border border-[#CBE4D5] dark:border-[#253F34] px-4 py-3 text-sm text-[#122620] dark:text-[#EDF7F2] flex items-center justify-between gap-3"
        >
          <span>{calendarFeedback}</span>
          <button
            type="button"
            onClick={() => setCalendarFeedback(null)}
            aria-label="Dismiss calendar status"
            className="p-1 text-[#49635A] hover:text-[#122620]"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Main 2-Column Layout matching AirNest AI Daily Plan reference */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Timeline Schedule with Done-Tracking + Expandable 3-Layer Impact */}
        <section
          aria-labelledby="schedule-heading"
          className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2
              id="schedule-heading"
              className="text-base font-bold text-[#122620] dark:text-[#EDF7F2] flex items-center gap-2"
            >
              <Clock className="w-4 h-4 text-[#2D8A56]" aria-hidden="true" />
              Your Schedule
            </h2>
            <span className="text-xs font-mono-tabular text-[#49635A] dark:text-[#A6C2B6]">
              {completedCount}/{plan.items.length} done ({progressPct}%)
            </span>
          </div>

          <ol className="space-y-4 relative before:absolute before:left-[15px] before:top-4 before:bottom-4 before:w-0.5 before:bg-[#DCEBE2] dark:before:bg-[#253F34]">
            {plan.items.map((item) => {
              const isDone = doneTaskIds.includes(item.id);
              const showImpact = expandedImpactId === item.id;
              return (
                <li key={item.id} className="relative pl-10">
                  <button
                    type="button"
                    onClick={() => onToggleDone(item.id)}
                    aria-pressed={isDone}
                    aria-label={`${isDone ? 'Mark incomplete' : 'Mark done'}: ${item.title}`}
                    className="absolute left-0 top-1 w-8 h-8 rounded-full bg-white dark:bg-[#13221C] flex items-center justify-center text-[#1B4D3E] dark:text-[#4ADE80]"
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-6 h-6 fill-[#1B4D3E] text-white dark:fill-[#4ADE80] dark:text-[#0B1612]" />
                    ) : (
                      <Circle className="w-6 h-6 text-[#96B8A7]" />
                    )}
                  </button>

                  <div
                    className={`rounded-xl border p-4 space-y-2.5 transition-colors ${
                      isDone
                        ? 'bg-[#EAF4EE]/60 dark:bg-[#172A22]/70 border-[#BEE0CC] dark:border-[#2A4A3C]'
                        : 'bg-[#F8FCF9] dark:bg-[#0F1D17] border-[#DCEBE2] dark:border-[#243B31]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold font-mono-tabular text-[#1B4D3E] dark:text-[#4ADE80]">
                        {item.timeWindow}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-[#E5F3EC] dark:bg-[#1C382B] text-[#143D30] dark:text-[#6EE7B7] text-xs font-bold">
                          {item.costTag}
                        </span>
                        <span className="text-xs font-mono-tabular text-[#49635A] dark:text-[#A6C2B6]">
                          Est. AQI {item.aqiExpected}
                        </span>
                      </div>
                    </div>

                    <h3
                      className={`text-sm font-bold text-[#122620] dark:text-[#EDF7F2] ${
                        isDone ? 'line-through opacity-75' : ''
                      }`}
                    >
                      {item.title}
                    </h3>

                    <p className="text-xs text-[#49635A] dark:text-[#A6C2B6] leading-relaxed">
                      {item.detail}
                    </p>

                    <div className="text-xs font-semibold text-[#1B4D3E] dark:text-[#4ADE80]">
                      What this changes: {item.impactSummary}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setExpandedImpactId(showImpact ? null : item.id)}
                        aria-expanded={showImpact}
                        className="min-h-[36px] px-3 rounded-lg bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] text-xs font-semibold text-[#122620] dark:text-[#EDF7F2] hover:border-[#1B4D3E]"
                      >
                        {showImpact ? 'Hide 3-Layer Impact' : 'See 3-Layer Impact & Formulas'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirmItem(item)}
                        className="min-h-[36px] px-3 rounded-lg bg-[#EAF4EE] dark:bg-[#192E25] text-xs font-semibold text-[#1B4D3E] dark:text-[#4ADE80] inline-flex items-center gap-1.5 hover:bg-[#DCEEE4]"
                      >
                        <CalendarPlus className="w-3.5 h-3.5" aria-hidden="true" />
                        {t(profile.language, 'addToCalendar')}
                      </button>
                    </div>

                    {showImpact && <ImpactCard impact={item.impact} language={profile.language} />}
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Bottom Progress Strip */}
          <div className="rounded-xl bg-[#EAF4EE] dark:bg-[#192E25] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#122620] dark:text-[#EDF7F2]">
              <CheckCircle2 className="w-4 h-4 text-[#2D8A56]" aria-hidden="true" />
              <span>{t(profile.language, 'markTasksHint')}</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Daily plan completion progress"
              className="w-full sm:w-40 h-2.5 rounded-full bg-white dark:bg-[#0F1D17] overflow-hidden"
            >
              <div
                className="h-full bg-[#1B4D3E] dark:bg-[#4ADE80] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </section>

        {/* Right: Inversion Physics Explanation + Family Tips + Disclaimer */}
        <div className="lg:col-span-5 space-y-5">
          <section
            aria-labelledby="why-plan-heading"
            className="rounded-2xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] p-5 shadow-sm space-y-3"
          >
            <h2
              id="why-plan-heading"
              className="text-base font-bold text-[#122620] dark:text-[#EDF7F2] flex items-center gap-2"
            >
              <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              {t(profile.language, 'whyRecommendations')}
            </h2>
            <p className="text-sm text-[#49635A] dark:text-[#A6C2B6] leading-relaxed">
              {plan.inversionExplanation}
            </p>
            <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs font-mono-tabular">
              <div className="rounded-xl bg-[#F4FAF6] dark:bg-[#172A22] p-3">
                <div className="text-[#49635A] dark:text-[#A6C2B6]">Boundary Layer</div>
                <div className="text-base font-bold text-[#122620] dark:text-[#EDF7F2]">
                  {aqiSnapshot.boundaryLayerM} m
                </div>
              </div>
              <div className="rounded-xl bg-[#F4FAF6] dark:bg-[#172A22] p-3">
                <div className="text-[#49635A] dark:text-[#A6C2B6]">Surface Wind</div>
                <div className="text-base font-bold text-[#122620] dark:text-[#EDF7F2]">
                  {aqiSnapshot.windKmh} km/h
                </div>
              </div>
            </div>
          </section>

          <section
            aria-labelledby="family-tips-heading"
            className="rounded-2xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] p-5 shadow-sm space-y-3"
          >
            <h2
              id="family-tips-heading"
              className="text-base font-bold text-[#122620] dark:text-[#EDF7F2] flex items-center gap-2"
            >
              <ShieldAlert className="w-4 h-4 text-[#2D8A56]" aria-hidden="true" />
              {t(profile.language, 'specialTipsFamily')}
            </h2>
            <div className="space-y-2.5">
              {plan.memberTips.map((tip) => (
                <div
                  key={tip.memberId}
                  className="rounded-xl bg-[#F4FAF6] dark:bg-[#172A22] border border-[#DCEBE2] dark:border-[#243B31] p-3 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#122620] dark:text-[#EDF7F2]">
                      {tip.label}
                    </span>
                    <span className="text-xs font-semibold text-[#1B4D3E] dark:text-[#4ADE80]">
                      {tip.riskLevel} Risk
                    </span>
                  </div>
                  <p className="text-xs text-[#49635A] dark:text-[#A6C2B6] leading-relaxed">
                    {tip.guidance}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <div className="rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 flex items-start gap-2.5 text-xs text-amber-950 dark:text-amber-200">
            <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <p>{plan.medicalDisclaimer}</p>
          </div>
        </div>
      </div>

      {/* Explicit Confirmation Modal Before Creating Google Calendar Event */}
      {confirmItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-cal-heading"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="max-w-md w-full rounded-2xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] p-5 shadow-xl space-y-4">
            <h2 id="confirm-cal-heading" className="text-lg font-bold text-[#122620] dark:text-[#EDF7F2]">
              Confirm Google Calendar Event
            </h2>
            <p className="text-sm text-[#49635A] dark:text-[#A6C2B6]">
              AirNest will create a reminder on your primary Google Calendar with the following details:
            </p>
            <div className="rounded-xl bg-[#F4FAF6] dark:bg-[#172A22] p-3 text-xs space-y-1">
              <div className="font-bold text-[#122620] dark:text-[#EDF7F2]">
                AirNest ({plan.city}): {confirmItem.title}
              </div>
              <div className="font-mono-tabular text-[#1B4D3E] dark:text-[#4ADE80]">
                Window: {confirmItem.timeWindow}
              </div>
              <div className="text-[#49635A] dark:text-[#A6C2B6]">{confirmItem.impactSummary}</div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmItem(null)}
                className="min-h-[42px] px-4 rounded-xl border border-[#D8E8DF] dark:border-[#253F34] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={calendarBusy}
                onClick={handleConfirmCalendarSync}
                className="min-h-[42px] px-4 rounded-xl bg-[#1B4D3E] hover:bg-[#143D30] text-white text-xs font-semibold"
              >
                {calendarBusy ? 'Adding...' : 'Confirm & Add Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
