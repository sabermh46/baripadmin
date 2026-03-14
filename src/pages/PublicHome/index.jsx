import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { appLogo } from '../../assets';
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
  FileText,
  Landmark,
  ChevronRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';

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
      <section className="max-w-7xl mx-auto mt-16 md:mt-24 px-5 grid grid-cols-1 md:grid-cols-2 gap-16 items-center text-center md:text-left">
        <div className="hero-content">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 text-gray-900 leading-tight">
            {t('landing_hero_title_before')}<span className="text-primary">{t('landing_hero_title_highlight')}</span>{t('landing_hero_title_after')}
          </h1>
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            {t('landing_hero_subtitle')}
          </p>
          <div className="flex justify-center md:justify-start gap-4 mb-12">
            <button
                onClick={handleGetStarted}
                className="px-8 py-3 text-lg font-semibold bg-primary text-white rounded-xl hover:bg-primary-600 transition-colors shadow-lg shadow-primary-200/50"
            >
              {isAuthenticated ? t('go_to_dashboard') : t('landing_get_started_free')}
            </button>
            <Link
                to="/#demo"
                className="px-8 py-3 text-lg font-semibold text-primary border-2 border-primary rounded-xl hover:bg-primary-50 transition-colors"
            >
              {t('landing_watch_demo')}
            </Link>
          </div>
          <div className="flex flex-wrap justify-center md:justify-start gap-8 md:gap-10">
            <div className="flex flex-col items-center md:items-start">
              <span className="text-3xl font-extrabold text-primary">100+</span>
              <span className="text-sm text-gray-600 mt-1">{t('landing_stat_properties')}</span>
            </div>
            <div className="flex flex-col items-center md:items-start">
              <span className="text-3xl font-extrabold text-primary">৳10M+</span>
              <span className="text-sm text-gray-600 mt-1">{t('landing_stat_rent')}</span>
            </div>
            <div className="flex flex-col items-center md:items-start">
              <span className="text-3xl font-extrabold text-primary">500+</span>
              <span className="text-sm text-gray-600 mt-1">{t('landing_stat_users')}</span>
            </div>
          </div>
        </div>
        <div className="relative h-96 hidden md:block">
          {/* TODO: Replace with real dashboard screenshots */}
          <div className="absolute p-5 bg-white rounded-xl shadow-2xl font-semibold transition-all duration-300 hover:scale-105" style={{ top: '0', left: '0', width: '200px', height: '150px' }}>
                📊 {t('landing_preview_dashboard')}
            </div>
          <div className="absolute p-5 bg-white rounded-xl shadow-2xl font-semibold transition-all duration-300 hover:scale-105" style={{ top: '80px', right: '0', width: '180px', height: '120px' }}>
                🏠 {t('landing_preview_houses')}
            </div>
          <div className="absolute p-5 bg-white rounded-xl shadow-2xl font-semibold transition-all duration-300 hover:scale-105" style={{ bottom: '40px', left: '40px', width: '220px', height: '140px' }}>
                💰 {t('landing_preview_rent')}
            </div>
          <div className="absolute p-5 bg-white rounded-xl shadow-2xl font-semibold transition-all duration-300 hover:scale-105" style={{ bottom: '0', right: '60px', width: '160px', height: '100px' }}>
                📢 {t('landing_preview_notices')}
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
          <div className="hidden lg:block absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-200 via-primary to-primary-200" style={{ left: '12.5%', right: '12.5%' }} aria-hidden />
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

      {/* Demo Section – Placeholder for video/screenshots */}
      <section id="demo" className="py-24 px-5">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">{t('landing_demo_title')}</h2>
          <p className="text-gray-600 mb-12 max-w-xl mx-auto">
            {t('landing_demo_subtitle')}
          </p>
          <div className="aspect-video max-w-4xl mx-auto rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-500 font-medium">
            {t('landing_demo_placeholder')}
          </div>
        </div>
      </section>

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
                <span className="text-2xl">🏠</span>
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