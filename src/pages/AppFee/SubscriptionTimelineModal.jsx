import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../../components/common/Modal';
import { ContentLoader } from '../../components/common/RouteLoader';
import { useGetMyAppFeeQuery } from '../../store/api/appFeeApi';
import { apiErrorMessage } from '../../utils/apiError';
import { showMessageInLanguage } from '../../utils/showMessageInLanguage';
import SubscriptionOverview from './SubscriptionOverview';

/**
 * An admin's view of one house owner's subscription: the exact overview and timeline that
 * owner sees on their own app-fee page, read-only.
 *
 * Same endpoint as the owner's page (/app-fees/me with house_owner_id), so it is the same
 * status, the same invoices and the same server-built timeline, behind the same access check
 * (web_owner, or staff holding app_fees.view). Fetched only while open.
 *
 * `onOpenInvoice` hands an invoice id to the caller's own details modal. The caller is
 * expected to hide this modal while that one is open (rather than stacking two dialogs) and
 * to show it again afterwards, which keeps the admin's place: see AdminsAppFeePage.
 */
const SubscriptionTimelineModal = ({ houseOwnerId, ownerName, isOpen, onClose, onOpenInvoice }) => {
  const { t } = useTranslation();
  const { data, isLoading, error } = useGetMyAppFeeQuery(houseOwnerId, { skip: !isOpen || !houseOwnerId });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={ownerName || t('tl_title')} subtitle={t('app_fee_and_subscription')} size="lg">
      {isLoading && !data ? (
        <ContentLoader />
      ) : error && !data ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {showMessageInLanguage(apiErrorMessage(error, 'Could not load this subscription.'))}
        </p>
      ) : (
        <SubscriptionOverview data={data} onDetails={onOpenInvoice} />
      )}
    </Modal>
  );
};

export default SubscriptionTimelineModal;
