import React, { useState } from 'react';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useFirmState } from '@/hooks/useFirmState';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { 
  Time01Icon, 
  Alert01Icon, 
  CreditCardIcon,
  CrownIcon,
  Loading03Icon
} from 'hugeicons-react';

export const SubscriptionStatusFloat: React.FC = () => {
  const { user } = useAuth();
  const { currentFirmId } = useFirmState(user?.id);
  const { 
    subscription, 
    loading, 
    initialized,
    isTrialExpiring, 
    isSubscriptionExpiring, 
    daysUntilExpiry 
  } = useSubscriptionStatus(currentFirmId || undefined);
  const navigate = useNavigate();
  const [showDialog, setShowDialog] = useState(false);

  // Don't show if not initialized or loading
  if (!initialized || loading || !subscription) {
    return null;
  }

  // Show for trial users (always show trial status)
  if (subscription.status === 'trial') {
    // Always show trial status - don't return null here
  }

  // Show for expired subscriptions
  else if (subscription.status === 'expired') {
    // Always show expired status - don't return null here
  }

  // Only hide for active paid subscriptions that are not expiring
  else if (subscription.status === 'active' && !isSubscriptionExpiring) {
    return null;
  }

  const getStatusConfig = () => {
    if (subscription.status === 'expired') {
      return {
        icon: subscription.subscribedOnce ? CreditCardIcon : Alert01Icon,
        bgColor: 'bg-destructive',
        hoverColor: 'hover:bg-destructive/90',
        shadowColor: 'shadow-destructive/50',
        title: 'Subscription Expired',
        message: subscription.subscribedOnce 
          ? 'Your subscription has expired. Upgrade now to continue using all features.'
          : 'Your 3-day trial has expired. Upgrade now or your data will be deleted in 2 days.',
        buttonText: 'Upgrade Now',
        pulse: false
      };
    }
    
    if (subscription.status === 'trial') {
      if (isTrialExpiring) {
        return {
          icon: Time01Icon,
          bgColor: 'bg-orange-500',
          hoverColor: 'hover:bg-orange-600',
          shadowColor: 'shadow-orange-500/50',
          title: 'Trial Expiring Soon',
          message: `Your trial expires in ${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'day' : 'days'}. Upgrade now to avoid interruption.`,
          buttonText: 'Upgrade Now',
          pulse: false
        };
      } else {
        return {
          icon: Time01Icon,
          bgColor: 'bg-primary',
          hoverColor: 'hover:bg-primary/90',
          shadowColor: 'shadow-primary/50',
          title: 'Trial Active',
          message: `${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'day' : 'days'} remaining in your trial. Upgrade anytime for continued access.`,
          buttonText: 'View Plans',
          pulse: false
        };
      }
    }
    
    if (subscription.status === 'active' && isSubscriptionExpiring) {
      return {
        icon: CrownIcon,
        bgColor: 'bg-yellow-500',
        hoverColor: 'hover:bg-yellow-600',
        shadowColor: 'shadow-yellow-500/50',
        title: 'Subscription Expiring Soon',
        message: `Your subscription expires in ${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'day' : 'days'}. Renew now to avoid interruption.`,
        buttonText: 'Renew Now',
        pulse: false
      };
    }

    return null;
  };

  const statusConfig = getStatusConfig();
  
  if (!statusConfig) {
    return null;
  }

  const { icon: Icon, bgColor, hoverColor, shadowColor, title, message, buttonText, pulse } = statusConfig;

  return (
    <>
      {/* Floating Status Button */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50">
        <Button
          onClick={() => setShowDialog(true)}
            className={`
            ${bgColor} ${hoverColor} text-white border-0
            h-12 w-6 rounded-l-full rounded-r-none
            shadow-lg ${shadowColor} hover:shadow-xl
            transition-all duration-300 ease-out
            hover:w-8 group
          `}
          size="sm"
        >
          <Icon 
            className={`
              h-4 w-4 transition-all duration-300
              group-hover:scale-110
            `} 
          />
        </Button>
      </div>

      {/* Status Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 p-3 rounded-full bg-muted w-fit">
              <Icon className={`h-8 w-8 text-foreground`} />
            </div>
            <DialogTitle className="text-lg font-semibold">
              {title}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2">
              {message}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center space-y-4 py-4">
            <Badge 
              variant={subscription.status === 'expired' ? 'destructive' : 'secondary'} 
              className="text-sm px-3 py-1"
            >
              {subscription.status === 'trial' ? 'Trial Account' : 
               subscription.status === 'expired' ? 'Subscription Expired' : 'Premium Account'}
            </Badge>
            
            {daysUntilExpiry !== null && subscription.status !== 'expired' && (
              <div className="text-center">
                <span className="text-2xl font-bold text-primary">{daysUntilExpiry}</span>
                <p className="text-sm text-muted-foreground">
                  {daysUntilExpiry === 1 ? 'day' : 'days'} remaining
                </p>
              </div>
            )}
            
            <div className="text-xs text-muted-foreground text-center">
              Need help? Contact: 
              <a 
                href="mailto:team.stoodiora@gmail.com" 
                className="text-primary hover:underline ml-1"
              >
                team.stoodiora@gmail.com
              </a>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                navigate('/subscription');
                setShowDialog(false);
              }}
              className="w-full flex items-center space-x-2"
            >
              <CreditCardIcon className="h-4 w-4" />
              <span>{buttonText}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};