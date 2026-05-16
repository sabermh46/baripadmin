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
  Globe,
  Bell,
  FileText,
  Settings,
  Zap,
  Heart,
  Award,
} from 'lucide-react';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import TkSymbol from '../../components/common/TkSymbol';
import { useGetLandingPageQuery } from '../../store/api/landingApi';

// Icon registry — maps string names stored in DB to Lucide components
const ICON_MAP = {
  House, Wallet, Megaphone, Shield, Smartphone, BarChart3,
  UserCheck, Users, Globe, Bell, FileText, Settings, Zap,
  Heart, Award, Star, Lock, CheckCircle2,
};

const resolveIcon = (name) => ICON_MAP[name] || House;

// Image map for demo slides
const SLIDE_IMAGE_MAP = {
  building: buildingShade,
  houses: housesImage,
  laptop: laptopImage,
  profile: profileAvatar,
};

const API_BASE = import.meta.env.VITE_APP_API_URL || '';

// Resolve a slide image_url: relative backend paths need the API origin prepended
const resolveSlideImage = (slide) => {
  if (slide?.image_url) {
    return slide.image_url.startsWith('http')
      ? slide.image_url
      : `${API_BASE}${slide.image_url}`;
  }
  return SLIDE_IMAGE_MAP[slide?.image_key] || buildingShade;
};

const SLIDE_ACCENTS = [
  'from-primary-600 to-primary-800',
  'from-secondary-600 to-secondary-800',
  'from-primary-500 to-secondary-600',
  'from-secondary-500 to-primary-600',
];

// ── Demo Slider ────────────────────────────────────────────────────────────────

