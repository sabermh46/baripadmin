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

  const rows = deductions.map((entry) => {
    const amount = parseFloat(entry.deducted_amount) || 0;
    return {
      entry,
      amount,
      // A negative amount is credit returned when a rent payment was unwound.
      isRestore: amount < 0,
      isReverted: entry.status === 'reverted',
    };
  });

  /** Shared by both layouts so the two can never offer different actions for the same row. */
  const Actions = ({ entry, isRestore, isReverted }) => (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => onView?.(entry)}
        className="rounded p-1.5 text-blue-600 transition-colors hover:bg-blue-50"
        title={t('view') || 'View'}
      >
        <Eye size={16} />
      </button>

      {/* No notice to send about money coming back, and nothing to edit once undone. */}
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
        <span
          className="flex items-center gap-1 px-1.5 text-xs text-green-600"
          title={t('credit_returned') || 'Credit returned'}
        >
          <Undo2 size={14} />
        </span>
      )}
    </div>
  );

  /** Counts, not ticks: a notice can legitimately go more than once. */
  const Notified = ({ entry }) => (
    <div className="flex items-center gap-3 text-xs">
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
  );

  return (
    <>
      {/* Phone: cards. As a table the row's ACTIONS sat behind a horizontal scroll, which is
          the one column someone opens this to use. */}
      <div className="divide-y divide-subdued/10 sm:hidden">
        {rows.map(({ entry, amount, isRestore, isReverted }) => (
          <div key={entry.id} className={`p-3 ${isReverted ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {entry.date ? format(new Date(entry.date), 'dd MMM yyyy') : '-'}
                </p>
                <p className="mt-0.5 text-xs text-subdued">
                  {entry.for_month || '-'}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`text-sm font-semibold ${isRestore ? 'text-green-600' : 'text-text'} ${
                    isReverted ? 'line-through' : ''
                  }`}
                >
                  {isRestore && '+'}
                  <TkSymbol />{Math.abs(amount).toLocaleString()}
                </p>
                <p className="mt-0.5 text-xs text-subdued">
                  {t('remaining')}: <TkSymbol />{(parseFloat(entry.remaining_after) || 0).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <Notified entry={entry} />
              {isReverted && (
                <span className="rounded-full bg-subdued/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-subdued">
                  {t('reverted') || 'Reverted'}
                </span>
              )}
              <Actions entry={entry} isRestore={isRestore} isReverted={isReverted} />
            </div>
          </div>
        ))}
      </div>

      {/* From sm up there is room for the table. */}
      <div className="hidden overflow-x-auto sm:block">
      <table className="w-full text-sm">
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
          {rows.map(({ entry, amount, isRestore, isReverted }) => (
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
              <td className="px-3 py-2">
                <div className="flex justify-center">
                  <Notified entry={entry} />
                </div>
              </td>
              <td className="px-3 py-2">
                <Actions entry={entry} isRestore={isRestore} isReverted={isReverted} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
};

export default AdvanceDeductionHistory;
