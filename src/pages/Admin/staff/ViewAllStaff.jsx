import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useGetStaffListQuery } from "../../../store/api/staffApi";
import ProtectedImage from "../../../components/common/ProtectedImage";
import {
  Search,
  User,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Key,
  Activity,
  ChevronRight,
  UserPlus,
} from "lucide-react";
import CreateStaffModal from "../../../components/admin/Staff/CreateStaffModal";
import { useTranslation } from "react-i18next";
import { apiErrorMessage } from "../../../utils/apiError";
import { showMessageInLanguage } from "../../../utils/showMessageInLanguage";

const STATUS_TONE = {
  active: { badge: "bg-green-100 text-green-800", strip: "bg-green-500" },
  inactive: { badge: "bg-gray-100 text-gray-700", strip: "bg-gray-300" },
  suspended: { badge: "bg-red-100 text-red-700", strip: "bg-red-500" },
};

const ViewAllStaff = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createStaffOpen, setCreateStaffOpen] = useState(false);

  const { t } = useTranslation();
  const limit = 12;

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isError, error, refetch } = useGetStaffListQuery({
    search: debouncedSearch,
    page,
    limit,
  });

  const staffList = data?.data || [];
  const pagination = data?.pagination;

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    return Number.isNaN(d.getTime())
      ? dateString
      : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <XCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to load staff</h3>
          <p className="text-red-600 mb-4">
            {showMessageInLanguage(apiErrorMessage(error, "Unable to fetch the staff list."))}
          </p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            {t("retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t("staff_management")}</h1>
          <p className="text-gray-600 mt-2">
            {t("view_and_manage_all_staff_members_and_their_permissions")}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={t("search_by_name_or_email")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-full md:w-80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
            />
          </div>
          <button
            type="button"
            onClick={() => setCreateStaffOpen(true)}
            className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            <UserPlus size={18} />
            {t("create_staff")}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { icon: Users, tone: "bg-blue-50 text-blue-600", label: t("total_staff"), value: pagination?.total || 0 },
          {
            icon: CheckCircle,
            tone: "bg-green-50 text-green-600",
            label: t("active"),
            value: staffList.filter((s) => s.status === "active").length,
          },
          {
            icon: Key,
            tone: "bg-primary-50 text-primary-600",
            label: t("avg_permissions"),
            value: staffList.length
              ? Math.round(staffList.reduce((acc, s) => acc + (s.totalPermissions || 0), 0) / staffList.length)
              : 0,
          },
        ].map(({ icon: Icon, tone, label, value }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className={`p-3 rounded-lg shrink-0 ${tone}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-gray-500 truncate">{label}</p>
                <p className="text-2xl font-semibold text-gray-900">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900">{t("staff_members")}</h2>
        <button
          onClick={refetch}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <Activity className="h-4 w-4 mr-2" />
          {t("refresh")}
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-56 rounded-xl border border-gray-200 bg-white animate-pulse" />
          ))}
        </div>
      ) : staffList.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{t("no_staff_found")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {staffList.map((staff) => {
            const tone = STATUS_TONE[staff.status] || { badge: "bg-yellow-100 text-yellow-800", strip: "bg-yellow-400" };
            const perms = staff.permissions ?? [];

            return (
              // The whole card is the link. An admin's next move from this screen is almost
              // always "open this person", and a row of small icon buttons made them aim for
              // it — four targets that each did something different, none of them "open".
              <Link
                key={staff.id}
                to={`/admin/staff/${staff.id}`}
                className="group block bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-primary/40 transition-all overflow-hidden"
              >
                <div className={`h-1 ${tone.strip}`} />
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* The old list fell back to ui-avatars.com, sending each staff member's
                        name to a third party on every render to draw an initial. */}
                    <ProtectedImage
                      src={staff.avatarUrl}
                      alt={staff.name}
                      className="h-12 w-12 rounded-xl object-cover shrink-0"
                      fallback={
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 truncate group-hover:text-primary transition-colors">
                        {staff.name}
                      </p>
                      <p className="text-sm text-gray-500 truncate">{staff.email}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase shrink-0 ${tone.badge}`}>
                      {staff.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">
                      <Shield className="h-3 w-3" />
                      {staff.role || t("role")}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary">
                      <Key className="h-3 w-3" />
                      {staff.totalPermissions ?? perms.length} {t("permissions")}
                    </span>
                  </div>

                  {/* A few actual permission names, because "16 permissions" says how many
                      doors are open and nothing about which. */}
                  {perms.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {perms.slice(0, 3).map((p) => (
                        <span key={p.key} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-100 text-gray-600">
                          {p.key}
                        </span>
                      ))}
                      {perms.length > 3 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] text-gray-400">
                          +{perms.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">{t("reports_to")}</p>
                      <p className="text-xs font-medium text-gray-700 truncate">{staff.parent?.name || "—"}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">{t("last_active")}</p>
                      <p className="text-xs font-medium text-gray-700 truncate flex items-center gap-1">
                        <Clock className="h-3 w-3 text-gray-400 shrink-0" />
                        {formatDate(staff.lastLoginAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1 mt-3 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    {t("view_details")}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, pagination.total)} of{" "}
            {pagination.total} results
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) pageNum = i + 1;
                else if (page <= 3) pageNum = i + 1;
                else if (page >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
                else pageNum = page - 2 + i;

                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition ${
                      page === pageNum ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              disabled={page === pagination.totalPages}
              onClick={() => setPage(page + 1)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <CreateStaffModal
        isOpen={createStaffOpen}
        onClose={() => setCreateStaffOpen(false)}
        onSuccess={() => {
          setCreateStaffOpen(false);
          refetch();
        }}
      />
    </div>
  );
};

export default ViewAllStaff;