const DemoSlider = ({ slides = [], sectionTitle = '', sectionSubtitle = '' }) => {
  const [active, setActive] = useState(0);
  const [animDir, setAnimDir] = useState('next');
  const [visible, setVisible] = useState(true);
  const timerRef = useRef(null);
  const hovered = useRef(false);
  const total = slides.length;

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
    if (!total) return;
    const tick = () => { if (!hovered.current) next(); };
    timerRef.current = setInterval(tick, 4500);
    return () => clearInterval(timerRef.current);
  }, [next, total]);

  if (!total) return null;

  const slide = slides[active] || {};
  const accent = SLIDE_ACCENTS[active % SLIDE_ACCENTS.length];
  const slideImage = resolveSlideImage(slide);

  const translateClass = visible
    ? 'translate-x-0 opacity-100'
    : animDir === 'next'
    ? '-translate-x-4 opacity-0'
    : 'translate-x-4 opacity-0';

  return (
    <section id="demo" className="py-24 px-5 bg-linear-to-b from-gray-50 to-white overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className={`inline-flex items-center gap-2 px-4 py-1.5 mb-4 rounded-full text-sm font-semibold text-white bg-linear-to-r ${accent} shadow-md transition-all duration-500`}>
            {slide.tag}
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">{sectionTitle}</h2>
          <p className="text-gray-600 max-w-xl mx-auto">{sectionSubtitle}</p>
        </div>

        <div
          className="relative rounded-3xl overflow-hidden shadow-2xl bg-gray-900"
          onMouseEnter={() => { hovered.current = true; }}
          onMouseLeave={() => { hovered.current = false; }}
        >
          <div className={`transition-all duration-300 ease-out ${translateClass}`}>
            <div className="relative">
              <img src={slideImage} alt={slide.title} className="w-full h-[340px] sm:h-[420px] md:h-[500px] object-cover" />
              <div className="absolute inset-0 bg-linear-to-t from-gray-950/90 via-gray-950/30 to-transparent" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
              <div className="max-w-2xl">
                <h3 className="text-xl md:text-3xl font-extrabold text-white mb-2 leading-tight drop-shadow">{slide.title}</h3>
                <p className="text-sm md:text-base text-gray-200 leading-relaxed">{slide.description}</p>
              </div>
            </div>
          </div>

          <button onClick={prev} aria-label="Previous slide" className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white flex items-center justify-center transition-colors border border-white/20">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <button onClick={next} aria-label="Next slide" className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white flex items-center justify-center transition-colors border border-white/20">
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="absolute top-4 right-5 text-xs font-semibold text-white/70 tabular-nums">
            {active + 1} / {total}
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <button key={i} onClick={() => goTo(i, i > active ? 'next' : 'prev')} aria-label={`Slide ${i + 1}`}
                className={`rounded-full transition-all duration-300 ${i === active ? 'w-7 h-2.5 bg-primary' : 'w-2.5 h-2.5 bg-gray-300 hover:bg-gray-400'}`}
              />
            ))}
          </div>
          <div className="hidden sm:flex items-center gap-3">
            {slides.map((s, i) => {
              const thumbImage = resolveSlideImage(s);
              return (
                <button key={i} onClick={() => goTo(i, i > active ? 'next' : 'prev')}
                  className={`relative rounded-xl overflow-hidden border-2 transition-all duration-300 ${i === active ? 'border-primary shadow-lg shadow-primary/30 scale-105' : 'border-transparent opacity-60 hover:opacity-90 hover:border-gray-300'}`}
                >
                  <img src={thumbImage} alt={s.title} className="w-24 h-16 object-cover" />
                  {i === active && <div className={`absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r ${SLIDE_ACCENTS[i % SLIDE_ACCENTS.length]}`} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────

const PublicHome = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: landingResponse } = useGetLandingPageQuery();
  const lp = landingResponse?.data || {};

  const nav          = lp.nav          || {};
  const hero         = lp.hero         || {};
  const why          = lp.why          || {};
  const features     = lp.features     || {};
  const personas     = lp.personas     || {};
  const howItWorks   = lp.how_it_works || {};
  const pricing      = lp.pricing      || {};
  const demoSlider   = lp.demo_slider  || {};
  const testimonials = lp.testimonials || {};
  const cta          = lp.cta          || {};
  const footer       = lp.footer       || {};

  const handleGetStarted = () => {
    if (isAuthenticated) navigate('/dashboard');
    else navigate('/signup');
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 via-white to-gray-50">

      {/* Navigation Bar */}
      <nav className="sticky top-0 bg-white shadow-md z-50 py-4">
        <div className="max-w-7xl mx-auto px-5 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <img src={appLogo} alt="Bari Porichalona Logo" className="h-full w-auto max-h-12 p-0" />
            <h1 className="text-sm md:text-xl font-extrabold bg-clip-text text-transparent bg-linear-to-r from-primary-600 via-primary-400 to-red-400 font-oswald">
              {nav.brand_name || t('bari_porichalona')}
            </h1>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {(nav.links || []).length > 0
              ? (nav.links || []).map((link, i) => (
                  <a key={i} href={link.href} className="text-gray-600 font-medium hover:text-primary transition-colors">
                    {link.label}
                  </a>
                ))
              : <>
                  <a href="#" className="text-gray-600 font-medium hover:text-primary transition-colors">{t('landing_nav_home')}</a>
                  <a href="#features" className="text-gray-600 font-medium hover:text-primary transition-colors">{t('landing_nav_features')}</a>
                  <a href="#pricing" className="text-gray-600 font-medium hover:text-primary transition-colors">{t('landing_nav_pricing')}</a>
                  <a href="#contact" className="text-gray-600 font-medium hover:text-primary transition-colors">{t('landing_nav_contact')}</a>
                </>
            }
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-gray-600 font-medium hidden sm:inline">
                  {t('landing_hello_user', { name: user?.name?.split(' ')[0] || t('landing_user_fallback') })}
                </span>
                <Btn type="primary" href="/dashboard">{t('go_to_dashboard')}</Btn>
              </>
            ) : (
              <>
                <LanguageSwitcher />
                <Btn type="outline" href="/login">{nav.cta_login || t('landing_login')}</Btn>
                <Btn type="primary" href="/signup">{nav.cta_signup || t('landing_signup')}</Btn>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 bg-linear-to-br from-primary-50/50 via-white to-secondary-50/30 -z-10" />
        <div aria-hidden className="absolute -top-40 -right-32 w-[480px] h-[480px] bg-primary-200/30 rounded-full blur-3xl -z-10" />
        <div aria-hidden className="absolute top-1/2 -left-40 w-[420px] h-[420px] bg-secondary-200/25 rounded-full blur-3xl -z-10" />
        <div aria-hidden className="absolute inset-0 -z-10 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(to right, #18243f 1px, transparent 1px), linear-gradient(to bottom, #18243f 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

        <div className="max-w-7xl mx-auto pt-12 md:pt-20 pb-16 md:pb-24 px-5 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-14 items-center">
          <div className="text-center lg:text-left">
            {hero.badge && (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 bg-white rounded-full shadow-sm border border-primary-100">
                <span className="text-base leading-none">🇧🇩</span>
                <span className="text-xs font-semibold text-primary-700 tracking-wide uppercase">{hero.badge}</span>
              </div>
            )}

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-5 text-text leading-[1.1] tracking-tight">
              {hero.title_before || t('landing_hero_title_before')}
              <span className="relative inline-block whitespace-nowrap">
                <span className="relative z-10 text-primary">{hero.title_highlight || t('landing_hero_title_highlight')}</span>
                <span aria-hidden className="absolute left-0 right-0 bottom-1 h-3 bg-primary-200/60 rounded z-0" />
              </span>
              {hero.title_after || t('landing_hero_title_after')}
            </h1>

            <p className="text-base md:text-lg text-subdued mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
              {hero.subtitle || t('landing_hero_subtitle')}
            </p>

            <div className="flex flex-wrap justify-center lg:justify-start gap-3 mb-7">
              <button onClick={handleGetStarted}
                className="inline-flex items-center gap-2 px-7 py-3.5 text-base font-semibold bg-primary text-white rounded-xl hover:bg-primary-600 transition-all shadow-lg shadow-primary-300/40 hover:shadow-xl hover:shadow-primary-300/50 hover:-translate-y-0.5">
                {isAuthenticated ? t('go_to_dashboard') : (hero.cta_primary || t('landing_get_started_free'))}
                <ChevronRight className="w-5 h-5" />
              </button>
              <a href="#demo"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-base font-semibold text-text bg-white border-2 border-gray-200 rounded-xl hover:border-primary hover:text-primary transition-colors">
                <PlayCircle className="w-5 h-5" />
                {hero.cta_secondary || t('landing_watch_demo')}
              </a>
            </div>

            <div className="flex flex-wrap justify-center lg:justify-start items-center gap-x-5 gap-y-2 text-sm mb-8">
              <div className="inline-flex items-center gap-1.5 text-subdued">
                <Lock className="w-4 h-4 text-green-600" />
                <span>{hero.trust_secure || t('landing_hero_trust_secure')}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 text-subdued">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>{hero.trust_no_card || t('landing_hero_trust_no_card')}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 md:gap-6 pt-7 border-t border-gray-200/70 max-w-md mx-auto lg:mx-0">
              {(hero.stats || []).map((stat, i) => (
                <div key={i} className="flex flex-col items-center lg:items-start">
                  <span className="text-2xl md:text-3xl font-extrabold text-text">{stat.value}</span>
                  <span className="text-xs md:text-sm text-subdued mt-0.5">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Dashboard mockup */}
          <div className="relative hidden md:block">
            <div aria-hidden className="absolute -inset-4 bg-linear-to-br from-primary-300/20 via-transparent to-secondary-300/20 rounded-3xl blur-2xl" />
            <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200/80 overflow-hidden">
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
              <div className="p-5 space-y-4 bg-linear-to-br from-gray-50/50 to-white">
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <h3 className="font-bold text-text text-sm">{t('landing_hero_preview_welcome')}</h3>
                    <p className="text-[11px] text-subdued">{t('landing_hero_preview_today')}</p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-linear-to-br from-primary to-primary-600 flex items-center justify-center text-white font-bold text-sm shadow-md">K</div>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { label: t('landing_hero_preview_total_rent'), value: '1,24,500', sub: <><TrendingUp className="w-3 h-3" /> 12%</>, subClass: 'text-green-600' },
                    { label: t('landing_hero_preview_collected'), value: '98,200', sub: <div className="mt-1 h-1 rounded-full bg-gray-100 overflow-hidden"><div className="h-full w-[79%] bg-linear-to-r from-primary to-primary-600 rounded-full" /></div>, subClass: '' },
                    { label: t('landing_hero_preview_pending'), value: '26,300', sub: t('landing_hero_preview_flats_pending'), subClass: 'text-amber-600' },
                  ].map(({ label, value, sub, subClass }) => (
                    <div key={label} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                      <div className="text-[10px] text-subdued mb-0.5 font-medium uppercase tracking-wide">{label}</div>
                      <div className="text-base font-bold text-text"><TkSymbol />{value}</div>
                      <div className={`text-[10px] font-semibold flex items-center gap-0.5 mt-0.5 ${subClass}`}>{sub}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-semibold text-text">{t('landing_hero_preview_activity')}</h4>
                    <span className="text-[10px] text-primary font-semibold">{t('landing_hero_preview_see_all')}</span>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { initials: 'R', name: 'Rahim Mia', sub: t('landing_hero_preview_paid_rent'), right: <span className="text-[11px] text-green-600 font-bold">+<TkSymbol />15,000</span>, bg: 'bg-green-100', fg: 'text-green-700' },
                      { initials: 'F', name: 'Fahim Ahmed', sub: t('landing_hero_preview_new_renter'), right: <span className="text-[10px] text-subdued">2h</span>, bg: 'bg-primary-100', fg: 'text-primary-700' },
                    ].map(({ initials, name, sub, right, bg, fg }) => (
                      <div key={name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-full ${bg} flex items-center justify-center ${fg} text-[11px] font-bold`}>{initials}</div>
                          <div className="text-left">
                            <div className="text-[11px] font-semibold text-text leading-tight">{name}</div>
                            <div className="text-[10px] text-subdued leading-tight">{sub}</div>
                          </div>
                        </div>
                        {right}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -top-5 -right-3 lg:-right-6 bg-white rounded-xl shadow-xl border border-gray-100 p-3 flex items-center gap-2.5 max-w-[230px] animate-float">
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-left">
                <div className="text-[11px] font-bold text-text leading-tight">{t('landing_hero_preview_payment_received')}</div>
                <div className="text-[10px] text-subdued mt-0.5">{t('landing_hero_preview_payment_detail')}</div>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-3 lg:-left-8 bg-white rounded-xl shadow-xl border border-gray-100 p-3.5 animate-float-delayed">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-linear-to-br from-primary-100 to-primary-200 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5 text-primary-700" />
                </div>
                <div className="text-left">
                  <div className="text-[10px] text-subdued">{t('landing_hero_preview_this_month')}</div>
                  <div className="text-sm font-extrabold text-text leading-tight">{t('landing_hero_preview_collection_rate')}</div>
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
                {[1,2,3,4,5].map((i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
              </div>
              <span className="text-sm font-semibold text-text">4.9/5</span>
            </div>
            <span className="hidden sm:block w-px h-5 bg-gray-300" />
            <p className="text-sm text-subdued">{hero.trusted_by || t('landing_hero_trusted_by')}</p>
          </div>
        </div>
      </section>

      {/* Why Section */}
      <section className="py-20 px-5 bg-white/80">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-center text-3xl md:text-4xl font-extrabold mb-4 text-gray-900">
            {why.title || t('landing_why_title')}
          </h2>
          <p className="text-center text-gray-600 mb-16 max-w-2xl mx-auto">
            {why.subtitle || t('landing_why_subtitle')}
          </p>
          <div className="grid md:grid-cols-2 gap-10 items-stretch">
            <div className="rounded-2xl border-2 border-red-100 bg-red-50/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-red-100"><AlertCircle className="w-6 h-6 text-red-600" /></div>
                <h3 className="text-xl font-bold text-gray-900">{why.without_title || t('landing_why_without')}</h3>
              </div>
              <ul className="space-y-3 text-gray-700">
                {(why.without_points || []).map((pt, i) => (
                  <li key={i} className="flex gap-2"><span className="text-red-400 mt-0.5">×</span> {pt}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border-2 border-primary-200 bg-primary-50/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary-200"><CheckCircle2 className="w-6 h-6 text-primary-600" /></div>
                <h3 className="text-xl font-bold text-gray-900">{why.with_title || t('landing_why_with')}</h3>
              </div>
              <ul className="space-y-3 text-gray-700">
                {(why.with_points || []).map((pt, i) => (
                  <li key={i} className="flex gap-2"><span className="text-primary-500 mt-0.5">✓</span> {pt}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto py-24 px-5">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-semibold mb-4">
            <Sparkles className="w-4 h-4" /> {features.badge || t('landing_features_badge')}
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">{features.title || t('landing_features_title')}</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">{features.subtitle || t('landing_features_subtitle')}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(features.items || []).map((item, i) => {
            const IconEl = resolveIcon(item.icon);
            return (
              <div key={i} className="group p-8 bg-white rounded-2xl shadow-lg border border-gray-100 transition-all duration-200 hover:shadow-xl hover:border-primary-100 hover:-translate-y-0.5">
                <div className="p-3 rounded-xl bg-primary-100 text-primary-600 w-fit mb-5 group-hover:bg-primary-200 transition-colors">
                  <IconEl className="w-6 h-6" aria-hidden />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Personas Section */}
      <section className="py-24 px-5 bg-linear-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">{personas.title || t('landing_personas_title')}</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">{personas.subtitle || t('landing_personas_subtitle')}</p>
        </div>
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          {(personas.items || []).map((item, i) => {
            const IconEl = resolveIcon(item.icon);
            return (
              <div key={i} className="text-center p-8 rounded-2xl bg-white border border-gray-100 shadow-lg hover:shadow-xl transition-all">
                <div className="w-14 h-14 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-5">
                  <IconEl className="w-7 h-7" aria-hidden />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-6xl mx-auto py-24 px-5">
        <h2 className="text-center text-3xl md:text-4xl font-extrabold mb-4 text-gray-900">{howItWorks.title || t('landing_how_title')}</h2>
        <p className="text-center text-gray-600 mb-16 max-w-xl mx-auto">{howItWorks.subtitle || t('landing_how_subtitle')}</p>
        <div className="relative">
          <div className="hidden lg:block absolute top-8 left-0 right-0 h-0.5 bg-linear-to-r from-primary-200 via-primary to-primary-200" style={{ left: '12.5%', right: '12.5%' }} aria-hidden />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-6">
            {(howItWorks.steps || []).map((step, i) => (
              <div key={i} className="relative text-center">
                <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-5 shadow-lg shadow-primary-200/50 relative z-10">
                  {i + 1}
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">{step.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-5 bg-gray-50">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">{pricing.title || t('landing_pricing_title')}</h2>
          <p className="text-gray-600 mb-12 max-w-xl mx-auto">{pricing.subtitle || t('landing_pricing_subtitle')}</p>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {(pricing.tiers || []).map((tier, i) => (
              <div key={i} className={`p-8 rounded-2xl bg-white ${tier.is_highlighted ? 'border-2 border-primary shadow-lg' : 'border border-gray-200 shadow'}`}>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{tier.title}</h3>
                <p className="text-gray-600 text-sm mb-6">{tier.description}</p>
                <ul className="text-left space-y-2 text-gray-700 text-sm mb-8">
                  {(tier.features || []).map((f, j) => (
                    <li key={j} className="flex gap-2">
                      <CheckCircle2 className={`w-5 h-5 shrink-0 ${tier.is_highlighted ? 'text-primary' : 'text-gray-400'}`} /> {f}
                    </li>
                  ))}
                </ul>
                {tier.is_coming_soon ? (
                  <button disabled className="w-full py-3 rounded-xl bg-gray-200 text-gray-500 font-semibold cursor-not-allowed">{tier.cta}</button>
                ) : (
                  <button onClick={handleGetStarted} className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-600 transition-colors">
                    {isAuthenticated ? t('go_to_dashboard') : tier.cta}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Slider */}
      <DemoSlider
        slides={demoSlider.slides || []}
        sectionTitle={demoSlider.title || t('landing_demo_title')}
        sectionSubtitle={demoSlider.subtitle || t('landing_demo_subtitle')}
      />

      {/* Testimonials */}
      <section className="py-24 px-5 bg-linear-to-b from-white to-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">{testimonials.title || t('landing_testimonials_title')}</h2>
          <p className="text-center text-gray-600 mb-12 max-w-xl mx-auto">{testimonials.subtitle || t('landing_testimonials_subtitle')}</p>
          <div className="grid md:grid-cols-2 gap-8">
            {(testimonials.items || []).map((item, i) => (
              <div key={i} className="p-8 rounded-2xl bg-white border border-gray-100 shadow-lg">
                {item.rating > 0 && (
                  <div className="flex mb-3">
                    {Array.from({ length: item.rating }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                )}
                <p className="text-gray-700 italic mb-6">&ldquo;{item.quote}&rdquo;</p>
                <div>
                  <span className="font-semibold text-gray-900">{item.name}</span>
                  {item.role && <span className="text-gray-500 text-sm"> · {item.role}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-linear-to-br from-primary to-primary-700 text-white py-20 px-5 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-5">{cta.title || t('landing_cta_title')}</h2>
          <p className="text-xl opacity-90 mb-8">{cta.subtitle || t('landing_cta_subtitle')}</p>
          <button onClick={handleGetStarted}
            className="inline-flex items-center gap-2 px-10 py-4 bg-white text-primary font-bold text-lg rounded-xl hover:bg-gray-100 transition-colors shadow-2xl">
            {isAuthenticated ? t('go_to_dashboard') : (cta.button_label || t('landing_get_started_free'))}
            <ChevronRight className="w-5 h-5" />
          </button>
          <p className="mt-4 text-sm opacity-80">{cta.disclaimer || t('landing_cta_no_card')}</p>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-800 text-white p-10 mt-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 border-b border-gray-700 pb-10 mb-8">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <img src={appLogo} alt="Bari Porichalona Logo" className="w-8 h-8" />
                <h2 className="text-xl font-bold">{nav.brand_name || t('bari_porichalona')}</h2>
              </div>
              <p className="text-gray-400 text-sm">{footer.tagline || t('landing_footer_tagline')}</p>
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold mb-5 text-gray-100">{t('landing_footer_product')}</h3>
              {(footer.product_links || []).map((link, i) => (
                <a key={i} href={link.href} className="text-gray-400 text-sm hover:text-white mb-3 transition-colors">{link.label}</a>
              ))}
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold mb-5 text-gray-100">{t('landing_footer_company')}</h3>
              {(footer.company_links || []).map((link, i) => (
                <a key={i} href={link.href} className="text-gray-400 text-sm hover:text-white mb-3 transition-colors">{link.label}</a>
              ))}
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold mb-5 text-gray-100">{t('landing_footer_connect')}</h3>
              {footer.email && (
                <a href={`mailto:${footer.email}`} className="text-gray-400 text-sm hover:text-white mb-3 transition-colors">Email: {footer.email}</a>
              )}
              {footer.phone && (
                <a href={`tel:${footer.phone.replace(/\s/g, '')}`} className="text-gray-400 text-sm hover:text-white mb-3 transition-colors">Phone: {footer.phone}</a>
              )}
            </div>
          </div>
          <div className="text-center pt-5">
            <p className="text-gray-500 text-sm">© {new Date().getFullYear()} {nav.brand_name || t('bari_porichalona')}. {t('landing_footer_rights')}</p>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default PublicHome;
