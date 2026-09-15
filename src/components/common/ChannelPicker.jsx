import React from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, MessageSquare, AlertTriangle, Loader2 } from 'lucide-react';
import { useGetSmsBalanceQuery } from '../../store/api/smsApi';

/**
 * Hoisted rather than declared inside ChannelPicker: a component created during render is a
 * new type on every keystroke, so React unmounts and remounts it — which would drop focus
 * and reset the checkbox mid-interaction.
 */
const ChannelOption = ({ channel, icon: Icon, label, sub, disabled, reason, checked, onToggle }) => (
  <label
    title={reason || undefined}
    className={`flex items-start gap-3 rounded-lg border p-3 min-h-11 transition-colors ${
      disabled
        ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-70'
        : checked
          ? 'border-primary bg-primary/5 cursor-pointer'
          : 'border-gray-200 hover:border-gray-300 cursor-pointer'
    }`}
  >
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={() => onToggle(channel)}
      className="mt-0.5 size-4 shrink-0 accent-primary"
    />
    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-1.5 text-sm font-medium text-gray-800 break-words">
        <Icon size={14} /> {label}
      </span>
      {(reason || sub) && (
        <span className={`mt-0.5 block text-xs break-words ${reason ? 'text-amber-700' : 'text-gray-500'}`}>
          {reason || sub}
        </span>
      )}
    </span>
  </label>
);

/**
 * Choose how a message goes out: email, SMS, or both.
 *
 * SMS is the only channel here that costs the house owner something, so the option is not
 * offered blindly. The balance and the gateway state are fetched up front and the SMS choice
 * explains itself — disabled with a reason when there is no gateway, no balance or no phone
 * number, rather than being selectable and then failing on submit.
 *
 * Email cannot be turned off while SMS is off: a send with no channel at all is not a state
 * worth allowing, and silently sending nothing is worse than a greyed-out button.
 *
 * @param {string[]} value            selected channels
 * @param {Function} onChange         (string[]) => void
 * @param {number}   [houseOwnerId]   whose balance to read; omitted when the user IS the owner
 * @param {boolean}  [smsAvailable]   caller-side override, e.g. the renter has no phone
 * @param {string}   [smsUnavailableReason]
 * @param {string}   [note]           e.g. that a PDF cannot go by SMS
 */
const ChannelPicker = ({
  value = ['email'],
  onChange,
  houseOwnerId,
  smsAvailable = true,
  smsUnavailableReason,
  note,
}) => {
  const { t } = useTranslation();
  const { data: sms, isLoading } = useGetSmsBalanceQuery(houseOwnerId || undefined);

  const gatewayMissing = sms && !sms.gatewayConfigured;
  const noBalance = sms && sms.balance <= 0;

  const smsBlockedReason = !smsAvailable
    ? (smsUnavailableReason || t('channel_sms_not_available'))
    : gatewayMissing
      ? t('channel_sms_no_gateway')
      : noBalance
        ? t('channel_sms_no_balance')
        : null;

  const smsDisabled = isLoading || !!smsBlockedReason;

  const toggle = (channel) => {
    const has = value.includes(channel);
    let next = has ? value.filter((c) => c !== channel) : [...value, channel];
    // Never leave nothing selected.
    if (next.length === 0) next = [channel === 'email' ? 'sms' : 'email'];
    onChange?.(next);
  };

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{t('channel_send_via')}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <ChannelOption
          channel="email" icon={Mail} label={t('channel_email')} sub={t('channel_email_always')}
          disabled={false} checked={value.includes('email')} onToggle={toggle}
        />
        <ChannelOption
          channel="sms"
          icon={MessageSquare}
          label={t('channel_sms')}
          checked={value.includes('sms')}
          onToggle={toggle}
          disabled={smsDisabled}
          reason={smsBlockedReason}
          sub={
            isLoading
              ? t('channel_sms_checking')
              : sms
                ? t('channel_sms_remaining', { count: sms.balance })
                : undefined
          }
        />
      </div>

      {/* A long or Bengali message costs more than one SMS, so "remaining" is not the same
          as "messages you can send". Warn while it still matters. */}
      {sms && sms.balance > 0 && sms.balance <= (sms.lowBalanceThreshold ?? 5) && value.includes('sms') && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-700">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          <span>{t('channel_sms_low_balance', { count: sms.balance })}</span>
        </p>
      )}

      {note && value.includes('sms') && (
        <p className="mt-2 text-xs text-gray-500">{note}</p>
      )}

      {isLoading && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
          <Loader2 size={12} className="animate-spin" /> {t('channel_sms_checking_availability')}
        </p>
      )}
    </div>
  );
};

export default ChannelPicker;
