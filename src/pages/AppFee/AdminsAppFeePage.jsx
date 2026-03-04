import React, { useState } from 'react';
import { Plus, Search, Eye, Pencil, Trash2 } from 'lucide-react';
import Table from '../../components/common/Table';
import Btn from '../../components/common/Button';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { useGetAppFeePaymentsQuery, useDeleteAppFeePaymentMutation, useUpdateAppFeePaymentMutation } from '../../store/api/appFeeApi';
import { useGetManagedOwnersQuery } from '../../store/api/houseApi';
import AppFeeCreateModal from './AppFeeCreateModal';
import AppFeeViewEditModal from './AppFeeViewEditModal';
import { toast } from 'react-toastify';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: '', label: 'All methods' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
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
      toast.success('Payment deleted successfully.');
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
  };

  const { data: listResponse, isLoading } = useGetAppFeePaymentsQuery(listParams);
  const { data: ownersResponse } = useGetManagedOwnersQuery(
    { search: '', page: 1, limit: 100 }
  );

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
      toast.success('Payment marked as paid.');
    } catch (err) {
      const msg =
        err?.data?.error || err?.data?.message || err?.message || 'Failed to update payment';
      toast.error(msg);
    }
  };

  const columns = [
    { key: 'id', title: 'ID', dataIndex: 'id', cellClassName: 'font-mono text-gray-600' },
    { key: 'house_owner_name', title: 'House Owner', dataIndex: 'house_owner_name' },
    {
      key: 'amount',
      title: 'Amount',
      dataIndex: 'amount',
      render: (row) => (
        <span className="font-medium">
          {row.amount != null ? Number(row.amount).toLocaleString() : '–'}
        </span>
      ),
    },
    { key: 'fee_type', title: 'Fee Type', dataIndex: 'fee_type' },
    {
      key: 'start_date',
      title: 'Start Date',
      dataIndex: 'start_date',
      render: (row) => formatDate(row.start_date),
    },
    {
      key: 'paid_date',
      title: 'Paid Date',
      dataIndex: 'paid_date',
      render: (row) => formatDate(row.paid_date),
    },
    { key: 'payment_method', title: 'Method', dataIndex: 'payment_method', render: (row) => row.payment_method || '–' },
    {
      key: 'closed',
      title: 'Closed',
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
            {isPaid ? 'Paid' : 'Mark paid'}
          </button>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        );
      },
    },
    {
      key: 'status',
      title: 'Status',
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
      title: 'Actions',
      dataIndex: 'id',
      cellClassName: 'whitespace-nowrap',
      render: (row) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setViewEditId({ id: row.id })}
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
            title="View"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewEditId({ id: row.id })}
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteConfirmId(row.id)}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Btn
            variant="primary"
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New app fee
          </Btn>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search..."
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
            <option value="">All house owners</option>
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
            title="From date"
          />
          <input
            type="date"
            value={filters.end_date}
            onChange={(e) => setFilter('end_date', e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
            title="To date"
          />
        </div>
      </div>

      <Table
        columns={columns}
        data={payments}
        loading={isLoading}
        rowKey="id"
        emptyMessage="No app fee payments found"
        showPagination
        pagination={{
          current: page,
          total,
          totalPages,
          pageSize: listParams.limit,
        }}
        onPageChange={setPage}
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
        title="Delete app fee payment"
        message="Are you sure you want to delete this app fee payment? This action cannot be undone."
        confirmText="Delete"
        isLoading={isDeleting}
        variant="danger"
      />
    </div>
  );
};

export default AdminsAppFeePage;
