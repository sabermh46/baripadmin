import React, { useState } from 'react';
import { Plus, Search, Eye, Pencil, Trash2 } from 'lucide-react';
import Table from '../../components/common/Table';
import Btn from '../../components/common/Button';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import {
  useGetAppFeePaymentsQuery,
  useDeleteAppFeePaymentMutation,
  useUpdateAppFeePaymentMutation,
  useGetAppFeeStatsQuery,
} from '../../store/api/appFeeApi';
import { useGetManagedOwnersQuery } from '../../store/api/houseApi';
import AppFeeCreateModal from './AppFeeCreateModal';
import AppFeeViewEditModal from './AppFeeViewEditModal';
import AppFeeOverview from './AppFeeOverview';
import AppFeeMetricModal from './AppFeeMetricModal';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

// Built from `t` inside the component rather than at module scope, so switching language
// re-labels the dropdowns instead of leaving them in the language loaded at import time.
const buildStatusOptions = (t) => [
  { value: '', label: t('all_statuses') },
  { value: 'pending', label: t('pending') },
  { value: 'paid', label: t('paid') },
  { value: 'overdue', label: t('overdue') },
  { value: 'cancelled', label: t('cancelled') },
];

const buildPaymentMethodOptions = (t) => [
  { value: '', label: t('all_methods') },
  { value: 'bank_transfer', label: t('bank_transfer') },
  { value: 'mobile_money', label: t('mobile_money') },
  { value: 'cash', label: t('cash') },
  { value: 'other', label: t('other') },
];

const formatDate = (d) => {
  if (!d) return '–';
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d;
  }
};

