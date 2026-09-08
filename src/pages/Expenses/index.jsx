import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  Pencil, Trash2, Plus, Check, X, Receipt, Wallet, CheckCircle2,
  Info, ExternalLink, RotateCcw,
} from 'lucide-react';

import Modal from '../../components/common/Modal';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import Table from '../../components/common/Table';
import TkSymbol from '../../components/common/TkSymbol';
import RecordExpenseForm from './RecordExpense';
import { apiErrorMessage } from '../../utils/apiError';
import { useAuth } from '../../hooks';
import useDefaultHouse from '../../hooks/useDefaultHouse';
import {
  useGetExpensesQuery,
  useDeleteExpenseMutation,
  useDecideExpenseMutation,
} from '../../store/api/reportApi';

const PAGE_SIZE = 20;

/**
 * Category and status both render as badges, so the tone lives with the value rather than
 * being rebuilt at each call site. Keys are translated; the identifiers are the database
 * enums and must not be.
 */
const CATEGORY_TONES = {
  maintenance: 'bg-blue-50 text-blue-700 border-blue-200',
  utility: 'bg-amber-50 text-amber-700 border-amber-200',
  repair: 'bg-orange-50 text-orange-700 border-orange-200',
  tax: 'bg-purple-50 text-purple-700 border-purple-200',
  salary: 'bg-teal-50 text-teal-700 border-teal-200',
  loan: 'bg-rose-50 text-rose-700 border-rose-200',
  other: 'bg-gray-50 text-gray-700 border-gray-200',
};

const STATUS_TONES = {
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  paid: 'bg-blue-50 text-blue-700 border-blue-200',
};

const CATEGORIES = ['maintenance', 'utility', 'repair', 'tax', 'salary', 'loan', 'other'];
const STATUSES = ['pending', 'approved', 'rejected', 'paid'];

