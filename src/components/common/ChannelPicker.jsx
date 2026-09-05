import React from 'react';
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
    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
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
      className="mt-0.5 accent-primary"
    />
    <span className="min-w-0">
      <span className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
        <Icon size={14} /> {label}
      </span>
      {(reason || sub) && (
        <span className={`block text-xs mt-0.5 ${reason ? 'text-amber-700' : 'text-gray-500'}`}>
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
  const { data: sms, isLoading } = useGetSmsBalanceQuery(houseOwnerId || undefined);

  const gatewayMissing = sms && !sms.gatewayConfigured;
  const noBalance = sms && sms.balance <= 0;

  const smsBlockedReason = !smsAvailable
    ? (smsUnavailableReason || 'Not available for this recipient')
    : gatewayMissing
      ? 'No SMS gateway is set up yet'
      : noBalance
        ? 'No SMS balance left — ask an administrator to top it up'
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
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Send via</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <ChannelOption
          channel="email" icon={Mail} label="Email" sub="Always available"
          disabled={false} checked={value.includes('email')} onToggle={toggle}
        />
        <ChannelOption
          channel="sms"
          icon={MessageSquare}
          label="SMS"
          checked={value.includes('sms')}
          onToggle={toggle}
          disabled={smsDisabled}
          reason={smsBlockedReason}
          sub={
            isLoading
              ? 'Checking balance…'
              : sms
                ? `${sms.balance} SMS remaining`
                : undefined
          }
        />
      </div>

      {/* A long or Bengali message costs more than one SMS, so "remaining" is not the same
          as "messages you can send". Warn while it still matters. */}
      {sms && sms.balance > 0 && sms.balance <= (sms.lowBalanceThreshold ?? 5) && value.includes('sms') && (
        <p className="mt-2 text-xs text-amber-700 flex items-start gap-1.5">
          <AlertTriangle size={12} className="shrink-0 mt-0.5" />
          <span>
            Only {sms.balance} SMS left. A long message, or one written in Bangla, uses more than one.
          </span>
        </p>
      )}

      {note && value.includes('sms') && (
        <p className="mt-2 text-xs text-gray-500">{note}</p>
      )}

      {isLoading && (
        <p className="mt-2 text-xs text-gray-400 flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin" /> Checking SMS availability…
        </p>
      )}
    </div>
  );
};

export default ChannelPicker;