const AdminsAppFeePage = () => {
  const { t } = useTranslation();
  const STATUS_OPTIONS = buildStatusOptions(t);
  const PAYMENT_METHOD_OPTIONS = buildPaymentMethodOptions(t);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    payment_method: '',
    house_owner_id: '',
    start_date: '',
    end_date: '',
  });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewEditId, setViewEditId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  // Set by clicking the "Awaiting your verification" tile. Kept separate from `filters`
  // because it is not a plain column filter — it narrows to pending invoices the owner has
  // already claimed to have paid, which is a metadata flag rather than a status.
  const [quickFilter, setQuickFilter] = useState(null);
  // Which overview tile is expanded. Null keeps the breakdown query skipped, so none of the
  // eight endpoints is hit until an admin actually asks for one.
  const [openMetric, setOpenMetric] = useState(null);
  const [deletePayment, { isLoading: isDeleting }] = useDeleteAppFeePaymentMutation();
  const [updatePayment, { isLoading: isUpdating }] = useUpdateAppFeePaymentMutation();

  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;
    try {
      await deletePayment(deleteConfirmId).unwrap();
      toast.success(t('payment_deleted_successfully'));
      setDeleteConfirmId(null);
    } catch {
      // Error toast from mutation
    }
  };

  const listParams = {
    page,
    limit: 20,
    search: filters.search || undefined,
    status: filters.status || undefined,
    payment_method: filters.payment_method || undefined,
    house_owner_id: filters.house_owner_id ? Number(filters.house_owner_id) : undefined,
    start_date: filters.start_date || undefined,
    end_date: filters.end_date || undefined,
    awaiting_verification: quickFilter === 'awaiting_verification' ? 1 : undefined,
  };

  const { data: listResponse, isLoading } = useGetAppFeePaymentsQuery(listParams);
  const { data: statsResponse, isLoading: statsLoading } = useGetAppFeeStatsQuery();
  const { data: ownersResponse } = useGetManagedOwnersQuery(
    { search: '', page: 1, limit: 100 }
  );

  // Filtering happens server-side (`awaiting_verification`) so the pagination totals stay
  // honest — narrowing the fetched page client-side would report the unfiltered count.
  const payments = listResponse?.data ?? [];
  const meta = listResponse?.meta ?? {};
  const total = meta.total ?? 0;
  const totalPages = meta.totalPages ?? 1;

  const ownerOptions = ownersResponse?.data
    ? ownersResponse.data.map((o) => ({ value: String(o.id), label: `${o.name} (${o.email})` }))
    : [];

  const handleQuickClose = async (id) => {
    try {
      await updatePayment({ id, body: { status: 'paid' } }).unwrap();
      toast.success(t('payment_marked_as_paid'));
    } catch (err) {
      const msg =
        err?.data?.error || err?.data?.message || err?.message || t('failed_to_update_payment');
      toast.error(msg);
    }
  };

  const columns = [
    { key: 'id', title: t('id'), dataIndex: 'id', cellClassName: 'font-mono text-gray-600' },
    { key: 'house_owner_name', title: t('house_owner'), dataIndex: 'house_owner_name' },
    {
      key: 'amount',
      title: t('amount'),
      dataIndex: 'amount',
      render: (row) => (
        <span className="font-medium">
          {row.amount != null ? Number(row.amount).toLocaleString() : '–'}
        </span>
      ),
    },
    { key: 'fee_type', title: t('fee_type'), dataIndex: 'fee_type' },
    {
      key: 'start_date',
      title: t('start_date'),
      dataIndex: 'start_date',
      render: (row) => formatDate(row.start_date),
    },
    {
      key: 'paid_date',
      title: t('paid_date'),
      dataIndex: 'paid_date',
      render: (row) => formatDate(row.paid_date),
    },
    { key: 'payment_method', title: t('method'), dataIndex: 'payment_method', render: (row) => row.payment_method || '–' },
    {
      key: 'closed',
      title: t('closed'),
      dataIndex: 'closed',
      render: (row) => {
        const waiting = row.metadata?.waiting_for_confirm ? row.metadata.waiting_for_confirm : false;
        const isPaid = row.metadata?.closed ? row.metadata.closed : false;
        return waiting || isPaid ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleQuickClose(row.id);
            }}
            disabled={isUpdating || isPaid}
            className={`px-2 py-1 text-xs rounded ${
              isPaid
                ? 'bg-green-100 text-green-700 cursor-default'
                : 'bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-60'
            }`}
          >
            {isPaid ? t('paid') : t('mark_paid')}
          </button>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        );
      },
    },
    {
      key: 'status',
      title: t('status'),
      dataIndex: 'status',
      render: (row) => (
        <span
          className={`px-2 py-0.5 rounded text-xs font-medium ${
            row.status === 'paid'
              ? 'bg-green-100 text-green-800'
              : row.status === 'pending'
                ? 'bg-amber-100 text-amber-800'
                : row.status === 'overdue'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-700'
          }`}
        >
          {row.status || '–'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: t('actions'),
      dataIndex: 'id',
      cellClassName: 'whitespace-nowrap',
      render: (row) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setViewEditId({ id: row.id })}
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
            title={t('view')}
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewEditId({ id: row.id })}
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
            title={t('edit')}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteConfirmId(row.id)}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
            title={t('delete')}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-gray-900">{t('app_fee_and_subscriptions')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('app_fee_admin_subtitle')}</p>
      </div>

      <AppFeeOverview
        overview={statsResponse?.overview}
        isLoading={statsLoading}
        activeFilter={quickFilter}
        onMetric={setOpenMetric}
      />

      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Btn
            variant="primary"
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {t('new_app_fee')}
          </Btn>
          {quickFilter === 'awaiting_verification' && (
            <button
              type="button"
              onClick={() => setQuickFilter(null)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200"
            >
              {t('showing_awaiting_verification')} ✕
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder={`${t("search")}...`}
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm w-40 focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilter('status', e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={filters.payment_method}
            onChange={(e) => setFilter('payment_method', e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
          >
            {PAYMENT_METHOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={filters.house_owner_id}
            onChange={(e) => setFilter('house_owner_id', e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none min-w-[160px]"
          >
            <option value="">{t('all_house_owners')}</option>
            {ownerOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={filters.start_date}
            onChange={(e) => setFilter('start_date', e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
            title={t('from_date')}
          />
          <input
            type="date"
            value={filters.end_date}
            onChange={(e) => setFilter('end_date', e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
            title={t('to_date')}
          />
        </div>
      </div>

      <Table
        columns={columns}
        data={payments}
        loading={isLoading}
        rowKey="id"
        emptyMessage={t('no_app_fee_payments_found')}
        showPagination
        pagination={{
          current: page,
          total,
          totalPages,
          pageSize: listParams.limit,
        }}
        onPageChange={setPage}
      />

      <AppFeeMetricModal
        metric={openMetric}
        isOpen={!!openMetric}
        onClose={() => setOpenMetric(null)}
        // A row in the breakdown is the same invoice the table below lists, so it opens the
        // same editor rather than a read-only copy of it.
        onOpenPayment={(id) => {
          setOpenMetric(null);
          setViewEditId({ id });
        }}
        onApplyQuickFilter={(key) => {
          setQuickFilter(key);
          setPage(1);
        }}
        // Owner rows narrow the table to that owner, which is the natural next step after
        // spotting them in a "who is lapsed" list.
        onFilterOwner={(houseOwnerId) => {
          setOpenMetric(null);
          setQuickFilter(null);
          setFilter('house_owner_id', String(houseOwnerId));
        }}
      />

      <AppFeeCreateModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => setCreateModalOpen(false)}
      />

      <AppFeeViewEditModal
        paymentId={viewEditId?.id}
        isOpen={!!viewEditId}
        onClose={() => setViewEditId(null)}
        onSuccess={() => setViewEditId(null)}
      />

      <ConfirmationModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDeleteConfirm}
        title={t('delete_app_fee_payment')}
        message={t('delete_app_fee_confirm')}
        confirmText={t('delete')}
        isLoading={isDeleting}
        variant="danger"
      />
    </div>
  );
};

export default AdminsAppFeePage;
