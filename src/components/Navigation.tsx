import React, { useState } from 'react';
import {
  CalendarCheck2,
  Download,
  Home,
  Leaf,
  LogOut,
  MessageSquare,
  Moon,
  Scale,
  Search,
  Settings,
  SlidersHorizontal,
  Sun,
  Users,
  Wind,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { t } from '../../packages/shared/i18n/index';
import type { Language } from '../../packages/shared/schemas';
import { usePWAInstall } from '../hooks/usePWAInstall';

export type AirNestRoute =
  | 'home'
  | 'plan'
  | 'indoor'
  | 'impact'
  | 'simulator'
  | 'community'
  | 'assistant'
  | 'settings';

interface NavProps {
  activeRoute: AirNestRoute;
  onNavigate: (route: AirNestRoute) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  scenarioKey: 'coimbatore' | 'delhi' | 'custom';
  onSwitchScenario: (key: 'coimbatore' | 'delhi') => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  user: User | null;
  onGoogleSignIn: () => void;
  onLogout: () => void;
  onOpenOnboarding: () => void;
}

export const Sidebar: React.FC<
  Pick<NavProps, 'activeRoute' | 'onNavigate' | 'language' | 'onLogout'>
> = ({ activeRoute, onNavigate, language, onLogout }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIosGuide, setShowIosGuide] = useState(false);

  const items: Array<{ id: AirNestRoute; label: string; icon: React.ReactNode }> = [
    { id: 'home', label: t(language, 'navHome'), icon: <Home className="w-4 h-4" aria-hidden="true" /> },
    { id: 'plan', label: t(language, 'navPlan'), icon: <CalendarCheck2 className="w-4 h-4" aria-hidden="true" /> },
    { id: 'indoor', label: t(language, 'navIndoor'), icon: <Wind className="w-4 h-4" aria-hidden="true" /> },
    { id: 'impact', label: t(language, 'navImpact'), icon: <Scale className="w-4 h-4" aria-hidden="true" /> },
    { id: 'simulator', label: t(language, 'navSimulator'), icon: <SlidersHorizontal className="w-4 h-4" aria-hidden="true" /> },
    { id: 'community', label: t(language, 'navCommunity'), icon: <Users className="w-4 h-4" aria-hidden="true" /> },
    { id: 'assistant', label: t(language, 'navAssistant'), icon: <MessageSquare className="w-4 h-4" aria-hidden="true" /> },
    { id: 'settings', label: t(language, 'navSettings'), icon: <Settings className="w-4 h-4" aria-hidden="true" /> },
  ];

  return (
    <aside
      aria-label="Primary Sidebar Navigation"
      className="no-print hidden lg:flex flex-col w-60 shrink-0 bg-white dark:bg-[#111F19] border-r border-[#DCEBE2] dark:border-[#21382E] min-h-screen sticky top-0 h-screen p-4 justify-between"
    >
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 px-2 py-1 rounded-xl text-left whitespace-nowrap shrink-0"
        >
          <span className="w-8 h-8 rounded-xl bg-[#1B4D3E] text-[#6EE7B7] flex items-center justify-center">
            <Leaf className="w-5 h-5" aria-hidden="true" />
          </span>
          <span className="text-xl font-bold tracking-tight text-[#122620] dark:text-[#EDF7F2]">
            {t(language, 'appName')}
          </span>
        </button>

        <nav aria-label="Main sections" className="space-y-1">
          {items.map((item) => {
            const active = activeRoute === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`w-full min-h-[44px] px-3 py-2 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#E5F3EC] dark:bg-[#1C382B] text-[#143D30] dark:text-[#6EE7B7] font-semibold'
                    : 'text-[#49635A] dark:text-[#A6C2B6] hover:bg-[#F3F8F5] dark:hover:bg-[#172A22]'
                }`}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Botanical Motto Card + In-App PWA Install Button */}
      <div className="space-y-2.5">
        {!isInstalled && (isInstallable || isIOS) && (
          <button
            type="button"
            onClick={isInstallable ? install : () => setShowIosGuide(true)}
            className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#1B4D3E] hover:bg-[#143D30] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            {isIOS ? 'Install on iOS' : 'Install AirNest App'}
          </button>
        )}

        <div className="rounded-2xl bg-gradient-to-br from-[#EAF5EE] to-[#D8EFE2] dark:from-[#172B22] dark:to-[#102019] border border-[#CBE4D5] dark:border-[#243E32] p-4 space-y-1">
          <Leaf className="w-5 h-5 text-[#2D8A56] dark:text-[#4ADE80]" aria-hidden="true" />
          <div className="text-sm font-bold text-[#143D30] dark:text-[#EDF7F2]">
            {t(language, 'tagline')}
          </div>
          <p className="text-xs text-[#49635A] dark:text-[#A6C2B6]">
            India-first & global clean-air intelligence.
          </p>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="w-full min-h-[42px] px-3 rounded-xl bg-[#F4FAF6] dark:bg-[#172A22] hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-[#DCEBE2] dark:border-[#243B31] hover:border-rose-300 dark:hover:border-rose-800 text-xs font-semibold text-[#3B554C] dark:text-[#A6C2B6] hover:text-rose-700 dark:hover:text-rose-300 flex items-center justify-center gap-2 transition-colors"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          <span>Log out</span>
        </button>

        {showIosGuide && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          >
            <div className="max-w-sm w-full rounded-2xl bg-white dark:bg-[#13221C] p-5 space-y-3 border border-[#D8E8DF] dark:border-[#253F34]">
              <h3 className="text-base font-bold">Install AirNest on iPhone / iPad</h3>
              <p className="text-sm text-[#49635A] dark:text-[#A6C2B6]">
                1. Tap the <strong>Share</strong> icon in Safari.<br />
                2. Tap <strong>Add to Home Screen</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="w-full min-h-[44px] rounded-xl bg-[#1B4D3E] text-white text-sm font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export const TopBar: React.FC<NavProps> = ({
  language,
  onLanguageChange,
  scenarioKey,
  onSwitchScenario,
  theme,
  onToggleTheme,
  searchQuery,
  onSearchChange,
  user,
  onGoogleSignIn,
  onLogout,
  onOpenOnboarding,
}) => {
  return (
    <header className="no-print sticky top-0 z-30 bg-[#F3F8F5]/90 dark:bg-[#0B1612]/90 backdrop-blur-md border-b border-[#DCEBE2] dark:border-[#21382E] px-4 sm:px-6 py-2.5">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        {/* Mobile Brand + Search */}
        <div className="flex items-center gap-3 flex-1 min-w-0 max-w-md">
          <span className="lg:hidden flex items-center gap-1.5 font-bold text-base text-[#122620] dark:text-[#EDF7F2] whitespace-nowrap shrink-0">
            <Leaf className="w-5 h-5 text-[#2D8A56]" aria-hidden="true" />
            AirNest
          </span>
          <label className="relative flex-1 hidden sm:block">
            <span className="sr-only">Search cities, tips, or features</span>
            <Search
              className="w-4 h-4 text-[#49635A] absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search city or clean-air tip..."
              className="w-full min-h-[40px] pl-9 pr-3 rounded-xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] text-sm text-[#122620] dark:text-[#EDF7F2] placeholder:text-[#637C73]"
            />
          </label>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Demo Scenario Quick Switcher */}
          <div
            role="group"
            aria-label="Demo scenario switcher"
            className="hidden md:inline-flex items-center p-1 rounded-xl bg-[#E4F1EA] dark:bg-[#172A22]"
          >
            <button
              type="button"
              onClick={() => onSwitchScenario('coimbatore')}
              aria-pressed={scenarioKey === 'coimbatore'}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                scenarioKey === 'coimbatore'
                  ? 'bg-white dark:bg-[#13221C] text-[#122620] dark:text-[#EDF7F2] shadow-xs'
                  : 'text-[#49635A] dark:text-[#A6C2B6]'
              }`}
            >
              Coimbatore 85
            </button>
            <button
              type="button"
              onClick={() => onSwitchScenario('delhi')}
              aria-pressed={scenarioKey === 'delhi'}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                scenarioKey === 'delhi'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'text-[#49635A] dark:text-[#A6C2B6]'
              }`}
            >
              Delhi 420
            </button>
          </div>

          {/* Language Switcher EN / HI / TA */}
          <label className="sr-only" htmlFor="airnest-lang-select">
            Select language
          </label>
          <select
            id="airnest-lang-select"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as Language)}
            className="min-h-[40px] px-2.5 rounded-xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] text-xs font-semibold text-[#122620] dark:text-[#EDF7F2]"
          >
            <option value="en">EN</option>
            <option value="hi">हिन्दी</option>
            <option value="ta">தமிழ்</option>
          </select>

          {/* Theme Switch */}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="min-w-[40px] min-h-[40px] rounded-xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] flex items-center justify-center text-[#122620] dark:text-[#EDF7F2]"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Moon className="w-4 h-4" aria-hidden="true" />
            )}
          </button>

          {/* 60s Setup or Account + Logout */}
          {user ? (
            <button
              type="button"
              onClick={onOpenOnboarding}
              aria-label={`Profile settings for ${user.displayName || 'User'}`}
              className="min-h-[40px] px-3 rounded-xl bg-[#1B4D3E] text-white text-xs font-semibold whitespace-nowrap shrink-0"
            >
              {(user.displayName || 'User').split(' ')[0]}
            </button>
          ) : (
            <button
              type="button"
              onClick={onGoogleSignIn}
              className="min-h-[40px] px-3 rounded-xl bg-white dark:bg-[#13221C] border border-[#747775] dark:border-[#46695A] text-xs font-semibold text-[#122620] dark:text-[#EDF7F2] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 hover:bg-[#F3F8F5] dark:hover:bg-[#1A2E25]"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span className="hidden sm:inline">Sign in</span>
            </button>
          )}

          <button
            type="button"
            onClick={onLogout}
            aria-label="Log out and return to login screen"
            className="min-h-[40px] px-2.5 sm:px-3 rounded-xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] hover:border-rose-300 dark:hover:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold text-[#3B554C] dark:text-[#A6C2B6] hover:text-rose-700 dark:hover:text-rose-300 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export const MobileBottomNav: React.FC<
  Pick<NavProps, 'activeRoute' | 'onNavigate' | 'language'>
