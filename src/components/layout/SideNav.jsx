import {
  BellDot,
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
  UsersRound,
} from "lucide-react";
import { useState, useMemo, memo } from "react";
import { useAppDispatch, useAuth } from "../../hooks";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLogoutMutation } from "../../store/api/authApi";
import { useGetAppFeeBadgeCountsQuery } from "../../store/api/appFeeApi";
import { logout as logoutAction } from '../../store/slices/authSlice';
import push from "../../services/push";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../common/LanguageSwitcher";
import ProtectedImage from "../common/ProtectedImage";

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
    toMatch: ["houses", "/houses/create", "/flats"],
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
    path: "/caretakers",
    labelKey: "caretakers",
    icon: UsersRound,
    roles: ["developer", "web_owner", "staff", "house_owner"],
  },
  {
    path: "/admin/house-owners",
    labelKey: "house_owners",
    icon: BookUser,
    roles: ["developer", "web_owner", "staff"],
  },
  {
    path: "/renters",
    labelKey: "renters",
    icon: Users,
    roles: ["developer", "web_owner", "staff", "house_owner", "caretaker"],
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
  { path: "/admin/settings", labelKey: "settings", icon: SettingsIcon, roles: ["developer", "web_owner"] },
  { path: "/admin/landing-editor", labelKey: "landing_editor", icon: Layout, roles: ["web_owner"] },
];

/**
 * `/houses/5` should light up the "Houses" entry, so a match on the first path segment
 * counts. Guarded against an empty segment: on "/" the segment is "", and
 * `"houses".includes("")` is true for every entry, which lit up several items at once.
 */
const isItemActive = (item, currentPath) => {
  if (currentPath === item.path) return true;
  if (!item.toMatch) return false;
  if (item.toMatch.includes(currentPath)) return true;

  const segment = currentPath.split("/")[1];
  if (!segment) return false;

  return item.toMatch.some((tm) => tm.includes(segment));
};

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
  const { user } = useAuth();
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
  const { data: appFeeBadges } = useGetAppFeeBadgeCountsQuery(undefined, {
    skip: !isAdmin,
    pollingInterval: 5 * 60 * 1000,
  });

  const handleLogout = async () => {
    try {
      await push.unsubscribeUser();
      await logoutMutation().unwrap();
      dispatch(logoutAction());
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const filteredNavItems = useMemo(
    () => NAV_ITEMS.filter((item) => !item.roles || (roleSlug && item.roles.includes(roleSlug))),
    [roleSlug]
  );

  return (
    <>
      <div>
        {/* for escaping the spacing of header */}
      </div>
      <div className="max-h-min overflow-y-auto">
        {filteredNavItems.map((item) => {
          const isActive = isItemActive(item, currentPath);
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
          <div className='w-min'>
            <p className="line-clamp-1 text-ellipsis overflow-hidden font-medium" title={user?.name}>{user?.name || 'User'}</p>
            <p className="line-clamp-1 text-ellipsis overflow-hidden text-xs text-subdued" title={user?.email}>{user?.email}</p>
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
