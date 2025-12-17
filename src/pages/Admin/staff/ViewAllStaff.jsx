import React, { useEffect, useState } from "react";
import {
  useGetStaffDetailsQuery,
  useGetStaffListQuery,
} from "../../../store/api/staffApi";
import MobileResponsiveTable from "../../../components/common/MobileResponsiveTable";
import Modal from "../../../components/common/Modal";
import {
  Search,
  User,
  Mail,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Key,
  Activity,
  History,
  ShieldEllipsis,
  Copy,
} from "lucide-react";
import StaffActivity from "../../../components/admin/Staff/StaffActivity";
import PermissionHistory from "../../../components/admin/Staff/PermissionHistory";
import BulkPermissionManager from "../../../components/admin/Staff/BulkPermissionManager";
import CopyPermissions from "../../../components/admin/Staff/CopyPermissions";
import { toast } from "react-toastify";
import Table from "../../../components/common/Table";

const ViewAllStaff = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [bulkManagerOpen, setBulkManagerOpen] = useState(false);
  const [copyPermissionsOpen, setCopyPermissionsOpen] = useState(false);

  const limit = 10;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  // Staff list
  const { data, isLoading, isError, refetch } = useGetStaffListQuery({
    search: debouncedSearch,
    page,
    limit,
  });

  // Staff details (on click)
  const { data: staffDetails, isLoading: isStaffDetailsLoading } =
    useGetStaffDetailsQuery(selectedStaff?.id, {
      skip: !selectedStaff?.id,
    });

  const staffList = data?.data || [];
  const pagination = data?.pagination;

  const handleViewStaff = (staff) => {
    setSelectedStaff(staff);
  };


  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </span>
        );
      case "inactive":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <XCircle className="h-3 w-3 mr-1" />
            Inactive
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            {status}
          </span>
        );
    }
  };

  const getAvatar = (staff) => {
    if (staff.avatarUrl) {
      return (
        <img
          src={staff.avatarUrl}
          alt={staff.name}
          className="w-8 h-8 rounded-full object-cover"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src =
              "https://ui-avatars.com/api/?name=" +
              encodeURIComponent(staff.name) +
              "&background=random";
          }}
        />
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
        <User className="h-4 w-4 text-primary-600" />
      </div>
    );
  };

  useEffect(() => {
    console.log(staffDetails);
  }, [staffDetails]);

  const actionButtons = [
    {
      label: "View Activity",
      icon: <Activity className="h-4 w-4" />,
      onClick: (staff) => {
        setSelectedStaff(staff);
        setActivityModalOpen(true);
      },
      color: "text-blue-600 hover:text-blue-800",
    },
    {
      label: "Permission History",
      icon: <History className="h-4 w-4" />,
      onClick: (staff) => {
        setSelectedStaff(staff);
        setHistoryModalOpen(true);
      },
      color: "text-purple-600 hover:text-purple-800",
    },
    {
      label: "Manage Permissions",
      icon: <ShieldEllipsis className="h-4 w-4" />,
      onClick: (staff) => {
        setSelectedStaff(staff);
        setBulkManagerOpen(true);
      },
      color: "text-green-600 hover:text-green-800",
    },
    {
      label: "Copy Permissions",
      icon: <Copy className="h-4 w-4" />,
      onClick: (staff) => {
        setSelectedStaff(staff);
        setCopyPermissionsOpen(true);
      },
      color: "text-indigo-600 hover:text-indigo-800",
    }
  ];
  // Table columns definition
  const columns = [
    {
      title: "Staff Member",
      dataIndex: "name",
      key: "name",
      render: (staff) => (
        <div className="flex items-center gap-3">
          {getAvatar(staff)}
          <div className="min-w-0">
            <div className="font-medium text-gray-900 truncate">
              {staff.name}
            </div>
            <div className="text-sm text-gray-500 truncate">{staff.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (staff) => getStatusBadge(staff.status),
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (staff) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Shield className="h-3 w-3 mr-1" />
          {staff.role || "Staff"}
        </span>
      ),
    },
    {
      title: "Reports To",
      key: "parent",
      render: (staff) => (
        <div className="text-sm">
          {staff.parent ? (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" />
              <span>{staff.parent.name}</span>
            </div>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      ),
    },
    {
      title: "Last Active",
      key: "lastLogin",
      render: (staff) => (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="h-4 w-4" />
          {formatDate(staff.lastLoginAt)}
        </div>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (staff) => (
        <div className="flex items-center gap-2">
          {actionButtons.map((button) => (
            <button
              key={button.label}
              onClick={(e) => {
                e.stopPropagation();
                button.onClick(staff);
              }}
              className={`p-1.5 ${button.color} hover:bg-gray-50 rounded-lg transition`}
              title={button.label}
            >
              {button.icon}
            </button>
          ))}
        </div>
      ),
    },
  ];

  // Handle pagination
  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <XCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Failed to load staff
          </h3>
          <p className="text-red-600 mb-4">
            Unable to fetch staff list. Please try again.
          </p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Retry
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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Staff Management
          </h1>
          <p className="text-gray-600 mt-2">
            View and manage all staff members and their permissions
          </p>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 w-full md:w-80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
          />
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Total Staff</p>
              <p className="text-2xl font-semibold text-gray-900">
                {pagination?.total || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-2xl font-semibold text-gray-900">
                {staffList.filter((s) => s.status === "active").length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-3 bg-primary-50 rounded-lg">
              <Key className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Avg. Permissions</p>
              <p className="text-2xl font-semibold text-gray-900">
                {staffList.length > 0
                  ? Math.round(
                      staffList.reduce(
                        (acc, s) => acc + (s.totalPermissions || 0),
                        0
                      ) / staffList.length
                    )
                  : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 md:p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Staff Members
            </h2>
            <button
              onClick={refetch}
              className="flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              <Activity className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>

          <Table
          columns={columns}
          data={staffList}
           />

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Showing {(page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, pagination.total)} of {pagination.total}{" "}
                results
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => handlePageChange(page - 1)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from(
                    { length: Math.min(5, pagination.totalPages) },
                    (_, i) => {
                      let pageNum;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`w-10 h-10 rounded-lg text-sm font-medium transition ${
                            page === pageNum
                              ? "bg-primary-600 text-white"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                  )}
                </div>
                <button
                  disabled={page === pagination.totalPages}
                  onClick={() => handlePageChange(page + 1)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>


      {selectedStaff && (
        <>
          <StaffActivity
            staffId={selectedStaff.id}
            staffName={selectedStaff.name}
            isOpen={activityModalOpen}
            onClose={() => setActivityModalOpen(false)}
          />

          <PermissionHistory
            staffId={selectedStaff.id}
            staffName={selectedStaff.name}
            isOpen={historyModalOpen}
            onClose={() => setHistoryModalOpen(false)}
          />

          <BulkPermissionManager
            staffId={selectedStaff.id}
            staffName={selectedStaff.name}
            isOpen={bulkManagerOpen}
            onClose={() => setBulkManagerOpen(false)}
            onSuccess={() => {
              refetch();
            }}
          />

          <CopyPermissions
            sourceStaffId={selectedStaff.id}
            sourceStaffName={selectedStaff.name}
            isOpen={copyPermissionsOpen}
            onClose={() => setCopyPermissionsOpen(false)}
            onSuccess={() => {
              refetch();
            }}
          />
        </>
      )}
    </div>
  );
};

export default ViewAllStaff;
