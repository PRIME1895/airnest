import React, { useState } from 'react';
import { ArrowRight, Check, Compass, Home, Leaf, LocateFixed, Users, X } from 'lucide-react';
import { DEMO_SCENARIOS, INDIAN_AND_GLOBAL_CITIES } from '../../packages/shared/demoScenarios';
import type {
  BudgetTier,
  CommuteMode,
  CookingFuel,
  HealthCondition,
  HeatingType,
  HomeType,
  Language,
  UserProfile,
} from '../../packages/shared/schemas';

interface OnboardingWizardProps {
  initialProfile: UserProfile;
  onComplete: (profile: UserProfile) => void;
  onClose: () => void;
  onLoadDemo: (key: 'coimbatore' | 'delhi') => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  initialProfile,
  onComplete,
  onClose,
  onLoadDemo,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [draft, setDraft] = useState<UserProfile>(initialProfile);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  const handleAutoLocate = () => {
    if (!navigator.geolocation) {
      setLocError('Geolocation is unavailable in this browser. Pick a city below.');
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const approxLat = Math.round(pos.coords.latitude * 100) / 100;
        const approxLng = Math.round(pos.coords.longitude * 100) / 100;
        setDraft((prev) => ({
          ...prev,
          city: 'Your Area',
          region: `${approxLat.toFixed(2)}°, ${approxLng.toFixed(2)}° (Approx. Grid)`,
          approxLat,
          approxLng,
          scenarioKey: 'custom',
        }));
        setLocating(false);
      },
      () => {
        setLocError('Location permission denied. Select any Indian or global city below.');
        setLocating(false);
      },
      { timeout: 6000 }
    );
  };

  const toggleCondition = (memberIdx: number, cond: HealthCondition) => {
    setDraft((prev) => {
      const next = [...prev.household];
      const current: HealthCondition[] = next[memberIdx].conditions.filter((c) => c !== 'none');
      const updated: HealthCondition[] = current.includes(cond)
        ? current.filter((c) => c !== cond)
        : [...current, cond];
      next[memberIdx] = {
        ...next[memberIdx],
        conditions: updated.length > 0 ? updated : ['none'],
      };
      return { ...prev, household: next };
    });
  };

  const handleFinish = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({ ...draft, displayName: draft.displayName.trim() || 'Family' });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-heading"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] shadow-xl p-6 space-y-5 my-auto">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1B4D3E] text-[#6EE7B7] flex items-center justify-center">
              <Leaf className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="onboarding-heading" className="text-lg font-bold text-[#122620] dark:text-[#EDF7F2]">
                60-Second AirNest Setup
              </h2>
              <p className="text-xs text-[#49635A] dark:text-[#A6C2B6]">
                Step {step} of 3 · Approximate location only · Always includes ₹0 actions
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close setup wizard"
            className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-[#49635A] hover:bg-[#EAF4EE] dark:hover:bg-[#192E25]"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Instant Demo Mode Quick Launchers */}
        <div className="rounded-xl bg-[#EAF4EE] dark:bg-[#192E25] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-semibold text-[#122620] dark:text-[#EDF7F2]">
            Or jump into a preloaded Demo Scenario:
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onLoadDemo('delhi')}
              className="px-3 py-1.5 min-h-[36px] rounded-lg bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] text-xs font-semibold text-[#122620] dark:text-[#EDF7F2] hover:border-[#1B4D3E]"
            >
              Delhi AQI 420 (Severe)
            </button>
            <button
              type="button"
              onClick={() => onLoadDemo('coimbatore')}
              className="px-3 py-1.5 min-h-[36px] rounded-lg bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] text-xs font-semibold text-[#122620] dark:text-[#EDF7F2] hover:border-[#1B4D3E]"
            >
              Coimbatore AQI 85
            </button>
          </div>
        </div>

        <form onSubmit={handleFinish} className="space-y-4">
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1 text-xs font-semibold text-[#122620] dark:text-[#EDF7F2]">
                  <span>Your Name</span>
                  <input
                    type="text"
                    required
                    maxLength={60}
                    value={draft.displayName}
                    onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-[#D8E8DF] dark:border-[#253F34] bg-white dark:bg-[#0F1C17] text-sm"
                  />
                </label>

                <label className="block space-y-1 text-xs font-semibold text-[#122620] dark:text-[#EDF7F2]">
                  <span>Language</span>
                  <select
                    value={draft.language}
                    onChange={(e) => setDraft({ ...draft, language: e.target.value as Language })}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-[#D8E8DF] dark:border-[#253F34] bg-white dark:bg-[#0F1C17] text-sm"
                  >
                    <option value="en">English</option>
                    <option value="hi">हिन्दी (Hindi)</option>
                    <option value="ta">தமிழ் (Tamil)</option>
                  </select>
                </label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#122620] dark:text-[#EDF7F2] flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-[#2D8A56]" aria-hidden="true" />
                    Select City (India-first & Global)
                  </span>
                  <button
                    type="button"
                    onClick={handleAutoLocate}
                    disabled={locating}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B4D3E] dark:text-[#4ADE80] hover:underline min-h-[36px]"
                  >
                    <LocateFixed className="w-3.5 h-3.5" aria-hidden="true" />
                    {locating ? 'Locating...' : 'Use approx. location'}
                  </button>
                </div>

                {locError && (
                  <p role="alert" className="text-xs text-amber-800 dark:text-amber-300">
                    {locError}
                  </p>
                )}

                <select
                  aria-label="Select city"
                  value={draft.city}
                  onChange={(e) => {
                    const match = INDIAN_AND_GLOBAL_CITIES.find((c) => c.city === e.target.value);
                    if (match) {
                      setDraft({
                        ...draft,
                        city: match.city,
                        region: match.region,
                        approxLat: match.lat,
                        approxLng: match.lng,
                        scenarioKey:
                          match.city === 'New Delhi'
                            ? 'delhi'
                            : match.city === 'Coimbatore'
                              ? 'coimbatore'
                              : 'custom',
                      });
                    }
                  }}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-[#D8E8DF] dark:border-[#253F34] bg-white dark:bg-[#0F1C17] text-sm"
                >
                  {INDIAN_AND_GLOBAL_CITIES.map((c) => (
                    <option key={c.city} value={c.city}>
                      {c.city} — {c.region}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-[#122620] dark:text-[#EDF7F2] flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#2D8A56]" aria-hidden="true" />
                Household Sensitivity Profile (Stored privately on device/your account only)
              </div>
              {draft.household.map((member, idx) => (
                <div
                  key={member.id}
                  className="rounded-xl border border-[#D8E8DF] dark:border-[#253F34] p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#122620] dark:text-[#EDF7F2]">
                      {member.label} ({member.role})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(['asthma', 'heart_condition', 'pregnancy'] as const).map((cond) => {
                      const active = member.conditions.includes(cond);
                      return (
                        <button
                          key={cond}
                          type="button"
                          onClick={() => toggleCondition(idx, cond)}
                          aria-pressed={active}
                          className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold border transition-colors ${
                            active
                              ? 'bg-[#1B4D3E] text-white border-[#1B4D3E]'
                              : 'bg-white dark:bg-[#0F1C17] text-[#49635A] dark:text-[#A6C2B6] border-[#D8E8DF] dark:border-[#253F34]'
                          }`}
                        >
                          {cond.replace('_', ' ')}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1 text-xs font-semibold">
                <span className="flex items-center gap-1">
                  <Home className="w-3.5 h-3.5 text-[#2D8A56]" aria-hidden="true" />
                  Home Type
                </span>
                <select
                  value={draft.homeType}
                  onChange={(e) => setDraft({ ...draft, homeType: e.target.value as HomeType })}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-[#D8E8DF] dark:border-[#253F34] bg-white dark:bg-[#0F1C17] text-sm"
                >
                  <option value="apartment_1bhk">1 BHK Apartment</option>
                  <option value="apartment_2bhk">2 BHK Apartment</option>
                  <option value="apartment_3bhk">3 BHK Apartment</option>
                  <option value="independent_house">Independent House</option>
                  <option value="shared_room">Shared Room / PG</option>
                </select>
              </label>

              <label className="block space-y-1 text-xs font-semibold">
                <span>Primary Commute</span>
                <select
                  value={draft.commuteMode}
                  onChange={(e) =>
                    setDraft({ ...draft, commuteMode: e.target.value as CommuteMode })
                  }
                  className="w-full min-h-[44px] px-3 rounded-xl border border-[#D8E8DF] dark:border-[#253F34] bg-white dark:bg-[#0F1C17] text-sm"
                >
                  <option value="public_transit">Metro / Bus</option>
                  <option value="walk_cycle">Walk / Cycle</option>
                  <option value="two_wheeler">Two-Wheeler</option>
                  <option value="carpool">Carpool</option>
                  <option value="private_car">Private Car</option>
                  <option value="work_from_home">Work from Home</option>
                </select>
              </label>

              <label className="block space-y-1 text-xs font-semibold">
                <span>Cooking Fuel</span>
                <select
                  value={draft.cookingFuel}
                  onChange={(e) =>
                    setDraft({ ...draft, cookingFuel: e.target.value as CookingFuel })
                  }
                  className="w-full min-h-[44px] px-3 rounded-xl border border-[#D8E8DF] dark:border-[#253F34] bg-white dark:bg-[#0F1C17] text-sm"
                >
                  <option value="lpg">LPG Cylinder</option>
                  <option value="png_piped">Piped Natural Gas (PNG)</option>
                  <option value="induction_electric">Induction / Electric</option>
                  <option value="biomass_kerosene">Biomass / Kerosene</option>
                </select>
              </label>

              <label className="block space-y-1 text-xs font-semibold">
                <span>Winter Heating</span>
                <select
                  value={draft.heatingType}
                  onChange={(e) =>
                    setDraft({ ...draft, heatingType: e.target.value as HeatingType })
                  }
                  className="w-full min-h-[44px] px-3 rounded-xl border border-[#D8E8DF] dark:border-[#253F34] bg-white dark:bg-[#0F1C17] text-sm"
                >
                  <option value="none">None / Warm Layering</option>
                  <option value="electric">Electric / Oil Heater</option>
                  <option value="lpg_gas">Gas Heater</option>
                  <option value="wood_coal_heater">Wood / Coal Brazier</option>
                </select>
              </label>

              <label className="block space-y-1 text-xs font-semibold sm:col-span-2">
                <span>Clean-Air Budget</span>
                <select
                  value={draft.budget}
                  onChange={(e) => setDraft({ ...draft, budget: e.target.value as BudgetTier })}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-[#D8E8DF] dark:border-[#253F34] bg-white dark:bg-[#0F1C17] text-sm"
                >
                  <option value="low">Low Budget (Prioritize ₹0 & DIY steps)</option>
                  <option value="moderate">Moderate Budget</option>
                  <option value="flexible">Flexible Budget</option>
                </select>
              </label>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-[#E4EFE9] dark:border-[#21382E]">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
                className="min-h-[44px] px-4 rounded-xl border border-[#D8E8DF] dark:border-[#253F34] text-sm font-semibold"
              >
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 rounded-xl text-sm font-medium text-[#49635A] dark:text-[#A6C2B6]"
              >
                Skip for now
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s === 1 ? 2 : 3))}
                className="min-h-[44px] px-5 rounded-xl bg-[#1B4D3E] hover:bg-[#143D30] text-white text-sm font-semibold inline-flex items-center gap-2"
              >
                Next
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="submit"
                className="min-h-[44px] px-5 rounded-xl bg-[#1B4D3E] hover:bg-[#143D30] text-white text-sm font-semibold inline-flex items-center gap-2"
              >
                <Check className="w-4 h-4" aria-hidden="true" />
                Save My Clean-Air Profile
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
