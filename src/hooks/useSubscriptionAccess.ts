import { useSubscription } from '@/hooks/useSubscription';
import { useFirmState } from '@/hooks/useFirmState';
import { useAuth } from '@/components/auth/AuthProvider';

export const useSubscriptionAccess = () => {
  const { user } = useAuth();
  const { currentFirmId } = useFirmState(user?.id);
  const { subscription, loading, canWrite } = useSubscription(currentFirmId || undefined);

  // Can view data if:
  // 1. Has active subscription, OR
  // 2. Had a subscription before (subscribedOnce = true) regardless of current status
  const canViewData = canWrite || (subscription?.subscribedOnce === true);

  // Can edit existing data if can view data
  const canEditData = canViewData;

  // Can create new entries only if has active subscription
  const canCreateNew = canWrite;

  // Can export PDFs only if has active subscription
  const canExport = canWrite;

  // Should show the blocking modal for trial users only
  const shouldBlock = !loading && subscription?.status === 'expired' && !subscription?.subscribedOnce;

  return {
    subscription,
    loading,
    canViewData,
    canEditData,
    canCreateNew,
    canExport,
    shouldBlock,
    isExpiredPaidUser: subscription?.status === 'expired' && subscription?.subscribedOnce === true
  };
};