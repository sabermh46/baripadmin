import React, { useState } from 'react';
import { useGetMyAppFeeQuery } from '../../store/api/appFeeApi';
import AppFeeViewEditModal from './AppFeeViewEditModal';
import AppFeeCreateModal from './AppFeeCreateModal';
import ReportPaymentModal from './ReportPaymentModal';
import SubscriptionOverview from './SubscriptionOverview';
import { ContentLoader } from '../../components/common/RouteLoader';
import { useTranslation } from 'react-i18next';

// The "which invoice should this owner act on" rule used to live here as
// selectActionableInvoice(). It now comes back as `actionable` on the same response, so the
// definition — pending, and raised by the platform rather than by the owner — exists once,
// on the server, next to the data it filters.

/**
 * The owner's (or caretaker's) own app-fee page: SubscriptionOverview with the owner's
 * actions wired in. Admins see the same overview per owner in SubscriptionTimelineModal.
 */
const CustomersAppFeePage = () => {
  const { t } = useTranslation();
  const [viewEditId, setViewEditId] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  // The invoice being claimed against, or null. Holds the row itself rather than an id:
  // /app-fees/me already returned it, so re-fetching it to fill a four-field form would
  // be a round trip for data we are looking at.
  const [claimFor, setClaimFor] = useState(null);

  // One request instead of three. The house owner is resolved server-side, which is also
  // what fixes this page for caretakers — it used to send the caretaker's own user id as a
  // house-owner id, so status and due both came back 403 and the panel silently vanished.
  // Backstop only. Push invalidation (App.jsx) covers the instant an admin is notified;
  // this catches the cases push cannot — permission never granted, a lapsed subscription,
  // or a change made by someone else with no notification attached. Paused while the tab is
  // in the background so it costs nothing when nobody is looking.
  const { data, isLoading } = useGetMyAppFeeQuery(undefined, {
    pollingInterval: 20_000,
    skipPollingIfUnfocused: true,
  });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 py-2 md:py-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{t('app_fee_and_subscription')}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{t('app_fee_owner_subtitle')}</p>
      </div>

      {isLoading && !data ? (
        <ContentLoader />
      ) : (
        <SubscriptionOverview
          data={data}
          onPay={setClaimFor}
          onReport={() => setReportOpen(true)}
          onDetails={(id) => setViewEditId({ id })}
        />
      )}

      {reportOpen && (
        <AppFeeCreateModal isOpen onClose={() => setReportOpen(false)} onSuccess={() => setReportOpen(false)} />
      )}

      {/* Keyed and conditionally mounted, so each claim gets a component seeded from its own
          invoice rather than one long-lived form kept in step by an effect. */}
      {claimFor && (
        <ReportPaymentModal
          key={claimFor.id}
          payment={claimFor}
          isOpen
          onClose={() => setClaimFor(null)}
          onSuccess={() => setClaimFor(null)}
        />
      )}

      {/* Read-only from here. The owner's "Details" is a look at the invoice, not an edit of
          it — the edit form belongs to whoever verifies the claim. */}
      <AppFeeViewEditModal
        key={viewEditId?.id ?? 'none'}
        paymentId={viewEditId?.id}
        isOpen={!!viewEditId}
        onClose={() => setViewEditId(null)}
        onSuccess={() => setViewEditId(null)}
      />
    </div>
  );
};

export default CustomersAppFeePage;
