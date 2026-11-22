import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Home,
  Leaf,
  Lock,
  Mail,
  Moon,
  Sun,
  User as UserIcon,
  Wind,
} from 'lucide-react';
import type { User } from 'firebase/auth';

interface LoginPageProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onBackToHome: () => void;
  onAuthSuccess: (user: User, accessToken?: string | null) => void;
  onContinueDemo: (scenario: 'coimbatore' | 'delhi') => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  theme,
  onToggleTheme,
  onBackToHome,
  onAuthSuccess,
  onContinueDemo,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [spotlightPos, setSpotlightPos] = useState<{ x: number; y: number }>({ x: 50, y: 35 });
  const [statusMessage, setStatusMessage] = useState<{
    type: 'error' | 'info';
    text: string;
  } | null>(null);

  const handleScenicPointerMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setSpotlightPos({ x, y });
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!email.trim() || !password) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter both your email address and password.',
      });
      return;
    }

    if (mode === 'signup' && password.length < 6) {
      setStatusMessage({
        type: 'error',
        text: 'Password must be at least 6 characters long.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const fb = await import('../lib/firebase');
      const signedInUser =
        mode === 'signup'
          ? await fb.signUpWithEmail(email, password, displayName || undefined)
          : await fb.signInWithEmail(email, password);
      onAuthSuccess(signedInUser, null);
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Unable to authenticate right now.';
      let friendly = raw;
      if (raw.includes('auth/invalid-credential') || raw.includes('auth/wrong-password')) {
        friendly = 'Incorrect email or password. Try again or continue with Google / Demo Mode.';
      } else if (raw.includes('auth/user-not-found')) {
        friendly = 'No account found for this email. Switch to Sign Up or use Google Sign-In.';
      } else if (raw.includes('auth/email-already-in-use')) {
        friendly = 'An account with this email already exists. Switch to Sign In.';
      } else if (raw.includes('auth/operation-not-allowed')) {
        friendly =
          'Email/password sign-in is not enabled on this project yet. Use Google Sign-In or Continue in Demo Mode below.';
      }
      setStatusMessage({ type: 'error', text: friendly });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setStatusMessage(null);
    setSubmitting(true);
    try {
      const fb = await import('../lib/firebase');
      const { user, accessToken } = await fb.signInWithGoogle();
      onAuthSuccess(user, accessToken);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text:
          err instanceof Error
            ? `Google Sign-In unavailable or canceled: ${err.message}`
            : 'Google Sign-In unavailable right now.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setStatusMessage(null);
    if (!email.trim()) {
      setStatusMessage({
        type: 'info',
        text: 'Enter your email address above first, then click Forgot Password.',
      });
      return;
    }
    setSubmitting(true);
    try {
      const fb = await import('../lib/firebase');
      await fb.sendPasswordReset(email);
      setStatusMessage({
        type: 'info',
        text: `Password reset email sent to ${email.trim()}. Check your inbox.`,
      });
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Could not send reset email right now. You can also sign in with Google or try Demo Mode.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-[#EBF5EE] dark:bg-[#091410] text-[#122620] dark:text-[#EDF7F2] overflow-hidden transition-colors duration-300"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 70% 60% at 15% 15%, rgba(206, 238, 220, 0.7) 0%, transparent 65%), radial-gradient(ellipse 65% 55% at 85% 85%, rgba(186, 229, 206, 0.55) 0%, transparent 65%)',
      }}
    >
      {/* Ambient Drifting Botanical Light Orbs */}
      <div
        aria-hidden="true"
        className="animate-airnest-orb pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#34D399]/18 dark:bg-[#10B981]/12 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="animate-airnest-orb pointer-events-none absolute -bottom-28 -right-24 w-[28rem] h-[28rem] rounded-full bg-[#60A5FA]/16 dark:bg-[#1B4D3E]/25 blur-3xl"
      />

      {/* Split-Screen Framed Container with Crisp Entrance */}
      <div className="relative z-10 animate-airnest-stage-enter w-full max-w-[1120px] rounded-[30px] bg-white/92 dark:bg-[#102019] border border-white dark:border-[#243E32] shadow-[0_32px_80px_-18px_rgba(18,52,40,0.28)] overflow-hidden grid grid-cols-1 lg:grid-cols-[1.12fr_0.88fr]">
        {/* Left Scenic Botanical Brand Showcase with Interactive Cursor Glow */}
        <section
          aria-label="AirNest overview"
          onMouseMove={handleScenicPointerMove}
          className="relative p-7 sm:p-10 lg:p-12 flex flex-col justify-between min-h-[420px] lg:min-h-[650px] overflow-hidden"
          style={{
            background:
              'radial-gradient(ellipse 80% 55% at 65% 10%, rgba(196, 234, 248, 0.85) 0%, transparent 65%), linear-gradient(180deg, #E2F3FB 0%, #EEF8F2 56%, #CBE8D5 100%)',
          }}
        >
          {/* Dark mode tint */}
          <div
            aria-hidden="true"
            className="hidden dark:block absolute inset-0 bg-gradient-to-b from-[#0E241C] via-[#102920] to-[#133528]"
          />

          {/* Interactive Pointer Spotlight Glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle 280px at ${spotlightPos.x}% ${spotlightPos.y}%, rgba(52, 211, 153, 0.2), transparent 72%)`,
            }}
          />

          {/* Floating Emerald Leaves */}
          <Leaf
            aria-hidden="true"
            className="animate-airnest-float pointer-events-none absolute top-16 right-12 w-7 h-7 text-[#229255]/45 dark:text-[#4ADE80]/30"
          />
          <Leaf
            aria-hidden="true"
            className="animate-airnest-float-alt pointer-events-none absolute bottom-44 right-16 w-5 h-5 text-[#1B4D3E]/35 dark:text-[#6EE7B7]/25"
          />

          {/* Sunlit City, River & Botanical Trees Illustration SVG */}
          <svg
            aria-hidden="true"
            viewBox="0 0 700 280"
            preserveAspectRatio="none"
            className="pointer-events-none absolute bottom-0 inset-x-0 w-full h-52 sm:h-64 opacity-90 dark:opacity-35"
          >
            <defs>
              <linearGradient id="loginRiver" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#9ED4E6" />
                <stop offset="50%" stopColor="#BCE4EE" />
                <stop offset="100%" stopColor="#8CC6DA" />
              </linearGradient>
              <linearGradient id="loginForest" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B935E" />
                <stop offset="100%" stopColor="#1B5539" />
              </linearGradient>
            </defs>
            <g fill="#B6D6DF" opacity="0.8">
              <rect x="330" y="95" width="22" height="105" rx="2" />
              <rect x="358" y="65" width="28" height="135" rx="2" />
              <rect x="392" y="88" width="24" height="112" rx="2" />
              <rect x="424" y="45" width="32" height="155" rx="2" />
              <rect x="462" y="76" width="26" height="124" rx="2" />
              <rect x="496" y="102" width="34" height="98" rx="2" />
              <rect x="536" y="68" width="24" height="132" rx="2" />
            </g>
            <path
              d="M0,210 C180,192 380,190 700,205 L700,280 L0,280 Z"
              fill="url(#loginRiver)"
            />
            <path
              d="M0,170 C110,160 220,210 380,235 C510,255 610,248 700,242 L700,280 L0,280 Z"
              fill="url(#loginForest)"
            />
            <path
              d="M270,192 C360,152 490,145 700,165 L700,212 L270,212 Z"
              fill="#4EA26E"
              opacity="0.72"
            />
          </svg>

          {/* Top Bar: Back + Brand */}
          <div className="relative z-10 space-y-5">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onBackToHome}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B4D3E] dark:text-[#6EE7B7] hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Back to Home</span>
              </button>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/75 dark:bg-[#142D23]/85 border border-white/80 dark:border-[#2A4B3C] text-[11px] font-semibold text-[#1B4D3E] dark:text-[#6EE7B7]">
                <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" aria-hidden="true" />
                <span>Live AQI Engine Ready</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#2D9D5B] to-[#1B4D3E] text-white flex items-center justify-center shadow-sm">
                <Leaf className="w-6 h-6" aria-hidden="true" />
              </span>
              <div>
                <div className="text-2xl font-extrabold tracking-tight text-[#0E241E] dark:text-[#EDF7F2] leading-none">
                  AirNest
                </div>
                <div className="text-[11px] font-semibold tracking-wider text-[#3C5B50] dark:text-[#9BC2B2] mt-1">
                  Breathe · Plan · Live Better
                </div>
              </div>
            </div>
          </div>

          {/* Middle Headline + Interactive Frosted Feature Pills */}
          <div className="relative z-10 my-8 space-y-5">
            <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold tracking-tight leading-[1.08] text-[#0E241E] dark:text-[#F2FBF6]">
              Breathe Smarter.
              <br />
              Live{' '}
              <span className="relative inline-block text-[#1F8A4C] dark:text-[#4ADE80]">
                Healthier.
                <svg
                  aria-hidden="true"
                  viewBox="0 0 220 14"
                  fill="none"
                  className="absolute -bottom-2 left-0 w-full h-3"
                >
                  <path
                    d="M4 10C65 3 150 2 216 9"
                    stroke="#28A45E"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            <p className="text-sm sm:text-base text-[#2E4B41] dark:text-[#B4CFC3] max-w-md leading-relaxed">
              Your AI-powered companion for cleaner air, healthier choices and a greener tomorrow.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {[
                {
                  icon: <Wind className="w-4 h-4 text-[#1F8A4C] dark:text-[#4ADE80]" aria-hidden="true" />,
                  label: 'Personalised Air Quality Advice',
                },
                {
                  icon: <Home className="w-4 h-4 text-[#1F8A4C] dark:text-[#4ADE80]" aria-hidden="true" />,
                  label: 'Indoor Air Guidance',
                },
                {
                  icon: <Leaf className="w-4 h-4 text-[#1F8A4C] dark:text-[#4ADE80]" aria-hidden="true" />,
                  label: 'Real Impact Insights',
                },
              ].map((pill) => (
                <div
                  key={pill.label}
                  className="rounded-2xl bg-white/85 dark:bg-[#13261E]/85 backdrop-blur-md border border-white/80 dark:border-[#2A493B] px-3 py-2.5 flex items-center gap-2 shadow-xs hover:-translate-y-1 hover:shadow-md transition-all duration-300"
                >
                  <span className="w-7 h-7 rounded-lg bg-[#E7F5EC] dark:bg-[#1C382B] flex items-center justify-center shrink-0">
                    {pill.icon}
                  </span>
                  <span className="text-[11.5px] font-semibold leading-tight text-[#122620] dark:text-[#E6F4EC]">
                    {pill.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Signature Motto */}
          <div className="relative z-10 pt-6">
            <p className="inline-block rounded-xl bg-[#143D30]/85 backdrop-blur-xs px-3.5 py-2 text-base sm:text-lg italic font-semibold text-white shadow-xs leading-snug">
              Cleaner Air.
              <br />A Healthier You.
            </p>
          </div>
        </section>

        {/* Right Pure-White Auth Card */}
        <section
          aria-label={mode === 'signin' ? 'Sign in form' : 'Create account form'}
          className="relative bg-white dark:bg-[#13221C] p-7 sm:p-10 lg:p-11 flex flex-col justify-center"
        >
          {/* Theme Toggle Corner Button */}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-[#F3F8F5] dark:bg-[#1A2F26] border border-[#DCEBE2] dark:border-[#29473A] flex items-center justify-center text-[#1B4D3E] dark:text-amber-300 hover:scale-105 transition-transform"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Moon className="w-4 h-4" aria-hidden="true" />
            )}
          </button>

          <div key={mode} className="max-w-sm w-full mx-auto space-y-6 animate-airnest-stage-enter">
            {/* Emblem + Heading */}
            <div className="text-center space-y-2">
              <div className="mx-auto w-14 h-14 rounded-full bg-[#EAF6EE] dark:bg-[#1A3428] border-2 border-[#B9E2CA] dark:border-[#2D5845] flex items-center justify-center shadow-xs">
                <Leaf className="w-7 h-7 text-[#1F8A4C] dark:text-[#4ADE80]" aria-hidden="true" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0E241E] dark:text-[#EDF7F2]">
                {mode === 'signin' ? 'Welcome Back!' : 'Create Account'}
              </h2>
              <p className="text-sm text-[#49635A] dark:text-[#A6C2B6]">
                {mode === 'signin'
                  ? 'Sign in to continue your clean air journey'
                  : 'Start your personalised clean air plan today'}
              </p>
            </div>

            {statusMessage && (
              <div
                role={statusMessage.type === 'error' ? 'alert' : 'status'}
                className={`rounded-xl px-3.5 py-2.5 text-xs font-medium border ${
                  statusMessage.type === 'error'
                    ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                    : 'bg-[#EAF5EE] dark:bg-[#192E25] border-[#CBE4D5] dark:border-[#253F34] text-[#143D30] dark:text-[#A7F3D0]'
                }`}
              >
                {statusMessage.text}
              </div>
            )}

            {/* Email / Password Form */}
            <form onSubmit={handleEmailSubmit} className="space-y-3.5">
              {mode === 'signup' && (
                <label className="block relative">
                  <span className="sr-only">Full Name</span>
                  <UserIcon
                    className="w-4 h-4 text-[#5D776E] absolute left-3.5 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Full Name"
                    autoComplete="name"
                    className="w-full min-h-[48px] pl-10 pr-4 rounded-xl bg-[#F4F7F6] dark:bg-[#0E1B16] border border-[#DCE8E1] dark:border-[#253F34] text-sm text-[#122620] dark:text-[#EDF7F2] placeholder:text-[#6B827A] focus:border-[#1F8A4C] transition-colors"
                  />
                </label>
              )}

              <label className="block relative">
                <span className="sr-only">Email Address</span>
                <Mail
                  className="w-4 h-4 text-[#5D776E] absolute left-3.5 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address"
                  autoComplete="email"
                  className="w-full min-h-[48px] pl-10 pr-4 rounded-xl bg-[#F4F7F6] dark:bg-[#0E1B16] border border-[#DCE8E1] dark:border-[#253F34] text-sm text-[#122620] dark:text-[#EDF7F2] placeholder:text-[#6B827A] focus:border-[#1F8A4C] transition-colors"
                />
              </label>

              <label className="block relative">
                <span className="sr-only">Password</span>
                <Lock
                  className="w-4 h-4 text-[#5D776E] absolute left-3.5 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  className="w-full min-h-[48px] pl-10 pr-11 rounded-xl bg-[#F4F7F6] dark:bg-[#0E1B16] border border-[#DCE8E1] dark:border-[#253F34] text-sm text-[#122620] dark:text-[#EDF7F2] placeholder:text-[#6B827A] focus:border-[#1F8A4C] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#5D776E] hover:text-[#122620] dark:hover:text-[#EDF7F2]"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </label>

              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="inline-flex items-center gap-2 cursor-pointer text-[#3E584F] dark:text-[#A6C2B6]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[#C6D8CE] accent-[#1B4D3E]"
                  />
                  <span>Remember me</span>
                </label>

                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="font-semibold text-[#1F8A4C] dark:text-[#4ADE80] hover:underline"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="airnest-shimmer-btn w-full min-h-[48px] rounded-xl bg-[#1B4D3E] hover:bg-[#143D30] disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-sm hover:-translate-y-0.5 transition-all mt-1"
              >
                <span className="w-5 h-5 rounded-full border border-white/70 flex items-center justify-center">
                  <ArrowRight className="w-3 h-3" aria-hidden="true" />
                </span>
                <span>
                  {submitting
                    ? 'Please wait...'
                    : mode === 'signin'
                      ? 'Sign In'
                      : 'Create Account'}
                </span>
              </button>
            </form>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-[#E2ECE6] dark:border-[#243B31]" />
              <span className="px-3 text-xs text-[#617B72] dark:text-[#8CA99D] bg-white dark:bg-[#13221C] whitespace-nowrap">
                or continue with
              </span>
              <div className="w-full border-t border-[#E2ECE6] dark:border-[#243B31]" />
            </div>

            {/* Google Sign-In + Instant Demo Mode Access */}
            <div className="space-y-2.5">
              <button
                type="button"
                disabled={submitting}
                onClick={handleGoogleLogin}
                className="w-full min-h-[46px] px-4 rounded-xl bg-white dark:bg-[#172A22] hover:bg-[#F6FAF8] dark:hover:bg-[#1E352B] border border-[#D4E2DA] dark:border-[#2C4B3E] text-sm font-semibold text-[#122620] dark:text-[#EDF7F2] inline-flex items-center justify-center gap-2.5 hover:-translate-y-0.5 transition-all"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onContinueDemo('coimbatore')}
                  className="min-h-[42px] px-3 rounded-xl bg-[#F3F8F5] dark:bg-[#172A22] hover:bg-[#E5F3EC] dark:hover:bg-[#1F352B] border border-[#D8E8DF] dark:border-[#253F34] text-xs font-semibold text-[#1B4D3E] dark:text-[#6EE7B7] hover:-translate-y-0.5 transition-all"
                >
                  Demo: Coimbatore 85
                </button>
                <button
                  type="button"
                  onClick={() => onContinueDemo('delhi')}
                  className="min-h-[42px] px-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-800 dark:text-rose-200 hover:-translate-y-0.5 transition-all"
                >
                  Demo: Delhi 420
                </button>
              </div>
            </div>

            {/* Sign Up / Sign In Switch */}
            <p className="text-center text-xs text-[#49635A] dark:text-[#A6C2B6] pt-1">
              {mode === 'signin' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setStatusMessage(null);
                    }}
                    className="font-bold text-[#1F8A4C] dark:text-[#4ADE80] hover:underline inline-flex items-center gap-0.5"
                  >
                    <span>Sign Up</span>
                    <ArrowRight className="w-3 h-3" aria-hidden="true" />
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setStatusMessage(null);
                    }}
                    className="font-bold text-[#1F8A4C] dark:text-[#4ADE80] hover:underline inline-flex items-center gap-0.5"
                  >
                    <span>Sign In</span>
                    <ArrowRight className="w-3 h-3" aria-hidden="true" />
                  </button>
                </>
              )}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
