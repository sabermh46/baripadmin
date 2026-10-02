import React, { useState, useCallback, useMemo, memo, Suspense } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { ContentLoader } from './common/RouteLoader';
import { useAuth } from '../hooks';
import { appLogo } from '../assets';
import NotificationIcon from './notifications/NotificationIcon';
import SideNav from './layout/SideNav';
import { Menu, X } from 'lucide-react';
import LanguageSwitcher from './common/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { useAdminPendingAppFee } from '../hooks/useAdminPendingAppFee';
import SubscriptionBlocked from './common/SubscriptionBlocked';
import RouteErrorBoundary from './common/RouteErrorBoundary';
import OfflineBanner from './common/OfflineBanner';
import { useAppSelector } from '../hooks';
import { format } from 'date-fns';

/**
 * Split out of Layout and memoized.
 *
 * Layout re-renders on every navigation (React Router re-renders the matched route tree),
 * and the header JSX lived inline in it — so the logo, the role label, LanguageSwitcher
 * and NotificationIcon were all re-rendered on every route change. As a memoized child
 * with only the mobile-menu props, the header is now skipped entirely on navigation and
 * re-renders only when the menu actually toggles or its own hooks change.
 */
const AppHeader = memo(function AppHeader({ isMobileMenuOpen, onToggleMobileMenu }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  return (
    <header className="h-header pt-safe bg-surface/30 border-b border-gray-200 flex items-center justify-between fixed w-full left-0 right-0 top-0 backdrop-blur-[3px] z-40 px-4 pl-[calc(1rem+env(safe-area-inset-left))] pr-[calc(1rem+env(safe-area-inset-right))]">
      <div className="flex gap-2 items-center">
        <Link
          to="/"
          className={`flex items-center text-xl font-bold gap-3 text-primary font-anek-bn`}
        >
          <img src={appLogo} className="h-10" alt="App Logo" width={40} height={40} />
          <p className="leading-[100%]">
            {t('bari_porichalona')} <br />
            <span className="text-xs font-thin text-gray-500 font-mooli">({user?.role?.name || 'User'})</span>
          </p>
        </Link>
      </div>

      <div className="flex gap-3">
        <div className="flex items-center gap-4">
          <div className="hidden md:block">
            <LanguageSwitcher />
          </div>
          <NotificationIcon />
        </div>
        <button
          className="md:hidden bg-transparent border-none text-2xl cursor-pointer"
          onClick={onToggleMobileMenu}
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {!isMobileMenuOpen ? <Menu className="text-slate-700" /> : <X className="text-slate-700" />}
        </button>
      </div>
    </header>
  );
});

/**
 * The blue "renews in N days" notice is a heads-up, not an obstacle, and it sits fixed over
 * the top of every page, covering the header and the page title for the whole last week.
 * So it can be dismissed. The dismissal is keyed to the user and the subscription period
 * (`expiresAt`): renewing starts a new period, so the next cycle warns again. Amber (grace)
 * and red (blocked) stay non-dismissible, because by then access is at stake.
 *
 * localStorage only makes this survive a reload. If it is unavailable the dismissal
 * still holds for the session, and the worst case is the notice returning on reload.
 */
const DISMISS_KEY = 'appFeeRenewalNoticeDismissed';

const readDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
};

