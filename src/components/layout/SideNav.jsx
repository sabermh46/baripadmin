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
import { useAuth } from "../../hooks";
import { Link, useLocation } from "react-router-dom";

export const SideNav = () => {
  const { user } = useAuth();
  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
    {
      path: "/houses",
      label: "Houses",
      icon: <House />,
      roles: ["web_owner", "house_owner"],
      toMatch: ["/admin/generate-token"]
    },
    {
      path: "/notification",
      label: "Notification",
      icon: <BellDot />,
      roles: ["web_owner", "staff", "house_owner"],
    },
    { path: "/profile", label: "Profile", icon: <CircleUser /> },
    {
      path: "/staffs",
      label: "Staffs",
      icon: <Users />,
      roles: ["web_owner"],
    },
    {
      path: "/caretakers",
      label: "Caretakers",
      icon: <UsersRound />,
      roles: ["web_owner", "staff", "house_owner"],
    },
    {
      path: "/admin/users",
      label: "House Owners",
      icon: <BookUser />,
      roles: ["web_owner", "staff"],
    },
    {
      path: "/admin/settings",
      label: "Settings",
      icon: <SettingsIcon />,
      roles: ["web_owner"],
    },
  ];

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    if (!user?.role?.slug) return false;
    return item.roles.includes(user.role.slug);
  });

  // now we will detect the acive route and highlight it
  const currentPath = useLocation().pathname;
  console.log(currentPath);

  return (
    <>
      {filteredNavItems.map((item) => {
        const isActive = currentPath === item.path || (item.toMatch && item.toMatch.includes(currentPath));

        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex font-mooli group items-center gap-3 px-5 py-3 text-text hover:bg-primary hover:text-white duration-300 transition-colors aria-[current=page]:bg-primary aria-[current=page]:text-white ${
              isActive ? "bg-slate-100" : ""
            }`}
          >
            <span
              className={`text-xl text-primary p-1 group-hover:text-white duration-300 transition-colors 
                        ${
                          isActive
                            ? "text-white bg-primary-500 rounded-full"
                            : ""
                        }`}
            >
              {item.icon}
            </span>
            <span className={`group-hover:text-white ${isActive ? "font-bold text-primary" : ""}`}
            >{item.label}</span>
          </Link>
        );
      })}
    </>
  );
};

export default SideNav;
