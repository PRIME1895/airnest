import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CalendarCheck2,
  CheckCircle2,
  ChevronDown,
  Globe,
  Home,
  Leaf,
  MapPin,
  Moon,
  Play,
  Scale,
  Settings,
  SlidersHorizontal,
  Sun,
  TrendingDown,
  Users,
  Wind,
} from 'lucide-react';
import type { Language } from '../../packages/shared/schemas';
import type { AirNestRoute } from './Navigation';

type LandingSectionId = 'home' | 'features' | 'about' | 'impact' | 'community' | 'faq';

interface LandingPageProps {
  language: Language;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onLanguageChange: (lang: Language) => void;
  onGetStarted: () => void;
  onExploreDemo: (scenario?: 'coimbatore' | 'delhi', route?: AirNestRoute) => void;
}

interface TestimonialItem {
  quote: string;
  author: string;
  city: string;
  initials: string;
  tone: string;
}

const NAV_LINKS: Array<{ id: LandingSectionId; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'features', label: 'Features' },
  { id: 'about', label: 'About' },
  { id: 'impact', label: 'Impact' },
  { id: 'community', label: 'Community' },
  { id: 'faq', label: 'FAQ' },
];

const TESTIMONIALS: TestimonialItem[] = [
  {
    quote:
      "AirNest helped us keep our home safer during Delhi's smog. The personalised plan is a game-changer!",
    author: 'Priya Sharma',
    city: 'Delhi',
    initials: 'PS',
    tone: 'bg-[#1B4D3E] text-white',
  },
  {
    quote:
      'Knowing the exact 5 PM – 7 PM clean window let my father resume evening walks safely without buying an expensive purifier.',
    author: 'Karthik Subramanian',
    city: 'Coimbatore',
    initials: 'KS',
    tone: 'bg-[#2D8A56] text-white',
  },
  {
    quote:
      'Our housing society joined the Clean Air Challenge and cut weekly solo car runs by 30% with clear CO2e estimates everyone trusts.',
    author: 'Meera Deshmukh',
    city: 'Mumbai',
    initials: 'MD',
    tone: 'bg-[#0F766E] text-white',
  },
];

const COMMUNITY_GROUPS = [
  { name: 'GreenSteps Coimbatore', city: 'Tamil Nadu', members: '4,210', co2Tonnes: '12.8 t' },
  { name: 'Dwarka Fresh Air Collective', city: 'Delhi-NCR', members: '6,840', co2Tonnes: '19.4 t' },
  { name: 'Indiranagar Clean Commute', city: 'Bengaluru', members: '3,920', co2Tonnes: '11.2 t' },
];

