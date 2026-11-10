import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { appLogo, buildingShade, housesImage, laptopImage, profileAvatar } from '../../assets';
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
  ArrowRight,
  ChevronRight,
  Check,
  X,
  PlayCircle,
  ShieldCheck,
  CalendarCheck,
  Lock,
  Star,
  Globe,
  Bell,
  FileText,
  Settings,
  Zap,
  Heart,
  Award,
  CheckCircle2,
  Quote,
  Mail,
  Phone,
} from 'lucide-react';
import { LANDING_LOCALES, landingLocale, useGetLandingPageQuery } from '../../store/api/landingApi';
import { useGetPublicRegistrationStatusQuery } from '../../store/api/authApi';
import Showcase from './Showcase';
import HeroArt from './HeroArt';
import { initialLanding, rememberLanding } from './landingContent';

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

// ── Shared pieces ──────────────────────────────────────────────────────────────
//
// One heading style, one card style and two button styles for the whole page. Headings are
// semibold in `ink` rather than extra-bold near-black: Anek Bangla at 800 reads heavy, and the
// page should feel calm. Sections alternate white and slate-50 so each reads as its own band.

const BTN_PRIMARY = 'inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-[15px] font-medium text-white shadow-sm shadow-primary-700/20 transition-colors hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30';
const BTN_SECONDARY = 'inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-[15px] font-medium text-ink ring-1 ring-slate-200 transition-colors hover:bg-slate-50 hover:ring-slate-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200';
// The nav bar's one button. Its own class, not BTN_PRIMARY plus overrides: two padding
// utilities on one element resolve by stylesheet order, not class order, so the bigger one won
// and the label wrapped onto two lines on a phone.
const NAV_BTN = 'inline-flex items-center justify-center whitespace-nowrap rounded-full bg-primary px-4 sm:px-5 py-2 text-sm font-medium text-white shadow-sm shadow-primary-700/20 transition-colors hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30';
// The hero's own buttons: rounder and a size up from the rest of the page.
const HERO_BTN_PRIMARY = 'inline-flex items-center justify-center gap-2.5 rounded-full bg-primary px-8 py-3.5 text-base sm:text-lg font-medium text-white shadow-lg shadow-primary-600/25 transition-colors hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30';
const HERO_BTN_SECONDARY = 'inline-flex items-center justify-center gap-2.5 rounded-full bg-white px-7 py-3.5 text-base sm:text-lg font-medium text-ink ring-1 ring-slate-200 shadow-sm transition-colors hover:bg-slate-50 hover:ring-slate-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200';
// One icon per hero stat, in the CMS's order: properties, rent processed, users.
const HERO_STAT_ICONS = [Users, CalendarCheck, ShieldCheck];
const CARD = 'rounded-2xl bg-white ring-1 ring-slate-200/80 shadow-[0_1px_2px_rgba(16,24,40,0.04)]';

const Section = ({ id, muted = false, className = '', children }) => (
  <section id={id} className={`py-20 sm:py-24 ${muted ? 'bg-slate-50' : 'bg-white'} ${className}`}>
    <div className="max-w-6xl mx-auto px-5">{children}</div>
  </section>
);

