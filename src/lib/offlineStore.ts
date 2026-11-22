import type { AqiSnapshot, DailyPlan, UserProfile } from '../../packages/shared/schemas';

export type ReflectionMood = 'energised' | 'steady' | 'tough' | 'reset';

export interface DailyReflectionEntry {
  dateKey: string;
  mood: ReflectionMood;
  tags: string[];
  note: string;
  completedCount: number;
  totalTasks: number;
  city: string;
  aqi: number;
  updatedAt: string;
}

const KEYS = {
  profile: 'airnest_profile_v1',
  aqi: 'airnest_last_aqi_v1',
  plan: 'airnest_last_plan_v1',
  doneTasks: 'airnest_done_tasks_v1',
  reflections: 'airnest_daily_reflections_v1',
  theme: 'airnest_theme_v1',
  highContrast: 'airnest_high_contrast_v1',
  onboarded: 'airnest_onboarded_v1',
} as const;

function safeRead<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage quota or privacy mode fallback
  }
}

export const offlineStore = {
  loadProfile: () => safeRead<UserProfile>(KEYS.profile),
  saveProfile: (p: UserProfile) => safeWrite(KEYS.profile, p),

  loadAqi: () => safeRead<AqiSnapshot>(KEYS.aqi),
  saveAqi: (a: AqiSnapshot) => safeWrite(KEYS.aqi, a),

  loadPlan: () => safeRead<DailyPlan>(KEYS.plan),
  savePlan: (p: DailyPlan) => safeWrite(KEYS.plan, p),

  loadDoneTasks: () => safeRead<string[]>(KEYS.doneTasks) ?? [],
  saveDoneTasks: (ids: string[]) => safeWrite(KEYS.doneTasks, ids),

  loadReflections: () => safeRead<DailyReflectionEntry[]>(KEYS.reflections) ?? [],
  saveReflection: (entry: DailyReflectionEntry): DailyReflectionEntry[] => {
    const existing = safeRead<DailyReflectionEntry[]>(KEYS.reflections) ?? [];
    const filtered = existing.filter((item) => item.dateKey !== entry.dateKey);
    const next = [entry, ...filtered].slice(0, 14);
    safeWrite(KEYS.reflections, next);
    return next;
  },

  loadTheme: () => safeRead<'light' | 'dark'>(KEYS.theme),
  saveTheme: (mode: 'light' | 'dark') => safeWrite(KEYS.theme, mode),

  loadHighContrast: () => safeRead<boolean>(KEYS.highContrast) ?? false,
  saveHighContrast: (enabled: boolean) => safeWrite(KEYS.highContrast, enabled),

  isOnboarded: () => safeRead<boolean>(KEYS.onboarded) ?? false,
  setOnboarded: (v: boolean) => safeWrite(KEYS.onboarded, v),

  exportAllData(): string {
    const payload = {
      exportedAt: new Date().toISOString(),
      privacyNote: 'Approximate city/grid coordinates only. No medical records stored.',
      profile: safeRead<UserProfile>(KEYS.profile),
      lastCachedAqi: safeRead<AqiSnapshot>(KEYS.aqi),
      lastCachedPlan: safeRead<DailyPlan>(KEYS.plan),
      completedTaskIds: safeRead<string[]>(KEYS.doneTasks) ?? [],
      dailyReflections: safeRead<DailyReflectionEntry[]>(KEYS.reflections) ?? [],
    };
    return JSON.stringify(payload, null, 2);
  },

  clearAllLocalData(): void {
    try {
      for (const key of Object.values(KEYS)) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignore
    }
  },
};
