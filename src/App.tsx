import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { AlertTriangle, Bell, Leaf, WifiOff, X } from 'lucide-react';
import { DEMO_SCENARIOS, INDIAN_AND_GLOBAL_CITIES } from '../packages/shared/demoScenarios';
import { t } from '../packages/shared/i18n/index';
import { buildDeterministicDailyPlan } from '../packages/shared/impact/index';
import type { AqiSnapshot, DailyPlan, Language, UserProfile } from '../packages/shared/schemas';
import { LandingPage } from './components/LandingPage';
import { MobileBottomNav, Sidebar, TopBar, type AirNestRoute } from './components/Navigation';
import { OnboardingWizard } from './components/OnboardingWizard';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import {
  evaluateAndTriggerAqiAlert,
  getStoredAqiThreshold,
  isUnhealthyAqi,
  saveStoredAqiThreshold,
} from './lib/aqiNotifications';
import { offlineStore } from './lib/offlineStore';

type AppStage = 'landing' | 'login' | 'dashboard';

const LazyLoginPage = lazy(() =>
  import('./components/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const LazyDashboardView = lazy(() =>
  import('./components/DashboardView').then((m) => ({ default: m.DashboardView }))
);
const LazyDailyPlanView = lazy(() =>
  import('./components/DailyPlanView').then((m) => ({ default: m.DailyPlanView }))
);
const LazyIndoorCoachView = lazy(() =>
  import('./components/IndoorCoachView').then((m) => ({ default: m.IndoorCoachView }))
);
const LazyImpactExplorerView = lazy(() =>
  import('./components/ImpactExplorerView').then((m) => ({ default: m.ImpactExplorerView }))
);
const LazyWhatIfSimulatorView = lazy(() =>
  import('./components/WhatIfSimulatorView').then((m) => ({ default: m.WhatIfSimulatorView }))
);
const LazyCommunityView = lazy(() =>
  import('./components/CommunityView').then((m) => ({ default: m.CommunityView }))
);
const LazyAssistantView = lazy(() =>
  import('./components/AssistantView').then((m) => ({ default: m.AssistantView }))
);
const LazySettingsView = lazy(() =>
  import('./components/SettingsView').then((m) => ({ default: m.SettingsView }))
);

const VALID_ROUTES: AirNestRoute[] = [
  'home',
  'plan',
  'indoor',
  'impact',
  'simulator',
  'community',
  'assistant',
  'settings',
];

function getInitialScenario(): 'coimbatore' | 'delhi' {
  const params = new URLSearchParams(window.location.search);
  return params.get('scenario') === 'delhi' ? 'delhi' : 'coimbatore';
}

function getInitialStage(): AppStage {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  if (view === 'login') return 'login';
  if (
    view === 'dashboard' ||
    params.get('autostart') === '1' ||
    params.has('scenario') ||
    params.has('route')
  ) {
    return 'dashboard';
  }
  return 'landing';
}

function getInitialRoute(): AirNestRoute {
  const params = new URLSearchParams(window.location.search);
  const route = params.get('route') as AirNestRoute | null;
  return route && VALID_ROUTES.includes(route) ? route : 'home';
}

export default function App() {
  const isOnline = useOnlineStatus();

  const [appStage, setAppStage] = useState<AppStage>(() => getInitialStage());
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = offlineStore.loadProfile();
    if (saved) return saved;
    return {
      ...DEMO_SCENARIOS[getInitialScenario()].profile,
      alertsOptIn: true,
    };
  });

  const [aqiSnapshot, setAqiSnapshot] = useState<AqiSnapshot>(() => {
    const saved = offlineStore.loadAqi();
    if (saved) return saved;
    return DEMO_SCENARIOS[getInitialScenario()].aqiSnapshot;
  });

  const [dailyPlan, setDailyPlan] = useState<DailyPlan>(() => {
    const saved = offlineStore.loadPlan();
    if (saved) return saved;
    const scenario = DEMO_SCENARIOS[getInitialScenario()];
    return buildDeterministicDailyPlan(scenario.profile, scenario.aqiSnapshot, 'daily');
  });

  const [doneTaskIds, setDoneTaskIds] = useState<string[]>(() => offlineStore.loadDoneTasks());
  const [activeRoute, setActiveRoute] = useState<AirNestRoute>(() => getInitialRoute());
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => offlineStore.loadTheme() ?? 'light');
  const [highContrast, setHighContrast] = useState<boolean>(() => offlineStore.loadHighContrast());
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [loadingAqi, setLoadingAqi] = useState<boolean>(false);
  const [loadingPlan, setLoadingPlan] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [hasCalendarToken, setHasCalendarToken] = useState<boolean>(false);
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState<boolean>(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [aqiAlertThreshold, setAqiAlertThreshold] = useState<number>(() =>
    getStoredAqiThreshold()
  );
  const [inAppAqiAlert, setInAppAqiAlert] = useState<string | null>(null);
  const [transitionCity, setTransitionCity] = useState<string | null>(null);
  const lastAlertedKeyRef = useRef<string>('');

  const enterDashboardWithTransition = useCallback(
    (cityLabel: string, route: AirNestRoute = 'home') => {
      const reducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      setActiveRoute(route);
      if (reducedMotion) {
        setAppStage('dashboard');
        return;
      }
      setTransitionCity(cityLabel);
      window.setTimeout(() => {
        setAppStage('dashboard');
      }, 360);
      window.setTimeout(() => {
        setTransitionCity(null);
      }, 720);
    },
    []
  );

  // Sync HTML attributes for WCAG accessibility, i18n language, and theming
  useEffect(() => {
    const root = document.documentElement;
    root.lang = profile.language;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('elder-mode', profile.elderMode);
    root.classList.toggle('high-contrast', highContrast);
    offlineStore.saveTheme(theme);
    offlineStore.saveHighContrast(highContrast);
  }, [theme, highContrast, profile.language, profile.elderMode]);

  // Listen for Google Maps Case A Quota Exceeded events
  useEffect(() => {
    const onQuota = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);

  // Listen for Service Worker notification clicks to navigate straight to the Daily Plan
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onSwMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; route?: AirNestRoute } | null;
      if (data?.type === 'AIRNEST_OPEN_ROUTE' && data.route && VALID_ROUTES.includes(data.route)) {
        setAppStage('dashboard');
        setActiveRoute(data.route);
      }
    };
    navigator.serviceWorker.addEventListener('message', onSwMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onSwMessage);
  }, []);

  // Evaluate local AQI against the configured 'Unhealthy' threshold and notify via Service Worker
  useEffect(() => {
    if (appStage !== 'dashboard') return;
    if (!profile.alertsOptIn) {
      setInAppAqiAlert(null);
      return;
    }
    if (!isUnhealthyAqi(aqiSnapshot.aqi, aqiAlertThreshold)) {
      setInAppAqiAlert(null);
      return;
    }

    const alertKey = `${aqiSnapshot.city}:${aqiSnapshot.aqi}:${aqiAlertThreshold}`;
    if (lastAlertedKeyRef.current === alertKey) return;
    lastAlertedKeyRef.current = alertKey;

    void evaluateAndTriggerAqiAlert(aqiSnapshot, aqiAlertThreshold).then((res) => {
      if (res.triggered) {
        setInAppAqiAlert(res.message);
      }
    });
  }, [appStage, aqiSnapshot, aqiAlertThreshold, profile.alertsOptIn]);

  // Subscribe to Firebase Auth state lazily after initial paint
  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void import('./lib/firebase')
        .then((fb) => {
          if (!cancelled) {
            unsub = fb.subscribeAuthState((nextUser, hasCal) => {
              setUser(nextUser);
              setHasCalendarToken(hasCal);
            });
          }
        })
        .catch(() => undefined);
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      unsub?.();
    };
  }, []);

  const fetchAqiAndPlan = useCallback(
    async (targetProfile: UserProfile, mode: 'daily' | 'weekly' = 'daily') => {
      if (!navigator.onLine) return;
      setLoadingAqi(true);
      try {
        const params = new URLSearchParams({
          lat: String(targetProfile.approxLat),
          lng: String(targetProfile.approxLng),
          city: targetProfile.city,
          region: targetProfile.region,
        });
        if (targetProfile.scenarioKey !== 'custom') {
          params.set('demoScenario', targetProfile.scenarioKey);
        }
        const aqiRes = await fetch(`/api/aqi?${params.toString()}`);
        let nextAqi = aqiSnapshot;
        if (aqiRes.ok) {
          nextAqi = (await aqiRes.json()) as AqiSnapshot;
          setAqiSnapshot(nextAqi);
          offlineStore.saveAqi(nextAqi);
        }

        setLoadingPlan(true);
        const planRes = await fetch('/api/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile: targetProfile, aqiData: nextAqi, mode }),
        });
        if (planRes.ok) {
          const nextPlan = (await planRes.json()) as DailyPlan;
          setDailyPlan(nextPlan);
          offlineStore.savePlan(nextPlan);
        } else {
          const fallback = buildDeterministicDailyPlan(targetProfile, nextAqi, mode);
          setDailyPlan(fallback);
          offlineStore.savePlan(fallback);
        }
      } catch {
        // Retain cached/deterministic data seamlessly
      } finally {
        setLoadingAqi(false);
        setLoadingPlan(false);
      }
    },
    [aqiSnapshot]
  );

  const handleSwitchScenario = useCallback(
    (key: 'coimbatore' | 'delhi') => {
      const scenario = DEMO_SCENARIOS[key];
      const mergedProfile: UserProfile = {
        ...scenario.profile,
        language: profile.language,
        eli10Mode: profile.eli10Mode,
        elderMode: profile.elderMode,
        alertsOptIn: profile.alertsOptIn,
      };
      const instantPlan = buildDeterministicDailyPlan(mergedProfile, scenario.aqiSnapshot, 'daily');
      lastAlertedKeyRef.current = '';
      setProfile(mergedProfile);
      setAqiSnapshot(scenario.aqiSnapshot);
      setDailyPlan(instantPlan);
      setDoneTaskIds([]);
      offlineStore.saveProfile(mergedProfile);
      offlineStore.saveAqi(scenario.aqiSnapshot);
      offlineStore.savePlan(instantPlan);
      offlineStore.saveDoneTasks([]);
      setShowOnboarding(false);
    },
    [profile.alertsOptIn, profile.elderMode, profile.eli10Mode, profile.language]
  );

  const handleUpdateProfile = useCallback(
    (next: UserProfile) => {
      setProfile(next);
      offlineStore.saveProfile(next);
      offlineStore.setOnboarded(true);
      if (user) {
        void import('./lib/firebase')
          .then((fb) => fb.saveProfileToCloud(user, next))
          .catch(() => undefined);
      }
      const nextPlan = buildDeterministicDailyPlan(next, aqiSnapshot, dailyPlan.mode);
      setDailyPlan(nextPlan);
      offlineStore.savePlan(nextPlan);
    },
    [aqiSnapshot, dailyPlan.mode, user]
  );

  const handleThresholdChange = useCallback((nextThreshold: number) => {
    setAqiAlertThreshold(nextThreshold);
    saveStoredAqiThreshold(nextThreshold);
    lastAlertedKeyRef.current = '';
  }, []);

  const handleSelectCity = useCallback(
    (cityObj: { city: string; region: string; lat: number; lng: number }) => {
      const nextProfile: UserProfile = {
        ...profile,
        city: cityObj.city,
        region: cityObj.region,
        approxLat: cityObj.lat,
        approxLng: cityObj.lng,
        scenarioKey:
          cityObj.city === 'New Delhi'
            ? 'delhi'
            : cityObj.city === 'Coimbatore'
              ? 'coimbatore'
              : 'custom',
      };
      lastAlertedKeyRef.current = '';
      setProfile(nextProfile);
      offlineStore.saveProfile(nextProfile);
      void fetchAqiAndPlan(nextProfile, 'daily');
    },
    [fetchAqiAndPlan, profile]
  );

  const handleToggleDone = useCallback(
    (taskId: string) => {
      setDoneTaskIds((prev) => {
        const next = prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId];
        offlineStore.saveDoneTasks(next);
        if (user) {
          const estCo2 = next.length * 1.4;
          void import('./lib/firebase')
            .then((fb) => fb.saveDailyProgressToCloud(user, dailyPlan.date, next, estCo2))
            .catch(() => undefined);
        }
        return next;
      });
    },
    [dailyPlan.date, user]
  );

  const handleGoogleSignIn = useCallback(async (): Promise<string | null> => {
    setAuthNotice(null);
    try {
      const fb = await import('./lib/firebase');
      const { user: signedInUser, accessToken } = await fb.signInWithGoogle();
      setUser(signedInUser);
      setHasCalendarToken(Boolean(accessToken));
      void fb.saveProfileToCloud(signedInUser, profile).catch(() => undefined);
      setAppStage('dashboard');
      return accessToken;
    } catch (err) {
      setAuthNotice(
        err instanceof Error
          ? `Sign-in canceled or unavailable: ${err.message}`
          : 'Sign-in unavailable right now.'
      );
      return null;
    }
  }, [profile]);

  const handleAuthSuccess = useCallback(
    (signedInUser: User, accessToken?: string | null) => {
      setUser(signedInUser);
      if (accessToken) {
        setHasCalendarToken(true);
      }
      const updatedProfile: UserProfile = signedInUser.displayName
        ? { ...profile, displayName: signedInUser.displayName }
        : profile;
      setProfile(updatedProfile);
      offlineStore.saveProfile(updatedProfile);
      void import('./lib/firebase')
        .then((fb) => fb.saveProfileToCloud(signedInUser, updatedProfile))
        .catch(() => undefined);
      enterDashboardWithTransition(updatedProfile.city, 'home');
    },
    [enterDashboardWithTransition, profile]
  );

  const handleLogout = useCallback(() => {
    setInAppAqiAlert(null);
    setAuthNotice(null);
    setShowOnboarding(false);
    setUser(null);
    setHasCalendarToken(false);
    void import('./lib/firebase')
      .then((fb) => fb.signOutUser())
      .catch(() => undefined);
    setAppStage('login');
  }, []);

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    const trimmed = q.trim().toLowerCase();
    if (trimmed.length >= 3) {
      const cityMatch = INDIAN_AND_GLOBAL_CITIES.find((c) =>
        c.city.toLowerCase().startsWith(trimmed)
      );
      if (cityMatch && cityMatch.city !== profile.city) {
        handleSelectCity(cityMatch);
      }
    }
  };

  const handleDeleteAllData = async () => {
    offlineStore.clearAllLocalData();
    if (user) {
      await import('./lib/firebase')
        .then((fb) => fb.deleteUserCloudData(user))
        .catch(() => undefined);
    }
    handleSwitchScenario('coimbatore');
  };

  const routeFallback = (
    <div className="rounded-2xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] p-8 text-center text-sm text-[#49635A] dark:text-[#A6C2B6]">
      Loading view...
    </div>
  );

  const transitionOverlay = transitionCity ? (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] bg-[#EAF5EE]/96 dark:bg-[#091611]/96 backdrop-blur-md flex items-center justify-center p-6"
    >
      <div className="flex flex-col items-center text-center space-y-5 max-w-sm w-full animate-airnest-stage-enter">
        <div className="relative w-24 h-24 flex items-center justify-center">
          <span
            aria-hidden="true"
            className="animate-airnest-breath-ring absolute inset-0 rounded-full border-2 border-[#2D8A56]/60 dark:border-[#4ADE80]/60"
          />
          <span
            aria-hidden="true"
            className="animate-airnest-breath-ring absolute inset-2 rounded-full border-2 border-[#1B4D3E]/50 dark:border-[#6EE7B7]/50"
            style={{ animationDelay: '220ms' }}
          />
          <span className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2D8A56] to-[#1B4D3E] text-white flex items-center justify-center shadow-lg">
            <Leaf className="w-8 h-8" aria-hidden="true" />
          </span>
        </div>

        <div className="space-y-1">
          <div className="text-lg font-extrabold tracking-tight text-[#0E241E] dark:text-[#EDF7F2]">
            Preparing AirNest for {transitionCity}
          </div>
          <p className="text-xs text-[#49635A] dark:text-[#A6C2B6]">
            Syncing live AQI, inversion window &amp; ₹0 clean-air plan...
          </p>
        </div>

        <div className="w-56 h-1.5 rounded-full bg-[#D4E8DC] dark:bg-[#1E352B] overflow-hidden">
          <div className="h-full w-full rounded-full bg-gradient-to-r from-[#2D8A56] to-[#1B4D3E] dark:from-[#4ADE80] dark:to-[#2D8A56] animate-airnest-progress" />
        </div>
      </div>
    </div>
  ) : null;

  if (appStage === 'landing') {
    return (
      <>
        <LandingPage
          language={profile.language}
          theme={theme}
          onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
          onLanguageChange={(lang: Language) => handleUpdateProfile({ ...profile, language: lang })}
          onGetStarted={() => setAppStage('login')}
          onExploreDemo={(scenario = 'coimbatore', route = 'home') => {
            handleSwitchScenario(scenario);
            const targetCity = DEMO_SCENARIOS[scenario].profile.city;
            enterDashboardWithTransition(targetCity, route);
          }}
        />
        {transitionOverlay}
      </>
    );
  }

  if (appStage === 'login') {
    return (
      <>
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#EBF5EE] dark:bg-[#091410] text-sm text-[#49635A] dark:text-[#A6C2B6]">
              Loading AirNest sign in...
            </div>
          }
        >
          <LazyLoginPage
            theme={theme}
            onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
            onBackToHome={() => setAppStage('landing')}
            onAuthSuccess={handleAuthSuccess}
            onContinueDemo={(scenario) => {
              handleSwitchScenario(scenario);
              const targetCity = DEMO_SCENARIOS[scenario].profile.city;
              enterDashboardWithTransition(targetCity, 'home');
            }}
          />
        </Suspense>
        {transitionOverlay}
      </>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#F3F8F5] dark:bg-[#0B1612] text-[#122620] dark:text-[#EDF7F2]">
      {/* WCAG 2.2 AA Skip Navigation Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-[#1B4D3E] focus:text-white focus:font-semibold"
      >
        {t(profile.language, 'skipToContent')}
      </a>

      {/* Desktop 240px Sidebar */}
      <Sidebar
        activeRoute={activeRoute}
        onNavigate={setActiveRoute}
        language={profile.language}
        onLogout={handleLogout}
      />

      {/* Main Content Shell */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Google Maps Case A Quota Exceeded Sticky Top Banner */}
        {mapsQuotaExceeded && (
          <div
            role="alert"
            className="no-print sticky top-0 z-50 bg-amber-100 dark:bg-amber-950 border-b border-amber-300 dark:border-amber-800 px-4 py-2 text-xs font-medium text-amber-950 dark:text-amber-100 flex items-center justify-center gap-2 text-center"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              Interactive Google Maps quota limit reached on this demo key. Air quality & forecast
              data remain active. See{' '}
              <a
                href="https://developers.google.com/maps/documentation/javascript/error-messages?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-bold"
              >
                maps developer site
              </a>{' '}
              for details.
            </span>
          </div>
        )}

        {/* Offline PWA Banner */}
        {!isOnline && (
          <div
            role="status"
            className="no-print bg-[#1B4D3E] text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2"
          >
            <WifiOff className="w-4 h-4" aria-hidden="true" />
            <span>{t(profile.language, 'offlineBanner')}</span>
          </div>
        )}

        <TopBar
          activeRoute={activeRoute}
          onNavigate={setActiveRoute}
          language={profile.language}
          onLanguageChange={(lang: Language) => handleUpdateProfile({ ...profile, language: lang })}
          scenarioKey={profile.scenarioKey}
          onSwitchScenario={handleSwitchScenario}
          theme={theme}
          onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          user={user}
          onGoogleSignIn={() => setAppStage('login')}
          onLogout={handleLogout}
          onOpenOnboarding={() => setShowOnboarding(true)}
        />

        {/* Unhealthy AQI Threshold Push Notification Banner */}
        {inAppAqiAlert && (
          <div
            role="alert"
            className="no-print mx-4 sm:mx-6 mt-3 max-w-6xl lg:mx-auto lg:w-[calc(100%-3rem)] rounded-2xl bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-700 px-4 py-3 text-xs text-rose-950 dark:text-rose-100 flex flex-wrap items-center justify-between gap-3 shadow-xs"
          >
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <Bell className="w-4 h-4 text-rose-700 dark:text-rose-300 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="font-medium leading-relaxed">{inAppAqiAlert}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveRoute('plan')}
                className="min-h-[34px] px-3 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold"
              >
                View Daily Plan
              </button>
              <button
                type="button"
                onClick={() => setInAppAqiAlert(null)}
                aria-label="Dismiss AQI alert"
                className="p-1.5 rounded-lg text-rose-800 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/50"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {authNotice && (
          <div
            role="alert"
            className="mx-4 sm:mx-6 mt-3 max-w-6xl rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 px-4 py-2 text-xs text-amber-950 dark:text-amber-100"
          >
            {authNotice}
          </div>
        )}

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-5 pb-24 lg:pb-10 animate-airnest-stage-enter"
        >
          {activeRoute === 'home' && (
            <Suspense fallback={routeFallback}>
              <LazyDashboardView
                profile={profile}
                aqiSnapshot={aqiSnapshot}
                dailyPlan={dailyPlan}
                doneTaskIds={doneTaskIds}
                loadingAqi={loadingAqi}
                mapsQuotaExceeded={mapsQuotaExceeded}
                onSelectCity={handleSelectCity}
                onSwitchScenario={handleSwitchScenario}
                onNavigate={setActiveRoute}
                onOpenOnboarding={() => setShowOnboarding(true)}
              />
            </Suspense>
          )}

          {activeRoute === 'plan' && (
            <Suspense fallback={routeFallback}>
              <LazyDailyPlanView
                profile={profile}
                aqiSnapshot={aqiSnapshot}
                plan={dailyPlan}
                doneTaskIds={doneTaskIds}
                loadingPlan={loadingPlan}
                onToggleDone={handleToggleDone}
                onRefreshPlan={(mode) => void fetchAqiAndPlan(profile, mode)}
                onRequestGoogleSignIn={handleGoogleSignIn}
              />
            </Suspense>
          )}

          {activeRoute === 'indoor' && (
            <Suspense fallback={routeFallback}>
              <LazyIndoorCoachView profile={profile} aqiSnapshot={aqiSnapshot} />
            </Suspense>
          )}

          {activeRoute === 'impact' && (
            <Suspense fallback={routeFallback}>
              <LazyImpactExplorerView
                profile={profile}
                aqiSnapshot={aqiSnapshot}
                doneTaskIds={doneTaskIds}
              />
            </Suspense>
          )}

          {activeRoute === 'simulator' && (
            <Suspense fallback={routeFallback}>
              <LazyWhatIfSimulatorView profile={profile} aqiSnapshot={aqiSnapshot} />
            </Suspense>
          )}

          {activeRoute === 'community' && (
            <Suspense fallback={routeFallback}>
              <LazyCommunityView profile={profile} aqiSnapshot={aqiSnapshot} />
            </Suspense>
          )}

          {activeRoute === 'assistant' && (
            <Suspense fallback={routeFallback}>
              <LazyAssistantView profile={profile} aqiSnapshot={aqiSnapshot} />
            </Suspense>
          )}

          {activeRoute === 'settings' && (
            <Suspense fallback={routeFallback}>
              <LazySettingsView
                profile={profile}
                aqiSnapshot={aqiSnapshot}
                aqiAlertThreshold={aqiAlertThreshold}
                onAqiAlertThresholdChange={handleThresholdChange}
                onTriggerInAppAlert={(msg) => setInAppAqiAlert(msg)}
                theme={theme}
                highContrast={highContrast}
                user={user}
                hasCalendarToken={hasCalendarToken}
                onUpdateProfile={handleUpdateProfile}
                onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
                onToggleHighContrast={() => setHighContrast((v) => !v)}
                onOpenOnboarding={() => setShowOnboarding(true)}
                onGoogleSignIn={() => setAppStage('login')}
                onSignOut={handleLogout}
                onDeleteAllData={handleDeleteAllData}
              />
            </Suspense>
          )}
        </main>
      </div>

      {/* Mobile 5-Tab Bottom Navigation */}
      <MobileBottomNav
        activeRoute={activeRoute}
        onNavigate={setActiveRoute}
        language={profile.language}
      />

      {/* 60-Second Onboarding Modal */}
      {showOnboarding && (
        <OnboardingWizard
          initialProfile={profile}
          onComplete={(nextProfile) => {
            handleUpdateProfile(nextProfile);
            setShowOnboarding(false);
            void fetchAqiAndPlan(nextProfile, 'daily');
          }}
          onClose={() => setShowOnboarding(false)}
          onLoadDemo={handleSwitchScenario}
        />
      )}
      {transitionOverlay}
    </div>
  );
}
