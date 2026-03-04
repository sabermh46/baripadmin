import { useMemo } from 'react';
import { useAuth } from '.';
import { useGetAppFeePaymentsQuery } from '../store/api/appFeeApi';

const selectWarningDayAdminPending = (payments = []) => {
  const todayStr = new Date().toISOString().slice(0, 10);

  const pending = payments.filter((p) => p.status === 'pending');

  const adminPending = pending.filter((p) => {
    const role = p.metadata?.createdBy?.role;
    return role === 'web_owner' || role === 'staff';
  });

  if (!adminPending.length) return null;

  const warningCandidates = adminPending.filter((p) => {
    const base = p.start_date || p.due_date;
    if (!base) return false;
    const days = typeof p.subscription_days === 'number' ? p.subscription_days : 30;
    const baseDate = new Date(base);
    if (Number.isNaN(baseDate.getTime())) return false;
    const warningDate = new Date(baseDate);
    warningDate.setDate(warningDate.getDate() + days);
    const warningStr = warningDate.toISOString().slice(0, 10);
    return warningStr < todayStr;
  });

  if (!warningCandidates.length) return null;

  const sorted = [...warningCandidates].sort((a, b) => {
    const aDate = a.start_date || a.due_date || a.created_at;
    const bDate = b.start_date || b.due_date || b.created_at;
    if (!aDate || !bDate) return 0;
    return new Date(aDate) - new Date(bDate);
  });

  return sorted[0] || null;
};

export const useAdminPendingAppFee = () => {
  const { user, isHouseOwner, isCaretaker } = useAuth();
  const enabled = !!user?.id && (isHouseOwner || isCaretaker);

  const { data, isLoading, isFetching, error } = useGetAppFeePaymentsQuery(
    { page: 1, limit: 20, status: 'pending' },
    { skip: !enabled }
  );

  const pendingPayment = useMemo(
    () => (enabled ? selectWarningDayAdminPending(data?.data || []) : null),
    [enabled, data]
  );


  return {
    pendingPayment,
    isLoading: isLoading || isFetching,
    error,
    // hasPendingAdminPayment: !!pendingPayment,
  };
};

export default useAdminPendingAppFee;

