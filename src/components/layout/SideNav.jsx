import {
  BellDot,
  BellRing,
  BookUser,
  ChartColumnBig,
  CircleUser,
  Wallet,
  FileClock,
  House,
  Landmark,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Mail,
  MessageSquare,
  Receipt,
  Settings,
  UserCheck,
  UserCog,
  Users,
  UsersRound,
} from "lucide-react";
import { useState, memo } from "react";
import { useAppDispatch, useAuth } from "../../hooks";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLogoutMutation } from "../../store/api/authApi";
import { useGetAppFeeBadgeCountsQuery } from "../../store/api/appFeeApi";
import { logout as logoutAction } from '../../store/slices/authSlice';
import push from "../../services/push";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../common/LanguageSwitcher";
import ProtectedImage from "../common/ProtectedImage";
import { clearOffline } from '../../utils/offlineCache';

/**
 * The sections the nav is divided into, in the order they appear.
 *
 * A web_owner sees eighteen entries. As one flat list that is a scroll with no landmarks,
 * and the two an admin actually reaches for sit in the middle of it. A house owner sees
 * eight across three sections, so the headings cost them almost nothing.
 */
const NAV_GROUPS = [
  { key: "main", labelKey: "nav_group_main" },
  { key: "people", labelKey: "nav_group_people" },
  { key: "money", labelKey: "nav_group_money" },
  { key: "admin", labelKey: "nav_group_admin" },
];

/**
 * Hoisted to module scope, and `icon` holds the component *reference* rather than a
 * rendered `<LayoutDashboard />` element.
 *
 * This array used to be rebuilt inside the component body, which meant every render
 * allocated 15 fresh objects and, worse, 15 brand-new icon React elements. SideNav calls
 * useLocation(), so it re-renders on every navigation — memo() cannot prevent that — and
 * each of those re-renders therefore re-created and re-rendered all 15 lucide SVGs. That
 * is the sidebar/header work you were seeing on every route change.
 *
 * `labelKey` instead of a resolved label so translation still happens at render time and
 * the list stays static across language switches.
 *
 * Every `icon` is distinct. Expenses and Reports both used FileText, and Staffs and Renters
 * both used Users — two pairs of unrelated destinations that were indistinguishable at a
 * glance, which is most of what "the icons look basic" was actually about.
 */
const NAV_ITEMS = [
  { path: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard, group: "main", toMatch: ["/admin/generate-token"] },
  {
    path: "/houses",
    labelKey: "houses",
    icon: House,
    group: "main",
    roles: ["developer", "web_owner", "staff", "house_owner", "caretaker"],
    // /flats/:id has no entry of its own and belongs here. The two entries alongside it
    // were "houses" and "/houses/create", both already covered by the /houses prefix.
    toMatch: ["/flats"],
  },
  {
    path: "/notification",
    labelKey: "notification",
    icon: BellDot,
    group: "main",
    roles: ["developer", "web_owner", "staff", "house_owner"],
  },
  { path: "/profile", labelKey: "profile", icon: CircleUser, group: "main" },
  { path: "/admin/staff", labelKey: "staffs", icon: UserCog, group: "people", roles: ["developer", "web_owner"] },
  {
    path: "/staff/user-approvals",
    labelKey: "caretaker_requests",
    icon: UserCheck,
    group: "people",
    roles: ["developer", "web_owner", "staff"],
    // Staff need the same capability the approve endpoint enforces.
    permission: "caretakers.create",
  },
  {
    path: "/caretakers",
    labelKey: "caretakers",
    icon: UsersRound,
    group: "people",
    // A caretaker belongs here too — it is where they see their own assignments.
    roles: ["developer", "web_owner", "staff", "house_owner", "caretaker"],
  },
  {
    path: "/admin/house-owners",
    labelKey: "house_owners",
    icon: BookUser,
    group: "people",
    roles: ["developer", "web_owner", "staff"],
    // Staff need users.view for this; without it the page is an Access Denied.
    permission: "users.view",
  },
  {
    path: "/renters",
    labelKey: "renters",
    icon: Users,
    group: "people",
    roles: ["developer", "web_owner", "staff", "house_owner", "caretaker"],
    // Same permission the route and the endpoint require, so the link is not offered to
    // somebody it would only refuse.
    permission: "renters.view",
  },
  {
    path: "/expenses",
    labelKey: "expenses",
    icon: Receipt,
    group: "money",
    roles: ["developer", "web_owner", "staff", "house_owner", "caretaker"],
  },
  {
    path: "/app-fee",
    labelKey: "app_fee",
    icon: Wallet,
    group: "money",
    roles: ["developer", "web_owner", "staff", "house_owner", "caretaker"],
  },
  {
    path: "/loans",
    labelKey: "loans",
    icon: Landmark,
    group: "money",
    roles: ["developer", "web_owner", "staff", "house_owner", "caretaker"],
  },
  {
    path: "/reports",
    labelKey: "reports",
    icon: ChartColumnBig,
    group: "money",
    roles: ["developer", "web_owner", "staff", "house_owner", "caretaker"],
  },
  { path: "/staff/audit-logs", labelKey: "audit_logs", icon: FileClock, group: "admin", roles: ["developer", "web_owner"] },
  {
    path: "/admin/notification-settings",
    labelKey: "notification_settings",
    icon: BellRing,
    group: "admin",
    roles: ["developer", "web_owner"],
  },
  { path: "/admin/settings", labelKey: "settings", icon: Settings, group: "admin", roles: ["developer", "web_owner"] },
  { path: "/admin/landing-editor", labelKey: "landing_editor", icon: LayoutTemplate, group: "admin", roles: ["web_owner"] },
  { path: "/admin/email-templates", labelKey: "email_templates", icon: Mail, group: "admin", roles: ["web_owner", "developer"] },
  { path: "/admin/sms-allowance", labelKey: "sms_allowance", icon: MessageSquare, group: "admin", roles: ["web_owner", "developer"] },
];