const SectionHeader = ({ eyebrow, title, subtitle }) => (
  <div className="max-w-2xl mx-auto text-center">
    {eyebrow && <p className="mb-3 text-sm font-medium text-primary-600">{eyebrow}</p>}
    <h2 className="text-[1.75rem] sm:text-4xl font-medium leading-snug text-ink">{title}</h2>
    {subtitle && <p className="mt-4 text-base sm:text-lg leading-relaxed text-ink-soft">{subtitle}</p>}
  </div>
);

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
  const slideImage = resolveSlideImage(slide);

  const translateClass = visible
    ? 'translate-x-0 opacity-100'
    : animDir === 'next'
    ? '-translate-x-4 opacity-0'
    : 'translate-x-4 opacity-0';

  return (
    <Section id="demo">
      <SectionHeader title={sectionTitle} subtitle={sectionSubtitle} />

      <div
        className="relative mt-12 rounded-3xl overflow-hidden bg-secondary-900 shadow-xl shadow-secondary-900/15"
        onMouseEnter={() => { hovered.current = true; }}
        onMouseLeave={() => { hovered.current = false; }}
      >
        <div className={`transition-all duration-300 ease-out ${translateClass}`}>
          <div className="relative">
            <img src={slideImage} alt={slide.title} className="w-full h-[340px] sm:h-[420px] md:h-[480px] object-cover" />
            <div className="absolute inset-0 bg-linear-to-t from-secondary-900/95 via-secondary-900/40 to-transparent" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
            <div className="max-w-2xl">
              {slide.tag && (
                <span className="inline-block mb-3 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/20 backdrop-blur-sm">{slide.tag}</span>
              )}
              <h3 className="text-xl md:text-3xl font-medium text-white mb-2 leading-snug">{slide.title}</h3>
              <p className="text-sm md:text-base text-white/80 leading-relaxed">{slide.description}</p>
            </div>
          </div>
        </div>

        <button onClick={prev} aria-label="Previous slide" className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-sm text-white flex items-center justify-center transition-colors ring-1 ring-white/20">
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
        <button onClick={next} aria-label="Next slide" className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-sm text-white flex items-center justify-center transition-colors ring-1 ring-white/20">
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="absolute top-4 right-5 text-xs font-medium text-white/70 tabular-nums">
          {active + 1} / {total}
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2">
          {slides.map((_, i) => (
            <button key={i} onClick={() => goTo(i, i > active ? 'next' : 'prev')} aria-label={`Slide ${i + 1}`}
              className={`rounded-full transition-all duration-300 ${i === active ? 'w-7 h-2 bg-primary' : 'w-2 h-2 bg-slate-300 hover:bg-slate-400'}`}
            />
          ))}
        </div>
        <div className="hidden sm:flex items-center gap-3">
          {slides.map((s, i) => (
            <button key={i} onClick={() => goTo(i, i > active ? 'next' : 'prev')}
              className={`rounded-xl overflow-hidden ring-2 transition-all duration-300 ${i === active ? 'ring-primary' : 'ring-transparent opacity-60 hover:opacity-90'}`}
            >
              <img src={resolveSlideImage(s)} alt={s.title} className="w-24 h-16 object-cover" />
            </button>
          ))}
        </div>
      </div>
    </Section>
  );
};

// ── Footer language switch ─────────────────────────────────────────────────────

// Each name in its own script, so a visitor who cannot read the current language can still
// find theirs.
const LOCALE_NAMES = { bn: 'বাংলা', en: 'English' };

