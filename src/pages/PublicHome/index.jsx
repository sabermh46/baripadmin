import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { appLogo, buildingShade, housesImage, laptopImage, profileAvatar } from '../../assets';
import Btn from '../../components/common/Button';
import { useTranslation } from 'react-i18next';
import {
  House,
  Wallet,
  Megaphone,
  Shield,
  Smartphone,
  BarChart3,
  UserCheck,
  Users,
  ChevronRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  PlayCircle,
  TrendingUp,
  Lock,
  Star,
} from 'lucide-react';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import TkSymbol from '../../components/common/TkSymbol';

const DEMO_SLIDES = [
  {
    image: buildingShade,
    titleKey: 'landing_demo_slide1_title',
    descKey:  'landing_demo_slide1_desc',
    tagKey:   'landing_demo_slide1_tag',
    accent:   'from-primary-600 to-primary-800',
  },
  {
    image: housesImage,
    titleKey: 'landing_demo_slide2_title',
    descKey:  'landing_demo_slide2_desc',
    tagKey:   'landing_demo_slide2_tag',
    accent:   'from-secondary-600 to-secondary-800',
  },
  {
    image: laptopImage,
    titleKey: 'landing_demo_slide3_title',
    descKey:  'landing_demo_slide3_desc',
    tagKey:   'landing_demo_slide3_tag',
    accent:   'from-primary-500 to-secondary-600',
  },
  {
    image: profileAvatar,
    titleKey: 'landing_demo_slide4_title',
    descKey:  'landing_demo_slide4_desc',
    tagKey:   'landing_demo_slide4_tag',
    accent:   'from-secondary-500 to-primary-600',
  },
];

