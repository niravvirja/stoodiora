import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

export const useSubscription = (firmId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkSubscription = useCallback(async () => {
    if (!user || !firmId) {
      setSubscription(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('check-firm-subscription', {
        body: { firmId },
      });

      if (error) {
        throw new Error(error.message || 'Failed to check subscription');
      }

      setSubscription(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error checking subscription:', err);
    } finally {
      setLoading(false);
    }
  }, [user, firmId]);

  const createRazorpayOrder = useCallback(async (planType: 'monthly' | 'annual') => {
    if (!user || !firmId) {
      throw new Error('User or firm not available');
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
        body: { planType, firmId },
      });

      if (error) {
        throw new Error(error.message || 'Failed to create order');
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  }, [user, firmId, toast]);

  const verifyPayment = useCallback(async (
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ) => {
    if (!user) {
      throw new Error('User not available');
    }

    try {
      const { data, error } = await supabase.functions.invoke('verify-razorpay-payment', {
        body: {
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
        },
      });

      if (error) {
        throw new Error(error.message || 'Payment verification failed');
      }

      // Refresh subscription status after successful payment
      await checkSubscription();

      toast({
        title: "Payment Successful!",
        description: "Your subscription has been activated.",
        variant: "default",
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment verification failed';
      toast({
        title: "Payment Verification Failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  }, [user, toast, checkSubscription]);

  // Auto-check subscription when firmId changes
  useEffect(() => {
    checkSubscription();
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
    error,
    checkSubscription,
    createRazorpayOrder,
    verifyPayment,
    isTrialExpiring: isTrialExpiring(),
    isSubscriptionExpiring: isSubscriptionExpiring(),
    canWrite: canWrite(),
    daysUntilExpiry: getDaysUntilExpiry(),
  };
};