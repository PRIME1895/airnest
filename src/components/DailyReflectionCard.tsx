import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  CloudRain,
  Edit3,
  Flame,
  Leaf,
  RotateCcw,
  Smile,
  Sun,
} from 'lucide-react';
import type { AqiSnapshot, DailyPlan } from '../../packages/shared/schemas';
import {
  offlineStore,
  type DailyReflectionEntry,
  type ReflectionMood,
} from '../lib/offlineStore';

interface DailyReflectionCardProps {
  aqiSnapshot: AqiSnapshot;
  dailyPlan: DailyPlan;
  doneTaskIds: string[];
  onOpenDailyPlan: () => void;
}

interface MoodOption {
  id: ReflectionMood;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  activeTone: string;
  coachingNote: (completed: number, city: string, bestWindow: string) => string;
}

const MOOD_OPTIONS: MoodOption[] = [
  {
    id: 'energised',
    label: 'Energised',
    subtitle: 'Stuck to my clean-air routine',
    icon: <Sun className="w-4 h-4" aria-hidden="true" />,
    activeTone:
      'bg-[#1B4D3E] text-white border-[#1B4D3E] shadow-sm dark:bg-[#2D8A56] dark:border-[#2D8A56]',
    coachingNote: (completed, city) => {
      const count = Math.max(completed, 1);
      return completed > 0
        ? `Strong momentum in ${city}! Completing ${count} low-emission ${count === 1 ? 'step' : 'steps'} today keeps indoor PM2.5 lower and cuts weekly CO₂e (modeled estimate).`
        : `Strong momentum in ${city}! Keep your clean-air streak going by checking off even one ₹0 step in your Daily Plan today (modeled estimate).`;
    },
  },
  {
    id: 'steady',
    label: 'Steady',
    subtitle: 'Hit the key ₹0 windows',
    icon: <Smile className="w-4 h-4" aria-hidden="true" />,
    activeTone:
      'bg-[#1F7A54] text-white border-[#1F7A54] shadow-sm dark:bg-[#247A53] dark:border-[#247A53]',
    coachingNote: (_, city, bestWindow) =>
      `Consistent ₹0 habits add up fast. Keep using ${city}'s cleanest window (${bestWindow}) for natural ventilation tomorrow.`,
  },
  {
    id: 'tough',
    label: 'Tough Air Day',
    subtitle: 'Smog made it harder today',
    icon: <CloudRain className="w-4 h-4" aria-hidden="true" />,
    activeTone:
      'bg-amber-700 text-white border-amber-700 shadow-sm dark:bg-amber-700 dark:border-amber-600',
    coachingNote: (_, city, bestWindow) =>
      `High pollution in ${city} is draining—even one ₹0 move (sealing drafts during peak smog + ventilating at ${bestWindow}) meaningfully reduces exposure.`,
  },
  {
    id: 'reset',
    label: 'Reset Tomorrow',
    subtitle: 'Missed today, ready for a fresh start',
    icon: <RotateCcw className="w-4 h-4" aria-hidden="true" />,
    activeTone:
      'bg-slate-700 text-white border-slate-700 shadow-sm dark:bg-slate-600 dark:border-slate-500',
    coachingNote: (_, __, bestWindow) =>
      `No pressure—start tomorrow with one effortless ₹0 anchor: open windows briefly during ${bestWindow} and close them before traffic peaks.`,
  },
];

const QUICK_TAGS = [
  '₹0 window timing',
  'Transit / carpool',
  'Cleaner cooking',
  'Protected family',
  'DIY / purifier filter',
] as const;