const money = (value) => Number(value ?? 0).toLocaleString('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const StatCard = ({ icon: Icon, label, value, hint, tone = 'text-gray-900' }) => (
  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
    <div className="flex items-center gap-2 text-gray-500 mb-1">
      <Icon className="w-4 h-4" />
      <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
    </div>
    <p className={`text-2xl font-bold ${tone}`}>{value}</p>
    {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
  </div>
);

const selectClass =
  'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white '
  + 'focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition';

const HouseOwnerExpensesPage = () => {
  const { t } = useTranslation();
  const { user, isHouseOwner } = useAuth();
  const { houses } = useDefaultHouse();

  const [page, setPage] = useState(1);
  const [houseId, setHouseId] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  // The list is keyed to the signed-in owner. Other roles reach this route too, but an
  // admin or caretaker passing their own id would query houses they do not own and get an
  // empty table with no explanation — so they are told where their view actually lives
  // rather than being shown a blank one.
  const { data, isLoading, isFetching, isError, refetch } = useGetExpensesQuery(
    { houseOwnerId: user?.id, houseId, category, status, page, limit: PAGE_SIZE },
    { skip: !user?.id || !isHouseOwner },
  );

  const [deleteExpense, { isLoading: isDeleting }] = useDeleteExpenseMutation();
  const [decideExpense, { isLoading: isDeciding }] = useDecideExpenseMutation();

  const expenses = data?.data || [];
  const summary = data?.summary || { totalCount: 0, totalAmount: 0, approvedAmount: 0, pendingCount: 0 };
  const meta = data?.meta || { total: 0, page: 1, lastPage: 1 };

  const hasFilters = Boolean(houseId || category || status);

  const resetFilters = () => {
    setHouseId('');
    setCategory('');
    setStatus('');
    setPage(1);
  };

  // Any filter change invalidates the current page number: staying on page 3 of a narrower
  // result set is the classic way to land on "no records" when matches exist.
  const applyFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (expense) => {
    setEditing(expense);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const confirmDelete = async () => {
    try {
      await deleteExpense({ houseId: deleting.house_id, expenseId: deleting.id }).unwrap();
      toast.success(t('expense_deleted'));
      setDeleting(null);
      // The last row on the final page leaves that page empty; step back rather than
      // showing an empty table with a page number still pointing past the end.
      if (expenses.length === 1 && page > 1) setPage((p) => p - 1);
    } catch (error) {
      toast.error(apiErrorMessage(error, t('failed_to_delete_expense')));
    }
  };

  const decide = async (expense, nextStatus) => {
    try {
      await decideExpense({
        houseId: expense.house_id,
        expenseId: expense.id,
        status: nextStatus,
      }).unwrap();
      toast.success(nextStatus === 'approved' ? t('expense_approved') : t('expense_rejected'));
    } catch (error) {
      toast.error(apiErrorMessage(error, t('failed_to_decide_expense')));
    }
  };

  const columns = [
    {
      title: t('date'),
      dataIndex: 'expense_date',
      render: (row) => (
        <span className="whitespace-nowrap text-gray-700">
          {row.expense_date ? new Date(row.expense_date).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      title: t('category'),
      dataIndex: 'category',
      render: (row) => (
        <span
          className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full border whitespace-nowrap ${
            CATEGORY_TONES[row.category] || CATEGORY_TONES.other
          }`}
        >
          {t(row.category)}
        </span>
      ),
    },
    {
      title: t('description'),
      dataIndex: 'description',
      render: (row) => (
        <div className="flex items-center gap-1.5 max-w-60">
          <span className="truncate text-gray-600" title={row.description || ''}>
            {row.description || '—'}
          </span>
          {row.receipt_url && (
            <a
              href={row.receipt_url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-primary hover:opacity-70 shrink-0"
              title={t('receipt_url')}
            >
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      ),
    },
    {
      title: t('amount'),
      dataIndex: 'amount',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <span className={`font-semibold whitespace-nowrap ${
          Number(row.amount) < 0 ? 'text-emerald-700' : 'text-gray-900'
        }`}>
          <TkSymbol />{money(row.amount)}
        </span>
      ),
    },
    {
      title: t('payment_method'),
      dataIndex: 'payment_method',
      render: (row) => (
        <span className="text-gray-600 whitespace-nowrap">
          {row.payment_method ? t(row.payment_method) : '—'}
        </span>
      ),
    },
    {
      title: t('status'),
      dataIndex: 'status',
      render: (row) => (
        <span
          className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full border whitespace-nowrap ${
            STATUS_TONES[row.status] || STATUS_TONES.pending
          }`}
        >
          {t(row.status)}
        </span>
      ),
    },
    {
      title: t('actions'),
      key: 'actions',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {/* Approve and reject only exist while a decision is outstanding — the server
              refuses to re-decide a settled expense, so offering the buttons would only
              produce an error. */}
          {row.status === 'pending' && (
            <>
              <button
                onClick={() => decide(row, 'approved')}
                disabled={isDeciding}
                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition disabled:opacity-50"
                title={t('approve')}
              >
                <Check size={16} />
              </button>
              <button
                onClick={() => decide(row, 'rejected')}
                disabled={isDeciding}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                title={t('reject')}
              >
                <X size={16} />
              </button>
            </>
          )}
          <button
            onClick={() => openEdit(row)}
            className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition"
            title={t('edit')}
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => setDeleting(row)}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            title={t('delete')}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  if (!isHouseOwner) {
    return (
      <div className="max-w-2xl mx-auto mt-10 bg-white border border-gray-200 rounded-xl p-6 text-center">
        <Info className="w-8 h-8 text-gray-400 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('expenses')}</h2>
        <p className="text-sm text-gray-500">{t('expenses_owner_only')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('expenses')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('expenses_subtitle')}</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition"
        >
          <Plus size={16} />
          {t('record_expense')}
        </button>
      </div>

      {/* Totals. These describe the filtered set, so they always agree with the rows below. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Receipt} label={t('total_records')} value={summary.totalCount} />
        <StatCard
          icon={Wallet}
          label={t('total_spend')}
          value={<><TkSymbol />{money(summary.totalAmount)}</>}
        />
        <StatCard
          icon={CheckCircle2}
          label={t('counted_in_reports')}
          value={<><TkSymbol />{money(summary.approvedAmount)}</>}
          tone="text-emerald-700"
          hint={summary.pendingCount > 0
            ? t('awaiting_approval_count', { count: summary.pendingCount })
            : t('counted_in_reports_hint')}
        />
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          {/* A plain select rather than HouseSelector: that component drops its blank option
              once a house is chosen ("" means "use the default" to the forms it was built
              for), so as a filter it could never be set back to "all properties". The house
              list comes from the same query it uses, so this costs no extra request. */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('property')}</label>
            <select
              className={selectClass}
              value={houseId}
              onChange={(e) => applyFilter(setHouseId)(e.target.value)}
            >
              <option value="">{t('all_properties')}</option>
              {houses.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name || h.address || `#${h.id}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('category')}</label>
            <select
              className={selectClass}
              value={category}
              onChange={(e) => applyFilter(setCategory)(e.target.value)}
            >
              <option value="">{t('all_categories')}</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{t(c)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('status')}</label>
            <select
              className={selectClass}
              value={status}
              onChange={(e) => applyFilter(setStatus)(e.target.value)}
            >
              <option value="">{t('all_statuses')}</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{t(s)}</option>
              ))}
            </select>
          </div>
        </div>

        {hasFilters && (
          <button
            onClick={resetFilters}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-primary transition"
          >
            <RotateCcw size={13} />
            {t('clear_filters')}
          </button>
        )}
      </div>

      {isError ? (
        <div className="bg-white border border-red-200 rounded-xl p-8 text-center">
          <p className="text-sm text-red-600 mb-3">{t('failed_to_load_expenses')}</p>
          <button
            onClick={refetch}
            className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            {t('retry')}
          </button>
        </div>
      ) : (
        <div className={isFetching && !isLoading ? 'opacity-60 transition-opacity' : ''}>
          <Table
            columns={columns}
            data={expenses}
            loading={isLoading}
            hoverable
            striped={false}
            className="bg-white"
            emptyMessage={hasFilters ? t('no_expenses_match_filters') : t('no_expense_records_found')}
            showPagination={meta.lastPage > 1}
            pagination={{
              current: meta.page,
              total: meta.total,
              totalPages: meta.lastPage,
              pageSize: PAGE_SIZE,
            }}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* The modal owns the heading; the form used to draw its own on top of this one. */}
      <Modal
        isOpen={formOpen}
        onClose={closeForm}
        size="lg"
        title={editing ? t('edit_expense') : t('record_expense')}
        subtitle={t('record_expense_subtitle')}
      >
        <RecordExpenseForm
          expense={editing}
          onCancel={closeForm}
          onSuccess={closeForm}
        />
      </Modal>

      <ConfirmationModal
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        variant="danger"
        title={t('delete_expense')}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        message={deleting
          ? `${t('delete_expense_confirm')} (${t(deleting.category)} — ৳${money(deleting.amount)})`
          : ''}
      />
    </div>
  );
};

export default HouseOwnerExpensesPage;
