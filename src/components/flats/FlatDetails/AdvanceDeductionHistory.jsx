import React from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Eye, Mail, MessageSquare, Pencil, Send, Undo2 } from 'lucide-react';
import TkSymbol from '../../common/TkSymbol';

/**
 * What an advance payment has been spent on.
 *
 * Deliberately a plain table rather than the shared `Table` component: this sits nested inside
 * a row of that same component, and reusing it would nest a scroll container and a set of
 * empty-state and loading behaviours that make no sense one level down. It is also short by
 * nature - an advance covers a handful of months - so none of what `Table` provides is needed.
 *
 * A negative `deducted_amount` is a RESTORE: money returned to the advance when a rent payment
 * was unwound. Those are shown as credits rather than hidden, because a history that only ever
 * counts down stops reconciling against the balance beside it.
 *
 * @param {Array}    deductions  AdvanceLedgerService history entries, oldest first
 * @param {Function} onView      (entry) => void
 * @param {Function} onSend      (entry) => void
 * @param {Function} [onEdit]    (entry) => void — omitted until stage 4 lands
 */
const AdvanceDeductionHistory = ({ deductions = [], onView, onSend, onEdit }) => {
  const { t } = useTranslation();

  if (!deductions.length) {
    return (
      <p className="px-4 py-3 text-sm text-subdued">
        {t('no_advance_deductions') || 'Nothing has been deducted from this advance yet.'}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-subdued/20 text-left text-xs uppercase tracking-wide text-subdued">
            <th className="px-3 py-2 font-semibold">{t('date')}</th>
            <th className="px-3 py-2 font-semibold">{t('deduction_for_month')}</th>
            <th className="px-3 py-2 text-right font-semibold">{t('amount')}</th>
            <th className="px-3 py-2 text-right font-semibold">{t('remaining')}</th>
            <th className="px-3 py-2 text-center font-semibold">{t('notified') || 'Notified'}</th>
            <th className="px-3 py-2 text-right font-semibold">{t('actions')}</th>
          </tr>
        </thead>
        <tbody>
          {deductions.map((entry) => {
            const amount = parseFloat(entry.deducted_amount) || 0;
            const isRestore = amount < 0;
            // Reverted entries stay visible: a deduction that happened and was then undone is
            // two facts, and hiding the row leaves a balance that moved for no stated reason.
            const isReverted = entry.status === 'reverted';

            return (
              <tr
                key={entry.id}
                className={`border-b border-subdued/10 last:border-0 ${isReverted ? 'opacity-60' : ''}`}
              >
                <td className="whitespace-nowrap px-3 py-2">
                  {entry.date ? format(new Date(entry.date), 'dd MMM yyyy') : '-'}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-subdued">
                  {entry.for_month || '-'}
                </td>
                <td
                  className={`whitespace-nowrap px-3 py-2 text-right font-semibold ${
                    isRestore ? 'text-green-600' : 'text-text'
                  } ${isReverted ? 'line-through' : ''}`}
                >
                  {isRestore && '+'}
                  <TkSymbol />{Math.abs(amount).toLocaleString()}
                  {isReverted && (
                    <span className="ml-2 rounded-full bg-subdued/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-subdued">
                      {t('reverted') || 'Reverted'}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-subdued">
                  <TkSymbol />{(parseFloat(entry.remaining_after) || 0).toLocaleString()}
                </td>

                {/* Counts, not ticks: a notice can legitimately go more than once, and "sent
                    twice" is exactly what someone asks about later. */}
                <td className="px-3 py-2">
                  <div className="flex items-center justify-center gap-3 text-xs">
                    <span
                      className={`flex items-center gap-1 ${entry.emailed > 0 ? 'text-green-600' : 'text-subdued/50'}`}
                      title={t('emailed') || 'Emailed'}
                    >
                      <Mail size={13} />
                      {entry.emailed > 0 ? entry.emailed : '-'}
                    </span>
                    <span
                      className={`flex items-center gap-1 ${entry.smsed > 0 ? 'text-green-600' : 'text-subdued/50'}`}
                      title={t('smsed') || 'SMS sent'}
                    >
                      <MessageSquare size={13} />
                      {entry.smsed > 0 ? entry.smsed : '-'}
                    </span>
                  </div>
                </td>

                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onView?.(entry)}
                      className="rounded p-1.5 text-blue-600 transition-colors hover:bg-blue-50"
                      title={t('view') || 'View'}
                    >
                      <Eye size={16} />
                    </button>

                    {/* A restore is money coming back; there is no deduction notice to send
                        about it, and offering one would produce a notice that reads backwards. */}
                    {!isRestore && !isReverted && (
                      <button
                        type="button"
                        onClick={() => onSend?.(entry)}
                        className="rounded p-1.5 text-primary transition-colors hover:bg-primary/10"
                        title={entry.emailed > 0 ? (t('send_again') || 'Send again') : (t('send') || 'Send')}
                      >
                        <Send size={16} />
                      </button>
                    )}

                    {onEdit && !isRestore && !isReverted && (
                      <button
                        type="button"
                        onClick={() => onEdit(entry)}
                        className="rounded p-1.5 text-amber-600 transition-colors hover:bg-amber-50"
                        title={t('edit') || 'Edit'}
                      >
                        <Pencil size={16} />
                      </button>
                    )}

                    {isRestore && (
                      <span className="flex items-center gap-1 px-1.5 text-xs text-green-600" title={t('credit_returned') || 'Credit returned'}>
                        <Undo2 size={14} />
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default AdvanceDeductionHistory;
