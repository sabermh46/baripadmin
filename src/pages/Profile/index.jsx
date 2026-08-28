import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  Bell, BellOff, BellRing, Calendar, CheckCircle2, KeyRound, Link2, Mail, Send, ShieldAlert, ShieldCheck, Type, UserCog,
} from 'lucide-react';
import { useAuth } from '../../hooks';
import { useLinkGoogleAccountMutation, useSetPasswordMutation, useUploadAvatarMutation } from '../../store/api/authApi';
import { setUser } from '../../store/slices/authSlice';
import push from '../../services/push';
import Btn from '../../components/common/Button';
import GoogleButton from '../../components/common/GoogleButton';
import { apiErrorMessage } from '../../utils/apiError';
import { showMessageInLanguage } from '../../utils/showMessageInLanguage';
import ProfileHero from './ProfileHero';
import RoleImpact from './RoleImpact';
import { FONT_SCALES, readFontScale, writeFontScale } from '../../utils/fontScale';

const Card = ({ icon: Icon, title, subtitle, children }) => (
  <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
    <div className="px-4 sm:px-5 py-3 border-b border-gray-100">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </h2>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
    <div className="p-4 sm:p-5">{children}</div>
  </section>
);

const Row = ({ label, children }) => (
  <div className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-100 last:border-0 min-w-0">
    <span className="text-sm text-gray-500 shrink-0">{label}</span>
    <span className="text-sm font-medium text-gray-900 text-right truncate min-w-0">{children}</span>
  </div>
);

