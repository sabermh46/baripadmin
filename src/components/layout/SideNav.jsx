import {
  BellDot,
  BookUser,
  CircleUser,
  House,
  LayoutDashboard,
  SettingsIcon,
  Users,
  UsersRound,
} from "lucide-react";
import { useAppDispatch, useAuth } from "../../hooks";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLogoutMutation } from "../../store/api/authApi";
import { logout as logoutAction } from '../../store/slices/authSlice';
import usePushNotifications from "../../hooks/usePushNotifications";
import { appLogo } from "../../assets";

export const SideNav = ({ isMobileMenuOpen = false, onClicked }) => {
  const { user } = useAuth();

    const { unsubscribe, subscription } = usePushNotifications();
  const dispatch = useAppDispatch();
  const [logoutMutation] = useLogoutMutation();
  const navigate = useNavigate();
  const handleLogout = async () => {
    try {
      await unsubscribe();
      
      await logoutMutation().unwrap();
      dispatch(logoutAction());
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: <LayoutDashboard />, toMatch: ["/admin/generate-token"] },
    {
      path: "/houses",
      label: "Houses",
      icon: <House />,
      roles: ["developer", "web_owner", "staff", "house_owner"],
      toMatch: ["houses", "/houses/create", "/house-owners/houses"]
      
    },
    {
      path: "/notification",
      label: "Notification",
      icon: <BellDot />,
      roles: ["developer", "web_owner", "staff", "house_owner"],
    },
    { path: "/profile", label: "Profile", icon: <CircleUser /> },
    {
      path: "/admin/staff",
      label: "Staffs",
      icon: <Users />,
      roles: ["developer", "web_owner"],
    },
    {
      path: "/caretakers",
      label: "Caretakers",
      icon: <UsersRound />,
      roles: ["developer", "web_owner", "staff", "house_owner"],
    },
    {
      path: "/admin/house-owners",
      label: "House Owners",
      icon: <BookUser />,
      roles: ["developer", "web_owner", "staff"],
    },
    {
      path: "/admin/settings",
      label: "Settings",
      icon: <SettingsIcon />,
      roles: ["developer", "web_owner"],
    },
  ];

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    if (!user?.role?.slug) return false;
    return item.roles.includes(user.role.slug);
  });

  // now we will detect the acive route and highlight it
  const currentPath = useLocation().pathname;

  return (
    <>

      <div className="h-auto flex-1 overflow-y-auto pb-30 mt-14">
        {filteredNavItems.map((item) => {
          let isActive = currentPath === item.path || (item.toMatch && item.toMatch.includes(currentPath));
          if(!isActive) {
            const path1 = currentPath.split('/')[1];
            isActive = item.toMatch?.some(tm => tm.includes(path1));
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={()=>onClicked(false)}
              className={`flex font-mooli group items-center gap-3 px-5 py-2 md:py-3 text-text hover:bg-primary hover:text-white duration-300 transition-colors aria-[current=page]:bg-primary aria-[current=page]:text-white ${
                isActive ? "bg-slate-100" : ""
              }`}
            >
              <span
                className={`text-xl text-primary p-1 group-hover:text-white duration-300 transition-colors 
                          ${
                            isActive
                              ? "text-white bg-primary-500 rounded-lg"
                              : ""
                          }`}
              >
                {item.icon}
              </span>
              <span className={`group-hover:text-white ${isActive ? "font-bold text-primary font-poppins" : ""}`}
              >{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="px-5 pt-5 border-t border-gray-200 absolute w-full max-w-full pb-5 bottom-0 bg-white overflow-x-clip">
                <div className="flex items-center gap-3 mb-4 max-w-full">
                  <div className="min-w-10 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold overflow-clip">
                    <img src={user?.avatarUrl} alt={user?.name} className="w-full h-full object-cover" />
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
                  Logout
                </button>
              </div>
    </>
  );
};

export default SideNav;
