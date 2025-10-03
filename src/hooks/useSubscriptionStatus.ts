import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionStatus {
  status: 'trial' | 'active' | 'expired';
  planType: string | null;
  isActive: boolean;
  trialEndAt: string | null;
  graceUntil: string | null;
  subscriptionEndAt: string | null;
  subscribedOnce: boolean;
  lastPaymentAt: string | null;
}

export const useSubscriptionStatus = (firmId?: string) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const checkSubscription = useCallback(async (isBackground = false, retryCount = 0) => {
    if (!user || !firmId) {
      setSubscription(null);
      setInitialized(true);
      return;
    }

    if (!isBackground) setLoading(true);
    setError(null);

    const maxRetries = 3;
    const retryDelay = 1000 * (retryCount + 1); // Progressive delay: 1s, 2s, 3s

    try {
      const { data, error } = await supabase.functions.invoke('check-firm-subscription', {
        body: { firmId },
      });

      if (error) {
        console.error('Edge function returned error:', error);
        throw new Error(error.message || 'Failed to check subscription');
      }
      
      setSubscription(data);
      setInitialized(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      
      // Retry logic for network errors
      if (retryCount < maxRetries && (
        errorMessage.includes('Failed to fetch') || 
        errorMessage.includes('Failed to send a request') ||
        errorMessage.includes('Network error')
      )) {
        setTimeout(() => {
          checkSubscription(isBackground, retryCount + 1);
        }, retryDelay);
        return;
      }
      
      setError(errorMessage);
      setSubscription(null);
      setInitialized(true);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [user, firmId]);

  useEffect(() => {
    checkSubscription(false);
  }, [checkSubscription]);

  // Helper functions
  const isTrialExpiring = useCallback(() => {
    if (!subscription || subscription.status !== 'trial' || !subscription.trialEndAt) {
      return false;
    }
    const trialEnd = new Date(subscription.trialEndAt);
    const now = new Date();
    const hoursUntilExpiry = (trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilExpiry <= 24 && hoursUntilExpiry > 0;
  }, [subscription]);

  const isSubscriptionExpiring = useCallback(() => {
    if (!subscription || subscription.status !== 'active' || !subscription.subscriptionEndAt) {
      return false;
    }
    const subscriptionEnd = new Date(subscription.subscriptionEndAt);
    const now = new Date();
    const daysUntilExpiry = (subscriptionEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  }, [subscription]);

  const canWrite = useCallback(() => {
    return subscription?.isActive || false;
  }, [subscription]);

  const getDaysUntilExpiry = useCallback(() => {
    if (!subscription) return null;
    
    let expiryDate: Date;
    if (subscription.status === 'trial' && subscription.trialEndAt) {
      expiryDate = new Date(subscription.trialEndAt);
    } else if (subscription.status === 'active' && subscription.subscriptionEndAt) {
      expiryDate = new Date(subscription.subscriptionEndAt);
    } else {
      return null;
    }

    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysUntilExpiry);
  }, [subscription]);

  return {
    subscription,
    loading,
    initialized,
    error,
    checkSubscription,
    isTrialExpiring: isTrialExpiring(),
    isSubscriptionExpiring: isSubscriptionExpiring(),
    canWrite: canWrite(),
    daysUntilExpiry: getDaysUntilExpiry(),
  };
};