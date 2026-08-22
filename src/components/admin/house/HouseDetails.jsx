// src/components/admin/house/HouseDetails.jsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { apiErrorMessage } from '../../../utils/apiError';
import {
  AlertTriangle, ArrowLeft, Banknote, Building2, CalendarDays, Edit, Mail,
  MapPin, Phone, RefreshCw, ShieldCheck, Trash2, TrendingDown, TrendingUp, Users, Wallet,
} from 'lucide-react';
import { useGetHouseDetailsQuery, useDeleteHouseMutation } from '../../../store/api/houseApi';
import { useAuth } from '../../../hooks';
import { ContentLoader } from '../../common/RouteLoader';
import ConfirmationModal from '../../common/ConfirmationModal';
import FlatForm from '../../flats/FlatForm';
import HouseFlatsSection from './HouseFlatsSection';
import HouseRentersSection from './HouseRentersSection';
import HouseCaretakersSection from './HouseCaretakersSection';
import RenterForm from '../../renters/RenterForm';
import AssignRenterModal from '../../flats/AssignRenterModal';
import { useDeleteRenterMutation } from '../../../store/api/renterApi';

const money = (n) =>
  n == null ? '—' : `৳${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const fmtDate = (d) => {
  if (!d) return '—';
  const parsed = new Date(d);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString();
};

/** One figure in the house header. `tone` carries meaning, not decoration. */
const Stat = ({ icon: Icon, label, value, sub, tone = 'neutral' }) => {
  const tones = {
    neutral: 'text-gray-600 bg-gray-100',
    positive: 'text-emerald-700 bg-emerald-100',
    warning: 'text-amber-700 bg-amber-100',
    danger: 'text-red-700 bg-red-100',
    info: 'text-blue-700 bg-blue-100',
  };

  return (
    // Icon above the text on a phone, beside it from sm up. Side-by-side at 320px left the
    // text column about 58px wide once the icon and gaps were taken out, which is why a
    // figure as ordinary as ৳41,000 rendered as "৳…". Stacking gives the number the full
    // width of the card.
    <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-start gap-2 sm:gap-3">
      <span className={`shrink-0 p-2 rounded-lg ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 w-full">
        <p className="text-[11px] text-gray-500 leading-tight">{label}</p>
        {/* Never truncate a money figure — a wrong number read confidently is worse than a
            number that takes two lines. */}
        <p className="text-base sm:text-lg font-semibold text-gray-900 leading-tight mt-0.5 tabular-nums break-words">
          {value}
        </p>
        {sub ? <p className="text-[11px] text-gray-500 mt-0.5 break-words">{sub}</p> : null}
      </div>
    </div>
  );
};

/**
 * One house, one page.
 *
 * Flats used to live at /houses/{id}/flats and caretakers were a count you could not act on,
 * so answering "how is this house doing" meant two navigations and a guess. Everything is
 * here now, and it is a single request: GET /houses/{id} returns the house, its flats, its
 * caretakers, occupancy and the money.
 */
const HouseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { hasPermission, isWebOwner, user } = useAuth();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [addFlatOpen, setAddFlatOpen] = useState(false);
  const [renterForm, setRenterForm] = useState(null);     // null | {} for new | the renter
  const [assignToFlat, setAssignToFlat] = useState(null);
  const [renterToDelete, setRenterToDelete] = useState(null);

  const { data, isLoading, isFetching, error, refetch } = useGetHouseDetailsQuery(id);
  const [deleteHouse, { isLoading: isDeleting }] = useDeleteHouseMutation();
  const [deleteRenter, { isLoading: isDeletingRenter }] = useDeleteRenterMutation();

  const house = data?.data;
  const stats = house?.stats ?? {};
  const fin = house?.financials ?? {};

  /**
   * Permission as this page sees it.
   *
   * A caretaker's grants are per house and live on the assignment, not on the account, so
   * hasPermission() — which only reads the account-level list — says no to a caretaker who
   * genuinely may assign a renter in this house. The house response already carries each
   * assignment's keys, so the answer is right here.
   */
  const caretakerKeys = React.useMemo(() => {
    const mine = (house?.caretakers ?? []).find((c) => c.caretaker?.id === user?.id);
    return new Set(mine?.permissions ?? []);
  }, [house?.caretakers, user?.id]);

  const can = (key) => hasPermission(key) || caretakerKeys.has(key);

  const handleDeleteRenter = async () => {
    try {
      await deleteRenter(renterToDelete.id).unwrap();
      toast.success(t('renter_deleted'));
      setRenterToDelete(null);
    } catch (err) {
      // The server refuses to delete a renter who still occupies a flat; show its reason
      // rather than a generic failure, because that one is actionable.
      toast.error(apiErrorMessage(err, t('failed_to_delete_renter')));
    }
  };

  const handleDelete = async () => {
    try {
      const res = await deleteHouse(id).unwrap();
      // The API distinguishes archived from permanently removed — say which happened
      // rather than a generic "deleted".
      toast.success(res?.message || t('house_archived'));
      navigate('/houses');
    } catch (err) {
      toast.error(apiErrorMessage(err, t('failed_to_delete_house')));
      setConfirmDelete(false);
    }
  };

  if (isLoading) return <ContentLoader />;

  if (error || !house) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center">
        <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-3" />
        <p className="text-gray-800 font-medium">{apiErrorMessage(error, t('failed_to_load_house'))}</p>
        <button
          type="button"
          onClick={() => navigate('/houses')}
          className="mt-4 px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
        >
          {t('back_to_houses')}
        </button>
      </div>
    );
  }

  // A house owner holds `houses.edit.own`, not `houses.edit` — which the server honours for
  // their own houses. Checking only `houses.edit` here hid the edit button from the one
  // person who unambiguously may use it.
  const ownsThisHouse = house.owner?.id === user?.id;
  const canEdit = can('houses.edit') || (ownsThisHouse && can('houses.edit.own'));
  const canDelete = can('houses.delete');

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <button
        type="button"
        onClick={() => navigate('/houses')}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('back_to_houses')}
      </button>

      {/* ── House information ─────────────────────────────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{house.name}</h1>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                  house.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {house.active ? t('active') : t('inactive')}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {house.address}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              title={t('reload')}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-primary hover:border-primary/50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={() => navigate(`/houses/${id}/edit`)}
                title={t('edit')}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-primary hover:border-primary/50"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                title={t('delete')}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-300"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Owner + created, kept compact so the money below is what draws the eye. */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-600">
          {house.owner && (
            <>
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-gray-400" />
                {house.owner.name}
              </span>
              {house.owner.email && (
                <a href={`mailto:${house.owner.email}`} className="flex items-center gap-1.5 hover:text-primary">
                  <Mail className="h-3.5 w-3.5 text-gray-400" />
                  {house.owner.email}
                </a>
              )}
              {house.owner.phone && (
                <a href={`tel:${house.owner.phone}`} className="flex items-center gap-1.5 hover:text-primary">
                  <Phone className="h-3.5 w-3.5 text-gray-400" />
                  {house.owner.phone}
                </a>
              )}
            </>
          )}
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
            {t('created_on', { date: fmtDate(house.createdAt) })}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <Stat
            icon={TrendingUp}
            tone="positive"
            label={t('earned_this_year', { year: fin.year })}
            value={money(fin.collectedThisYear)}
            sub={t('this_month_amount', { amount: money(fin.collectedThisMonth) })}
          />
          <Stat
            icon={TrendingDown}
            tone={fin.expensesThisYear > 0 ? 'warning' : 'neutral'}
            label={t('expenses_this_year')}
            value={money(fin.expensesThisYear)}
            sub={t('net_amount', { amount: money(fin.netThisYear) })}
          />
          <Stat
            icon={Wallet}
            tone={fin.outstanding > 0 ? 'danger' : 'neutral'}
            label={t('outstanding_rent')}
            value={money(fin.outstanding)}
            sub={t('overdue_count', { count: fin.overdueCount ?? 0 })}
          />
          <Stat
            icon={Banknote}
            tone="info"
            label={t('monthly_potential')}
            value={money(fin.monthlyPotential)}
            sub={t('if_every_flat_let')}
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
          <Stat
            icon={Users}
            tone={stats.occupancyRate >= 80 ? 'positive' : stats.occupancyRate > 0 ? 'warning' : 'neutral'}
            label={t('occupancy')}
            value={`${stats.occupancyRate ?? 0}%`}
            sub={t('occupied_of_total', { occupied: stats.occupiedFlats ?? 0, total: stats.totalFlats ?? 0 })}
          />
          <Stat icon={Building2} label={t('total_flats')} value={stats.totalFlats ?? 0} />
          <Stat icon={Building2} tone={stats.vacantFlats > 0 ? 'warning' : 'neutral'} label={t('vacant')} value={stats.vacantFlats ?? 0} />
          <Stat icon={ShieldCheck} label={t('caretakers')} value={stats.caretakers ?? 0} />
        </div>

        {(house.metadata?.description || house.metadata?.amenities?.length > 0) && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            {house.metadata?.description && (
              <p className="text-sm text-gray-600">{house.metadata.description}</p>
            )}
            {house.metadata?.amenities?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {house.metadata.amenities.map((a, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[11px]">
                    {typeof a === 'string' ? a : a?.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <HouseFlatsSection
        flats={house.flats ?? []}
        onAddFlat={() => setAddFlatOpen(true)}
        onAssignRenter={setAssignToFlat}
        can={can}
      />

      {/* Renters sit between flats and caretakers: it is the same tenancy data read the
          other way round — by person rather than by unit. */}
      <HouseRentersSection
        flats={house.flats ?? []}
        unassignedRenters={house.unassignedRenters ?? []}
        can={can}
        onAddRenter={() => setRenterForm({})}
        onEditRenter={setRenterForm}
        onDeleteRenter={setRenterToDelete}
      />

      <HouseCaretakersSection caretakers={house.caretakers ?? []} onChanged={refetch} />

      <ConfirmationModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title={t('delete_house')}
        // Staff always archive; only a web_owner can go further, and even then only from an
        // explicit action. Saying so here stops "delete" reading as "destroy".
        message={isWebOwner ? t('delete_house_confirm_admin') : t('delete_house_confirm_archive')}
        confirmText={t('delete')}
        isLoading={isDeleting}
        variant="danger"
      />

      {/* FlatForm renders its own overlay and owns its open/close props — it must not be
          wrapped in <Modal>, or the page gets two stacked backdrops. Refetching on close
          picks up a newly created flat. */}
      <FlatForm
        open={addFlatOpen}
        onClose={() => {
          setAddFlatOpen(false);
          refetch();
        }}
        houseId={house.id}
      />

      {/* Same contract as FlatForm: own overlay, own open/close. The renter belongs to the
          house owner, not to the house — a renter can be moved between the owner's houses,
          so ownership is where it is recorded. */}
      <RenterForm
        open={!!renterForm}
        onClose={() => setRenterForm(null)}
        renter={renterForm?.id ? renterForm : undefined}
        houseOwnerId={house.owner?.id ?? house.ownerId}
      />

      {assignToFlat && (
        <AssignRenterModal
          open
          flat={{ ...assignToFlat, house_id: house.id }}
          houseinfo={house}
          onClose={() => setAssignToFlat(null)}
          onSuccess={() => {
            setAssignToFlat(null);
            refetch();
          }}
        />
      )}

      <ConfirmationModal
        isOpen={!!renterToDelete}
        onClose={() => setRenterToDelete(null)}
        onConfirm={handleDeleteRenter}
        title={t('delete_renter')}
        message={t('delete_renter_confirm', { name: renterToDelete?.name ?? '' })}
        confirmText={t('delete')}
        isLoading={isDeletingRenter}
        variant="danger"
      />
    </div>
  );
};

export default HouseDetails;