> = ({ activeRoute, onNavigate, language }) => {
  const mobileItems: Array<{ id: AirNestRoute; label: string; icon: React.ReactNode }> = [
    { id: 'home', label: t(language, 'navHome'), icon: <Home className="w-5 h-5" aria-hidden="true" /> },
    { id: 'plan', label: t(language, 'navPlan'), icon: <CalendarCheck2 className="w-5 h-5" aria-hidden="true" /> },
    { id: 'assistant', label: t(language, 'navAssistant'), icon: <MessageSquare className="w-5 h-5" aria-hidden="true" /> },
    { id: 'community', label: t(language, 'navCommunity'), icon: <Users className="w-5 h-5" aria-hidden="true" /> },
    { id: 'settings', label: t(language, 'navSettings'), icon: <Settings className="w-5 h-5" aria-hidden="true" /> },
  ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="no-print lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#111F19]/95 backdrop-blur-md border-t border-[#DCEBE2] dark:border-[#21382E] px-1 py-1"
    >
      <div className="grid grid-cols-5 gap-1">
        {mobileItems.map((item) => {
          const active = activeRoute === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
                active
                  ? 'text-[#1B4D3E] dark:text-[#6EE7B7] bg-[#E5F3EC] dark:bg-[#1C382B]'
                  : 'text-[#49635A] dark:text-[#A6C2B6]'
              }`}
            >
              {item.icon}
              <span className="truncate max-w-full px-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