/**
 * How well an entry claims the current URL: 0 for no claim, higher for a more specific one.
 *
 * The previous matcher took the first URL segment and asked `String.includes` of each
 * `toMatch` string — substring matching between unrelated paths. On /admin/staff the segment
 * was "admin", and Dashboard's toMatch entry "/admin/generate-token" contains "admin", so
 * Dashboard lit up next to Staffs; likewise on /admin/settings, /admin/house-owners and
 * /admin/landing-editor. On /admin/house-owners/62 it inverted: Dashboard was the *only*
 * entry highlighted, because House Owners has no toMatch and returned false before the URL
 * was ever really examined. Detail pages under an entry with no toMatch — /caretakers/12/
 * details — highlighted nothing at all.
 *
 * Matching is on whole path segments now: equal to the entry, or below it. So /houses claims
 * /houses/5/edit, and /admin/generate-token claims nothing else under /admin. An exact hit
 * outscores a descendant hit by one, so a page owning an entry always beats its ancestor's.
 */
const normalisePath = (path) => {
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  // A trailing slash is a real case, not a hypothetical: the dashboard's renters modal links
  // to "/renters/?view=3", whose pathname is "/renters/".
  return withSlash.replace(/\/+$/, "") || "/";
};

const matchScore = (candidate, currentPath) => {
  const base = normalisePath(candidate);
  if (currentPath === base) return base.length + 1;
  if (currentPath.startsWith(`${base}/`)) return base.length;
  return 0;
};

const navMatchScore = (item, currentPath) =>
  [item.path, ...(item.toMatch ?? [])].reduce(
    (best, candidate) => Math.max(best, matchScore(candidate, currentPath)),
    0
  );

/**
 * The two counts an admin has to act on, rendered on the App Fee entry.
 *
 * Kept as two distinct pills rather than one total because they need opposite responses:
 * "not enabled" means go raise/chase an invoice, "to verify" means an owner has already
 * paid and is waiting on you. Collapsing them into a single number would hide which.
 */
const AppFeeBadges = ({ counts, collapsed }) => {
  const { t } = useTranslation();

  if (!counts) return null;

  const { notEnabled = 0, pendingVerification = 0 } = counts;
  if (!notEnabled && !pendingVerification) return null;

  const pills = [
    notEnabled > 0 && {
      key: 'notEnabled',
      value: notEnabled,
      className: 'bg-red-100 text-red-700',
      title: t('badge_no_active_subscription', { count: notEnabled }),
    },
    pendingVerification > 0 && {
      key: 'pendingVerification',
      value: pendingVerification,
      className: 'bg-amber-100 text-amber-800',
      title: t('badge_awaiting_verification', { count: pendingVerification }),
    },
  ].filter(Boolean);

  return (
    <span className={`flex items-center gap-1 ${collapsed ? '' : 'ml-auto'}`}>
      {pills.map((p) => (
        <span
          key={p.key}
          title={p.title}
          className={`min-w-5 px-1.5 h-5 inline-flex items-center justify-center rounded-full text-[11px] font-semibold tabular-nums ${p.className}`}
        >
          {p.value > 99 ? '99+' : p.value}
        </span>
      ))}
    </span>
  );
};

/**
 * One nav row.
 *
 * The active row used to carry three competing signals at once — a slate-100 ground, an
 * orange filled square around the icon, and an orange bold label — and a fourth that never
 * fired, because `aria-[current=page]:bg-primary` was written against a plain `Link`, which
 * (unlike `NavLink`) never sets aria-current. The result read as an accident rather than a
 * state. It is one signal now: a tinted pill with an orange edge, and the icon and label
 * tinted to match. `aria-current` is set for real, for screen readers.
 *
 * Inactive icons are slate, not orange. Eighteen orange icons in a column is eighteen things
 * asking for attention, which is the same as none of them getting it; orange now means "you
 * are here" or "you are pointing at this".
 */
const NavRow = ({ item, isActive, isBengali, onClicked, badges, t }) => {
  const Icon = item.icon;

  return (
    <Link
      to={item.path}
      // Optional call: Layout renders the desktop sidebar as <SideNav /> with no props, so an
      // unguarded onClicked(false) threw a TypeError inside the Link's click handler on every
      // desktop nav click.
      onClick={() => onClicked?.(false)}
      aria-current={isActive ? 'page' : undefined}
      className={`group relative mb-0.5 flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/50 ${
        isBengali ? 'font-hind-siliguri' : 'font-roboto'
      } ${isActive ? 'bg-primary-100/70' : 'hover:bg-slate-100 active:bg-slate-200'}`}
    >
      {/* Clipped by the pill's own rounded corners, which tapers it at both ends. */}
      {isActive && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-primary-500"
        />
      )}
      <Icon
        size={20}
        strokeWidth={isActive ? 2.25 : 1.75}
        className={`shrink-0 transition-colors ${
          isActive ? 'text-primary-600' : 'text-slate-400 group-hover:text-primary-500'
        }`}
      />
      <span
        className={`min-w-0 flex-1 truncate text-base transition-colors ${
          isActive
            ? `font-semibold text-primary-700 ${isBengali ? 'font-hind-siliguri' : 'font-poppins'}`
            : 'text-text group-hover:text-slate-900'
        }`}
      >
        {t(item.labelKey)}
      </span>
      {badges}
    </Link>
  );
};

export const SideNav = ({ onClicked }) => {
  const { user, hasPermission } = useAuth();
  const { t, i18n } = useTranslation();
  const [googleAvatarError, setGoogleAvatarError] = useState(false);
  const isBengali = i18n.language?.startsWith('bn');

  const dispatch = useAppDispatch();
  const [logoutMutation] = useLogoutMutation();
  const navigate = useNavigate();
  const currentPath = useLocation().pathname;

  const roleSlug = user?.role?.slug;
  const isAdmin = roleSlug === 'web_owner' || roleSlug === 'staff' || roleSlug === 'developer';

  // Admin-only endpoint, so skip entirely for house owners and caretakers — otherwise every
  // one of their page loads would fire a request that can only come back 403.
  //
  // The role check alone was not enough: the endpoint also requires app_fees.view of staff,
  // so a staff member without it fired a guaranteed 403 on every page load and again on
  // every poll. Now that a 403 triggers a permission resync, that was a resync every five
  // minutes for an answer already known.
  const canSeeAppFees = isAdmin && (roleSlug !== 'staff' || hasPermission('app_fees.view'));

  const { data: appFeeBadges } = useGetAppFeeBadgeCountsQuery(undefined, {
    skip: !canSeeAppFees,
    // Was 5 minutes, which is 5 minutes of a badge insisting there is nothing to verify
    // after an owner has reported a payment.
    pollingInterval: 60 * 1000,
    skipPollingIfUnfocused: true,
  });

  const handleLogout = async () => {
    try {
      await push.unsubscribeUser();
      await logoutMutation().unwrap();
      // A saved dashboard is one household's finances. The next person to sign in on a
      // shared phone must not be shown it.
      clearOffline();
      dispatch(logoutAction());
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Items may also name a permission. The nav could only filter by role before, so a staff
  // member saw links to pages their permissions would refuse — and the route guard met them
  // with Access Denied, which reads as a broken app rather than a boundary.
  //
  // Not memoised: it is a dozen objects, and the permission list is resynced at runtime by
  // the 403 handler, so a stale memo would keep showing a link that has just been revoked.
  const filteredNavItems = NAV_ITEMS.filter((item) => {
    if (item.roles && !(roleSlug && item.roles.includes(roleSlug))) return false;
    if (item.permission && !hasPermission(item.permission)) return false;
    return true;
  });

  // One winner, chosen across the whole list, instead of asking each entry in isolation
  // whether it likes the URL. Asking in isolation is what let two entries answer yes at the
  // same time; a single winner cannot, by construction — which is the point, since the next
  // entry someone adds would otherwise reopen the same bug. Scored over the *filtered* list
  // so an entry this user cannot see never takes the highlight from one they can.
  const activePath = filteredNavItems.reduce(
    (best, item) => {
      const score = navMatchScore(item, normalisePath(currentPath));
      return score > best.score ? { score, path: item.path } : best;
    },
    { score: 0, path: null }
  ).path;

  // Groups with nothing in them after role and permission filtering are dropped, so nobody
  // is shown a heading over empty space.
  const visibleGroups = NAV_GROUPS
    .map((group) => ({ ...group, items: filteredNavItems.filter((i) => i.group === group.key) }))
    .filter((group) => group.items.length > 0);

  // A single heading over the whole list names nothing — it only takes a row of height.
  const showHeadings = visibleGroups.length > 1;

  return (
    <>
      <div>
        {/* Clears the fixed header. Its height is the grid's first row in Layout, kept in
            rem so it tracks the header's h-16 when the root font scale changes. */}
      </div>

      {/* min-h-0 is what actually lets this scroll: it sits in a 1fr grid row, and a grid
          item's automatic minimum size is its content, so an eighteen-item list grew the row
          instead of scrolling inside it and pushed the footer off-screen. */}
      <div className="min-h-0 overflow-y-auto px-2 pb-2">
        {visibleGroups.map((group) => (
          <div key={group.key}>
            {showHeadings && (
              <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {t(group.labelKey)}
              </p>
            )}
            {group.items.map((item) => (
              <NavRow
                key={item.path}
                item={item}
                isActive={item.path === activePath}
                isBengali={isBengali}
                onClicked={onClicked}
                t={t}
                badges={
                  item.path === '/app-fee' && isAdmin ? <AppFeeBadges counts={appFeeBadges} /> : null
                }
              />
            ))}
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 bg-white px-3 pt-3 pb-2 w-full max-w-full overflow-x-clip">
        <div className="pb-3 flex justify-end md:hidden">
          <LanguageSwitcher />
        </div>

        <div className="flex items-center gap-3 mb-3 max-w-full">
          <div className="min-w-10 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold overflow-clip ring-2 ring-primary-100">
            {user?.metadata?.avatarPath ? (
              <ProtectedImage
                src={user.metadata.avatarPath}
                alt={user?.name}
                className="w-full h-full object-cover"
                fallback={<span className="text-sm">{user?.name?.charAt(0)?.toUpperCase() || '?'}</span>}
              />
            ) : user?.avatarUrl && !googleAvatarError ? (
              <img
                src={user.avatarUrl}
                alt={user?.name}
                className="w-full h-full object-cover"
                onError={() => setGoogleAvatarError(true)}
              />
            ) : (
              <span className="text-sm">{user?.name?.charAt(0)?.toUpperCase() || '?'}</span>
            )}
          </div>
          {/* min-w-0, not w-min. `w-min` is width:min-content, which for a run of text is the
              width of its longest unbreakable word — and an email address has no break
              opportunities, so this box grew to fit the whole address and pushed past the
              sidebar. The overflow rules on the paragraphs never fired because the box was
              never too small; the panel was. A flex child also defaults to min-width:auto and
              refuses to shrink below its content, so min-w-0 is what actually permits the
              truncation, and flex-1 lets it take the space the avatar leaves. */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800" title={user?.name}>
              {user?.name || 'User'}
            </p>
            <p className="truncate text-xs text-subdued" title={user?.email}>{user?.email}</p>
          </div>
        </div>

        {/* Was a full-width saturated red bar, which made signing out the loudest thing in
            the panel. Still unmistakably destructive, no longer shouting. */}
        <button
          onClick={handleLogout}
          className="w-full inline-flex items-center justify-center gap-2 py-2 rounded-xl border border-red-200 bg-red-50 text-sm font-medium text-red-700 cursor-pointer outline-none transition-colors hover:bg-red-100 hover:border-red-300 focus-visible:ring-2 focus-visible:ring-red-400/50"
        >
          <LogOut className="h-4 w-4 shrink-0" strokeWidth={2} />
          {t('logout')}
        </button>
        <p className="text-center text-[11px] text-gray-400 mt-1.5">v{__APP_VERSION__}</p>
      </div>
    </>
  );
};

export default memo(SideNav);
