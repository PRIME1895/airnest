import React, { useState } from 'react';
import {
  Bell,
  Calendar,
  Contrast,
  Download,
  Eye,
  FileDown,
  LogOut,
  Moon,
  Shield,
  Sparkles,
  Trash2,
  UserCheck,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { t } from '../../packages/shared/i18n/index';
import type { AqiSnapshot, Language, UserProfile } from '../../packages/shared/schemas';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  evaluateAndTriggerAqiAlert,
  getNotificationPermissionState,
  requestAqiNotificationPermission,
  type AqiNotificationPermission,
} from '../lib/aqiNotifications';
import { listUpcomingCalendarEvents, type CalendarEventSummary } from '../lib/calendar';
import { getInMemoryCalendarToken } from '../lib/firebase';
import { offlineStore } from '../lib/offlineStore';

interface SettingsViewProps {
  profile: UserProfile;
  aqiSnapshot: AqiSnapshot;
  aqiAlertThreshold: number;
  onAqiAlertThresholdChange: (nextThreshold: number) => void;
  onTriggerInAppAlert: (message: string) => void;
  theme: 'light' | 'dark';
  highContrast: boolean;
  user: User | null;
  hasCalendarToken: boolean;
  onUpdateProfile: (next: UserProfile) => void;
  onToggleTheme: () => void;
  onToggleHighContrast: () => void;
  onOpenOnboarding: () => void;
  onGoogleSignIn: () => void;
  onSignOut: () => void;
  onDeleteAllData: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  aqiSnapshot,
  aqiAlertThreshold,
  onAqiAlertThresholdChange,
  onTriggerInAppAlert,
  theme,
  highContrast,
  user,
  hasCalendarToken,
  onUpdateProfile,
  onToggleTheme,
  onToggleHighContrast,
  onOpenOnboarding,
  onGoogleSignIn,
  onSignOut,
  onDeleteAllData,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [alertFeedback, setAlertFeedback] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] = useState<AqiNotificationPermission>(() =>
    getNotificationPermissionState()
  );
  const [testingAlert, setTestingAlert] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventSummary[]>([]);
  const [calLoading, setCalLoading] = useState(false);

  const handleAlertsToggle = async () => {
    const nextState = !profile.alertsOptIn;
    if (nextState) {
      const perm = await requestAqiNotificationPermission();
      setNotifPermission(perm);
      setAlertFeedback(
        perm === 'granted'
          ? `Service Worker push notifications enabled for AQI ≥ ${aqiAlertThreshold}.`
          : 'Unhealthy AQI alerts enabled in-app. Grant browser notification permission for system push alerts.'
      );
    } else {
      setAlertFeedback('Unhealthy AQI alerts paused.');
    }
    onUpdateProfile({ ...profile, alertsOptIn: nextState });
  };

  const handleSendTestAlert = async () => {
    setTestingAlert(true);
    try {
      const perm = await requestAqiNotificationPermission();
      setNotifPermission(perm);
      const testAqi = Math.max(aqiAlertThreshold + 25, 210);
      const testSnapshot: AqiSnapshot =
        aqiSnapshot.aqi >= aqiAlertThreshold
          ? aqiSnapshot
          : {
              ...aqiSnapshot,
              aqi: testAqi,
              band: testAqi > 300 ? 'Very Poor' : 'Poor',
              pm25: Math.max(aqiSnapshot.pm25, 112),
            };
      const result = await evaluateAndTriggerAqiAlert(testSnapshot, aqiAlertThreshold, true);
      onTriggerInAppAlert(result.message);
      setAlertFeedback(
        result.channel === 'service-worker'
          ? `Push notification dispatched via Vite PWA Service Worker (${testSnapshot.city} AQI ${testSnapshot.aqi}).`
          : result.channel === 'window-notification'
            ? `Browser notification dispatched (${testSnapshot.city} AQI ${testSnapshot.aqi}).`
            : `In-app Unhealthy AQI alert triggered (${testSnapshot.city} AQI ${testSnapshot.aqi}). Browser Notification permission is "${perm}".`
      );
    } finally {
      setTestingAlert(false);
    }
  };

  const handleExportJson = () => {
    const json = offlineStore.exportAllData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `airnest-data-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadCalendarEvents = async () => {
    const token = getInMemoryCalendarToken();
    if (!token) {
      setAlertFeedback('Sign in with Google first to view upcoming Calendar events.');
      return;
    }
    setCalLoading(true);
    try {
      const events = await listUpcomingCalendarEvents(token);
      setCalendarEvents(events);
    } catch (err) {
      setAlertFeedback(err instanceof Error ? err.message : 'Unable to fetch Calendar events.');
    } finally {
      setCalLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="airnest-sky-backdrop rounded-2xl border border-[#D8E8DF] dark:border-[#253F34] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#122620] dark:text-[#EDF7F2]">
            {t(profile.language, 'navSettings')}
          </h1>
          <p className="text-sm text-[#49635A] dark:text-[#A6C2B6] mt-0.5">
            Accessibility, language, Google Calendar sync, offline PWA, and privacy controls.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenOnboarding}
          className="min-h-[42px] px-4 rounded-xl bg-[#1B4D3E] hover:bg-[#143D30] text-white text-xs font-semibold"
        >
          Edit 60s Household Profile
        </button>
      </section>

      {alertFeedback && (
        <div
          role="status"
          className="rounded-xl bg-[#EAF4EE] dark:bg-[#192E25] border border-[#CBE4D5] dark:border-[#253F34] px-4 py-3 text-xs font-semibold text-[#122620] dark:text-[#EDF7F2]"
        >
          {alertFeedback}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Accessibility & Language */}
        <section className="rounded-2xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] p-5 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-[#122620] dark:text-[#EDF7F2] flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#2D8A56]" aria-hidden="true" />
            Accessibility & Language (WCAG 2.2 AA)
          </h2>

          <label className="block space-y-1 text-xs font-semibold">
            <span>Display Language</span>
            <select
              value={profile.language}
              onChange={(e) =>
                onUpdateProfile({ ...profile, language: e.target.value as Language })
              }
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#D8E8DF] dark:border-[#253F34] bg-[#F8FCF9] dark:bg-[#0F1D17] text-sm"
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="ta">தமிழ் (Tamil)</option>
            </select>
          </label>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => onUpdateProfile({ ...profile, eli10Mode: !profile.eli10Mode })}
              aria-pressed={profile.eli10Mode}
              className="w-full min-h-[46px] px-4 rounded-xl bg-[#F4FAF6] dark:bg-[#172A22] border border-[#DCEBE2] dark:border-[#243B31] flex items-center justify-between text-xs font-semibold"
            >
              <span className="inline-flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#2D8A56]" aria-hidden="true" />
                &ldquo;Explain like I&apos;m 10&rdquo; Plain-Language Mode
              </span>
              <span className="font-bold text-[#1B4D3E] dark:text-[#4ADE80]">
                {profile.eli10Mode ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onUpdateProfile({ ...profile, elderMode: !profile.elderMode })}
              aria-pressed={profile.elderMode}
              className="w-full min-h-[46px] px-4 rounded-xl bg-[#F4FAF6] dark:bg-[#172A22] border border-[#DCEBE2] dark:border-[#243B31] flex items-center justify-between text-xs font-semibold"
            >
              <span>Elder-Friendly Large Text Mode</span>
              <span className="font-bold text-[#1B4D3E] dark:text-[#4ADE80]">
                {profile.elderMode ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              aria-pressed={theme === 'dark'}
              className="w-full min-h-[46px] px-4 rounded-xl bg-[#F4FAF6] dark:bg-[#172A22] border border-[#DCEBE2] dark:border-[#243B31] flex items-center justify-between text-xs font-semibold"
            >
              <span className="inline-flex items-center gap-2">
                <Moon className="w-4 h-4 text-[#2D8A56]" aria-hidden="true" />
                Dark Mode
              </span>
              <span className="font-bold text-[#1B4D3E] dark:text-[#4ADE80]">
                {theme === 'dark' ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={onToggleHighContrast}
              aria-pressed={highContrast}
              className="w-full min-h-[46px] px-4 rounded-xl bg-[#F4FAF6] dark:bg-[#172A22] border border-[#DCEBE2] dark:border-[#243B31] flex items-center justify-between text-xs font-semibold"
            >
              <span className="inline-flex items-center gap-2">
                <Contrast className="w-4 h-4 text-[#2D8A56]" aria-hidden="true" />
                High Contrast Borders
              </span>
              <span className="font-bold text-[#1B4D3E] dark:text-[#4ADE80]">
                {highContrast ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Service Worker Unhealthy AQI Push Notification Controls */}
            <div className="rounded-xl bg-[#F4FAF6] dark:bg-[#172A22] border border-[#DCEBE2] dark:border-[#243B31] p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-xs font-bold text-[#122620] dark:text-[#EDF7F2]">
                  <Bell className="w-4 h-4 text-[#2D8A56]" aria-hidden="true" />
                  Unhealthy AQI Push Alerts (PWA Service Worker)
                </span>
                <button
                  type="button"
                  onClick={handleAlertsToggle}
                  aria-pressed={profile.alertsOptIn}
                  className={`min-h-[34px] px-3 rounded-lg text-xs font-bold transition-colors ${
                    profile.alertsOptIn
                      ? 'bg-[#1B4D3E] text-white'
                      : 'bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] text-[#49635A] dark:text-[#A6C2B6]'
                  }`}
                >
                  {profile.alertsOptIn ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#49635A] dark:text-[#A6C2B6]">
                <span>
                  Notification API status:{' '}
                  <strong className="text-[#122620] dark:text-[#EDF7F2] capitalize">
                    {notifPermission}
                  </strong>
                </span>
                <span>
                  Current {aqiSnapshot.city}:{' '}
                  <strong className="tabular-nums text-[#122620] dark:text-[#EDF7F2]">
                    AQI {aqiSnapshot.aqi}
                  </strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-end">
                <label className="block space-y-1 text-[11px] font-semibold text-[#49635A] dark:text-[#A6C2B6]">
                  <span>Alert Threshold</span>
                  <select
                    aria-label="AQI Push Notification Threshold"
                    value={aqiAlertThreshold}
                    onChange={(e) => onAqiAlertThresholdChange(Number(e.target.value))}
                    className="w-full min-h-[40px] px-2.5 rounded-lg border border-[#D8E8DF] dark:border-[#253F34] bg-white dark:bg-[#0F1D17] text-xs font-semibold text-[#122620] dark:text-[#EDF7F2]"
                  >
                    <option value={151}>Unhealthy (AQI &gt; 150)</option>
                    <option value={201}>Poor (AQI &gt; 200)</option>
                    <option value={301}>Very Poor / Severe (AQI &gt; 300)</option>
                  </select>
                </label>

                <button
                  type="button"
                  disabled={testingAlert}
                  onClick={() => void handleSendTestAlert()}
                  className="min-h-[40px] px-3 rounded-lg bg-[#1B4D3E] hover:bg-[#143D30] disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                >
                  <Bell className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{testingAlert ? 'Triggering...' : 'Test Unhealthy AQI Alert'}</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Account, Google Calendar & Privacy Controls */}
        <section className="rounded-2xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] p-5 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-[#122620] dark:text-[#EDF7F2] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#2D8A56]" aria-hidden="true" />
            Account, Google Calendar & Privacy
          </h2>

          {/* Google Sign-In / Cloud Sync */}
          <div className="rounded-xl bg-[#F4FAF6] dark:bg-[#172A22] border border-[#DCEBE2] dark:border-[#243B31] p-4 space-y-3">
            {user ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <UserCheck className="w-4 h-4 text-[#2D8A56]" aria-hidden="true" />
                  <div>
                    <div className="font-bold text-[#122620] dark:text-[#EDF7F2]">
                      {user.displayName || user.email}
                    </div>
                    <div className="text-[#49635A] dark:text-[#A6C2B6]">
                      Cloud profile synced · Calendar {hasCalendarToken ? 'connected' : 'reconnect for events'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="min-h-[38px] px-3 rounded-lg border border-[#D8E8DF] dark:border-[#253F34] text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  Sign out
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-[#49635A] dark:text-[#A6C2B6]">
                  Sign in with Google to sync your household clean-air profile across devices and
                  add clean-window reminders to Google Calendar.
                </p>
                <button type="button" onClick={onGoogleSignIn} className="gsi-material-button">
                  <svg className="w-4 h-4" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  <span>Sign in with Google</span>
                </button>
              </div>
            )}

            {hasCalendarToken && (
              <div className="pt-2 border-t border-[#DCEBE2] dark:border-[#253F34] space-y-2">
                <button
                  type="button"
                  disabled={calLoading}
                  onClick={handleLoadCalendarEvents}
                  className="text-xs font-semibold text-[#1B4D3E] dark:text-[#4ADE80] inline-flex items-center gap-1.5 hover:underline"
                >
                  <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                  {calLoading ? 'Checking Calendar...' : 'View Upcoming Calendar Events'}
                </button>
                {calendarEvents.length > 0 && (
                  <ul className="space-y-1 text-xs text-[#49635A] dark:text-[#A6C2B6]">
                    {calendarEvents.map((ev) => (
                      <li key={ev.id} className="truncate">
                        • {ev.summary}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* PWA Install */}
          {!isInstalled && isInstallable && (
            <button
              type="button"
              onClick={install}
              className="w-full min-h-[44px] px-4 rounded-xl bg-[#1B4D3E] hover:bg-[#143D30] text-white text-xs font-semibold inline-flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              Install AirNest Offline App (PWA)
            </button>
          )}

          {/* Privacy Notice + Export & Delete Data */}
          <div className="rounded-xl bg-[#EAF4EE] dark:bg-[#192E25] p-3.5 text-xs text-[#49635A] dark:text-[#A6C2B6] space-y-2">
            <div className="font-bold text-[#122620] dark:text-[#EDF7F2]">
              Privacy-First Data Minimization
            </div>
            <p>
              Location is snapped to an approximate ~1.1 km grid (2 decimal places). Health
              sensitivities never appear in server logs, and Google OAuth tokens stay strictly in
              browser memory.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handleExportJson}
                className="min-h-[40px] px-3.5 rounded-xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] text-xs font-semibold text-[#122620] dark:text-[#EDF7F2] inline-flex items-center gap-1.5"
              >
                <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
                {t(profile.language, 'exportData')}
              </button>

              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="min-h-[40px] px-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-xs font-semibold text-rose-800 dark:text-rose-200 inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                {t(profile.language, 'deleteData')}
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-data-heading"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="max-w-sm w-full rounded-2xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] p-5 shadow-xl space-y-4">
            <h2 id="delete-data-heading" className="text-lg font-bold text-[#122620] dark:text-[#EDF7F2]">
              Delete All Your AirNest Data?
            </h2>
            <p className="text-xs text-[#49635A] dark:text-[#A6C2B6]">
              This clears your cached profile, daily plan progress, and cloud profile document if
              signed in.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="min-h-[40px] px-4 rounded-xl border border-[#D8E8DF] dark:border-[#253F34] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onDeleteAllData();
                  setConfirmDelete(false);
                  setAlertFeedback('All local and cloud profile data deleted.');
                }}
                className="min-h-[40px] px-4 rounded-xl bg-rose-700 text-white text-xs font-semibold"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