const DemoSlider = ({ t }) => {
  const [active, setActive] = useState(0);
  const [animDir, setAnimDir] = useState('next'); // 'next' | 'prev'
  const [visible, setVisible] = useState(true);
  const timerRef = useRef(null);
  const hovered = useRef(false);
  const total = DEMO_SLIDES.length;

  const goTo = useCallback((idx, dir = 'next') => {
    setVisible(false);
    setAnimDir(dir);
    setTimeout(() => {
      setActive(idx);
      setVisible(true);
    }, 260);
  }, []);

  const next = useCallback(() => goTo((active + 1) % total, 'next'), [active, goTo, total]);
  const prev = useCallback(() => goTo((active - 1 + total) % total, 'prev'), [active, goTo, total]);

  useEffect(() => {
    const tick = () => { if (!hovered.current) next(); };
    timerRef.current = setInterval(tick, 4500);
    return () => clearInterval(timerRef.current);
  }, [next]);

  const slide = DEMO_SLIDES[active];
  const translateClass = visible
    ? 'translate-x-0 opacity-100'
    : animDir === 'next'
    ? '-translate-x-4 opacity-0'
    : 'translate-x-4 opacity-0';

  return (
    <section
      id="demo"
      className="py-24 px-5 bg-linear-to-b from-gray-50 to-white overflow-hidden"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <span className={`inline-flex items-center gap-2 px-4 py-1.5 mb-4 rounded-full text-sm font-semibold text-white bg-linear-to-r ${slide.accent} shadow-md transition-all duration-500`}>
            {t(slide.tagKey)}
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">
            {t('landing_demo_title')}
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">{t('landing_demo_subtitle')}</p>
        </div>

        {/* Slide area */}
        <div
          className="relative rounded-3xl overflow-hidden shadow-2xl bg-gray-900"
          onMouseEnter={() => { hovered.current = true; }}
          onMouseLeave={() => { hovered.current = false; }}
        >
          {/* Image layer */}
          <div
            className={`transition-all duration-300 ease-out ${translateClass}`}
          >
            <div className="relative">
              <img
                src={slide.image}
                alt={t(slide.titleKey)}
                className="w-full h-[340px] sm:h-[420px] md:h-[500px] object-cover"
              />
              {/* dark scrim for text legibility */}
              <div className="absolute inset-0 bg-linear-to-t from-gray-950/90 via-gray-950/30 to-transparent" />
            </div>

            {/* Caption overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
              <div className="max-w-2xl">
                <h3 className="text-xl md:text-3xl font-extrabold text-white mb-2 leading-tight drop-shadow">
                  {t(slide.titleKey)}
                </h3>
                <p className="text-sm md:text-base text-gray-200 leading-relaxed">
                  {t(slide.descKey)}
                </p>
              </div>
            </div>
          </div>

          {/* Prev / Next buttons */}
          <button
            onClick={prev}
            aria-label={t('landing_demo_prev')}
            className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white flex items-center justify-center transition-colors border border-white/20"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <button
            onClick={next}
            aria-label={t('landing_demo_next')}
            className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white flex items-center justify-center transition-colors border border-white/20"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Slide counter */}
          <div className="absolute top-4 right-5 text-xs font-semibold text-white/70 tabular-nums">
            {t('landing_demo_slide_of', { current: active + 1, total })}
          </div>
        </div>

        {/* Dot indicators + thumbnail strip */}
        <div className="mt-6 flex flex-col items-center gap-4">
          {/* Dots */}
          <div className="flex items-center gap-2">
            {DEMO_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i, i > active ? 'next' : 'prev')}
                aria-label={`Slide ${i + 1}`}
                className={`rounded-full transition-all duration-300 ${
                  i === active
                    ? 'w-7 h-2.5 bg-primary'
                    : 'w-2.5 h-2.5 bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>

          {/* Thumbnail strip */}
          <div className="hidden sm:flex items-center gap-3">
            {DEMO_SLIDES.map((s, i) => (
              <button
                key={i}
                onClick={() => goTo(i, i > active ? 'next' : 'prev')}
                className={`relative rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                  i === active
                    ? 'border-primary shadow-lg shadow-primary/30 scale-105'
                    : 'border-transparent opacity-60 hover:opacity-90 hover:border-gray-300'
                }`}
              >
                <img
                  src={s.image}
                  alt={t(s.titleKey)}
                  className="w-24 h-16 object-cover"
                />
                {i === active && (
                  <div className={`absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r ${s.accent}`} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const PublicHome = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/signup');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
      {/* Navigation Bar */}
      <nav className="sticky top-0 bg-white shadow-md z-50 py-4">

        <div className="max-w-7xl mx-auto px-5 flex justify-between items-center">


          <Link to="/" className="flex items-center gap-2">
            <img src={appLogo} alt="Bari Porichalona Logo" className="h-full w-auto max-h-12 p-0" />
            <h1 className="text-sm md:text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 via-primary-400 to-red-400 font-oswald">
                {t('bari_porichalona')}
            </h1>
          </Link>


          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-gray-600 font-medium hover:text-primary transition-colors">
                {t('landing_nav_home')}
            </Link>
            <Link to="/#features" className="text-gray-600 font-medium hover:text-primary transition-colors">
                {t('landing_nav_features')}
            </Link>
            <Link to="/#pricing" className="text-gray-600 font-medium hover:text-primary transition-colors">
                {t('landing_nav_pricing')}
            </Link>
            <Link to="/#contact" className="text-gray-600 font-medium hover:text-primary transition-colors">
                {t('landing_nav_contact')}
            </Link>
          </div>


          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-gray-600 font-medium hidden sm:inline">
                    {t('landing_hello_user', { name: user?.name?.split(' ')[0] || t('landing_user_fallback') })}
                </span>
                <Btn
                  type="primary"
                  href="/dashboard"
                >
                  {t('go_to_dashboard')}
                </Btn>
              </>
            ) : (
              <>
                <LanguageSwitcher />
                <Btn type="outline" href="/login">
                  {t('landing_login')}
                </Btn>
                <Btn type="primary" href="/signup">
                  {t('landing_signup')}
                </Btn>

                
              </>
            )}
          </div>


        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Decorative background */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-primary-50/50 via-white to-secondary-50/30 -z-10" />
        <div aria-hidden className="absolute -top-40 -right-32 w-[480px] h-[480px] bg-primary-200/30 rounded-full blur-3xl -z-10" />
        <div aria-hidden className="absolute top-1/2 -left-40 w-[420px] h-[420px] bg-secondary-200/25 rounded-full blur-3xl -z-10" />
        {/* Subtle grid pattern */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #18243f 1px, transparent 1px), linear-gradient(to bottom, #18243f 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="max-w-7xl mx-auto pt-12 md:pt-20 pb-16 md:pb-24 px-5 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-14 items-center">
          {/* Left: Content */}
          <div className="text-center lg:text-left">
            {/* Bangladesh trust badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 bg-white rounded-full shadow-sm border border-primary-100">
              <span className="text-base leading-none">🇧🇩</span>
              <span className="text-xs font-semibold text-primary-700 tracking-wide uppercase">
                {t('landing_hero_badge')}
              </span>
            </div>

            {/* Headline with highlight underline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-5 text-text leading-[1.1] tracking-tight">
              {t('landing_hero_title_before')}
              <span className="relative inline-block whitespace-nowrap">
                <span className="relative z-10 text-primary">
                  {t('landing_hero_title_highlight')}
                </span>
                <span
                  aria-hidden
                  className="absolute left-0 right-0 bottom-1 h-3 bg-primary-200/60 rounded -z-0"
                />
              </span>
              {t('landing_hero_title_after')}
            </h1>

            {/* Subtitle */}
            <p className="text-base md:text-lg text-subdued mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
              {t('landing_hero_subtitle')}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-3 mb-7">
              <button
                onClick={handleGetStarted}
                className="inline-flex items-center gap-2 px-7 py-3.5 text-base font-semibold bg-primary text-white rounded-xl hover:bg-primary-600 transition-all shadow-lg shadow-primary-300/40 hover:shadow-xl hover:shadow-primary-300/50 hover:-translate-y-0.5"
              >
                {isAuthenticated ? t('go_to_dashboard') : t('landing_get_started_free')}
                <ChevronRight className="w-5 h-5" />
              </button>
              <Link
                to="/#demo"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-base font-semibold text-text bg-white border-2 border-gray-200 rounded-xl hover:border-primary hover:text-primary transition-colors"
              >
                <PlayCircle className="w-5 h-5" />
                {t('landing_watch_demo')}
              </Link>
            </div>

            {/* Trust signal pills */}
            <div className="flex flex-wrap justify-center lg:justify-start items-center gap-x-5 gap-y-2 text-sm mb-8">
              <div className="inline-flex items-center gap-1.5 text-subdued">
                <Lock className="w-4 h-4 text-green-600" />
                <span>{t('landing_hero_trust_secure')}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 text-subdued">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>{t('landing_hero_trust_no_card')}</span>
              </div>
            </div>

            {/* Stats divider */}
            <div className="grid grid-cols-3 gap-4 md:gap-6 pt-7 border-t border-gray-200/70 max-w-md mx-auto lg:mx-0">
              <div className="flex flex-col items-center lg:items-start">
                <span className="text-2xl md:text-3xl font-extrabold text-text">100+</span>
                <span className="text-xs md:text-sm text-subdued mt-0.5">
                  {t('landing_stat_properties')}
                </span>
              </div>
              <div className="flex flex-col items-center lg:items-start">
                <span className="text-2xl md:text-3xl font-extrabold text-text">
                  <TkSymbol />1Cr+
                </span>
                <span className="text-xs md:text-sm text-subdued mt-0.5">
                  {t('landing_stat_rent')}
                </span>
              </div>
              <div className="flex flex-col items-center lg:items-start">
                <span className="text-2xl md:text-3xl font-extrabold text-text">500+</span>
                <span className="text-xs md:text-sm text-subdued mt-0.5">
                  {t('landing_stat_users')}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Dashboard mockup */}
          <div className="relative hidden md:block">
            {/* Decorative gradient blob behind mockup */}
            <div
              aria-hidden
              className="absolute -inset-4 bg-gradient-to-br from-primary-300/20 via-transparent to-secondary-300/20 rounded-3xl blur-2xl"
            />

            {/* Main mockup card */}
            <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200/80 overflow-hidden">
              {/* Fake browser chrome */}
              <div className="bg-gray-50 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-400" />
                  <span className="w-3 h-3 rounded-full bg-yellow-400" />
                  <span className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="ml-3 px-3 py-1 bg-white border border-gray-200 rounded text-[11px] text-gray-500 flex-1 truncate font-mono">
                  bariporichalona.com/dashboard
                </div>
              </div>

              {/* Mock dashboard content */}
              <div className="p-5 space-y-4 bg-gradient-to-br from-gray-50/50 to-white">
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <h3 className="font-bold text-text text-sm">
                      {t('landing_hero_preview_welcome')}
                    </h3>
                    <p className="text-[11px] text-subdued">
                      {t('landing_hero_preview_today')}
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                    K
                  </div>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                    <div className="text-[10px] text-subdued mb-0.5 font-medium uppercase tracking-wide">
                      {t('landing_hero_preview_total_rent')}
                    </div>
                    <div className="text-base font-bold text-text">
                      <TkSymbol />1,24,500
                    </div>
                    <div className="text-[10px] text-green-600 font-semibold flex items-center gap-0.5 mt-0.5">
                      <TrendingUp className="w-3 h-3" /> 12%
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                    <div className="text-[10px] text-subdued mb-0.5 font-medium uppercase tracking-wide">
                      {t('landing_hero_preview_collected')}
                    </div>
                    <div className="text-base font-bold text-text">
                      <TkSymbol />98,200
                    </div>
                    <div className="mt-1 h-1 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full w-[79%] bg-gradient-to-r from-primary to-primary-600 rounded-full" />
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                    <div className="text-[10px] text-subdued mb-0.5 font-medium uppercase tracking-wide">
                      {t('landing_hero_preview_pending')}
                    </div>
                    <div className="text-base font-bold text-text">
                      <TkSymbol />26,300
                    </div>
                    <div className="text-[10px] text-amber-600 font-semibold mt-0.5">
                      {t('landing_hero_preview_flats_pending')}
                    </div>
                  </div>
                </div>

                {/* Activity list */}
                <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-semibold text-text">
                      {t('landing_hero_preview_activity')}
                    </h4>
                    <span className="text-[10px] text-primary font-semibold">
                      {t('landing_hero_preview_see_all')}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-[11px] font-bold">
                          R
                        </div>
                        <div className="text-left">
                          <div className="text-[11px] font-semibold text-text leading-tight">
                            Rahim Mia
                          </div>
                          <div className="text-[10px] text-subdued leading-tight">
                            {t('landing_hero_preview_paid_rent')}
                          </div>
                        </div>
                      </div>
                      <div className="text-[11px] text-green-600 font-bold">
                        +<TkSymbol />15,000
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-[11px] font-bold">
                          F
                        </div>
                        <div className="text-left">
                          <div className="text-[11px] font-semibold text-text leading-tight">
                            Fahim Ahmed
                          </div>
                          <div className="text-[10px] text-subdued leading-tight">
                            {t('landing_hero_preview_new_renter')}
                          </div>
                        </div>
                      </div>
                      <div className="text-[10px] text-subdued">2h</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating notification card */}
            <div className="absolute -top-5 -right-3 lg:-right-6 bg-white rounded-xl shadow-xl border border-gray-100 p-3 flex items-center gap-2.5 max-w-[230px] animate-float">
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-left">
                <div className="text-[11px] font-bold text-text leading-tight">
                  {t('landing_hero_preview_payment_received')}
                </div>
                <div className="text-[10px] text-subdued mt-0.5">
                  {t('landing_hero_preview_payment_detail')}
                </div>
              </div>
            </div>

            {/* Floating stat card */}
            <div className="absolute -bottom-6 -left-3 lg:-left-8 bg-white rounded-xl shadow-xl border border-gray-100 p-3.5 animate-float-delayed">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5 text-primary-700" />
                </div>
                <div className="text-left">
                  <div className="text-[10px] text-subdued">
                    {t('landing_hero_preview_this_month')}
                  </div>
                  <div className="text-sm font-extrabold text-text leading-tight">
                    {t('landing_hero_preview_collection_rate')}
                  </div>
                  <div className="text-[10px] text-green-600 font-semibold flex items-center gap-0.5 mt-0.5">
                    <TrendingUp className="w-3 h-3" /> {t('landing_hero_preview_trend')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trusted-by strip */}
        <div className="border-t border-gray-200/60 bg-white/60 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-5 py-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-center">
            <div className="flex items-center gap-1.5">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <span className="text-sm font-semibold text-text">4.9/5</span>
            </div>
            <span className="hidden sm:block w-px h-5 bg-gray-300" />
            <p className="text-sm text-subdued">{t('landing_hero_trusted_by')}</p>
          </div>
        </div>
      </section>

      {/* Why Bari Porichalona – Problem vs Solution */}
      <section className="py-20 px-5 bg-white/80">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-center text-3xl md:text-4xl font-extrabold mb-4 text-gray-900">
            {t('landing_why_title')}
          </h2>
          <p className="text-center text-gray-600 mb-16 max-w-2xl mx-auto">
            {t('landing_why_subtitle')}
          </p>
          <div className="grid md:grid-cols-2 gap-10 items-stretch">
            <div className="rounded-2xl border-2 border-red-100 bg-red-50/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-red-100">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">{t('landing_why_without')}</h3>
              </div>
              <ul className="space-y-3 text-gray-700">
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">×</span> {t('landing_why_without_1')}</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">×</span> {t('landing_why_without_2')}</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">×</span> {t('landing_why_without_3')}</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">×</span> {t('landing_why_without_4')}</li>
              </ul>
            </div>
            <div className="rounded-2xl border-2 border-primary-200 bg-primary-50/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary-200">
                  <CheckCircle2 className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">{t('landing_why_with')}</h3>
              </div>
              <ul className="space-y-3 text-gray-700">
                <li className="flex gap-2"><span className="text-primary-500 mt-0.5">✓</span> {t('landing_why_with_1')}</li>
                <li className="flex gap-2"><span className="text-primary-500 mt-0.5">✓</span> {t('landing_why_with_2')}</li>
                <li className="flex gap-2"><span className="text-primary-500 mt-0.5">✓</span> {t('landing_why_with_3')}</li>
                <li className="flex gap-2"><span className="text-primary-500 mt-0.5">✓</span> {t('landing_why_with_4')}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto py-24 px-5">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-semibold mb-4">
            <Sparkles className="w-4 h-4" /> {t('landing_features_badge')}
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
            {t('landing_features_title')}
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {t('landing_features_subtitle')}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: House, titleKey: 'landing_feature_house_title', descKey: 'landing_feature_house_desc' },
            { icon: Wallet, titleKey: 'landing_feature_rent_title', descKey: 'landing_feature_rent_desc' },
            { icon: Megaphone, titleKey: 'landing_feature_notice_title', descKey: 'landing_feature_notice_desc' },
            { icon: Shield, titleKey: 'landing_feature_role_title', descKey: 'landing_feature_role_desc' },
            { icon: Smartphone, titleKey: 'landing_feature_pwa_title', descKey: 'landing_feature_pwa_desc' },
            { icon: BarChart3, titleKey: 'landing_feature_reports_title', descKey: 'landing_feature_reports_desc' },
          ].map((item) => {
            const IconEl = item.icon;
            return (
            <div
              key={item.titleKey}
              className="group p-8 bg-white rounded-2xl shadow-lg border border-gray-100 transition-all duration-200 hover:shadow-xl hover:border-primary-100 hover:-translate-y-0.5"
            >
              <div className="p-3 rounded-xl bg-primary-100 text-primary-600 w-fit mb-5 group-hover:bg-primary-200 transition-colors">
                <IconEl className="w-6 h-6" aria-hidden />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">{t(item.titleKey)}</h3>
              <p className="text-gray-600 leading-relaxed">{t(item.descKey)}</p>
            </div>
          ); })}
        </div>
      </section>

      {/* Who It's For – Personas */}
      <section className="py-24 px-5 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
            {t('landing_personas_title')}
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {t('landing_personas_subtitle')}
          </p>
        </div>
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            { icon: UserCheck, labelKey: 'landing_persona_owners', descKey: 'landing_persona_owners_desc' },
            { icon: Users, labelKey: 'landing_persona_caretakers', descKey: 'landing_persona_caretakers_desc' },
            { icon: House, labelKey: 'landing_persona_tenants', descKey: 'landing_persona_tenants_desc' },
          ].map((item) => {
            const IconEl = item.icon;
            return (
            <div key={item.labelKey} className="text-center p-8 rounded-2xl bg-white border border-gray-100 shadow-lg hover:shadow-xl transition-all">
              <div className="w-14 h-14 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-5">
                <IconEl className="w-7 h-7" aria-hidden />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">{t(item.labelKey)}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{t(item.descKey)}</p>
            </div>
          ); })}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-6xl mx-auto py-24 px-5">
        <h2 className="text-center text-3xl md:text-4xl font-extrabold mb-4 text-gray-900">{t('landing_how_title')}</h2>
        <p className="text-center text-gray-600 mb-16 max-w-xl mx-auto">{t('landing_how_subtitle')}</p>
        <div className="relative">
          <div className="hidden lg:block absolute top-8 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-200 via-primary to-primary-200" style={{ left: '12.5%', right: '12.5%' }} aria-hidden />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-6">
            {[
              { step: 1, titleKey: 'landing_how_step1_title', textKey: 'landing_how_step1_text' },
              { step: 2, titleKey: 'landing_how_step2_title', textKey: 'landing_how_step2_text' },
              { step: 3, titleKey: 'landing_how_step3_title', textKey: 'landing_how_step3_text' },
              { step: 4, titleKey: 'landing_how_step4_title', textKey: 'landing_how_step4_text' },
            ].map(({ step, titleKey, textKey }) => (
              <div key={step} className="relative text-center">
                <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-5 shadow-lg shadow-primary-200/50 relative z-10">
                  {step}
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">{t(titleKey)}</h3>
                <p className="text-gray-600 leading-relaxed text-sm">{t(textKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section – Placeholder for future plans */}
      <section id="pricing" className="py-24 px-5 bg-gray-50">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">{t('landing_pricing_title')}</h2>
          <p className="text-gray-600 mb-12 max-w-xl mx-auto">
            {t('landing_pricing_subtitle')}
          </p>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <div className="p-8 rounded-2xl bg-white border-2 border-primary shadow-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t('landing_pricing_free_title')}</h3>
              <p className="text-gray-600 text-sm mb-6">{t('landing_pricing_free_desc')}</p>
              <ul className="text-left space-y-2 text-gray-700 text-sm mb-8">
                <li className="flex gap-2"><CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> {t('landing_pricing_free_1')}</li>
                <li className="flex gap-2"><CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> {t('landing_pricing_free_2')}</li>
                <li className="flex gap-2"><CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> {t('landing_pricing_free_3')}</li>
              </ul>
              <button onClick={handleGetStarted} className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-600 transition-colors">
                {isAuthenticated ? t('go_to_dashboard') : t('landing_get_started_free')}
              </button>
            </div>
            <div className="p-8 rounded-2xl bg-white border border-gray-200 shadow">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t('landing_pricing_pro_title')}</h3>
              <p className="text-gray-600 text-sm mb-6">{t('landing_pricing_pro_desc')}</p>
              <ul className="text-left space-y-2 text-gray-700 text-sm mb-8">
                <li className="flex gap-2"><CheckCircle2 className="w-5 h-5 text-gray-400 shrink-0" /> {t('landing_pricing_pro_1')}</li>
                <li className="flex gap-2"><CheckCircle2 className="w-5 h-5 text-gray-400 shrink-0" /> {t('landing_pricing_pro_2')}</li>
                <li className="flex gap-2"><CheckCircle2 className="w-5 h-5 text-gray-400 shrink-0" /> {t('landing_pricing_pro_3')}</li>
              </ul>
              <button disabled className="w-full py-3 rounded-xl bg-gray-200 text-gray-500 font-semibold cursor-not-allowed">
                {t('coming_soon')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section – Feature Slider */}
      <DemoSlider t={t} />

      {/* Testimonials – Static for now; can be driven by API later */}
      <section className="py-24 px-5 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">{t('landing_testimonials_title')}</h2>
          <p className="text-center text-gray-600 mb-12 max-w-xl mx-auto">
            {t('landing_testimonials_subtitle')}
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              { quoteKey: 'landing_testimonial_1_quote', nameKey: 'landing_testimonial_1_name', roleKey: 'landing_testimonial_1_role' },
              { quoteKey: 'landing_testimonial_2_quote', nameKey: 'landing_testimonial_2_name', roleKey: 'landing_testimonial_2_role' },
            ].map(({ quoteKey, nameKey, roleKey }) => (
              <div key={nameKey} className="p-8 rounded-2xl bg-white border border-gray-100 shadow-lg">
                <p className="text-gray-700 italic mb-6">&ldquo;{t(quoteKey)}&rdquo;</p>
                <div>
                  <span className="font-semibold text-gray-900">{t(nameKey)}</span>
                  <span className="text-gray-500 text-sm"> · {t(roleKey)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-primary to-primary-700 text-white py-20 px-5 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-5">{t('landing_cta_title')}</h2>
          <p className="text-xl opacity-90 mb-8">{t('landing_cta_subtitle')}</p>
          <button
            onClick={handleGetStarted}
            className="inline-flex items-center gap-2 px-10 py-4 bg-white text-primary font-bold text-lg rounded-xl hover:bg-gray-100 transition-colors shadow-2xl"
          >
            {isAuthenticated ? t('go_to_dashboard') : t('landing_get_started_free')}
            <ChevronRight className="w-5 h-5" />
          </button>
          <p className="mt-4 text-sm opacity-80">{t('landing_cta_no_card')}</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white p-10 mt-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 border-b border-gray-700 pb-10 mb-8">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">
                  <img src={appLogo} alt="Bari Porichalona Logo" className="w-8 h-8" />
                </span>
                <h2 className="text-xl font-bold">{t('bari_porichalona')}</h2>
              </div>
              <p className="text-gray-400 text-sm">{t('landing_footer_tagline')}</p>
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold mb-5 text-gray-100">{t('landing_footer_product')}</h3>
              <Link to="/#features" className="text-gray-400 text-sm hover:text-white mb-3 transition-colors">{t('landing_nav_features')}</Link>
              <Link to="/#pricing" className="text-gray-400 text-sm hover:text-white mb-3 transition-colors">{t('landing_nav_pricing')}</Link>
              <Link to="/#demo" className="text-gray-400 text-sm hover:text-white mb-3 transition-colors">{t('landing_footer_demo')}</Link>
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold mb-5 text-gray-100">{t('landing_footer_company')}</h3>
              <Link to="/about" className="text-gray-400 text-sm hover:text-white mb-3 transition-colors">{t('landing_footer_about')}</Link>
              <Link to="/contact" className="text-gray-400 text-sm hover:text-white mb-3 transition-colors">{t('landing_footer_contact')}</Link>
              <Link to="/privacy" className="text-gray-400 text-sm hover:text-white mb-3 transition-colors">{t('landing_footer_privacy')}</Link>
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold mb-5 text-gray-100">{t('landing_footer_connect')}</h3>
              <a href="mailto:support@bariporichalona.com" className="text-gray-400 text-sm hover:text-white mb-3 transition-colors">Email: support@bariporichalona.com</a>
              <a href="tel:+8801712345678" className="text-gray-400 text-sm hover:text-white mb-3 transition-colors">Phone: +880 1712 345678</a>
            </div>
          </div>
          <div className="text-center pt-5">
            <p className="text-gray-500 text-sm">© {new Date().getFullYear()} {t('bari_porichalona')}. {t('landing_footer_rights')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicHome;