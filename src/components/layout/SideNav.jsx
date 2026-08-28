import {
  BellDot,
  BellRing,
  BookUser,
  CircleUser,
  Wallet,
  FileClock,
  FileText,
  House,
  Landmark,
  Layout,
  LayoutDashboard,
  SettingsIcon,
  Users,
  UserCheck,
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
 */
const NAV_ITEMS = [
  { path: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard, toMatch: ["/admin/generate-token"] },
  {
    path: "/houses",
    labelKey: "houses",
    icon: House,
    roles: ["developer", "web_owner", "staff", "house_owner", "caretaker"],
    // /flats/:id has no entry of its own and belongs here. The two entries alongside it
    // were "houses" and "/houses/create", both already covered by the /houses prefix.
    toMatch: ["/flats"],
  },
  {
    path: "/notification",
    labelKey: "notification",
    icon: BellDot,
    roles: ["developer", "web_owner", "staff", "house_owner"],
  },
  { path: "/profile", labelKey: "profile", icon: CircleUser },
  { path: "/admin/staff", labelKey: "staffs", icon: Users, roles: ["developer", "web_owner"] },
  { path: "/staff/audit-logs", labelKey: "audit_logs", icon: FileClock, roles: ["developer", "web_owner"] },
  {
    path: "/staff/user-approvals",
    labelKey: "caretaker_requests",
    icon: UserCheck,
    roles: ["developer", "web_owner", "staff"],
    // Staff need the same capability the approve endpoint enforces.
    permission: "caretakers.create",
  },
  {
    path: "/caretakers",
    labelKey: "caretakers",
    icon: UsersRound,
    // A caretaker belongs here too — it is where they see their own assignments.
    roles: ["developer", "web_owner", "staff", "house_owner", "caretaker"],
  },
  {
    path: "/admin/house-owners",
    labelKey: "house_owners",
    icon: BookUser,
    roles: ["developer", "web_owner", "staff"],
    // Staff need users.view for this; without it the page is an Access Denied.
    permission: "users.view",
  },
  {
    path: "/renters",
    labelKey: "renters",
    icon: Users,
    roles: ["developer", "web_owner", "staff", "house_owner", "caretaker"],
    // Same permission the route and the endpoint require, so the link is not offered to
    // somebody it would only refuse.
    permission: "renters.view",
  },
  {
    path: "/expenses",
    labelKey: "expenses",
    icon: FileText,
    roles: ["developer", "web_owner", "staff", "house_owner", "caretaker"],
  },
  {
    path: "/app-fee",
    labelKey: "app_fee",
    icon: Wallet,
    roles: ["developer", "web_owner", "staff", "house_owner", "caretaker"],
  },
  {
    path: "/loans",
    labelKey: "loans",
    icon: Landmark,
    roles: ["developer", "web_owner", "staff", "house_owner", "caretaker"],
  },
  {
    path: "/reports",
    labelKey: "reports",
    icon: FileText,
    roles: ["developer", "web_owner", "staff", "house_owner", "caretaker"],
  },
  {
    path: "/admin/notification-settings",
    labelKey: "notification_settings",
    icon: BellRing,
    roles: ["developer", "web_owner"],
  },
  { path: "/admin/settings", labelKey: "settings", icon: SettingsIcon, roles: ["developer", "web_owner"] },
  { path: "/admin/landing-editor", labelKey: "landing_editor", icon: Layout, roles: ["web_owner"] },
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
      className: 'bg-red-100 text-red-700 group-hover:bg-white/90 group-hover:text-red-700',
      title: t('badge_no_active_subscription', { count: notEnabled }),
    },
    pendingVerification > 0 && {
      key: 'pendingVerification',
      value: pendingVerification,
      className: 'bg-amber-100 text-amber-800 group-hover:bg-white/90 group-hover:text-amber-800',
      title: t('badge_awaiting_verification', { count: pendingVerification }),
    },
  ].filter(Boolean);

  return (
    <span className={`flex items-center gap-1 ${collapsed ? '' : 'ml-auto'}`}>
      {pills.map((p) => (
        <span
          key={p.key}
          title={p.title}
          className={`min-w-5 px-1.5 h-5 inline-flex items-center justify-center rounded-full text-[11px] font-semibold transition-colors ${p.className}`}
        >
          {p.value > 99 ? '99+' : p.value}
        </span>
      ))}
    </span>
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

  return (
    <>
      <div>
        {/* for escaping the spacing of header */}
      </div>
      <div className="max-h-min overflow-y-auto">
        {filteredNavItems.map((item) => {
          const isActive = item.path === activePath;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              // Optional call: Layout renders the desktop sidebar as <SideNav /> with no
              // props, so an unguarded onClicked(false) threw a TypeError inside the Link's
              // click handler on every desktop nav click.
              onClick={() => onClicked?.(false)}
              className={`flex ${isBengali ? 'font-hind-siliguri' : 'font-roboto'} group items-center gap-3 px-5 py-2 md:py-3 text-text hover:bg-primary hover:text-white duration-300 transition-colors aria-[current=page]:bg-primary aria-[current=page]:text-white ${
                isActive ? "bg-slate-100" : ""
              }`}
            >
              <span
                className={`text-xl text-primary p-1 group-hover:text-white duration-300 transition-colors ${
                  isActive ? "text-white bg-primary-500 rounded-lg" : ""
                }`}
              >
                <Icon />
              </span>
              <span
                className={`group-hover:text-white ${
                  isActive ? `font-bold text-primary ${isBengali ? 'font-hind-siliguri' : 'font-poppins'}` : ""
                }`}
              >
                {t(item.labelKey)}
              </span>
              {item.path === '/app-fee' && isAdmin && <AppFeeBadges counts={appFeeBadges} />}
            </Link>
          );
        })}
      </div>

      <div className="px-5 pt-5 border-t shadow-[0_-5px_5px_rgba(0,0,0,0.1)] border-gray-200 w-full max-w-full pb-1 bg-white overflow-x-clip">
        <div className="pb-2 flex justify-end md:hidden">
          <LanguageSwitcher />
        </div>
        <div className="flex items-center gap-3 mb-4 max-w-full">
          <div className="min-w-10 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold overflow-clip">
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
            <p className="truncate font-medium" title={user?.name}>{user?.name || 'User'}</p>
            <p className="truncate text-xs text-subdued" title={user?.email}>{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full py-2 bg-red-500 text-white border-none rounded-lg cursor-pointer hover:bg-red-600 transition-colors"
        >
          {t('logout')}
        </button>
        <p className="text-center text-xs text-gray-400 mt-1">v{__APP_VERSION__}</p>
      </div>
    </>
  );
};

export default memo(SideNav);