const Pill = ({ ok, children }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
      ok ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'
    }`}
  >
    {ok ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
    {children}
  </span>
);

const inputClass =
  'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none';

const ProfilePage = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [fontScale, setFontScale] = useState(readFontScale);
  const dispatch = useDispatch();

  const [setPasswordMutation, { isLoading: isSettingPassword }] = useSetPasswordMutation();
  const [uploadAvatar, { isLoading: isUploadingAvatar }] = useUploadAvatarMutation();
  useLinkGoogleAccountMutation();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [pushStatus, setPushStatus] = useState('checking');

  // Reads the answer; does not write it. Three of these branches resolve without awaiting
  // anything, so a version that called setPushStatus inline set state synchronously from
  // inside the effect body below. Returning the value instead means every write happens in a
  // callback, and the caller decides whether it is still interested.
  const readPushStatus = async () => {
    if (!push.isSupported) return 'unsupported';
    if (Notification.permission === 'denied') return 'blocked';
    if (Notification.permission !== 'granted') return 'pending';

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription ? 'subscribed' : 'not_subscribed';
  };

  useEffect(() => {
    // navigator.serviceWorker.ready can settle long after a quick visit to this page; the
    // original had nothing stopping it setting state on an unmounted component.
    let alive = true;
    readPushStatus().then((status) => { if (alive) setPushStatus(status); });

    return () => { alive = false; };
  }, []);

  const handleSubscribe = async () => {
    setPushStatus('subscribing');
    await push.subscribeUser();
    setPushStatus(await readPushStatus());
  };

  const handleUnsubscribe = async () => {
    setPushStatus('unsubscribing');
    await push.unsubscribeUser();
    setPushStatus(await readPushStatus());
  };

  const handleTest = async () => {
    const result = await push.sendTest();
    if (result?.success === false) toast.error(t('test_notification_failed'));
    else toast.success(t('test_notification_sent'));
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error(t('passwords_do_not_match'));
      return;
    }
    try {
      await setPasswordMutation({ password }).unwrap();
      toast.success(t('password_set_successfully'));
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(showMessageInLanguage(apiErrorMessage(error, t('failed_to_set_password'))));
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarError('');

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const result = await uploadAvatar(formData).unwrap();
      dispatch(setUser({ ...user, metadata: { ...(user.metadata || {}), avatarPath: result.avatarPath } }));
    } catch (err) {
      setAvatarError(showMessageInLanguage(apiErrorMessage(err, t('failed_to_upload_avatar'))));
    }
  };

  const joined = user?.createdAt ? new Date(user.createdAt) : null;
  const canSetPassword = user?.needsPasswordSetup;

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-6">
      <ProfileHero
        user={user}
        avatarPath={user?.metadata?.avatarPath}
        googleAvatar={user?.avatarUrl}
        onPickAvatar={handleAvatarChange}
        isUploading={isUploadingAvatar}
        error={avatarError}
      />

      <RoleImpact />

      {/* One column on a phone, two from `sm` up. The old page mixed md:col-span-2 and
          md:col-span-3 inside a two-column grid, so the third card claimed a track that did
          not exist and the row heights never lined up. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card icon={UserCog} title={t('personal_information')}>
          <Row label={t('name')}>{user?.name || t('not_set')}</Row>
          <Row label={t('email')}>{user?.email}</Row>
          <Row label={t('role')}>{user?.role?.name}</Row>
          <Row label={t('account_created')}>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              {joined && !Number.isNaN(joined.getTime()) ? joined.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
            </span>
          </Row>
        </Card>

        <Card icon={KeyRound} title={t('security')}>
          <Row label={t('password')}>
            <Pill ok={!user?.needsPasswordSetup}>{user?.needsPasswordSetup ? t('not_set') : t('set')}</Pill>
          </Row>
          <Row label={t('google_account')}>
            <Pill ok={!!user?.googleId}>{user?.googleId ? t('linked') : t('not_linked')}</Pill>
          </Row>

          {canSetPassword ? (
            <form onSubmit={handleSetPassword} className="space-y-2.5 mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500">{t('set_a_password_hint')}</p>
              <input
                type="password"
                placeholder={t('new_password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={inputClass}
              />
              <input
                type="password"
                placeholder={t('confirm_password')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={inputClass}
              />
              <button
                type="submit"
                disabled={isSettingPassword}
                className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {t('set_password')}
              </button>
            </form>
          ) : (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <Btn href="/change-password">{t('change_password')}</Btn>
            </div>
          )}
        </Card>

        <Card icon={Link2} title={t('account_linking')} subtitle={t('connect_external_services_for_fast_secure_login')}>
          {user?.googleId ? (
            <p className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-green-200 bg-green-50 text-sm font-medium text-green-800">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {t('google_account_linked')}
            </p>
          ) : (
            <GoogleButton
              onClick={() => window.open(`${import.meta.env.VITE_APP_API_URL}/auth/google?link=true`, '_self')}
            />
          )}
        </Card>

        {/* This whole section existed in the old file as state and handlers — pushStatus,
            handleSubscribe, handleUnsubscribe, handleTest — and was never rendered anywhere.
            checkPushStatus() ran on every mount, woke the service worker, and displayed
            nothing. The controls are the ones that were already written; they simply had no
            markup to live in. */}
        {/* Applied by scaling the root font size, so the boxes move with the words —
            see utils/fontScale.js. Written on click rather than behind a save button:
            the effect is the page you are looking at, so a preview IS the confirmation. */}
        <Card icon={Type} title={t('text_size')} subtitle={t('text_size_hint')}>
          <div className="grid grid-cols-4 gap-2">
            {Object.keys(FONT_SCALES).map((key) => {
              const active = fontScale === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFontScale(writeFontScale(key))}
                  aria-pressed={active}
                  className={`rounded-lg border py-3 transition-colors ${
                    active
                      ? 'border-primary bg-primary/5 text-primary font-semibold'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {/* Each button previews its own size — the label is the sample. */}
                  <span style={{ fontSize: `${FONT_SCALES[key].px}px` }}>{t(`text_size_${key}`)}</span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card icon={Bell} title={t('notifications')} subtitle={t('push_notifications_hint')}>
          {pushStatus === 'unsupported' ? (
            <p className="text-sm text-gray-500">{t('push_not_supported')}</p>
          ) : pushStatus === 'blocked' ? (
            <p className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <BellOff className="h-4 w-4 mt-0.5 shrink-0" />
              {t('push_blocked_in_browser')}
            </p>
          ) : (
            <div className="space-y-3">
              <Row label={t('status')}>
                <Pill ok={pushStatus === 'subscribed'}>
                  {pushStatus === 'subscribed' ? t('push_on') : t('push_off')}
                </Pill>
              </Row>

              <div className="flex flex-col sm:flex-row gap-2">
                {pushStatus === 'subscribed' ? (
                  <>
                    <button
                      type="button"
                      onClick={handleUnsubscribe}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <BellOff className="h-4 w-4" />
                      {t('turn_off')}
                    </button>
                    <button
                      type="button"
                      onClick={handleTest}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Send className="h-4 w-4" />
                      {t('send_test')}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubscribe}
                    disabled={pushStatus === 'subscribing'}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
                  >
                    <BellRing className="h-4 w-4" />
                    {t('turn_on')}
                  </button>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      <p className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
        <Mail className="h-3 w-3" />
        {t('profile_contact_admin_hint')}
      </p>
    </div>
  );
};

export default ProfilePage;
