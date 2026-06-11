import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Search,
  Shield,
  Clock,
  User,
  FileClock,
  X,
  RotateCcw,
  Eye,
} from "lucide-react";
import {
  useGetAuditLogsQuery,
  useGetAuditLogFacetsQuery,
} from "../../../store/api/auditLogApi";
import Table from "../../../components/common/Table";
import Modal from "../../../components/common/Modal";

const CATEGORY_COLORS = {
  auth: "bg-blue-100 text-blue-800",
  financial: "bg-green-100 text-green-800",
  permission: "bg-purple-100 text-purple-800",
  user_mgmt: "bg-amber-100 text-amber-800",
  mutation: "bg-gray-100 text-gray-700",
};

const EMPTY_FILTERS = {
  actorEmail: "",
  entityType: "",
  action: "",
  actionCategory: "",
  status: "",
  startDate: "",
  endDate: "",
};

const AuditLogs = () => {
  const { t } = useTranslation();
  const limit = 20;

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [actorEmailInput, setActorEmailInput] = useState("");
  const [selected, setSelected] = useState(null);

  // Debounce the free-text actor email search.
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setFilters((prev) => ({ ...prev, actorEmail: actorEmailInput }));
    }, 500);
    return () => clearTimeout(timer);
  }, [actorEmailInput]);

  const { data: facetsData } = useGetAuditLogFacetsQuery();
  const facets = facetsData?.data || { entityTypes: [], actions: [], categories: [] };

  const { data, isLoading, isFetching, refetch } = useGetAuditLogsQuery({
    ...filters,
    page,
    limit,
  });

  const logs = data?.data || [];
  const pagination = data?.pagination;

  const handleFilterChange = (key) => (e) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const clearFilters = () => {
    setPage(1);
    setFilters(EMPTY_FILTERS);
    setActorEmailInput("");
  };

  const hasActiveFilters =
    actorEmailInput ||
    Object.values(filters).some((v) => v !== "");

  const formatDate = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const categoryBadge = (category) => (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        CATEGORY_COLORS[category] || "bg-gray-100 text-gray-700"
      }`}
    >
      {category}
    </span>
  );

  const statusBadge = (status) => (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        status === "failure"
          ? "bg-red-100 text-red-800"
          : "bg-green-100 text-green-800"
      }`}
    >
      {status}
    </span>
  );

  const columns = [
    {
      title: t("time"),
      key: "createdAt",
      render: (row) => (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="h-4 w-4 text-gray-400" />
          {formatDate(row.createdAt)}
        </div>
      ),
    },
    {
      title: t("actor"),
      key: "actor",
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-gray-900 truncate">
              {row.actorName || row.actorEmail || t("unknown") || "—"}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {row.actorRole || "—"}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: t("action"),
      key: "action",
      render: (row) => (
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs text-gray-800">{row.action}</span>
          {categoryBadge(row.actionCategory)}
        </div>
      ),
    },
    {
      title: t("entity_type"),
      key: "entity",
      render: (row) => (
        <span className="text-sm text-gray-700">
          {row.entityType}
          {row.entityId ? <span className="text-gray-400"> #{row.entityId}</span> : null}
        </span>
      ),
    },
    {
      title: t("status"),
      key: "status",
      render: (row) => statusBadge(row.status),
    },
    {
      title: t("actions"),
      key: "view",
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSelected(row);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
        >
          <Eye size={16} />
          {t("view_details")}
        </button>
      ),
    },
  ];

  const tablePagination = pagination
    ? {
        current: pagination.page,
        total: pagination.total,
        totalPages: pagination.pages,
        pageSize: pagination.limit,
      }
    : null;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FileClock className="h-7 w-7 text-primary" />
            {t("audit_logs")}
          </h1>
          <p className="text-gray-600 mt-2">{t("audit_log_management")}</p>
        </div>
        <button
          onClick={refetch}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 w-fit"
        >
          <RotateCcw className="h-4 w-4" />
          {t("refresh")}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Actor email search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={t("search_by_name_or_email")}
              value={actorEmailInput}
              onChange={(e) => setActorEmailInput(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm"
            />
          </div>

          {/* Entity type */}
          <select
            value={filters.entityType}
            onChange={handleFilterChange("entityType")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm"
          >
            <option value="">{t("entity_type")}</option>
            {facets.entityTypes.map((et) => (
              <option key={et} value={et}>{et}</option>
            ))}
          </select>

          {/* Action */}
          <select
            value={filters.action}
            onChange={handleFilterChange("action")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm"
          >
            <option value="">{t("action")}</option>
            {facets.actions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {/* Category */}
          <select
            value={filters.actionCategory}
            onChange={handleFilterChange("actionCategory")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm"
          >
            <option value="">{t("category")}</option>
            {facets.categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Status */}
          <select
            value={filters.status}
            onChange={handleFilterChange("status")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm"
          >
            <option value="">{t("status")}</option>
            <option value="success">success</option>
            <option value="failure">failure</option>
          </select>

          {/* Date range */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t("from_date")}</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={handleFilterChange("startDate")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t("to_date")}</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={handleFilterChange("endDate")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm"
            />
          </div>

          {hasActiveFilters && (
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={16} />
                {t("clear_filters")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={logs}
        loading={isLoading || isFetching}
        emptyMessage={t("no_audit_logs")}
        rowKey="id"
        showPagination={!!tablePagination && tablePagination.totalPages > 1}
        pagination={tablePagination}
        onPageChange={(p) => setPage(p)}
        onRowClick={(row) => setSelected(row)}
      />

      {/* Detail modal */}
      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={
          <div className="flex items-center gap-2 text-base md:text-lg">
            <Shield className="h-5 w-5 text-primary" />
            {selected?.action} — {selected?.entityType}
          </div>
        }
        subtitle={selected ? formatDate(selected.createdAt) : ""}
        size="lg"
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Detail label={t("actor")} value={`${selected.actorName || "—"} (${selected.actorEmail || "—"})`} />
              <Detail label={t("role")} value={selected.actorRole || "—"} />
              <Detail label={t("entity_type")} value={`${selected.entityType}${selected.entityId ? ` #${selected.entityId}` : ""}`} />
              <Detail label={t("category")} value={selected.actionCategory} />
              <Detail label={t("status")} value={selected.status} />
              <Detail label="IP" value={selected.ipAddress || "—"} />
            </div>

            {selected.reason && (
              <Detail label={t("reason") || "Reason"} value={selected.reason} />
            )}

            {selected.changes && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-1">{t("before")} / {t("after")}</h4>
                <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs overflow-x-auto max-h-64">
                  {JSON.stringify(selected.changes, null, 2)}
                </pre>
              </div>
            )}

            {selected.metadata && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-1">Metadata</h4>
                <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs overflow-x-auto max-h-64">
                  {JSON.stringify(selected.metadata, null, 2)}
                </pre>
              </div>
            )}

            {selected.userAgent && (
              <Detail label="User Agent" value={selected.userAgent} />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

const Detail = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-gray-900 break-words">{value}</p>
  </div>
);

export default AuditLogs;
