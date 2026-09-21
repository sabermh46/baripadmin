import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle, Building2, Check, Clock, Copy, Eye, EyeOff, Inbox, KeyRound, Loader2,
  Mail, MessageSquare, Phone, RefreshCw, ShieldCheck, User, X,
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

  // Credentials, decided at approval time. Empty password = let the server generate one,
  // which is what this screen did unconditionally before.
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [channels, setChannels] = useState(['email']);
  // Set only when the server hands the password back, which it does exactly when no channel
  // carried it. That is the one moment this credential is recoverable, so it gets a panel
  // rather than a toast that can be missed.
  const [issued, setIssued] = useState(null);

  const { data, isLoading } = useGetUserApprovalsQuery({ status: tab === 'all' ? undefined : tab });
  const [approve, { isLoading: isApproving }] = useApproveUserApprovalMutation();
  const [reject, { isLoading: isRejecting }] = useRejectUserApprovalMutation();

  const rows = data?.data ?? [];
  const pendingCount = data?.meta?.pending ?? 0;
  // A gateway has to exist before SMS is worth offering as a choice.
  const smsConfigured = data?.meta?.sms?.configured ?? false;

  const canSms = smsConfigured && !!granting?.phone;
  const smsBlockedReason = smsConfigured ? 'sms_no_phone_on_request' : 'sms_not_configured_warning';

  const toggleChannel = (key) =>
    setChannels((prev) => (prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]));

  // 12 chars from an unambiguous alphabet — no O/0 or l/1, because this gets read off a
  // screen and typed, or dictated over a phone.
  const generatePassword = () => {
    const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const bytes = crypto.getRandomValues(new Uint32Array(12));
    setPassword(Array.from(bytes, (b) => alphabet[b % alphabet.length]).join(''));
    setShowPassword(true);
  };

  const openApprove = (row) => {
    setGrantKeys(row.permissions ?? []);
    setPassword('');
    setShowPassword(false);
    // SMS is only offered when there is a gateway AND a number to send to, so the default
    // never silently includes a channel that cannot run.
    setChannels(['email']);
    setGranting(row);
  };

  const confirmApprove = async () => {
    try {
      const res = await approve({
        id: granting.id,
        permissions: grantKeys,
        // Omitted rather than sent empty: the server reads absent as "generate one".
        ...(password.trim() ? { password: password.trim() } : {}),
        channels,
      }).unwrap();

      const name = res?.data?.createdUser?.name ?? granting.name;
      const delivery = res?.delivery ?? {};

      // A channel that failed is not a failed approval — the account exists either way, and
      // saying only "created" would hide an SMS that never went.
      const failed = Object.entries(delivery).filter(([, r]) => r && !r.ok);
      if (failed.length) {
        toast.warn(
          `${t('caretaker_account_created', { name })} ${failed
            .map(([channel, r]) => `${t(`channel_${channel}`)}: ${r.message || r.reason}`)
            .join(' · ')}`
        );
      } else {
        toast.success(t('caretaker_account_created', { name }));
      }

      setGranting(null);

      // Nothing delivered it, so this is the only copy that will ever exist.
      if (res?.password) {
        setIssued({ name, email: granting.email, password: res.password });
      }
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

            {/* Password. Blank means the server generates one — the behaviour this screen
                had unconditionally before, kept as the default so the quick path stays one
                click. */}
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5" />
                {t('password')}
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('password_leave_blank_to_generate')}
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-9 text-sm outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t('hide') : t('show')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t('generate')}
                </button>
              </div>
              {password.trim() && password.trim().length < 8 && (
                <p className="mt-1 text-xs text-red-600">{t('password_min_8')}</p>
              )}
            </div>

            {/* Where the credentials go. Nothing ticked is a legitimate choice — the
                password then comes back on screen for the admin to hand over themselves. */}
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1.5">{t('send_credentials_via')}</p>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={channels.includes('email')}
                    onChange={() => toggleChannel('email')}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/40"
                  />
                  <Mail className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-gray-800">{granting.email}</span>
                </label>

                <label className={`flex items-center gap-2 text-xs ${canSms ? '' : 'opacity-50'}`}>
                  <input
                    type="checkbox"
                    checked={canSms && channels.includes('sms')}
                    disabled={!canSms}
                    onChange={() => toggleChannel('sms')}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/40"
                  />
                  <MessageSquare className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-gray-800">{granting.phone || t('no_phone_number')}</span>
                </label>

                {/* Why it is greyed out, rather than leaving the admin to guess. */}
                {!canSms && <p className="pl-6 text-[11px] text-amber-700">{t(smsBlockedReason)}</p>}

                {/* The SMS is charged to the owner who asked for this caretaker, not to the
                    platform. Worth saying before the click, not after the invoice. */}
                {canSms && channels.includes('sms') && (
                  <p className="pl-6 text-[11px] text-gray-500">
                    {t('sms_billed_to_owner', { name: granting.requestedBy?.name ?? '' })}
                  </p>
                )}

                {channels.length === 0 && (
                  <p className="flex items-start gap-1 pt-0.5 text-[11px] text-amber-700">
                    <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
                    {t('no_channel_password_shown_once')}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button type="button" onClick={() => setGranting(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={confirmApprove}
                disabled={isApproving || (!!password.trim() && password.trim().length < 8)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {isApproving && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('approve_and_create')}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* The password exists in exactly one place now: this dialog.

          It is shown only when the server handed it back, which it does only when no channel
          carried it — so this is never a second copy of something already emailed. Closing
          it loses the credential for good, which is why it is a modal that must be dismissed
          deliberately rather than a toast that times out. */}
      <Modal
        isOpen={!!issued}
        onClose={() => setIssued(null)}
        title={t('account_created')}
        subtitle={issued?.name}
        size="md"
      >
        {issued && (
          <div className="space-y-3">
            <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
              <AlertTriangle className="mt-px h-4 w-4 shrink-0 text-amber-500" />
              {t('credentials_shown_once_warning')}
            </p>

            <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">{t('email')}</p>
                <p className="font-mono text-sm text-gray-900 break-all">{issued.email}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">{t('password')}</p>
                <p className="font-mono text-sm text-gray-900 break-all">{issued.password}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  // Clipboard access can be refused (insecure origin, denied permission), and
                  // a silent failure here would have the admin close the dialog believing they
                  // had copied a credential they cannot get back.
                  navigator.clipboard
                    ?.writeText(`${issued.email} / ${issued.password}`)
                    .then(() => toast.success(t('copied')))
                    .catch(() => toast.error(t('copy_failed_select_manually')));
                }}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Copy className="h-4 w-4" />
                {t('copy')}
              </button>
              <button
                type="button"
                onClick={() => setIssued(null)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                {t('saved_it')}
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
