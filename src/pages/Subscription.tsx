import React, { useState, useEffect } from 'react';
import TopNavbar from '@/components/layout/TopNavbar';
import { useAuth } from '@/components/auth/AuthProvider';
import { useFirmState } from '@/hooks/useFirmState';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Tick01Icon, 
  CreditCardIcon, 
  Shield01Icon, 
  Time01Icon,
  Alert01Icon,
  CrownIcon,
  Calendar01Icon
} from 'hugeicons-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const Subscription = () => {
  const { user } = useAuth();
  const { currentFirmId, currentFirm } = useFirmState(user?.id);
  const { 
    subscription, 
    loading, 
    createRazorpayOrder, 
    verifyPayment,
    checkSubscription,
    isTrialExpiring,
    isSubscriptionExpiring,
    daysUntilExpiry
  } = useSubscription(currentFirmId || undefined);
  const { toast } = useToast();
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [portalData, setPortalData] = useState<any>(null);
  const [showPortalDialog, setShowPortalDialog] = useState(false);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => setRazorpayLoaded(true);
    script.onerror = () => {
      toast({
        title: "Error",
        description: "Failed to load payment gateway. Please refresh the page.",
        variant: "destructive",
      });
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [toast]);

  const handleUpgrade = async (planType: 'monthly' | 'annual') => {
    if (!razorpayLoaded) {
      toast({
        title: "Error",
        description: "Payment gateway is loading. Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }

    if (!currentFirmId || !user) {
      toast({
        title: "Error",
        description: "Please select a firm first.",
        variant: "destructive",
      });
      return;
    }

    setProcessingPlan(planType);

    try {
      // Create Razorpay order
      const orderData = await createRazorpayOrder(planType);
      
      const options = {
        key: orderData.keyId, // Razorpay key ID from backend
        amount: orderData.amount,
        currency: orderData.currency,
        name: currentFirm?.name || 'Studio Management',
        description: `${planType === 'monthly' ? 'Monthly' : 'Annual'} Subscription`,
        order_id: orderData.orderId,
        handler: async (response: any) => {
          try {
            await verifyPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );
            // Payment successful - refresh subscription status
            await checkSubscription();
            setProcessingPlan(null);
            toast({
              title: "Payment Successful!",
              description: "Your subscription has been activated.",
              variant: "default",
            });
          } catch (error) {
            console.error('Payment verification failed:', error);
            setProcessingPlan(null);
            toast({
              title: "Payment Failed",
              description: "There was an issue processing your payment. Please try again.",
              variant: "destructive",
            });
          }
        },
        prefill: {
          email: user.email,
        },
        theme: {
          color: '#c4b28d',
        },
        modal: {
          ondismiss: () => {
            setProcessingPlan(null);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Error creating order:', error);
      setProcessingPlan(null);
    }
  };

  const handleUpgradeFromActive = async (planType: 'monthly' | 'annual') => {
    setProcessingPlan('change');
    
    try {
      await handleUpgrade(planType);
    } finally {
      setProcessingPlan(null);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!currentFirmId) {
      toast({
        title: "Error",
        description: "Please select a firm first.",
        variant: "destructive",
      });
      return;
    }

    setProcessingPlan('download');

    try {
      const { data, error } = await supabase.functions.invoke('download-invoice', {
        body: { firmId: currentFirmId },
      });

      if (error) {
        throw new Error(error.message || 'Failed to download invoice');
      }

      // Generate proper PDF using the existing PDF system
      const { generateSubscriptionInvoicePDF } = await import('@/components/subscription/SubscriptionInvoicePDF');
      
      // Get firm data for PDF header/footer
      const { data: firm } = await supabase
        .from('firms')
        .select('name, description, logo_url, header_left_content, footer_content')
        .eq('id', currentFirmId)
        .single();

      await generateSubscriptionInvoicePDF(data, firm);

      toast({
        title: "Invoice Downloaded",
        description: "Your invoice has been downloaded successfully.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : 'Failed to download invoice.',
        variant: "destructive",
      });
    } finally {
      setProcessingPlan(null);
    }
  };

  const handleChangePlan = async () => {
    if (!currentFirmId) {
      toast({
        title: "Error",
        description: "Please select a firm first.",
        variant: "destructive",
      });
      return;
    }

    setProcessingPlan('manage');

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        body: { firmId: currentFirmId },
      });

      if (error) {
        throw new Error(error.message || 'Failed to load plan options');
      }

      setPortalData(data);
      setShowPortalDialog(true);
    } catch (error) {
      console.error('Error loading plan options:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to load plan options.',
        variant: "destructive",
      });
    } finally {
      setProcessingPlan(null);
    }
  };

  const generateInvoiceHTML = (invoiceData: any) => {
    // This function is no longer needed as we're using proper PDF generation
    return '';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = () => {
    if (!subscription) return null;

    switch (subscription.status) {
      case 'trial':
        return <StatusBadge status="trial-active" variant="subtle" />;
      case 'active':
        return <StatusBadge status="subscription-active" variant="subtle" />;
      case 'expired':
        return <StatusBadge status="subscription-expired" variant="subtle" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <TopNavbar>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Loading subscription details...</span>
          </div>
        </div>
      </TopNavbar>
    );
  }

  return (
    <TopNavbar>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Subscription</h1>
            <p className="text-muted-foreground">
              Manage your plan
            </p>
          </div>
          <div className="flex items-center">
            {getStatusBadge()}
          </div>
        </div>

        {/* Current Status Card */}
        {subscription && (
          <Card>
            <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield01Icon className="h-5 w-5" />
              <span>Current Status</span>
            </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div className="mt-1">
                    {getStatusBadge()}
                  </div>
                </div>
                
                {subscription.status === 'active' && subscription.planType && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Plan</p>
                    <p className="text-lg font-semibold capitalize">
                      {subscription.planType} Plan
                    </p>
                  </div>
                )}
                
                {daysUntilExpiry !== null && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {subscription.status === 'trial' ? 'Trial expires in' : 'Renews in'}
                    </p>
                    <p className="text-lg font-semibold">
                      {daysUntilExpiry} {daysUntilExpiry === 1 ? 'day' : 'days'}
                    </p>
                  </div>
                )}
              </div>

              {(subscription.trialEndAt || subscription.subscriptionEndAt) && (
                <div className="pt-4 border-t">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Calendar01Icon className="h-4 w-4" />
                    <span>
                      {subscription.status === 'trial' 
                        ? `Trial ends on ${formatDate(subscription.trialEndAt!)}`
                        : subscription.subscriptionEndAt 
                        ? `Subscription ends on ${formatDate(subscription.subscriptionEndAt)}`
                        : ''
                      }
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Alert for expiring/expired subscriptions */}
        {(isTrialExpiring || isSubscriptionExpiring || subscription?.status === 'expired') && (
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/30">
            <Alert01Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription>
              {subscription?.status === 'expired' ? (
                <span>
                  Your subscription has expired. Upgrade now to continue using all features.
                  {!subscription.subscribedOnce && (
                    <strong className="text-red-600 dark:text-red-400"> Data will be deleted in 2 days if no payment is made.</strong>
                  )}
                </span>
              ) : isTrialExpiring ? (
                <span>Your trial is expiring soon. Upgrade now to avoid interruption.</span>
              ) : (
                <span>Your subscription is expiring soon. Consider renewing to avoid interruption.</span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Active Subscription Management */}
        {subscription?.status === 'active' && !isSubscriptionExpiring && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CrownIcon className="h-5 w-5 text-primary" />
                <span>Active Subscription</span>
              </CardTitle>
              <CardDescription>
                Your {subscription.planType} subscription is active
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Subscription Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Current Plan</p>
                  <p className="text-lg font-semibold capitalize">{subscription.planType} Plan</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Next Billing</p>
                  <p className="text-lg font-semibold">
                    {subscription.subscriptionEndAt ? formatDate(subscription.subscriptionEndAt) : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Amount</p>
                  <p className="text-lg font-semibold">
                    ₹{subscription.planType === 'monthly' ? '749' : '8,199'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div className="mt-1">
                    <StatusBadge status="subscription-active" variant="subtle" />
                  </div>
                </div>
              </div>

              {/* Simple Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  variant="outline" 
                  className="flex items-center space-x-2"
                  onClick={handleDownloadInvoice}
                  disabled={processingPlan === 'download'}
                >
                  {processingPlan === 'download' ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                  <span>Download Invoice</span>
                </Button>

                <Button 
                  variant="outline"
                  className="flex items-center space-x-2"
                  onClick={handleChangePlan}
                  disabled={processingPlan === 'manage'}
                >
                  {processingPlan === 'manage' ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CreditCardIcon className="h-4 w-4" />
                  )}
                  <span>Change Plan</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pricing Plans - Only show when needed */}
        {(subscription?.status === 'trial' || 
          subscription?.status === 'expired' || 
          (isSubscriptionExpiring && daysUntilExpiry !== null && daysUntilExpiry <= 3)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Monthly Plan */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Monthly Plan</span>
                <div className="text-right">
                  <div className="text-2xl font-bold">₹749</div>
                  <div className="text-sm text-muted-foreground">per month</div>
                </div>
              </CardTitle>
              <CardDescription>
                Perfect for getting started with all features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                 <div className="flex items-center space-x-2">
                   <Tick01Icon className="h-4 w-4 text-green-600 dark:text-green-400" />
                   <span className="text-sm">Unlimited events and clients</span>
                 </div>
                 <div className="flex items-center space-x-2">
                   <Tick01Icon className="h-4 w-4 text-green-600 dark:text-green-400" />
                   <span className="text-sm">Task management</span>
                 </div>
                 <div className="flex items-center space-x-2">
                   <Tick01Icon className="h-4 w-4 text-green-600 dark:text-green-400" />
                   <span className="text-sm">Financial tracking</span>
                 </div>
                 <div className="flex items-center space-x-2">
                   <Tick01Icon className="h-4 w-4 text-green-600 dark:text-green-400" />
                   <span className="text-sm">WhatsApp integration</span>
                 </div>
                 <div className="flex items-center space-x-2">
                   <Tick01Icon className="h-4 w-4 text-green-600 dark:text-green-400" />
                   <span className="text-sm">Google Sheets sync</span>
                 </div>
              </div>
              
              <Separator />
              
              <Button
                className="w-full"
                onClick={() => handleUpgrade('monthly')}
                disabled={processingPlan === 'monthly' || !razorpayLoaded || (subscription?.status === 'active' && subscription?.planType === 'monthly')}
              >
                {processingPlan === 'monthly' ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : subscription?.status === 'active' && subscription?.planType === 'monthly' ? (
                  <div className="flex items-center space-x-2">
                    <CrownIcon className="h-4 w-4" />
                    <span>Current Plan</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <CreditCardIcon className="h-4 w-4" />
                    <span>Upgrade to Monthly</span>
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Annual Plan */}
          <Card className="relative border-primary">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground">
                Save ₹1,498
              </Badge>
            </div>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Annual Plan</span>
                <div className="text-right">
                  <div className="text-2xl font-bold">₹8,199</div>
                  <div className="text-sm text-muted-foreground">
                    <span className="line-through">₹8,988</span> for 12 months
                  </div>
                </div>
              </CardTitle>
              <CardDescription>
                Best value with 2 months free
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                 <div className="flex items-center space-x-2">
                   <Tick01Icon className="h-4 w-4 text-green-600 dark:text-green-400" />
                   <span className="text-sm">Everything in Monthly Plan</span>
                 </div>
                 <div className="flex items-center space-x-2">
                   <Tick01Icon className="h-4 w-4 text-green-600 dark:text-green-400" />
                   <span className="text-sm">Savings worth ₹789</span>
                 </div>
                 <div className="flex items-center space-x-2">
                   <Tick01Icon className="h-4 w-4 text-green-600 dark:text-green-400" />
                   <span className="text-sm">Priority email support</span>
                 </div>
                 <div className="flex items-center space-x-2">
                   <Tick01Icon className="h-4 w-4 text-green-600 dark:text-green-400" />
                   <span className="text-sm">Dedicated customer support</span>
                 </div>
                 <div className="flex items-center space-x-2">
                   <Tick01Icon className="h-4 w-4 text-green-600 dark:text-green-400" />
                   <span className="text-sm">Early access to new features</span>
                 </div>
              </div>
              
              <Separator />
              
              <Button
                className="w-full"
                onClick={() => handleUpgrade('annual')}
                disabled={processingPlan === 'annual' || !razorpayLoaded || (subscription?.status === 'active' && subscription?.planType === 'annual')}
              >
                {processingPlan === 'annual' ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : subscription?.status === 'active' && subscription?.planType === 'annual' ? (
                  <div className="flex items-center space-x-2">
                    <CrownIcon className="h-4 w-4" />
                    <span>Current Plan</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <CreditCardIcon className="h-4 w-4" />
                    <span>Upgrade to Annual</span>
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Support Information */}
        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
            <CardDescription>
              Contact our support team for any questions about your subscription
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Email:</span>
                <a 
                  href="mailto:pritphoto1985@gmail.com" 
                  className="text-sm text-primary hover:underline"
                >
                  pritphoto1985@gmail.com
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Phone:</span>
                <a 
                  href="tel:+917265072603" 
                  className="text-sm text-primary hover:underline"
                >
                  +91 7265072603
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Management Portal Dialog */}
        <Dialog open={showPortalDialog} onOpenChange={setShowPortalDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Shield01Icon className="h-5 w-5" />
                <span>Change Plan</span>
              </DialogTitle>
              <DialogDescription>
                Switch to a different subscription plan
              </DialogDescription>
            </DialogHeader>

            {portalData && (
              <div className="space-y-4">
                {/* Available Plans */}
                <div className="grid grid-cols-1 gap-4">
                  {portalData.availablePlans.map((plan: any) => (
                    <div key={plan.id} className={`p-4 border rounded-lg ${
                      portalData.subscription.planType === plan.id ? 'border-primary bg-primary/5' : 'border-muted'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{plan.name}</h4>
                        {portalData.subscription.planType === plan.id && (
                          <Badge variant="secondary">Current</Badge>
                        )}
                      </div>
                      <div className="text-xl font-bold mb-1">₹{plan.price.toLocaleString()}</div>
                      <p className="text-sm text-muted-foreground mb-3">{plan.duration}</p>
                      {portalData.subscription.planType !== plan.id && (
                        <Button 
                          className="w-full" 
                          onClick={() => {
                            setShowPortalDialog(false);
                            handleUpgrade(plan.id as 'monthly' | 'annual');
                          }}
                        >
                          Switch to {plan.name}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPortalDialog(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TopNavbar>
  );
};

export default Subscription;