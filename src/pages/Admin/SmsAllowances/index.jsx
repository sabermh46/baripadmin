import React, { useState } from 'react';
import { toast } from 'react-toastify';
import {
  MessageSquare, Search, Loader2, Save, Plus, Minus, AlertTriangle, CheckCircle2, XCircle,
} from 'lucide-react';
import {
  useGetSmsSettingsQuery,
  useUpdateSmsSettingsMutation,
  useGetSmsAllowancesQuery,
  useAdjustSmsAllowanceMutation,
  useGetSmsLogsQuery,
} from '../../../store/api/smsApi';
import { apiErrorMessage } from '../../../utils/apiError';

const BRAND = '#f9873c';

/**
 * Admin control of the SMS allowance.
 *
 * SMS is the only channel in this app that costs the platform owner money per message, so it
 * is the only one with a balance. This is where that balance is set: a platform-wide default
 * for owners who have not started sending, and a per-owner top-up or clawback for everyone
 * who has.
 */

const AdjustRow = ({ owner, onAdjust, busy }) => {
  const [amount, setAmount] = useState(20);
  const [note, setNote] = useState('');

  const apply = (sign) => {
    const delta = sign * Math.abs(Number(amount) || 0);
    if (!delta) return;
    onAdjust(owner.userId, delta, note.trim() || undefined);
    setNote('');
  };

  const low = owner.balance <= 5;

  return (
    <tr className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/60">
      <td className="px-4 py-3">
        <div className="text-sm font-medium text-gray-800">{owner.name}</div>
        <div className="text-xs text-gray-500">{owner.email}</div>
        {!owner.phone && (
          <div className="text-[11px] text-amber-700 mt-0.5 flex items-center gap-1">
            <AlertTriangle size={11} /> no phone on file
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <span className={`text-lg font-bold tabular-nums ${low ? 'text-amber-600' : 'text-gray-900'}`}>
          {owner.balance}
        </span>
        {/* An owner who has never sent has no row yet — say so, rather than showing a figure
            that looks like a spent balance. */}
        {!owner.provisioned && (
          <div className="text-[11px] text-gray-400">default, not yet used</div>
        )}
      </td>
      <td className="px-4 py-3 text-right text-xs text-gray-500 tabular-nums hidden md:table-cell">
        {owner.totalUsed} / {owner.totalAllocated}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1.5">
          <input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-20 px-2 py-1.5 text-sm text-right border border-gray-200 rounded-lg outline-none focus:border-orange-300"
          />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="w-32 px-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-orange-300 hidden lg:block"
          />
          <button
            type="button"
            title="Add to this owner's balance"
            onClick={() => apply(1)}
            disabled={busy}
            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-40"
          >
            <Plus size={14} />
          </button>
          <button
            type="button"
            title="Take back from this owner's balance"
            onClick={() => apply(-1)}
            disabled={busy}
            className="p-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-40"
          >
            <Minus size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
};

const SmsAllowancesPage = () => {
  const [search, setSearch] = useState('');
  const [showLogs, setShowLogs] = useState(false);

  const { data: settings, isLoading: loadingSettings } = useGetSmsSettingsQuery();
  const [saveSettings, { isLoading: savingSettings }] = useUpdateSmsSettingsMutation();
  const { data: allowances, isFetching } = useGetSmsAllowancesQuery({ search });
  const [adjust, { isLoading: adjusting }] = useAdjustSmsAllowanceMutation();
  const { data: logs } = useGetSmsLogsQuery({ limit: 25 }, { skip: !showLogs });

  const [defaultAllocation, setDefaultAllocation] = useState(null);
  const effectiveDefault = defaultAllocation ?? settings?.defaultAllocation ?? 20;
  const canAllocate = settings?.canAllocate !== false;

  const handleSaveDefault = async () => {
    try {
      await saveSettings({ defaultAllocation: Number(effectiveDefault) }).unwrap();
      toast.success('Default allocation saved.');
      setDefaultAllocation(null);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save the default.'));
    }
  };

  const handleAdjust = async (userId, delta, note) => {
    try {
      const res = await adjust({ userId, delta, note }).unwrap();
      toast.success(`${delta > 0 ? 'Added' : 'Removed'} ${Math.abs(delta)} SMS. New balance: ${res.data.balance}.`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not adjust the balance.'));
    }
  };

  return (
    <div className="pb-6">
      <div className="flex items-center gap-3 mb-5">
        <MessageSquare style={{ color: BRAND }} size={22} />
        <div>
          <h1 className="text-xl font-bold text-gray-800">SMS allowance</h1>
          <p className="text-xs text-gray-500">
            How many SMS each house owner may send. SMS costs money per message, unlike email.
          </p>
        </div>
      </div>

      {/* Gateway state — nothing else here works without one, so it is said first. */}
      {!loadingSettings && settings && !settings.gateway?.configured && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
          <div className="text-sm">
            <p className="font-semibold text-amber-900">No SMS gateway is configured</p>
            <p className="text-amber-800 mt-0.5">
              Balances can be set here, but nothing will send until a gateway is added under
              Notification settings.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">
            Default for new owners
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="10000"
              disabled={!canAllocate}
              value={effectiveDefault}
              onChange={(e) => setDefaultAllocation(e.target.value)}
              className="w-24 px-3 py-2 text-lg font-bold border border-gray-200 rounded-lg outline-none focus:border-orange-300 disabled:bg-gray-50"
            />
            <button
              type="button"
              onClick={handleSaveDefault}
              disabled={savingSettings || !canAllocate || defaultAllocation === null}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-40"
              style={{ backgroundColor: BRAND }}
            >
              {savingSettings ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
            </button>
          </div>
          {/* The lazy-provisioning rule, stated where it matters — an admin raising this will
              otherwise expect every existing owner's balance to jump. */}
          <p className="mt-2 text-[11px] text-gray-500 leading-relaxed">
            Applies to owners who have not sent an SMS yet. Anyone already sending keeps their
            current balance — top those up individually below.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Gateway</p>
          <p className="text-lg font-bold text-gray-900 flex items-center gap-2">
            {settings?.gateway?.configured ? (
              <><CheckCircle2 size={18} className="text-emerald-600" /> {settings.gateway.name}</>
            ) : (
              <><XCircle size={18} className="text-gray-400" /> Not configured</>
            )}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Send log</p>
          <button
            type="button"
            onClick={() => setShowLogs((v) => !v)}
            className="text-sm font-semibold text-orange-700 hover:underline"
          >
            {showLogs ? 'Hide recent messages' : 'Show recent messages'}
          </button>
          <p className="mt-2 text-[11px] text-gray-500">
            Every send, with the segments it was charged.
          </p>
        </div>
      </div>

      {showLogs && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold">Owner</th>
                  <th className="px-4 py-2.5 text-left font-semibold">To</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Context</th>
                  <th className="px-4 py-2.5 text-right font-semibold">SMS used</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {(logs?.data ?? []).map((l) => (
                  <tr key={l.id} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-4 py-2.5 text-gray-800">{l.owner}</td>
                    <td className="px-4 py-2.5 text-gray-600 font-mono text-xs">{l.recipient}</td>
                    <td className="px-4 py-2.5 text-gray-600 text-xs">{l.context.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {l.segments}{!l.charged && <span className="text-[11px] text-gray-400"> (not charged)</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-semibold ${l.status === 'sent' ? 'text-emerald-700' : 'text-red-600'}`}>
                        {l.status}
                      </span>
                      {l.error && <div className="text-[11px] text-red-500 truncate max-w-[240px]">{l.error}</div>}
                    </td>
                  </tr>
                ))}
                {(logs?.data ?? []).length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">Nothing sent yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <Search size={15} className="text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search house owners by name, email or phone"
            className="flex-1 text-sm outline-none bg-transparent"
          />
          {isFetching && <Loader2 size={14} className="animate-spin text-gray-400" />}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold">House owner</th>
                <th className="px-4 py-2.5 text-right font-semibold">Balance</th>
                <th className="px-4 py-2.5 text-right font-semibold hidden md:table-cell">Used / allocated</th>
                <th className="px-4 py-2.5 text-right font-semibold">Adjust</th>
              </tr>
            </thead>
            <tbody>
              {(allowances?.data ?? []).map((owner) => (
                <AdjustRow
                  key={owner.userId}
                  owner={owner}
                  onAdjust={handleAdjust}
                  busy={adjusting || !canAllocate}
                />
              ))}
              {(allowances?.data ?? []).length === 0 && !isFetching && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-400">No house owners found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!canAllocate && (
        <p className="mt-3 text-xs text-amber-700 flex items-center gap-1.5">
          <AlertTriangle size={12} />
          You can view balances but not change them — that needs the <code className="font-mono">sms.allocate</code> permission.
        </p>
      )}
    </div>
  );
};

export default SmsAllowancesPage;
