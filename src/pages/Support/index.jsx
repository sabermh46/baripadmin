import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { Check, Clock, LifeBuoy, MessageCircle, Send, Settings2, WifiOff } from 'lucide-react';
import { useAuth } from '../../hooks';
import { useGetSupportChannelsQuery } from '../../store/api/supportApi';
import { apiErrorMessage } from '../../utils/apiError';
import { showMessageInLanguage } from '../../utils/showMessageInLanguage';
import { buildChannelUrl, buildSupportMessage, CHANNEL_STYLE, displayTarget } from '../../utils/supportLinks';

/**
 * Customer support: pick WhatsApp or Messenger, write the message here, and the app opens
 * with it already typed. There is no messaging inside Bari Porichalona. The conversation
 * happens in the user's own WhatsApp or Messenger, and all this page adds is who they are
 * (see utils/supportLinks.js), so support can help without first asking.
 *
 * Reachable while a subscription is blocked (Layout lets /support through the paywall), and
 * offline from the saved copy of the channel list, since both are when people need help.
 */
const MAX_LENGTH = 1000;

const SupportPage = () => {
  const { t } = useTranslation();
  const { user, hasPermission } = useAuth();
  const { data: channels = [], isLoading, error, refetch } = useGetSupportChannelsQuery();
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState('');

  const roleSlug = user?.role?.slug;
  const canManage = roleSlug === 'web_owner' || roleSlug === 'developer' || (roleSlug === 'staff' && hasPermission('support.manage'));

  // One channel needs no choosing. An explicit choice wins, and falls back if it vanished.
  const selected = channels.find((c) => c.id === selectedId) ?? (channels.length === 1 ? channels[0] : null);
  const style = selected ? CHANNEL_STYLE[selected.type] ?? CHANNEL_STYLE.whatsapp : null;

  const fullMessage = useMemo(() => buildSupportMessage({ message, user, t }), [message, user, t]);
  const canSend = !!selected && message.trim().length > 0;

  const send = async () => {
    if (!canSend) return;
    const url = buildChannelUrl(selected, fullMessage);

    // Messenger does not always fill the text in; the clipboard is the backup.
    if (selected.type === 'messenger') {
      try {
        await navigator.clipboard?.writeText(fullMessage);
        toast.info(t('support_copied'));
      } catch {
        // Clipboard refused (no permission, not a secure context): the link still carries it.
      }
    }

    // A new tab keeps this page (and the typed message) where it was. On a phone, wa.me and
    // m.me hand over to the installed app. If the browser refuses a new window (an installed
    // app on some platforms), open it in place instead.
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) window.location.assign(url);
    toast.success(t('support_opened', { app: style.name }));
  };

  return (
    <div className="mx-auto w-full max-w-2xl py-2 md:py-4">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-800 md:text-2xl">
            <LifeBuoy className="h-6 w-6 text-primary-500" />
            {t('support')}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{t('support_subtitle')}</p>
        </div>
        {canManage && (
          <Link
            to="/admin/support-channels"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('support_manage_channels')}</span>
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-[68px] animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : error && channels.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center">
          <WifiOff className="mx-auto h-7 w-7 text-slate-400" />
          <p className="mt-3 text-sm text-slate-600">{showMessageInLanguage(apiErrorMessage(error, t('error_loading_notifications')))}</p>
          <button type="button" onClick={refetch} className="mt-3 text-sm font-medium text-primary-600 hover:underline">
            {t('retry')}
          </button>
        </div>
      ) : channels.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <MessageCircle className="h-5 w-5 text-slate-400" />
          </div>
          <p className="mt-3 text-sm font-medium text-slate-800">{t('support_no_channels')}</p>
          {canManage && (
            <>
              <p className="mt-1 text-sm text-slate-500">{t('support_no_channels_manager')}</p>
              <Link to="/admin/support-channels" className="mt-3 inline-block text-sm font-medium text-primary-600 hover:underline">
                {t('support_add_channel')}
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          {/* 1. Where to */}
          <h2 className="mb-2 text-sm font-medium text-slate-700">{t('support_choose_channel')}</h2>
          <div role="radiogroup" aria-label={t('support_choose_channel')} className="space-y-2">
            {channels.map((c) => {
              const s = CHANNEL_STYLE[c.type] ?? CHANNEL_STYLE.whatsapp;
              const active = selected?.id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSelectedId(c.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left transition-colors ${
                    active ? 'border-primary-400 ring-2 ring-primary-100' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${s.tint}`}>
                    <MessageCircle className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800">{c.label}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {s.name} · {displayTarget(c)}
                    </span>
                    {c.hours && (
                      <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="h-3 w-3" />
                        {c.hours}
                      </span>
                    )}
                  </span>
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      active ? 'border-primary-500 bg-primary-500 text-white' : 'border-slate-300'
                    }`}
                  >
                    {active && <Check className="h-3 w-3" />}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 2. What to say */}
          {selected && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
              <label htmlFor="support-message" className="text-sm font-medium text-slate-700">
                {t('support_your_message')}
              </label>
              <textarea
                id="support-message"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
                rows={5}
                placeholder={t('support_message_placeholder')}
                className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
              />
              <div className="mt-1 flex justify-between gap-2 text-xs text-slate-400">
                <span>{t('support_signature_note')}</span>
                <span className="shrink-0 tabular-nums">
                  {message.length}/{MAX_LENGTH}
                </span>
              </div>

              {message.trim() && (
                <details className="mt-3 group">
                  <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">
                    {t('support_preview')}
                  </summary>
                  <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 font-sans text-sm text-slate-700">
                    {fullMessage}
                  </pre>
                </details>
              )}

              <button
                type="button"
                onClick={send}
                disabled={!canSend}
                className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${style.button}`}
              >
                <Send className="h-4 w-4" />
                {t('support_open_app', { app: style.name })}
              </button>
              <p className="mt-2 text-xs text-slate-500">
                {selected.type === 'whatsapp' ? t('support_whatsapp_hint') : t('support_messenger_hint')}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SupportPage;