const Layout = () => {
  const { t } = useTranslation();
  const { user, isHouseOwner, isCaretaker } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { status, showWarning, isBlocked, inGracePeriod, daysRemaining, graceDaysRemaining, loseAccessAt, validThrough, expiresAt } =
    useAdminPendingAppFee();

  const [dismissedFor, setDismissedFor] = useState(readDismissed);
  const renewalNoticeId = user?.id && expiresAt ? `${user.id}:${expiresAt}` : null;
  const isRenewalNotice = !isBlocked && !inGracePeriod;
  const renewalDismissed = isRenewalNotice && !!renewalNoticeId && dismissedFor === renewalNoticeId;
  const dismissRenewalNotice = useCallback(() => {
    if (!renewalNoticeId) return;
    setDismissedFor(renewalNoticeId);
    try {
      localStorage.setItem(DISMISS_KEY, renewalNoticeId);
    } catch {
      // storage blocked: dismissed for this session only
    }
  }, [renewalNoticeId]);

  // The same warning, for the App Fee entry in the nav. Memoized because SideNav is, and a
  // fresh object each render would re-render both sidebars on every navigation.
  const appFeeNotice = useMemo(() => {
    if (!showWarning || !(isHouseOwner || isCaretaker)) return null;
    if (isBlocked) return { tone: 'blocked' };
    if (inGracePeriod) return { tone: 'grace', days: graceDaysRemaining };
    return { tone: 'renewal', days: daysRemaining };
  }, [showWarning, isHouseOwner, isCaretaker, isBlocked, inGracePeriod, graceDaysRemaining, daysRemaining]);
  const location = useLocation();

  // Two independent signals, deliberately OR'd. The status query says "this account is
  // blocked" and is the only one that can also say the block is over; the 402 flag says "the
  // API just refused a call for this reason" and covers the window before that status has
  // arrived — on a cold load the paywall would otherwise trail a screen of failing widgets.
  // Either signal alone leaves a gap.
  const blockedByApi = useAppSelector((state) => state.ui.subscriptionBlocked);
  const paywalled =
    (isHouseOwner || isCaretaker) && (blockedByApi || (isBlocked && !!status?.hasEverPaid));

  // Stable identities so the memoized header isn't invalidated on every Layout render.
  const toggleMobileMenu = useCallback(() => setIsMobileMenuOpen((open) => !open), []);
  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);

  // All three values come from the server's AppFeeStatusService. This used to recompute the
  // cut-off locally as `start_date + subscription_days + offset_days` off a *pending*
  // invoice, which is neither the formula nor the row the gate actually uses — so the date
  // shown here could differ from the day access was really withdrawn.
  const safeFormat = (value, pattern) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : format(d, pattern);
  };

  const loseAccessText = safeFormat(loseAccessAt, 'dd MMM yyyy');
  const validThroughText = safeFormat(validThrough, 'dd MMM yyyy');

  /*
   * `h-dvh`, not `min-h-screen`: the shell is exactly one viewport tall, so <main>
   * (flex-1, stretched) is bounded and its existing `overflow-auto` becomes a real scroll
   * container instead of one that stretches to its own content and never scrolls. That is
   * what makes `position: sticky` work inside a page - sticky binds to the nearest scroll
   * container, and until now that container never moved. `dvh` over `vh` so the bottom of
   * the column is not stranded under a mobile URL bar.
   */
  return (
    <div className="flex h-dvh max-w-full overflow-x-clip">
      {/* Sidebar */}
      <div className="hidden md:flex md:sticky top-0 w-64 bg-surface border-r border-gray-200 flex-col h-screen!">
        <nav className="flex-1 h-full grid grid-rows-[4rem_1fr_auto]">
          <SideNav onClicked={closeMobileMenu} appFeeNotice={appFeeNotice} />
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-background overflow-auto relative pt-header">
        <AppHeader isMobileMenuOpen={isMobileMenuOpen} onToggleMobileMenu={toggleMobileMenu} />

        {/* Subscription banner. Three distinct states, because "expiring in 5 days",
            "expired but still usable" and "access withdrawn" call for different urgency —
            the previous single red bar said "overdue" for all of them, including to owners
            whose subscription was still perfectly valid. */}
        {showWarning && !renewalDismissed && (isHouseOwner || isCaretaker) && (
          <div
            className={`fixed max-w-[90%] w-[28rem] mx-auto top-[calc(1.5rem+env(safe-area-inset-top))] z-50 left-0 right-0 rounded-2xl border shadow-sm ${
              isBlocked
                ? 'bg-red-50 border-red-300'
                : inGracePeriod
                  ? 'bg-amber-50 border-amber-300'
                  : 'bg-blue-50 border-blue-300'
            }`}
          >
            <div
              className={`px-4 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${
                isRenewalNotice && renewalNoticeId ? 'pr-9' : ''
              }`}
            >
              <div className="text-xs sm:text-sm">
                {isBlocked ? (
                  <span className="text-red-900">
                    <span className="font-semibold">{t('your_subscription_has_expired')}.</span>{' '}
                    {t('subscription_expired_limited')}
                  </span>
                ) : inGracePeriod ? (
                  <span className="text-amber-900">
                    <span className="font-semibold">
                      {validThroughText
                        ? t('subscription_ended_on', { date: validThroughText })
                        : t('your_subscription_has_expired')}
                    </span>{' '}
                    {graceDaysRemaining > 0 && loseAccessText
                      ? t('days_before_access_paused', { count: graceDaysRemaining, date: loseAccessText })
                      : t('access_paused_shortly')}
                  </span>
                ) : (
                  <span className="text-blue-900">
                    <span className="font-semibold">
                      {t('subscription_renews_in', { count: daysRemaining })}
                    </span>{' '}
                    {validThroughText ? t('valid_through_date', { date: validThroughText }) : ''}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => navigate('/app-fee')}
                className={`self-start sm:self-auto shrink-0 px-3 py-1 text-white text-xs rounded-md ${
                  isBlocked ? 'bg-red-600 hover:bg-red-700' : inGracePeriod ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isBlocked || inGracePeriod ? t('pay_now') : t('view_app_fee')}
              </button>
            </div>
            {isRenewalNotice && renewalNoticeId && (
              <button
                type="button"
                onClick={dismissRenewalNotice}
                aria-label={t('dismiss')}
                title={t('dismiss')}
                className="absolute top-1.5 right-1.5 p-1 rounded-full text-blue-700 hover:bg-blue-100"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Suspense sits here, not around the whole <Routes>, so a lazy route chunk
            renders its loader inside the content column — the sidebar and header stay
            mounted and stop flashing away on every navigation. */}
        <div className="flex-1 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pl-[calc(1rem+env(safe-area-inset-left))] pr-[calc(1rem+env(safe-area-inset-right))] max-w-full overflow-x-clip relative">
          {/* The app-fee page stays reachable while blocked — it is the way out, and the
              server's gate allow-lists it for exactly that reason. Everything else is
              replaced rather than covered over, so no doomed request fires behind it. */}
          {/* Offline, or showing a saved copy: said once here for every page. */}
          <OfflineBanner />
          {/* /support too: someone whose access has lapsed is the person most likely to need
              to ask for help, and the support API is outside the subscription gate as well. */}
          {paywalled && !location.pathname.startsWith('/app-fee') && !location.pathname.startsWith('/support') ? (
            <SubscriptionBlocked
              validThrough={validThrough}
              daysSinceExpiry={status?.daysSinceExpiry ?? 0}
              isCaretaker={isCaretaker}
            />
          ) : (
            // Keyed by path, so moving to another page clears a failure here. Inside the
            // content column, so a page that cannot load (offline, or code from a build that
            // has since been replaced) leaves the header and sidebar working. With no
            // boundary at all, one failed page unmounted everything: the white screen.
            <RouteErrorBoundary key={location.pathname}>
              <Suspense fallback={<ContentLoader />}>
                <Outlet />
              </Suspense>
            </RouteErrorBoundary>
          )}
        </div>
      </main>

      {/* Mobile Menu */}
      <div
        className={`fixed md:hidden inset-0 bg-black/25 z-30 duration-300 ${
          isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMobileMenu}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={`md:hidden max-w-80 w-[80%] !min-w-[250px] bg-surface z-50 ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          } fixed top-0 left-0 w-full duration-300 transition-transform flex-1 h-full pt-safe pb-safe grid grid-rows-[4rem_1fr_auto]`}
        >
          <SideNav isMobileMenuOpen={isMobileMenuOpen} onClicked={setIsMobileMenuOpen} appFeeNotice={appFeeNotice} />
        </div>
      </div>
    </div>
  );
};

export default Layout;