const FAQ_ITEMS = [
  {
    q: 'Do I need an expensive air purifier to benefit from AirNest?',
    a: 'No. Every AirNest daily plan and Indoor Air Coach recommendation starts with a ₹0 action — such as inversion-aware ventilation timing, wet mopping, lid-covered cooking, or a low-cost DIY Corsi-Rosenthal box-fan filter.',
  },
  {
    q: 'How does the Push Notification system alert me about Unhealthy air?',
    a: 'When you opt in to alerts in Settings, AirNest monitors your local AQI through the browser Notification API inside its PWA Service Worker and fires an alert automatically whenever AQI exceeds Unhealthy levels (AQI > 150 by default, customizable).',
  },
  {
    q: 'Are the CO2e and PM2.5 impact numbers exact measurements?',
    a: 'All personal exposure, household CO2e, and community scale numbers are clearly labeled as modeled estimates backed by CPCB, WHO 2021, and IPCC AR6 formulas, with High/Medium/Low confidence indicators.',
  },
  {
    q: 'Does AirNest work offline and protect my family privacy?',
    a: 'Yes. AirNest caches your latest AQI snapshot and daily plan for offline access as a PWA. Coordinates are rounded to an approximate ~1.1 km grid, and you can export or delete your data anytime.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  language,
  theme,
  onToggleTheme,
  onLanguageChange,
  onGetStarted,
  onExploreDemo,
}) => {
  const [previewCity, setPreviewCity] = useState<'coimbatore' | 'delhi'>('coimbatore');
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const [activeSection, setActiveSection] = useState<LandingSectionId>('home');
  const [spotlightSection, setSpotlightSection] = useState<LandingSectionId | null>(null);
  const [impactHouseholds, setImpactHouseholds] = useState<number>(500);

  // Scroll-spy via IntersectionObserver for smooth active nav link updates
  useEffect(() => {
    const ids: LandingSectionId[] = ['home', 'features', 'about', 'impact', 'community', 'faq'];
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (elements.length === 0 || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveSection(visible[0].target.id as LandingSectionId);
        }
      },
      { rootMargin: '-25% 0px -55% 0px', threshold: [0.15, 0.4, 0.7] }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handleNavJump = (id: LandingSectionId) => {
    setActiveSection(id);
    setSpotlightSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    window.setTimeout(() => {
      setSpotlightSection((curr) => (curr === id ? null : curr));
    }, 950);
  };

  // Interactive modeled city-scale impact estimates for the Impact section
  const scaledImpact = useMemo(() => {
    const monthlyCo2Tonnes = Math.round(((impactHouseholds * 1.81 * 4.33) / 1000) * 100) / 100;
    const monthlyPm25Kg = Math.round(((impactHouseholds * 0.78 * 4.33) / 1000) * 100) / 100;
    const cleanAirHours = Math.round(impactHouseholds * 2.4);
    return { monthlyCo2Tonnes, monthlyPm25Kg, cleanAirHours };
  }, [impactHouseholds]);

  const activeTestimonial = TESTIMONIALS[testimonialIdx];
  const isDelhiPreview = previewCity === 'delhi';

  const previewData = isDelhiPreview
    ? {
        city: 'New Delhi',
        aqi: 420,
        band: 'Severe',
        pm25: '268 µg/m³',
        temp: '14°C',
        weather: 'Winter Smog',
        bestWindow: '2 PM – 4 PM',
        worstWindow: '6 AM – 10 AM',
        strokeColor: '#DC2626',
        dashOffset: 24,
        planItems: [
          '7 AM – Seal windows & wet-mop floors (₹0)',
          '2 PM – Brief 15 min cross-ventilation',
          'Outdoors – Fitted N95 mask for essential trips',
        ],
      }
    : {
        city: 'Coimbatore',
        aqi: 85,
        band: 'Moderate',
        pm25: '28 µg/m³',
        temp: '28°C',
        weather: 'Partly Cloudy',
        bestWindow: '5 PM – 7 PM',
        worstWindow: '9 AM – 11 AM',
        strokeColor: '#22C55E',
        dashOffset: 98,
        planItems: [
          '7 AM – Keep windows closed during traffic peak',
          '5 PM – Great time for outdoor exercise!',
          'After 8 PM – Avoid high-heat cooking without exhaust',
        ],
      };

  const nextTestimonial = () => setTestimonialIdx((i) => (i + 1) % TESTIMONIALS.length);
  const prevTestimonial = () =>
    setTestimonialIdx((i) => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);

  return (
    <div className="min-h-screen bg-[#F3F8F5] dark:bg-[#0B1612] text-[#122620] dark:text-[#EDF7F2] overflow-x-clip transition-colors duration-300">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#F2F9F6]/85 dark:bg-[#0B1612]/85 backdrop-blur-md border-b border-[#DCEBE2]/70 dark:border-[#21382E] transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <button
            type="button"
            onClick={() => handleNavJump('home')}
            className="inline-flex items-center gap-2.5 font-extrabold text-xl tracking-tight text-[#122620] dark:text-[#EDF7F2] shrink-0"
          >
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2D8A56] to-[#1B4D3E] text-white flex items-center justify-center shadow-sm">
              <Leaf className="w-5 h-5" aria-hidden="true" />
            </span>
            <span>AirNest</span>
          </button>

          {/* Animated Smooth-Scroll Navigation Links */}
          <nav aria-label="Landing navigation" className="hidden md:flex items-center gap-1.5 text-sm font-medium">
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => handleNavJump(link.id)}
                  className={`relative px-3.5 py-2 rounded-full transition-all duration-300 ${
                    isActive
                      ? 'text-[#143D30] dark:text-[#6EE7B7] font-semibold bg-[#E4F3EA] dark:bg-[#183126]'
                      : 'text-[#3C564D] dark:text-[#A6C2B6] hover:text-[#1B4D3E] dark:hover:text-[#6EE7B7] hover:bg-[#EDF7F1] dark:hover:bg-[#14261E]'
                  }`}
                >
                  <span>{link.label}</span>
                  <span
                    aria-hidden="true"
                    className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-0.5 rounded-full bg-[#1F8A4C] dark:bg-[#4ADE80] transition-all duration-300 ${
                      isActive ? 'w-5 opacity-100' : 'w-0 opacity-0'
                    }`}
                  />
                </button>
              );
            })}
          </nav>

          {/* Right Language + Dark Mode + CTA */}
          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="landing-lang-select" className="sr-only">
              Select language
            </label>
            <div className="relative inline-flex items-center">
              <Globe
                className="w-3.5 h-3.5 text-[#3C564D] dark:text-[#A6C2B6] absolute left-3 pointer-events-none"
                aria-hidden="true"
              />
              <select
                id="landing-lang-select"
                value={language}
                onChange={(e) => onLanguageChange(e.target.value as Language)}
                className="min-h-[40px] pl-8 pr-3 rounded-full bg-white/90 dark:bg-[#13221C] border border-[#CFE2D7] dark:border-[#253F34] text-xs font-semibold text-[#122620] dark:text-[#EDF7F2]"
              >
                <option value="en">EN</option>
                <option value="hi">हिन्दी</option>
                <option value="ta">தமிழ்</option>
              </select>
            </div>

            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="min-w-[40px] min-h-[40px] rounded-full bg-white/90 dark:bg-[#13221C] border border-[#CFE2D7] dark:border-[#253F34] flex items-center justify-center text-[#122620] dark:text-[#EDF7F2] hover:border-[#2D8A56] transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-300" aria-hidden="true" />
              ) : (
                <Moon className="w-4 h-4 text-[#1B4D3E]" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={onGetStarted}
              className="airnest-shimmer-btn min-h-[42px] px-5 rounded-full bg-[#1B4D3E] hover:bg-[#143D30] text-white text-sm font-semibold inline-flex items-center gap-1.5 shadow-sm transition-colors whitespace-nowrap"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section with Bright Botanical Sky & Horizon */}
      <section
        id="home"
        className="relative overflow-hidden pt-10 pb-20 lg:pt-14 lg:pb-24 scroll-mt-20"
        style={{
          background:
            'radial-gradient(ellipse 75% 55% at 75% 8%, rgba(167, 232, 200, 0.45) 0%, transparent 65%), radial-gradient(ellipse 65% 50% at 15% 15%, rgba(209, 238, 248, 0.72) 0%, transparent 65%), linear-gradient(180deg, #E2F2FA 0%, #EEF8F2 68%, #E4F4EA 100%)',
        }}
      >
        {/* Dark mode overlay tint for hero */}
        <div
          aria-hidden="true"
          className="hidden dark:block absolute inset-0 bg-gradient-to-b from-[#0E221B] via-[#0D1E18] to-[#0B1612]"
        />

        {/* Ambient Floating Botanical Leaves */}
        <Leaf
          aria-hidden="true"
          className="animate-airnest-float pointer-events-none hidden lg:block absolute top-14 left-[46%] w-7 h-7 text-[#2D8A56]/30 dark:text-[#4ADE80]/20"
        />
        <Leaf
          aria-hidden="true"
          className="animate-airnest-float-alt pointer-events-none hidden lg:block absolute top-32 right-8 w-6 h-6 text-[#1F8A4C]/25 dark:text-[#6EE7B7]/20"
        />

        {/* Atmospheric Sunlit City + Botanical Hills Backdrop SVG */}
        <svg
          aria-hidden="true"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
          className="pointer-events-none absolute bottom-0 inset-x-0 w-full h-44 sm:h-56 lg:h-64 opacity-85 dark:opacity-35"
        >
          <defs>
            <linearGradient id="landHillBack" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9ED4B6" />
              <stop offset="100%" stopColor="#6BB48C" />
            </linearGradient>
            <linearGradient id="landHillFront" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4FA072" />
              <stop offset="100%" stopColor="#1F6646" />
            </linearGradient>
          </defs>
          <g fill="#BBD8DF" opacity="0.7">
            <rect x="420" y="130" width="28" height="140" rx="2" />
            <rect x="454" y="95" width="34" height="175" rx="2" />
            <rect x="494" y="118" width="24" height="152" rx="2" />
            <rect x="525" y="72" width="38" height="198" rx="2" />
            <rect x="570" y="108" width="30" height="162" rx="2" />
            <rect x="608" y="138" width="42" height="132" rx="2" />
            <rect x="656" y="88" width="32" height="182" rx="2" />
          </g>
          <path
            d="M0,245 C220,175 430,220 670,195 C910,170 1160,120 1440,185 L1440,320 L0,320 Z"
            fill="url(#landHillBack)"
          />
          <path
            d="M0,268 C260,210 520,255 820,215 C1090,180 1280,205 1440,230 L1440,320 L0,320 Z"
            fill="url(#landHillFront)"
          />
        </svg>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left Hero Copy */}
          <div className="lg:col-span-6 space-y-6 animate-airnest-stage-enter">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/85 dark:bg-[#132820]/90 border border-[#C6E4D2] dark:border-[#294A3B] text-xs font-semibold text-[#1B4D3E] dark:text-[#6EE7B7] shadow-xs">
              <Leaf className="w-3.5 h-3.5 text-[#229255]" aria-hidden="true" />
              <span>AI-Powered · Personalised · For a Cleaner Tomorrow</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[58px] font-extrabold tracking-tight leading-[1.06] text-[#0E241E] dark:text-[#F2FBF6]">
              Breathe Smarter.
              <br />
              Live{' '}
              <span className="relative inline-block text-[#1F8A4C] dark:text-[#4ADE80]">
                Healthier.
                <svg
                  aria-hidden="true"
                  viewBox="0 0 240 16"
                  fill="none"
                  className="absolute -bottom-2 left-0 w-full h-3.5"
                >
                  <path
                    d="M4 11C68 3 162 2 236 10"
                    stroke="#28A45E"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            <p className="text-base sm:text-lg text-[#365047] dark:text-[#B4CFC3] max-w-xl leading-relaxed">
              AirNest is your GenAI assistant for winter smog and urban air pollution — giving you
              personalised daily plans, zero-cost indoor protection, and real environmental impact
              estimates.
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="flex flex-wrap items-center gap-3.5 pt-1">
              <button
                type="button"
                onClick={onGetStarted}
                className="airnest-shimmer-btn min-h-[50px] px-7 rounded-full bg-[#1B4D3E] hover:bg-[#143D30] text-white text-sm sm:text-base font-semibold inline-flex items-center gap-2 shadow-md transition-all hover:-translate-y-0.5"
              >
                <span>Try AirNest Now</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => onExploreDemo('coimbatore', 'home')}
                className="min-h-[50px] px-6 rounded-full bg-white/95 dark:bg-[#13221C] hover:bg-white dark:hover:bg-[#1B3128] border border-[#CBE2D5] dark:border-[#2C4B3E] text-[#122620] dark:text-[#EDF7F2] text-sm sm:text-base font-semibold inline-flex items-center gap-2 shadow-xs transition-all hover:-translate-y-0.5"
              >
                <span className="w-6 h-6 rounded-full bg-[#1F8A4C] text-white flex items-center justify-center">
                  <Play className="w-3 h-3 fill-current ml-0.5" aria-hidden="true" />
                </span>
                <span>Explore Live Demo</span>
              </button>
            </div>

            {/* Family Trust Row */}
            <div className="flex items-center gap-3 pt-1">
              <div className="flex -space-x-2" aria-hidden="true">
                {[
                  { label: 'PS', bg: 'bg-[#1B4D3E]' },
                  { label: 'KS', bg: 'bg-[#2D8A56]' },
                  { label: 'MD', bg: 'bg-[#0F766E]' },
                  { label: 'AR', bg: 'bg-[#366B54]' },
                ].map((av) => (
                  <span
                    key={av.label}
                    className={`w-8 h-8 rounded-full ${av.bg} text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-[#0B1612]`}
                  >
                    {av.label}
                  </span>
                ))}
              </div>
              <p className="text-xs sm:text-sm font-medium text-[#314E44] dark:text-[#A6C2B6]">
                Designed for families across Delhi-NCR, Tamil Nadu &amp; global cities
              </p>
            </div>
          </div>

          {/* Right Elevated Interactive Dashboard Preview Card */}
          <div className="lg:col-span-6">
            <div className="lg:rotate-[1.4deg] hover:rotate-0 transition-transform duration-500 rounded-[26px] bg-white/95 dark:bg-[#12221B]/95 backdrop-blur-md border border-white/90 dark:border-[#284539] shadow-[0_24px_60px_-15px_rgba(18,52,40,0.22)] p-3.5 sm:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-[126px_1fr] gap-3">
                {/* Mini Preview Sidebar */}
                <div className="hidden sm:flex flex-col justify-between rounded-2xl bg-[#F5FAF7] dark:bg-[#0E1B16] border border-[#E2EFE7] dark:border-[#20362C] p-3">
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-[#122620] dark:text-[#EDF7F2]">
                      <Leaf className="w-4 h-4 text-[#229255]" aria-hidden="true" />
                      <span>AirNest</span>
                    </div>
                    <div className="space-y-1 text-[10.5px] font-medium text-[#49635A] dark:text-[#96B4A8]">
                      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[#E4F3EA] dark:bg-[#1B3529] text-[#143D30] dark:text-[#6EE7B7] font-semibold">
                        <Home className="w-3 h-3" aria-hidden="true" />
                        <span>Home</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1">
                        <CalendarCheck2 className="w-3 h-3" aria-hidden="true" />
                        <span>My Plan</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1">
                        <Wind className="w-3 h-3" aria-hidden="true" />
                        <span>Indoor Coach</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1">
                        <Scale className="w-3 h-3" aria-hidden="true" />
                        <span>Impact</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1">
                        <SlidersHorizontal className="w-3 h-3" aria-hidden="true" />
                        <span>Simulator</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1">
                        <Users className="w-3 h-3" aria-hidden="true" />
                        <span>Community</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1">
                        <Settings className="w-3 h-3" aria-hidden="true" />
                        <span>Settings</span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl bg-gradient-to-br from-[#E4F4EA] to-[#D1EBDC] dark:from-[#172C22] dark:to-[#11221B] p-2 text-[10px] font-bold text-[#143D30] dark:text-[#6EE7B7] leading-tight">
                    Breathe Better
                    <br />
                    Live Greener
                  </div>
                </div>

                {/* Mini Dashboard Main Preview */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-[#122620] dark:text-[#EDF7F2]">
                        Good afternoon, Harikrishna
                      </div>
                      <div className="text-[11px] text-[#49635A] dark:text-[#A6C2B6]">
                        Let&apos;s breathe smarter together.
                      </div>
                    </div>
                    <div
                      role="group"
                      aria-label="Preview city switcher"
                      className="inline-flex items-center rounded-full bg-[#EFF7F2] dark:bg-[#172B22] p-0.5 border border-[#D8E8DF] dark:border-[#264135]"
                    >
                      <button
                        type="button"
                        onClick={() => setPreviewCity('coimbatore')}
                        aria-pressed={!isDelhiPreview}
                        className={`px-2.5 py-1 rounded-full text-[10.5px] font-semibold inline-flex items-center gap-1 transition-colors ${
                          !isDelhiPreview
                            ? 'bg-white dark:bg-[#12221B] text-[#122620] dark:text-[#EDF7F2] shadow-xs'
                            : 'text-[#49635A] dark:text-[#A6C2B6]'
                        }`}
                      >
                        <MapPin className="w-2.5 h-2.5 text-[#1F8A4C]" aria-hidden="true" />
                        Coimbatore
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewCity('delhi')}
                        aria-pressed={isDelhiPreview}
                        className={`px-2.5 py-1 rounded-full text-[10.5px] font-semibold transition-colors ${
                          isDelhiPreview
                            ? 'bg-rose-700 text-white shadow-xs'
                            : 'text-[#49635A] dark:text-[#A6C2B6]'
                        }`}
                      >
                        Delhi 420
                      </button>
                    </div>
                  </div>

                  {/* Preview Grid: AQI Gauge + 48h Forecast + Mini AI Plan */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <div className="sm:col-span-7 space-y-2.5">
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="rounded-2xl bg-[#F7FBF8] dark:bg-[#162820] border border-[#E2EFE7] dark:border-[#243E32] p-2.5 flex flex-col items-center justify-center text-center">
                          <div className="relative w-24 h-24 flex items-center justify-center">
                            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-hidden="true">
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke="#E1ECE6"
                                strokeWidth="8"
                              />
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke={previewData.strokeColor}
                                strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray="251"
                                strokeDashoffset={previewData.dashOffset}
                                className="transition-all duration-500"
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-[9px] uppercase tracking-wider text-[#49635A] dark:text-[#A6C2B6] font-semibold">
                                AQI
                              </span>
                              <span className="text-2xl font-extrabold tabular-nums text-[#122620] dark:text-[#EDF7F2] leading-none">
                                {previewData.aqi}
                              </span>
                              <span className="text-[10px] font-semibold text-[#1F8A4C] dark:text-[#6EE7B7] mt-0.5">
                                {previewData.band}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] text-[#49635A] dark:text-[#A6C2B6] font-medium">
                            PM2.5: {previewData.pm25}
                          </span>
                        </div>

                        <div className="rounded-2xl bg-[#F7FBF8] dark:bg-[#162820] border border-[#E2EFE7] dark:border-[#243E32] p-2.5 flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-base font-bold tabular-nums text-[#122620] dark:text-[#EDF7F2]">
                                {previewData.temp}
                              </div>
                              <div className="text-[10px] text-[#49635A] dark:text-[#A6C2B6]">
                                {previewData.weather}
                              </div>
                            </div>
                            <Sun className="w-5 h-5 text-amber-500" aria-hidden="true" />
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-[#122620] dark:text-[#EDF7F2] mb-1">
                              48h Forecast
                            </div>
                            <svg viewBox="0 0 120 42" className="w-full h-10" aria-hidden="true">
                              <path
                                d={
                                  isDelhiPreview
                                    ? 'M4,12 Q32,8 58,24 T116,14'
                                    : 'M4,22 Q34,26 64,16 T116,18'
                                }
                                fill="none"
                                stroke={isDelhiPreview ? '#DC2626' : '#229255'}
                                strokeWidth="2.5"
                                strokeLinecap="round"
                              />
                              <path
                                d={
                                  isDelhiPreview
                                    ? 'M4,20 Q32,16 58,31 T116,22'
                                    : 'M4,30 Q34,32 64,25 T116,26'
                                }
                                fill="none"
                                stroke="#38BDF8"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="flex justify-between text-[8.5px] text-[#607970] dark:text-[#8CA99D]">
                              <span>Now</span>
                              <span>6PM</span>
                              <span>12AM</span>
                              <span>12PM</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl bg-[#EEF8F2] dark:bg-[#162A22] border border-[#D8ECE0] dark:border-[#243E32] px-3 py-2 grid grid-cols-2 gap-2 text-[10.5px]">
                        <div>
                          <div className="text-[#49635A] dark:text-[#A6C2B6] font-medium">
                            Best Outdoor Window
                          </div>
                          <div className="font-bold text-[#1B4D3E] dark:text-[#6EE7B7] tabular-nums">
                            {previewData.bestWindow}
                          </div>
                        </div>
                        <div className="border-l border-[#D2E6DA] dark:border-[#253F34] pl-2.5">
                          <div className="text-[#49635A] dark:text-[#A6C2B6] font-medium">
                            Worst Time
                          </div>
                          <div className="font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                            {previewData.worstWindow}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="sm:col-span-5 rounded-2xl bg-[#EEF7F1] dark:bg-[#162920] border border-[#D8ECE0] dark:border-[#253F34] p-3 flex flex-col justify-between gap-2.5">
                      <div className="space-y-2">
                        <div>
                          <div className="text-xs font-bold text-[#122620] dark:text-[#EDF7F2]">
                            Your AI Daily Plan
                          </div>
                          <div className="text-[10px] text-[#49635A] dark:text-[#A6C2B6]">
                            Personalised for {previewData.city} · {previewData.temp}
                          </div>
                        </div>
                        <ul className="space-y-1.5 text-[10.5px] text-[#1D3B30] dark:text-[#D9ECE2]">
                          {previewData.planItems.map((item) => (
                            <li key={item} className="flex items-start gap-1.5 leading-snug">
                              <CheckCircle2
                                className="w-3.5 h-3.5 text-[#229255] shrink-0 mt-0.5"
                                aria-hidden="true"
                              />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <button
                        type="button"
                        onClick={() => onExploreDemo(previewCity, 'plan')}
                        className="w-full min-h-[34px] rounded-xl bg-[#1B4D3E] hover:bg-[#143D30] text-white text-[11px] font-semibold inline-flex items-center justify-center gap-1 transition-colors"
                      >
                        <span>View Full Plan</span>
                        <ArrowRight className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Floating 5-Column Feature Bar */}
      <section
        id="features"
        className="relative z-20 -mt-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24"
      >
        <div
          className={`rounded-2xl bg-white/95 dark:bg-[#13221C]/95 backdrop-blur-md border border-[#D8E8DF] dark:border-[#253F34] shadow-lg grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[#E3EFE8] dark:divide-[#21382E] transition-all ${
            spotlightSection === 'features' ? 'animate-airnest-spotlight' : ''
          }`}
        >
          {[
            {
              icon: <Home className="w-5 h-5 text-[#1F8A4C] dark:text-[#4ADE80]" aria-hidden="true" />,
              title: 'Indoor Air Coach',
              sub: 'Healthier Homes',
              route: 'indoor' as AirNestRoute,
            },
            {
              icon: <Leaf className="w-5 h-5 text-[#1F8A4C] dark:text-[#4ADE80]" aria-hidden="true" />,
              title: 'Impact Explorer',
              sub: 'See Your Difference',
              route: 'impact' as AirNestRoute,
            },
            {
              icon: <SlidersHorizontal className="w-5 h-5 text-[#1F8A4C] dark:text-[#4ADE80]" aria-hidden="true" />,
              title: 'What-If Simulator',
              sub: 'Explore Alternatives',
              route: 'simulator' as AirNestRoute,
            },
            {
              icon: <Users className="w-5 h-5 text-[#1F8A4C] dark:text-[#4ADE80]" aria-hidden="true" />,
              title: 'Community',
              sub: 'Join Clean Air Challenges',
              route: 'community' as AirNestRoute,
            },
            {
              icon: <Globe className="w-5 h-5 text-[#1F8A4C] dark:text-[#4ADE80]" aria-hidden="true" />,
              title: 'Multi-Language',
              sub: 'English • Hindi • Tamil',
              route: 'settings' as AirNestRoute,
            },
          ].map((feat) => (
            <button
              key={feat.title}
              type="button"
              onClick={() => onExploreDemo('coimbatore', feat.route)}
              className="group p-4 sm:p-5 flex items-center gap-3 text-left hover:bg-[#F4FAF6] dark:hover:bg-[#182C23] transition-all first:rounded-t-2xl sm:first:rounded-l-2xl sm:first:rounded-tr-none last:rounded-b-2xl lg:last:rounded-r-2xl lg:last:rounded-bl-none"
            >
              <span className="w-10 h-10 rounded-xl bg-[#EAF5EE] dark:bg-[#1B3529] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                {feat.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-[#122620] dark:text-[#EDF7F2] truncate">
                  {feat.title}
                </span>
                <span className="block text-xs text-[#49635A] dark:text-[#A6C2B6] truncate">
                  {feat.sub}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* About / Why AirNest Section */}
      <section
        id="about"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-8 scroll-mt-24"
      >
        <div
          className={`rounded-3xl bg-white dark:bg-[#13221C] border border-[#DCEBE2] dark:border-[#253F34] p-6 sm:p-8 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center transition-all ${
            spotlightSection === 'about' ? 'animate-airnest-spotlight' : ''
          }`}
        >
          <div className="lg:col-span-6 space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF5EE] dark:bg-[#1A3428] text-xs font-bold text-[#1B4D3E] dark:text-[#6EE7B7]">
              Why AirNest?
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0E241E] dark:text-[#EDF7F2]">
              Because cleaner air shouldn&apos;t be a luxury. It should be a plan.
            </h2>
            <p className="text-sm sm:text-base text-[#49635A] dark:text-[#A6C2B6] leading-relaxed">
              Most apps stop at an AQI number. AirNest translates atmospheric inversion physics,
              wind speed, and household sensitivities into ₹0 daily routines and clear health and
              emissions math.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                onClick={() => onExploreDemo('delhi', 'home')}
                className="airnest-shimmer-btn min-h-[44px] px-6 rounded-full bg-[#1B4D3E] hover:bg-[#143D30] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
              >
                <span>Try Delhi Severe Smog Demo</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => handleNavJump('impact')}
                className="min-h-[44px] px-5 rounded-full bg-[#F3F8F5] dark:bg-[#172A22] border border-[#D8E8DF] dark:border-[#253F34] text-sm font-semibold text-[#1B4D3E] dark:text-[#6EE7B7] hover:bg-[#E5F3EC] dark:hover:bg-[#1F352B] transition-colors"
              >
                See Interactive Impact
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                title: 'Personalised Daily Plans',
                desc: 'Hour-by-hour inversion-aware schedules tailored to your city, home, and budget.',
              },
              {
                title: 'Always Includes ₹0 Options',
                desc: 'Never assumes a car or pricey purifier — starts with zero-cost ventilation & DIY hacks.',
              },
              {
                title: 'Per-Family Risk Protection',
                desc: 'Tailored guidance for asthmatic children, elders, and sensitive lungs.',
              },
              {
                title: 'Push Alerts & Offline PWA',
                desc: 'Service Worker notifications when local AQI exceeds Unhealthy levels, plus offline caching.',
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-2xl bg-[#F6FBF8] dark:bg-[#162820] border border-[#E0EFE6] dark:border-[#243B31] p-4 space-y-1.5 hover:-translate-y-0.5 transition-transform"
              >
                <div className="flex items-center gap-2 text-sm font-bold text-[#122620] dark:text-[#EDF7F2]">
                  <CheckCircle2 className="w-4 h-4 text-[#1F8A4C] dark:text-[#4ADE80] shrink-0" aria-hidden="true" />
                  <span>{card.title}</span>
                </div>
                <p className="text-xs text-[#49635A] dark:text-[#A6C2B6] leading-relaxed">
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dedicated Interactive Impact Section */}
      <section
        id="impact"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 scroll-mt-24"
      >
        <div
          className={`rounded-3xl bg-gradient-to-br from-[#EAF6EE] via-[#E4F3EA] to-[#D7ECE0] dark:from-[#13261E] dark:via-[#11221B] dark:to-[#0E1C16] border border-[#CFE5D8] dark:border-[#243E32] p-6 sm:p-8 lg:p-10 shadow-sm space-y-7 transition-all ${
            spotlightSection === 'impact' ? 'animate-airnest-spotlight' : ''
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 dark:bg-[#193328] text-xs font-bold text-[#1B4D3E] dark:text-[#6EE7B7]">
                <TrendingDown className="w-3.5 h-3.5" aria-hidden="true" />
                <span>3-Layer Impact Explainer</span>
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0E241E] dark:text-[#EDF7F2]">
                Real Impact. Measurable Change.
              </h2>
              <p className="text-sm sm:text-base text-[#355248] dark:text-[#A6C2B6]">
                Every AirNest recommendation explains (1) personal PM2.5 exposure cut, (2)
                household CO₂e &amp; PM2.5 avoided, and (3) what happens when your neighbourhood acts
                together.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onExploreDemo('coimbatore', 'impact')}
              className="airnest-shimmer-btn min-h-[44px] px-5 rounded-full bg-[#1B4D3E] hover:bg-[#143D30] text-white text-sm font-semibold inline-flex items-center gap-2 shrink-0 self-start lg:self-auto"
            >
              <span>Open Impact Explorer</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Interactive City-Scale Adoption Slider */}
          <div className="rounded-2xl bg-white/90 dark:bg-[#13221C]/90 border border-[#D4E8DC] dark:border-[#253F34] p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="landing-impact-slider"
                className="text-sm font-bold text-[#122620] dark:text-[#EDF7F2]"
              >
                Simulate neighbourhood adoption: if{' '}
                <span className="text-[#1F8A4C] dark:text-[#4ADE80] tabular-nums">
                  {impactHouseholds.toLocaleString()} households
                </span>{' '}
                switch 3 weekly commutes + time ventilation
              </label>
              <span className="text-xs font-semibold text-[#49635A] dark:text-[#A6C2B6]">
                Modeled estimates · Confidence: High
              </span>
            </div>
            <input
              id="landing-impact-slider"
              type="range"
              min={100}
              max={5000}
              step={100}
              value={impactHouseholds}
              onChange={(e) => setImpactHouseholds(Number(e.target.value))}
              className="w-full accent-[#1B4D3E] dark:accent-[#4ADE80] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] font-medium text-[#49635A] dark:text-[#A6C2B6] tabular-nums">
              <span>100 homes</span>
              <span>500 homes</span>
              <span>2,500 homes</span>
              <span>5,000 homes</span>
            </div>
          </div>

          {/* 4 Live Calculated Impact Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[
              {
                icon: <Wind className="w-5 h-5 text-[#1F8A4C] dark:text-[#4ADE80]" aria-hidden="true" />,
                value: '↓ 25–42%',
                label: 'Personal PM2.5 Exposure',
                note: 'Per household (est.)',
              },
              {
                icon: <Leaf className="w-5 h-5 text-[#1F8A4C] dark:text-[#4ADE80]" aria-hidden="true" />,
                value: `${scaledImpact.monthlyCo2Tonnes} t`,
                label: 'CO₂e Avoided / Month',
                note: `${impactHouseholds.toLocaleString()} homes (est.)`,
              },
              {
                icon: <Scale className="w-5 h-5 text-[#1F8A4C] dark:text-[#4ADE80]" aria-hidden="true" />,
                value: `${scaledImpact.monthlyPm25Kg} kg`,
                label: 'PM2.5 Avoided / Month',
                note: 'Tailpipe + dust (est.)',
              },
              {
                icon: <Users className="w-5 h-5 text-[#1F8A4C] dark:text-[#4ADE80]" aria-hidden="true" />,
                value: `${scaledImpact.cleanAirHours.toLocaleString()} h`,
                label: 'Cleaner Indoor Hours / Day',
                note: 'Inversion-aware timing',
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl bg-white/92 dark:bg-[#13221C] border border-[#D4E8DC] dark:border-[#253F34] p-4 sm:p-5 space-y-1.5 shadow-xs"
              >
                {stat.icon}
                <div className="text-2xl sm:text-3xl font-extrabold tabular-nums text-[#0E241E] dark:text-[#EDF7F2]">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm font-bold text-[#1B4D3E] dark:text-[#6EE7B7]">
                  {stat.label}
                </div>
                <div className="text-[11px] text-[#49635A] dark:text-[#A6C2B6]">{stat.note}</div>
              </div>
            ))}
          </div>

          <p className="text-xs text-[#345448] dark:text-[#9BC2B2] text-center">
            All numbers are modeled estimates derived from CPCB, WHO 2021, and IPCC AR6 emission
            factors. Full formulas &amp; assumptions are visible inside the app.
          </p>
        </div>
      </section>

      {/* Dedicated Community Clean Air Challenge + Testimonials Section */}
      <section
        id="community"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 scroll-mt-24"
      >
        <div
          className={`grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch transition-all rounded-3xl ${
            spotlightSection === 'community' ? 'animate-airnest-spotlight' : ''
          }`}
        >
          {/* Left 7 Cols: Aggregate Community Challenge + Neighbourhood Leaderboard */}
          <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-[#13221C] border border-[#DCEBE2] dark:border-[#253F34] p-6 sm:p-7 shadow-sm flex flex-col justify-between gap-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF5EE] dark:bg-[#1A3428] text-xs font-bold text-[#1B4D3E] dark:text-[#6EE7B7]">
                  <Award className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Community Clean Air Challenge</span>
                </span>
                <span className="text-xs font-semibold text-[#49635A] dark:text-[#A6C2B6]">
                  Privacy-safe · Aggregate only
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0E241E] dark:text-[#EDF7F2]">
                Cleaner Air Together Across India
              </h2>
              <p className="text-sm text-[#49635A] dark:text-[#A6C2B6]">
                Join neighbourhood Clean Air Challenges, share WhatsApp clean-window cards, and
                print apartment-board smog safety posters.
              </p>
            </div>

            {/* Aggregate Progress Bar */}
            <div className="rounded-2xl bg-[#F4FAF6] dark:bg-[#162820] border border-[#DCEBE2] dark:border-[#243B31] p-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                <span className="text-[#122620] dark:text-[#EDF7F2]">
                  Monthly Community Goal: 10% Lower Neighbourhood PM2.5 (Estimate)
                </span>
                <span className="text-[#1F8A4C] dark:text-[#4ADE80] tabular-nums">78% reached</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-[#DCEBE2] dark:bg-[#243B31] overflow-hidden">
                <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-[#2D8A56] to-[#1B4D3E] dark:from-[#4ADE80] dark:to-[#2D8A56]" />
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                <div>
                  <div className="font-extrabold text-base tabular-nums text-[#122620] dark:text-[#EDF7F2]">
                    24.5K
                  </div>
                  <div className="text-[11px] text-[#49635A] dark:text-[#A6C2B6]">Participants</div>
                </div>
                <div>
                  <div className="font-extrabold text-base tabular-nums text-[#122620] dark:text-[#EDF7F2]">
                    43.4 t
                  </div>
                  <div className="text-[11px] text-[#49635A] dark:text-[#A6C2B6]">CO₂e Avoided*</div>
                </div>
                <div>
                  <div className="font-extrabold text-base tabular-nums text-[#122620] dark:text-[#EDF7F2]">
                    2.1M
                  </div>
                  <div className="text-[11px] text-[#49635A] dark:text-[#A6C2B6]">Clean Air Hours</div>
                </div>
              </div>
            </div>

            {/* Neighbourhood Groups */}
            <div className="space-y-2">
              {COMMUNITY_GROUPS.map((grp, idx) => (
                <div
                  key={grp.name}
                  className="rounded-xl bg-[#F8FCF9] dark:bg-[#15251E] border border-[#E2EFE7] dark:border-[#243B31] px-4 py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-[#E5F3EC] dark:bg-[#1C382B] text-[#1B4D3E] dark:text-[#6EE7B7] font-bold flex items-center justify-center shrink-0 tabular-nums">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-[#122620] dark:text-[#EDF7F2] truncate">
                        {grp.name}
                      </div>
                      <div className="text-[11px] text-[#49635A] dark:text-[#A6C2B6]">
                        {grp.city} · {grp.members} households
                      </div>
                    </div>
                  </div>
                  <span className="font-bold tabular-nums text-[#1F8A4C] dark:text-[#4ADE80] shrink-0">
                    {grp.co2Tonnes} CO₂e
                  </span>
                </div>
              ))}
            </div>

            <div>
              <button
                type="button"
                onClick={() => onExploreDemo('coimbatore', 'community')}
                className="airnest-shimmer-btn min-h-[44px] px-6 rounded-full bg-[#1B4D3E] hover:bg-[#143D30] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
              >
                <span>Join Community Challenge</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Right 5 Cols: Interactive Family Stories Carousel */}
          <div className="lg:col-span-5 rounded-3xl bg-white dark:bg-[#13221C] border border-[#DCEBE2] dark:border-[#253F34] p-6 sm:p-7 flex flex-col justify-between shadow-sm">
            <div className="space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-[#1F8A4C] dark:text-[#4ADE80]">
                Family Stories
              </div>
              <div
                aria-hidden="true"
                className="text-5xl leading-none font-serif font-bold text-[#229255]"
              >
                &ldquo;
              </div>
              <p
                key={activeTestimonial.author}
                className="text-base sm:text-lg font-medium leading-relaxed text-[#142D25] dark:text-[#E6F4EC] animate-airnest-stage-enter"
              >
                {activeTestimonial.quote}
              </p>
            </div>

            <div className="pt-6 space-y-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-11 h-11 rounded-full ${activeTestimonial.tone} text-xs font-bold flex items-center justify-center shrink-0`}
                  >
                    {activeTestimonial.initials}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#122620] dark:text-[#EDF7F2] truncate">
                      {activeTestimonial.author}
                    </div>
                    <div className="text-xs text-[#49635A] dark:text-[#A6C2B6]">
                      {activeTestimonial.city}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={prevTestimonial}
                    aria-label="Previous testimonial"
                    className="w-9 h-9 rounded-full border border-[#D8E8DF] dark:border-[#253F34] flex items-center justify-center text-[#122620] dark:text-[#EDF7F2] hover:bg-[#F3F8F5] dark:hover:bg-[#1B3128] transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={nextTestimonial}
                    aria-label="Next testimonial"
                    className="w-9 h-9 rounded-full border border-[#D8E8DF] dark:border-[#253F34] flex items-center justify-center text-[#122620] dark:text-[#EDF7F2] hover:bg-[#F3F8F5] dark:hover:bg-[#1B3128] transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2">
                {TESTIMONIALS.map((item, idx) => (
                  <button
                    key={item.author}
                    type="button"
                    onClick={() => setTestimonialIdx(idx)}
                    aria-label={`Show testimonial ${idx + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      idx === testimonialIdx
                        ? 'w-7 bg-[#1F8A4C] dark:bg-[#4ADE80]'
                        : 'w-2 bg-[#CDE2D6] dark:bg-[#2A4539]'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Compact FAQ Section */}
      <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16 space-y-4 scroll-mt-24">
        <div
          className={`space-y-4 rounded-3xl p-2 transition-all ${
            spotlightSection === 'faq' ? 'animate-airnest-spotlight' : ''
          }`}
        >
          <div className="text-center space-y-1">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0E241E] dark:text-[#EDF7F2]">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-[#49635A] dark:text-[#A6C2B6]">
              Clear, science-backed guidance designed for every household budget.
            </p>
          </div>

          <div className="space-y-2.5">
            {FAQ_ITEMS.map((faq, idx) => {
              const isOpen = openFaqIdx === idx;
              return (
                <div
                  key={faq.q}
                  className="rounded-2xl bg-white dark:bg-[#13221C] border border-[#DCEBE2] dark:border-[#253F34] overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    className="w-full min-h-[56px] px-5 py-3.5 flex items-center justify-between gap-3 text-left text-sm font-bold text-[#122620] dark:text-[#EDF7F2] hover:bg-[#F7FBF8] dark:hover:bg-[#172A22] transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 text-[#49635A] transition-transform duration-300 ${
                        isOpen ? 'rotate-180 text-[#1F8A4C] dark:text-[#4ADE80]' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-sm leading-relaxed text-[#49635A] dark:text-[#A6C2B6] animate-airnest-stage-enter">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="border-t border-[#DCEBE2] dark:border-[#21382E] bg-white/70 dark:bg-[#0E1B16]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#49635A] dark:text-[#A6C2B6]">
          <div className="flex items-center gap-2 font-bold text-[#122620] dark:text-[#EDF7F2]">
            <Leaf className="w-4 h-4 text-[#1F8A4C] dark:text-[#4ADE80]" aria-hidden="true" />
            <span>AirNest · Breathe Better, Live Greener</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onGetStarted}
              className="font-semibold text-[#1B4D3E] dark:text-[#6EE7B7] hover:underline"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => onExploreDemo('coimbatore', 'home')}
              className="font-semibold text-[#1B4D3E] dark:text-[#6EE7B7] hover:underline"
            >
              Coimbatore Demo
            </button>
            <button
              type="button"
              onClick={() => onExploreDemo('delhi', 'home')}
              className="font-semibold text-rose-700 dark:text-rose-300 hover:underline"
            >
              Delhi 420 Demo
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