const LanguageSwitch = () => {
  const { t, i18n } = useTranslation();
  const current = landingLocale(i18n.language);
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex items-center gap-1.5 text-sm text-white/60">
        <Globe className="w-4 h-4" aria-hidden /> {t('landing_footer_language')}
      </span>
      <div role="radiogroup" aria-label={t('landing_footer_language')} className="inline-flex rounded-full bg-white/10 p-1 ring-1 ring-white/10">
        {LANDING_LOCALES.map((code) => (
          <button key={code} type="button" role="radio" aria-checked={current === code} lang={code}
            onClick={() => i18n.changeLanguage(code)}
            className={`rounded-full px-3.5 py-1 text-sm transition-colors ${
              current === code ? 'bg-white text-secondary-900 font-medium' : 'text-white/75 hover:text-white'
            }`}>
            {LOCALE_NAMES[code]}
          </button>
        ))}
      </div>
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────

const PublicHome = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const heroVideoRef = useRef(null);

  // The page's words come from the landing CMS in the visitor's language. It renders at once
  // from the copy bundled into the build (or this browser's newer saved one), then the
  // backend's answer replaces it if anything changed (landingContent.js).
  const locale = landingLocale(i18n.language);
  const { data: landingResponse } = useGetLandingPageQuery(locale);
  const fresh = landingResponse?.locale === locale ? landingResponse.data : undefined;
  const initial = useMemo(() => initialLanding(locale), [locale]);
  useEffect(() => { if (fresh) rememberLanding(locale, fresh); }, [locale, fresh]);
  const lp = fresh || initial;

  const nav          = lp.nav          || {};
  const hero         = lp.hero         || {};
  const why          = lp.why          || {};
  const features     = lp.features     || {};
  const showcase     = lp.showcase     || {};
  const personas     = lp.personas     || {};
  const howItWorks   = lp.how_it_works || {};
  const pricing      = lp.pricing      || {};
  const demoSlider   = lp.demo_slider  || {};
  const testimonials = lp.testimonials || {};
  const cta          = lp.cta          || {};
  const footer       = lp.footer       || {};

  const brand = nav.brand_name || t('bari_porichalona');

  // Sign-up is by invitation unless the web owner opens it (Admin settings): the first owners
  // are signed up in person. While it is closed, every "get started" button leads to the
  // contact details instead of a sign-up form that would only refuse the visitor.
  const { data: registration } = useGetPublicRegistrationStatusQuery(undefined, { skip: isAuthenticated });
  const signupOpen = registration?.publicRegistrationEnabled === true;
  const startLabel = (label) => (isAuthenticated ? t('go_to_dashboard') : signupOpen ? label : t('landing_contact_us'));

  const handleGetStarted = () => {
    if (isAuthenticated) navigate('/dashboard');
    else if (signupOpen) navigate('/signup');
    else document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  const navLinks = (nav.links || []).length > 0 ? nav.links : [
    { label: t('landing_nav_home'), href: '#' },
    { label: t('landing_nav_features'), href: '#features' },
    { label: t('landing_nav_pricing'), href: '#pricing' },
    { label: t('landing_nav_contact'), href: '#contact' },
  ];

  return (
    <div className="min-h-screen bg-white text-ink">

      {/* Navigation Bar */}
      <nav data-landing-nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-5 h-16 flex justify-between items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <img src={appLogo} alt="" className="h-9 w-auto" />
            {/* Under 380px the name and both buttons do not fit one row; the logo carries the brand there. */}
            <span className="max-[379px]:hidden whitespace-nowrap text-base sm:text-lg font-semibold text-secondary-800">{brand}</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link, i) => (
              <a key={i} href={link.href} className="text-[15px] font-medium text-ink-soft hover:text-ink transition-colors">
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {isAuthenticated ? (
              <>
                <span className="hidden sm:inline mr-2 text-sm text-ink-soft">
                  {t('landing_hello_user', { name: user?.name?.split(' ')[0] || t('landing_user_fallback') })}
                </span>
                <Link to="/dashboard" className={`${NAV_BTN}`}>{t('go_to_dashboard')}</Link>
              </>
            ) : (
              <>
                <Link to="/login" className="whitespace-nowrap rounded-full px-2.5 sm:px-4 py-2 text-sm font-medium text-ink hover:bg-slate-100 transition-colors">
                  {nav.cta_login || t('landing_login')}
                </Link>
                {signupOpen ? (
                  <Link to="/signup" className={`${NAV_BTN}`}>{nav.cta_signup || t('landing_signup')}</Link>
                ) : (
                  <a href="#contact" className={`${NAV_BTN}`}>{t('landing_contact_us')}</a>
                )}
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero: a villa in its garden with the promo video standing in front of it (HeroArt).
          On a phone the picture comes straight after the headline, ahead of the buttons; on a
          wide screen it takes the right-hand side. */}
      <section className="relative overflow-hidden bg-linear-to-b from-[#f2f8fc] via-white to-white">
        <div aria-hidden className="absolute -top-56 right-[-12%] w-240 h-176 rounded-full bg-sky-100/70 blur-3xl" />
        <div aria-hidden className="absolute top-1/3 -left-56 w-120 h-120 rounded-full bg-primary-100/40 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-5 pt-8 sm:pt-12 lg:pt-8 pb-14 lg:pb-16 grid grid-cols-1 lg:grid-cols-[minmax(0,23fr)_minmax(0,25fr)] gap-x-10 gap-y-8 lg:gap-y-0">
          <div className="relative z-20 lg:col-start-1 lg:row-start-1 lg:self-end text-center lg:text-left">
            {hero.badge && (
              <span className="inline-flex items-center gap-2.5 rounded-full bg-white/80 px-4 py-1.5 text-sm font-medium text-ink ring-1 ring-slate-200 shadow-sm backdrop-blur-sm">
                <span className="relative flex w-2 h-2" aria-hidden>
                  <span className="absolute inset-0 rounded-full bg-primary opacity-60 motion-safe:animate-ping" />
                  <span className="relative w-2 h-2 rounded-full bg-primary" />
                </span>
                {hero.badge}
              </span>
            )}
            {/* `??`, not `||`: an empty part is deliberate (the Bengali headline ends on its
                highlight), and `||` would fill it with the built-in English-shaped fallback.
                The highlight never breaks inside itself, so it moves to its own line whole. */}
            <h1 className="mt-6 text-[2.25rem] sm:text-5xl lg:text-[3.15rem] xl:text-[3.4rem] font-bold leading-[1.22] text-ink">
              {hero.title_before ?? t('landing_hero_title_before')}
              {(() => {
                const highlight = hero.title_highlight ?? t('landing_hero_title_highlight');
                // Ending on the highlight (the Bengali headline), it takes a line of its own.
                const after = hero.title_after ?? t('landing_hero_title_after');
                return highlight ? (
                  <span className={`relative ${after ? 'inline-block' : 'table mx-auto lg:mx-0'} whitespace-nowrap pb-2 text-primary-600`}>
                    {highlight}
                    <svg aria-hidden viewBox="0 0 200 14" preserveAspectRatio="none"
                      className="absolute left-[30%] -bottom-1 w-[55%] h-3.5 text-primary-400">
                      <path d="M4 10 C 60 2, 130 1, 196 8" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
                    </svg>
                  </span>
                ) : null;
              })()}
              {hero.title_after ?? t('landing_hero_title_after')}
            </h1>
            <p className="mt-6 text-base sm:text-lg leading-relaxed text-ink-soft max-w-xl mx-auto lg:mx-0">
              {hero.subtitle || t('landing_hero_subtitle')}
            </p>
          </div>

          <div className="min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:self-center">
            <HeroArt videoRef={heroVideoRef} soundLabel={hero.video_sound_label} />
          </div>

          <div className="relative z-20 lg:col-start-1 lg:row-start-2 lg:self-start lg:pt-9 text-center lg:text-left">
            {/* Full width and stacked on a phone, where two auto-width buttons wrapped into a
                ragged pair; side by side from sm up. */}
            <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-3 sm:gap-4 [&>*]:w-full sm:[&>*]:w-auto">
              <button type="button" onClick={handleGetStarted} className={HERO_BTN_PRIMARY}>
                {startLabel(hero.cta_primary || t('landing_get_started_free'))}
                <ArrowRight className="w-5 h-5" aria-hidden />
              </button>
              <button type="button" onClick={() => heroVideoRef.current?.playWithSound()} className={HERO_BTN_SECONDARY}>
                <PlayCircle className="w-6 h-6 text-primary-600" aria-hidden />
                {hero.cta_secondary || t('landing_watch_demo')}
              </button>
            </div>

            {(hero.stats || []).length > 0 && (
              <div className="mt-10 grid grid-cols-3 divide-x divide-slate-200/80 max-w-xl mx-auto lg:mx-0 rounded-2xl bg-white/80 py-4 ring-1 ring-slate-200/70 shadow-[0_8px_30px_-12px_rgba(16,24,40,0.12)] backdrop-blur-sm">
                {hero.stats.map((stat, i) => {
                  const StatIcon = HERO_STAT_ICONS[i % HERO_STAT_ICONS.length];
                  return (
                    <div key={i} className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 px-2 sm:px-4">
                      <span className="w-10 h-10 shrink-0 rounded-xl bg-secondary-100/70 text-secondary-700 flex items-center justify-center" aria-hidden>
                        <StatIcon className="w-5 h-5" />
                      </span>
                      <div className="text-center sm:text-left">
                        <div className="text-xl sm:text-2xl font-bold leading-tight text-ink">{stat.value}</div>
                        <div className="mt-0.5 text-xs sm:text-[13px] text-ink-soft">{stat.label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Trusted-by strip */}
        <div className="relative border-t border-slate-200/70 bg-white/70 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-5 py-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-5 text-center">
            <div className="flex items-center gap-1.5">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" aria-hidden />)}
              </div>
              <span className="text-sm font-medium text-ink">4.9/5</span>
            </div>
            <span className="hidden sm:block w-px h-4 bg-slate-300" />
            <p className="text-sm text-ink-soft">{hero.trusted_by || t('landing_hero_trusted_by')}</p>
          </div>
        </div>
      </section>

      {/* Why Section */}
      <Section>
        <SectionHeader title={why.title || t('landing_why_title')} subtitle={why.subtitle || t('landing_why_subtitle')} />
        <div className="mt-14 grid md:grid-cols-2 gap-5 sm:gap-6">
          <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-7 sm:p-8">
            <h3 className="flex items-center gap-3 text-lg font-semibold text-ink">
              <span className="w-9 h-9 rounded-full bg-white ring-1 ring-slate-200 flex items-center justify-center">
                <X className="w-4 h-4 text-slate-400" aria-hidden />
              </span>
              {why.without_title || t('landing_why_without')}
            </h3>
            <ul className="mt-6 space-y-3.5">
              {(why.without_points || []).map((pt, i) => (
                <li key={i} className="flex gap-3 text-ink-soft leading-relaxed">
                  <X className="w-4 h-4 mt-1 shrink-0 text-rose-400" aria-hidden /> {pt}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-secondary-800 p-7 sm:p-8 text-white shadow-lg shadow-secondary-900/15">
            <div aria-hidden className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/5" />
            <h3 className="relative flex items-center gap-3 text-lg font-semibold">
              <span className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-4 h-4" aria-hidden />
              </span>
              {why.with_title || t('landing_why_with')}
            </h3>
            <ul className="relative mt-6 space-y-3.5">
              {(why.with_points || []).map((pt, i) => (
                <li key={i} className="flex gap-3 text-white/85 leading-relaxed">
                  <Check className="w-4 h-4 mt-1 shrink-0 text-primary-300" aria-hidden /> {pt}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Features Section */}
      <Section id="features" muted>
        <SectionHeader
          eyebrow={features.badge || t('landing_features_badge')}
          title={features.title || t('landing_features_title')}
          subtitle={features.subtitle || t('landing_features_subtitle')}
        />
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {(features.items || []).map((item, i) => {
            const IconEl = resolveIcon(item.icon);
            return (
              <div key={i} className={`${CARD} p-7 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}>
                <div className="w-11 h-11 rounded-xl bg-primary-100/70 text-primary-700 flex items-center justify-center">
                  <IconEl className="w-5 h-5" aria-hidden />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-ink">{item.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{item.description}</p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Feature showcase (the client's flyers, rebuilt) */}
      <Showcase data={showcase} />

      {/* Personas Section */}
      <Section muted>
        <SectionHeader title={personas.title || t('landing_personas_title')} subtitle={personas.subtitle || t('landing_personas_subtitle')} />
        <div className="mt-14 grid md:grid-cols-3 gap-5">
          {(personas.items || []).map((item, i) => {
            const IconEl = resolveIcon(item.icon);
            return (
              <div key={i} className={`${CARD} p-7`}>
                <div className="w-11 h-11 rounded-xl bg-secondary-100 text-secondary-700 flex items-center justify-center">
                  <IconEl className="w-5 h-5" aria-hidden />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-ink">{item.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{item.description}</p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* How It Works */}
      <Section>
        <SectionHeader title={howItWorks.title || t('landing_how_title')} subtitle={howItWorks.subtitle || t('landing_how_subtitle')} />
        <ol className="relative mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          <span aria-hidden className="hidden lg:block absolute top-5 left-[12.5%] right-[12.5%] h-px bg-slate-200" />
          {(howItWorks.steps || []).map((step, i) => (
            <li key={i} className="relative text-center">
              <span className="relative z-10 mx-auto w-10 h-10 rounded-full bg-white ring-1 ring-slate-200 shadow-sm flex items-center justify-center text-base font-semibold text-primary-600">
                {i + 1}
              </span>
              <h3 className="mt-5 text-lg font-semibold text-ink">{step.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{step.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Pricing Section */}
      <Section id="pricing" muted>
        <SectionHeader title={pricing.title || t('landing_pricing_title')} subtitle={pricing.subtitle || t('landing_pricing_subtitle')} />
        <div className="mt-14 grid md:grid-cols-2 gap-5 sm:gap-6 max-w-4xl mx-auto">
          {(pricing.tiers || []).map((tier, i) => (
            <div key={i} className={`flex flex-col rounded-2xl bg-white p-8 ${tier.is_highlighted ? 'ring-2 ring-primary/70 shadow-lg shadow-primary-700/10' : 'ring-1 ring-slate-200/80'}`}>
              <h3 className="text-xl font-semibold text-ink">{tier.title}</h3>
              <p className="mt-2 text-[15px] text-ink-soft">{tier.description}</p>
              <ul className="mt-6 mb-8 space-y-3 text-[15px] text-ink">
                {(tier.features || []).map((f, j) => (
                  <li key={j} className="flex gap-3">
                    <Check className={`w-5 h-5 shrink-0 ${tier.is_highlighted ? 'text-primary-600' : 'text-secondary-600'}`} aria-hidden /> {f}
                  </li>
                ))}
              </ul>
              {tier.is_coming_soon ? (
                <button type="button" disabled className="mt-auto w-full rounded-xl bg-slate-100 py-3 text-[15px] font-medium text-slate-400 cursor-not-allowed">{tier.cta}</button>
              ) : (
                <button type="button" onClick={handleGetStarted} className={`${BTN_PRIMARY} mt-auto w-full`}>
                  {startLabel(tier.cta)}
                </button>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Demo Slider */}
      <DemoSlider
        slides={demoSlider.slides || []}
        sectionTitle={demoSlider.title || t('landing_demo_title')}
        sectionSubtitle={demoSlider.subtitle || t('landing_demo_subtitle')}
      />

      {/* Testimonials */}
      <Section muted>
        <SectionHeader title={testimonials.title || t('landing_testimonials_title')} subtitle={testimonials.subtitle || t('landing_testimonials_subtitle')} />
        <div className="mt-14 grid md:grid-cols-2 gap-5 sm:gap-6 max-w-5xl mx-auto">
          {(testimonials.items || []).map((item, i) => (
            <figure key={i} className={`${CARD} p-8 flex flex-col`}>
              <Quote className="w-8 h-8 text-primary-200" aria-hidden />
              {/* Not italic: Anek Bangla has no italic, and a slanted Bengali fallback is hard to read. */}
              <blockquote className="mt-4 flex-1 text-lg leading-relaxed text-ink">{item.quote}</blockquote>
              <figcaption className="mt-6 flex items-center justify-between gap-4 border-t border-slate-100 pt-5">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-secondary-100 text-secondary-700 flex items-center justify-center font-semibold">
                    {item.name?.charAt(0)}
                  </span>
                  <div>
                    <div className="font-medium text-ink">{item.name}</div>
                    {item.role && <div className="text-sm text-ink-soft">{item.role}</div>}
                  </div>
                </div>
                {item.rating > 0 && (
                  <div className="flex shrink-0" aria-label={`${item.rating}/5`}>
                    {Array.from({ length: item.rating }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" aria-hidden />
                    ))}
                  </div>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </Section>

      {/* CTA Section: a teal panel, the same material as the video. */}
      <section className="bg-white py-20 sm:py-24 px-5">
        <div className="relative overflow-hidden max-w-5xl mx-auto rounded-3xl bg-linear-to-br from-secondary-700 to-secondary-900 px-6 py-14 sm:px-12 sm:py-16 text-center text-white">
          <div aria-hidden className="absolute -top-24 -left-20 w-72 h-72 rounded-full bg-white/5" />
          <div aria-hidden className="absolute -bottom-32 -right-24 w-96 h-96 rounded-full bg-white/5" />
          <div className="relative">
            <h2 className="text-[1.75rem] sm:text-4xl font-medium leading-snug">{cta.title || t('landing_cta_title')}</h2>
            <p className="mt-4 text-base sm:text-lg text-white/75 max-w-2xl mx-auto">{cta.subtitle || t('landing_cta_subtitle')}</p>
            <button type="button" onClick={handleGetStarted} className={`${BTN_PRIMARY} mt-8 px-8 py-3.5 text-base`}>
              {startLabel(cta.button_label || t('landing_get_started_free'))}
              <ArrowRight className="w-4 h-4" aria-hidden />
            </button>
            <p className="mt-4 text-sm text-white/60">{cta.disclaimer || t('landing_cta_no_card')}</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-secondary-900 text-white">
        <div className="max-w-6xl mx-auto px-5 pt-14 pb-8">
          <div className="grid grid-cols-2 md:grid-cols-12 gap-10 pb-10 border-b border-white/10">
            <div className="col-span-2 md:col-span-5">
              <div className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
                  <img src={appLogo} alt="" className="w-7 h-7" />
                </span>
                <span className="text-lg font-semibold">{brand}</span>
              </div>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">{footer.tagline || t('landing_footer_tagline')}</p>
            </div>
            <div className="md:col-span-2">
              <h3 className="text-sm font-semibold text-white/90">{t('landing_footer_product')}</h3>
              <ul className="mt-4 space-y-3">
                {(footer.product_links || []).map((link, i) => (
                  <li key={i}><a href={link.href} className="text-sm text-white/60 hover:text-white transition-colors">{link.label}</a></li>
                ))}
              </ul>
            </div>
            <div className="md:col-span-2">
              <h3 className="text-sm font-semibold text-white/90">{t('landing_footer_company')}</h3>
              <ul className="mt-4 space-y-3">
                {(footer.company_links || []).map((link, i) => (
                  <li key={i}><a href={link.href} className="text-sm text-white/60 hover:text-white transition-colors">{link.label}</a></li>
                ))}
              </ul>
            </div>
            <div className="col-span-2 md:col-span-3">
              <h3 className="text-sm font-semibold text-white/90">{t('landing_footer_connect')}</h3>
              <ul className="mt-4 space-y-3">
                {footer.email && (
                  <li>
                    <a href={`mailto:${footer.email}`} className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
                      <Mail className="w-4 h-4 shrink-0" aria-hidden /> {footer.email}
                    </a>
                  </li>
                )}
                {footer.phone && (
                  <li>
                    <a href={`tel:${footer.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
                      <Phone className="w-4 h-4 shrink-0" aria-hidden /> {footer.phone}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>
          <div className="pt-6 flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-white/50">© {new Date().getFullYear()} {brand}. {t('landing_footer_rights')}</p>
            <LanguageSwitch />
          </div>
        </div>
      </footer>

    </div>
  );
};

export default PublicHome;