function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const DailyReflectionCard: React.FC<DailyReflectionCardProps> = ({
  aqiSnapshot,
  dailyPlan,
  doneTaskIds,
  onOpenDailyPlan,
}) => {
  const todayKey = useMemo(() => getTodayDateKey(), []);
  const [history, setHistory] = useState<DailyReflectionEntry[]>(() =>
    offlineStore.loadReflections()
  );

  const todaySaved = useMemo(
    () => history.find((entry) => entry.dateKey === todayKey) ?? null,
    [history, todayKey]
  );

  const [selectedMood, setSelectedMood] = useState<ReflectionMood>(
    () => todaySaved?.mood ?? 'steady'
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(() => todaySaved?.tags ?? []);
  const [note, setNote] = useState<string>(() => todaySaved?.note ?? '');
  const [editing, setEditing] = useState<boolean>(() => !todaySaved);

  const totalTasks = dailyPlan.items.length;
  const completedCount = doneTaskIds.length;
  const estDailyCo2eKg = Math.round(completedCount * 0.45 * 100) / 100;

  const activeMoodObj =
    MOOD_OPTIONS.find((m) => m.id === (todaySaved && !editing ? todaySaved.mood : selectedMood)) ??
    MOOD_OPTIONS[1];

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const entry: DailyReflectionEntry = {
      dateKey: todayKey,
      mood: selectedMood,
      tags: selectedTags,
      note: note.trim().slice(0, 200),
      completedCount,
      totalTasks,
      city: aqiSnapshot.city,
      aqi: aqiSnapshot.aqi,
      updatedAt: new Date().toISOString(),
    };
    const nextHistory = offlineStore.saveReflection(entry);
    setHistory(nextHistory);
    setEditing(false);
  };

  return (
    <section
      aria-labelledby="daily-reflection-heading"
      className="rounded-2xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] p-5 sm:p-6 shadow-sm space-y-4"
    >
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#EAF4EE] dark:bg-[#1A3428] text-[#1F8A4C] dark:text-[#4ADE80] flex items-center justify-center">
              <Leaf className="w-4 h-4" aria-hidden="true" />
            </span>
            <h2
              id="daily-reflection-heading"
              className="text-base sm:text-lg font-bold text-[#122620] dark:text-[#EDF7F2]"
            >
              Daily Quick-Reflection
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#49635A] dark:text-[#A6C2B6]">
            How did you feel about your low-emission plan progress today?
          </p>
        </div>

        {/* Live Progress + Streak Pill */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-[#F4FAF6] dark:bg-[#172A22] border border-[#DCEBE2] dark:border-[#243B31] font-semibold text-[#122620] dark:text-[#EDF7F2] tabular-nums">
            Plan today: {completedCount}/{totalTasks} done
            {estDailyCo2eKg > 0 ? ` · ~${estDailyCo2eKg} kg CO₂e est.` : ''}
          </span>
          {history.length > 0 && (
            <span className="px-3 py-1.5 rounded-xl bg-[#EAF5EE] dark:bg-[#1C382B] text-[#143D30] dark:text-[#6EE7B7] font-bold inline-flex items-center gap-1 tabular-nums">
              <Flame className="w-3.5 h-3.5 text-[#1F8A4C] dark:text-[#4ADE80]" aria-hidden="true" />
              {history.length} day{history.length === 1 ? '' : 's'} logged
            </span>
          )}
        </div>
      </div>

      {/* Saved Confirmation View OR Interactive Quick-Reflection Form */}
      {todaySaved && !editing ? (
        <div className="rounded-xl bg-[#F4FAF6] dark:bg-[#172A22] border border-[#DCEBE2] dark:border-[#243B31] p-4 space-y-3 animate-airnest-stage-enter">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <span className="w-9 h-9 rounded-xl bg-[#1B4D3E] dark:bg-[#2D8A56] text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
              </span>
              <div className="space-y-1">
                <div className="text-sm font-bold text-[#122620] dark:text-[#EDF7F2]">
                  Today&apos;s Check-In: {activeMoodObj.label}
                </div>
                <p className="text-xs sm:text-sm text-[#355248] dark:text-[#B5CFC3] leading-relaxed">
                  {activeMoodObj.coachingNote(
                    todaySaved.completedCount,
                    aqiSnapshot.city,
                    aqiSnapshot.bestWindow
                  )}
                </p>
                {todaySaved.note && (
                  <p className="text-xs italic text-[#49635A] dark:text-[#A6C2B6] pt-0.5">
                    &ldquo;{todaySaved.note}&rdquo;
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setEditing(true)}
              className="min-h-[36px] px-3 rounded-lg bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] text-xs font-semibold text-[#1B4D3E] dark:text-[#6EE7B7] inline-flex items-center gap-1.5 hover:bg-[#EAF4EE] dark:hover:bg-[#1E352B]"
            >
              <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
              Edit
            </button>
          </div>

          {todaySaved.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {todaySaved.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] text-[11px] font-semibold text-[#1B4D3E] dark:text-[#6EE7B7]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          {/* 4 Mood Sentiment Buttons */}
          <div
            role="radiogroup"
            aria-label="How did you feel about your low-emission progress today?"
            className="grid grid-cols-2 lg:grid-cols-4 gap-2.5"
          >
            {MOOD_OPTIONS.map((option) => {
              const selected = selectedMood === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setSelectedMood(option.id)}
                  className={`min-h-[68px] rounded-xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between gap-1 ${
                    selected
                      ? option.activeTone
                      : 'bg-[#F8FCF9] dark:bg-[#162820] border-[#DCEBE2] dark:border-[#243B31] text-[#122620] dark:text-[#EDF7F2] hover:border-[#2D8A56]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-xs sm:text-sm font-bold">{option.label}</span>
                    {option.icon}
                  </div>
                  <span
                    className={`text-[11px] leading-snug ${
                      selected ? 'text-white/90' : 'text-[#49635A] dark:text-[#A6C2B6]'
                    }`}
                  >
                    {option.subtitle}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Win Tags */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[#49635A] dark:text-[#A6C2B6]">
              What helped most?
            </span>
            {QUICK_TAGS.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleTag(tag)}
                  className={`min-h-[34px] px-3 rounded-lg border text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-[#E5F3EC] dark:bg-[#1C382B] border-[#1F8A4C] text-[#143D30] dark:text-[#6EE7B7]'
                      : 'bg-white dark:bg-[#0F1D17] border-[#D8E8DF] dark:border-[#253F34] text-[#49635A] dark:text-[#A6C2B6] hover:border-[#2D8A56]'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>

          {/* Optional Note + Save CTA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <label htmlFor="daily-reflection-note" className="sr-only">
              Optional reflection note
            </label>
            <input
              id="daily-reflection-note"
              type="text"
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional: one quick win or challenge from today's routine..."
              className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-[#F8FCF9] dark:bg-[#0F1D17] border border-[#D8E8DF] dark:border-[#253F34] text-sm text-[#122620] dark:text-[#EDF7F2] placeholder:text-[#637C73]"
            />
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="submit"
                className="airnest-shimmer-btn min-h-[44px] px-5 rounded-xl bg-[#1B4D3E] hover:bg-[#143D30] text-white text-xs sm:text-sm font-semibold transition-colors"
              >
                Save Check-In
              </button>
              {completedCount === 0 && (
                <button
                  type="button"
                  onClick={onOpenDailyPlan}
                  className="min-h-[44px] px-3.5 rounded-xl bg-[#EAF4EE] dark:bg-[#192E25] text-[#1B4D3E] dark:text-[#6EE7B7] text-xs font-semibold hover:bg-[#DCEEE3] dark:hover:bg-[#223B2F]"
                >
                  Open Plan
                </button>
              )}
            </div>
          </div>
        </form>
      )}
    </section>
  );
};
