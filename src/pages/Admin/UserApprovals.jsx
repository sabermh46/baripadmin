import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
  Building2, Check, Clock, Inbox, KeyRound, Loader2, Mail, Phone, ShieldCheck, User, X,
} from 'lucide-react';
import {
  useApproveUserApprovalMutation,
  useGetUserApprovalsQuery,
  useRejectUserApprovalMutation,
} from '../../store/api/userApprovalApi';
import Modal from '../../components/common/Modal';
import { apiErrorMessage } from '../../utils/apiError';
import { showMessageInLanguage } from '../../utils/showMessageInLanguage';

const STATUS_TONE = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const when = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
};

const Fact = ({ icon: Icon, children }) => (
  <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 min-w-0">
    <Icon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
    <span className="truncate">{children}</span>
  </span>
);

/**
 * The queue of accounts house owners have asked for.
 *
 * This route existed and rendered <ComingSoonPage />. The owner-facing half did not exist at
 * all: a house owner holds `caretakers.create`, so the Caretakers page showed them an "Add
 * caretaker" button, and POST /auth/create-user is role:web_owner,staff — the form ended in a
 * 403 every time, with nothing explaining why or what to do instead.
 *
 * Approving mints a real user with the caretaker role, assigns the house, and grants the
 * permissions this admin allows — which may be narrower than what the owner asked for, since
 * the owner proposes and the admin decides.
 */
const UserApprovals = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState('pending');
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const [granting, setGranting] = useState(null);
  const [grantKeys, setGrantKeys] = useState([]);

  const { data, isLoading } = useGetUserApprovalsQuery({ status: tab === 'all' ? undefined : tab });
  const [approve, { isLoading: isApproving }] = useApproveUserApprovalMutation();
  const [reject, { isLoading: isRejecting }] = useRejectUserApprovalMutation();

  const rows = data?.data ?? [];
  const pendingCount = data?.meta?.pending ?? 0;

  const openApprove = (row) => {
    setGrantKeys(row.permissions ?? []);
    setGranting(row);
  };

  const confirmApprove = async () => {
    try {
      const res = await approve({ id: granting.id, permissions: grantKeys, sendEmail: true }).unwrap();
      toast.success(t('caretaker_account_created', { name: res?.data?.createdUser?.name ?? granting.name }));
      setGranting(null);
    } catch (err) {
      toast.error(showMessageInLanguage(apiErrorMessage(err, t('failed_to_approve_request'))));
    }
  };

  const confirmReject = async () => {
    if (!reason.trim()) return;
    try {
      await reject({ id: rejecting.id, reason: reason.trim() }).unwrap();
      toast.success(t('request_declined'));
      setRejecting(null);
      setReason('');
    } catch (err) {
      toast.error(showMessageInLanguage(apiErrorMessage(err, t('failed_to_decline_request'))));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">{t('caretaker_requests')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('caretaker_requests_subtitle')}</p>
      </div>

      <div className="flex gap-2">
        {['pending', 'approved', 'rejected', 'all'].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t(`approval_tab_${key}`)}
            {key === 'pending' && pendingCount > 0 && (
              <span className={`ml-1.5 px-1.5 rounded-full text-[10px] ${tab === key ? 'bg-white/25' : 'bg-amber-100 text-amber-800'}`}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => <div key={i} className="h-28 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <Inbox className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{t('no_requests_here')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{row.name}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                    <Fact icon={Mail}>{row.email}</Fact>
                    {row.phone && <Fact icon={Phone}>{row.phone}</Fact>}
                    {row.house && <Fact icon={Building2}>{row.house.name}</Fact>}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase shrink-0 ${STATUS_TONE[row.status]}`}>
                  {t(`status_${row.status}`, row.status)}
                </span>
              </div>

              <p className="text-xs text-gray-500 mt-2">
                {t('requested_by_on', { name: row.requestedBy?.name ?? '—', date: when(row.createdAt) })}
              </p>

              {row.note && <p className="text-sm text-gray-700 mt-2 bg-gray-50 rounded-lg px-3 py-2">{row.note}</p>}

              {row.permissions?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {row.permissions.map((k) => (
                    <span key={k} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-primary/10 text-primary">{k}</span>
                  ))}
                </div>
              )}

              {row.status === 'rejected' && row.rejectionReason && (
                <p className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-2">
                  {row.rejectionReason}
                </p>
              )}

              {row.status === 'approved' && row.createdUser && (
                <p className="flex items-center gap-1.5 text-xs text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mt-2">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  {t('account_created_for', { email: row.createdUser.email })}
                </p>
              )}

              {row.status === 'pending' && (
                <div className="flex flex-col sm:flex-row gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => openApprove(row)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
                  >
                    <Check className="h-4 w-4" />
                    {t('approve_and_create')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRejecting(row); setReason(''); }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-red-200 text-red-700 text-sm font-medium hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                    {t('decline')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Approving is the moment the permissions are actually decided, so they are editable
          here rather than taken on trust from the request. */}
      <Modal isOpen={!!granting} onClose={() => setGranting(null)} title={t('approve_and_create')} subtitle={granting?.name} size="md">
        {granting && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{t('approve_creates_account_hint', { email: granting.email })}</p>

            <div>
              <p className="text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5" />
                {t('permissions')}
              </p>
              {(granting.permissions ?? []).length === 0 ? (
                <p className="text-xs text-gray-500">{t('no_permissions_requested')}</p>
              ) : (
                <div className="space-y-1.5">
                  {granting.permissions.map((k) => (
                    <label key={k} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={grantKeys.includes(k)}
                        onChange={(e) =>
                          setGrantKeys((prev) => (e.target.checked ? [...prev, k] : prev.filter((x) => x !== k)))
                        }
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/40"
                      />
                      <span className="font-mono text-gray-800">{k}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button type="button" onClick={() => setGranting(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={confirmApprove}
                disabled={isApproving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {isApproving && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('approve_and_create')}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!rejecting} onClose={() => setRejecting(null)} title={t('decline')} subtitle={rejecting?.name} size="md">
        <div className="space-y-3">
          <label className="block">
            <span className="block text-sm font-medium text-gray-800 mb-1">{t('why_are_you_declining')}</span>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('decline_reason_placeholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            />
            {/* Required by the API too — a refusal the owner cannot read is the same as
                silence from their side. */}
            <span className="block text-xs text-gray-500 mt-1">{t('decline_reason_is_sent_to_owner')}</span>
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setRejecting(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={confirmReject}
              disabled={!reason.trim() || isRejecting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isRejecting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('send_back_to_owner')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserApprovals;
