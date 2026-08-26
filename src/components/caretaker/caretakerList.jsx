// pages/Caretakers.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ProtectedImage from '../common/ProtectedImage';
import {
  useGetCaretakersQuery,
  useDeleteCaretakerMutation,
} from '../../store/api/caretakerApi';
import {
  Search,
  Plus,
  Trash2,
  Home,
  User,
  Mail,
  Phone,
  Calendar,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiErrorMessage } from '../../utils/apiError';
import { showMessageInLanguage } from '../../utils/showMessageInLanguage';
import { useAuth } from '../../hooks';
import Btn from '../common/Button';
import ConfirmationModal from '../common/ConfirmationModal';
import { useTranslation } from 'react-i18next';
import AddCaretakerModal from './AddCaretakerModal';
import RequestCaretakerModal from './RequestCaretakerModal';
import { useGetUserApprovalsQuery } from '../../store/api/userApprovalApi';

const STATUS_TONE = {
  active: { badge: 'bg-green-100 text-green-800', strip: 'bg-green-500' },
  inactive: { badge: 'bg-yellow-100 text-yellow-800', strip: 'bg-yellow-400' },
  default: { badge: 'bg-gray-100 text-gray-800', strip: 'bg-gray-300' },
};

const CaretakerList = () => {
  const [filters, setFilters] = useState({
    search: '',
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const { t } = useTranslation();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCaretaker, setSelectedCaretaker] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  
  // Declared before anything reads it. This sat below the queries, and `isHouseOwner`
  // referenced `user` four lines above the const that creates it — a temporal dead zone
  // ReferenceError that took the whole page down on mount.
  const { user, hasPermission } = useAuth();

  const { data, isLoading, error, refetch } = useGetCaretakersQuery(filters);
  // An owner's own requests, so a pending one is visible instead of looking like nothing
  // happened after they sent it.
  const isHouseOwner = user?.role?.slug === 'house_owner';
  const { data: myRequests } = useGetUserApprovalsQuery(undefined, { skip: !isHouseOwner });
  const caretakers = data?.data || [];
  const totalPages = data?.pagination?.pages || 0;
  const [deleteCaretaker, { isLoading: isDeleting }] = useDeleteCaretakerMutation();

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filters change
    }));
  };

  const handlePageChange = (page) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleDelete = async () => {
    if (!selectedCaretaker) return;
    
    try {
      await deleteCaretaker(selectedCaretaker.id).unwrap();
      toast.success('Caretaker deleted successfully');
      setDeleteModalOpen(false);
      setSelectedCaretaker(null);
      refetch();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Failed to delete caretaker'));
    }
  };

  const openDeleteModal = (caretaker) => {
    setSelectedCaretaker(caretaker);
    setDeleteModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('caretakers')}</h1>
          <p className="text-gray-600 mt-1">
            {t('manage_caretakers_and_their_permissions')}
          </p>
        </div>
        
        {/* Was a hand-rolled role check that left the developer role out, so a developer —
            who bypasses every permission — could not see this button. hasPermission already
            encodes the web_owner/developer bypass. */}
        {/* An owner holds caretakers.create but cannot call POST /auth/create-user — that
            route is role:web_owner,staff. Offering them the same button as an admin is what
            produced a guaranteed 403; they get the request flow instead. */}
        {isHouseOwner ? (
          <Btn onClick={() => setRequestModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('request_a_caretaker')}
          </Btn>
        ) : hasPermission('caretakers.create') && (
          <Btn onClick={() => setAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('add_caretaker')}
          </Btn>
        )}
      </div>

      {/* Where their asks stand. Without this, sending a request and then seeing the same
          empty caretaker list reads as the request having gone nowhere. */}
      {isHouseOwner && (myRequests?.data ?? []).some((r) => r.status === 'pending' || r.status === 'rejected') && (
        <div className="space-y-2">
          {myRequests.data
            .filter((r) => r.status === 'pending' || r.status === 'rejected')
            .map((r) => (
              <div
                key={r.id}
                className={`rounded-xl border p-3 ${
                  r.status === 'pending' ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <p className={`text-sm font-medium ${r.status === 'pending' ? 'text-amber-900' : 'text-red-900'}`}>
                  {r.status === 'pending'
                    ? t('request_waiting_for_approval', { name: r.name })
                    : t('request_was_declined', { name: r.name })}
                </p>
                {r.status === 'rejected' && r.rejectionReason && (
                  <p className="text-xs text-red-800 mt-0.5">{r.rejectionReason}</p>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
          </div>
          
          <div>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            >
              <option value="name">{t('sort_by_name')}</option>
              <option value="createdAt">{t('sort_by_date')}</option>
              <option value="email">{t('sort_by_email')}</option>
            </select>
          </div>
          
          <div>
            <select
              value={filters.sortOrder}
              onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            >
              <option value="asc">{t('accending')}</option>
              <option value="desc">{t('decending')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cards, not rows. A caretaker is a person with a handful of houses attached, and
          the six-column table spent most of its width on empty cells while truncating the
          one thing being scanned for — which houses they look after. */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-60 rounded-xl border border-gray-200 bg-white animate-pulse" />
          ))}
        </div>
      ) : error ? (
        // A failed request used to fall through to the empty state, so "could not load" and
        // "you have none" looked identical — one needs a retry, the other needs a caretaker.
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center">
          <p className="text-sm text-red-800">
            {showMessageInLanguage(apiErrorMessage(error, t('failed_to_load_caretakers')))}
          </p>
          <button
            type="button"
            onClick={refetch}
            className="mt-3 px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700"
          >
            {t('retry')}
          </button>
        </div>
      ) : caretakers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <User className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{t('no_caretakers_found')}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {caretakers.map((row) => {
            const tone = STATUS_TONE[row.status] || STATUS_TONE.default;
            const canDelete = user.role.slug === 'web_owner'
              || (user.role.slug === 'staff' && user.permissions?.includes('caretakers.delete'));

            return (
              <div
                key={row.id}
                className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-primary/40 transition-all overflow-hidden flex flex-col"
              >
                <div className={`h-1 ${tone.strip}`} />

                {/* The body is the link; the footer's own controls sit outside it, because a
                    <button> inside an <a> is invalid HTML and swallows its own clicks. */}
                <Link to={`/caretakers/${row.id}/details`} className="block p-4 flex-1">
                  <div className="flex items-start gap-3">
                    <ProtectedImage
                      src={row.avatarUrl}
                      alt={row.name}
                      className="h-12 w-12 rounded-xl object-cover shrink-0"
                      fallback={
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 truncate group-hover:text-primary transition-colors">
                        {row.name}
                      </p>
                      <p className="text-sm text-gray-500 truncate flex items-center gap-1">
                        <Mail className="h-3 w-3 shrink-0" />
                        {row.email}
                      </p>
                      {row.phone && (
                        <p className="text-sm text-gray-500 truncate flex items-center gap-1">
                          <Phone className="h-3 w-3 shrink-0" />
                          {row.phone}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase shrink-0 ${tone.badge}`}>
                      {row.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="rounded-lg bg-gray-50 px-2.5 py-2 min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-gray-500">{t('houses')}</p>
                      <p className="text-sm font-semibold text-gray-900">{row.houseCount ?? 0}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-2.5 py-2 min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-gray-500">{t('assignments')}</p>
                      <p className="text-sm font-semibold text-gray-900">{row.assignmentCount ?? 0}</p>
                    </div>
                  </div>

                  {/* Which houses, by name. The table showed owners; the houses are what a
                      caretaker is actually responsible for. */}
                  {row.assignments?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">{t('houses')}</p>
                      <div className="flex flex-wrap gap-1">
                        {row.assignments.map((a) => (
                          <span
                            key={a.houseId}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary max-w-full"
                          >
                            <Home className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{a.houseName}</span>
                          </span>
                        ))}
                        {row.hasMoreAssignments && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] text-gray-400">
                            +{(row.assignmentCount ?? 0) - row.assignments.length}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {row.houseOwners?.length > 0 && (
                    <p className="mt-3 text-xs text-gray-500 truncate">
                      <span className="text-gray-400">{t('house_owners')}: </span>
                      {row.houseOwners.map((o) => o.name).join(', ')}
                    </p>
                  )}
                </Link>

                <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/70 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-gray-500 flex items-center gap-1 min-w-0">
                    <Calendar className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {t('joined')} {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}
                    </span>
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {/* An Edit link used to sit here pointing at /caretakers/:id/edit —
                        a route that does not exist, rendered by a component that does not
                        exist, backed by an endpoint that does not exist. It fell through to
                        the catch-all every time it was clicked. */}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => openDeleteModal(row)}
                        className="p-1.5 rounded-lg text-red-600 hover:text-red-800 hover:bg-white transition-colors"
                        title={t('delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            {data?.pagination?.total ?? 0} {t('caretakers')}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={filters.page === 1}
              onClick={() => handlePageChange(filters.page - 1)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600 tabular-nums">
              {filters.page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={filters.page >= totalPages}
              onClick={() => handlePageChange(filters.page + 1)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add Caretaker Modal */}
      <AddCaretakerModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={refetch}
      />

      <RequestCaretakerModal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        onSuccess={refetch}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title={t('delete_caretaker')}
        message={`${t('are_you_sure_you_want_to_delete')} ${selectedCaretaker?.name}? ${t('this_will_remove_all_their_assignments_and_permissions_this_action_cannot_be_undone')}`}
        confirmText={t('delete_caretaker')}
        cancelText={t('cancel')}
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default CaretakerList;