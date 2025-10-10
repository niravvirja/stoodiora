import React, { useState, useEffect } from 'react';
import TopNavbar from '@/components/layout/TopNavbar';
import { useAuth } from '@/components/auth/AuthProvider';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useSubscriptionPayments } from '@/hooks/useSubscriptionPayments';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
import { PaymentHistorySection } from '@/components/subscription/PaymentHistorySection';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Calendar01Icon, Shield01Icon, CreditCardIcon, CheckmarkCircle01Icon, Clock02Icon } from 'hugeicons-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const Subscription = () => {
  const { user, currentFirmId, currentFirm } = useAuth();
  const { 
    subscription, 
    loading, 
    checkSubscription,
    daysUntilExpiry
  } = useSubscriptionStatus(currentFirmId || undefined);
  const { createRazorpayOrder, verifyPayment } = useSubscriptionPayments(currentFirmId || undefined);
  const { plans, loading: plansLoading } = useSubscriptionPlans();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  // Get monthly plan from database
  const monthlyPlan = plans.find(plan => plan.duration_months === 1);

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

  const handleActivation = async () => {
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

    setProcessing(true);

    try {
      // Create Razorpay order for monthly subscription
      const orderData = await createRazorpayOrder('monthly_access');
      
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: currentFirm?.name || 'Studio Management',
        description: 'Monthly Subscription',
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
            setProcessing(false);
            toast({
              title: "Subscription Successful!",
              description: "Your monthly subscription has been activated.",
              variant: "default",
            });
          } catch (error) {
            console.error('Payment verification failed:', error);
            setProcessing(false);
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
            setProcessing(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Error creating order:', error);
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
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

  if (loading || plansLoading) {
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

  const isActivated = subscription?.subscribedOnce === true;

  return (
    <TopNavbar>
      <div className="max-w-4xl mx-auto space-y-4 py-4 px-2 lg:py-8 lg:px-4">
        {/* Header Section */}
        <div className="text-center space-y-4 lg:space-y-6">
          <div className="space-y-2 lg:space-y-4">
            <div className="flex items-center justify-center space-x-3">
              {getStatusBadge()}
            </div>
            <h1 className="text-2xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text">
              {subscription?.status === 'trial' ? 'Trial Active' : isActivated ? 'Subscription Active' : 'Subscription'}
            </h1>
            {monthlyPlan && (
              <p className="text-muted-foreground text-sm lg:text-lg px-4 lg:px-0">
                {isActivated 
                  ? `Your subscription is active and costs ${formatCurrency(monthlyPlan.price)}/month`
                  : `Subscribe for ${formatCurrency(monthlyPlan.price)}/month to unlock full access`}
              </p>
            )}
          </div>
        </div>

        {/* Main Status Card */}
        {subscription && (
          <Card className="border-2 shadow-lg max-w-2xl mx-auto">
            <CardContent className="p-4 lg:p-8">
              <div className="text-center space-y-6">
                
                {isActivated ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center space-x-2 text-success">
                      <CheckmarkCircle01Icon className="h-8 w-8" />
                      <span className="text-2xl font-bold">Active Subscription</span>
                    </div>
                    {subscription.subscriptionEndAt && (
                      <div className="space-y-2">
                        <p className="text-muted-foreground">
                          Active until {formatDate(subscription.subscriptionEndAt)}
                        </p>
                        {new Date(subscription.subscriptionEndAt) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && (
                          <Button
                            onClick={handleActivation}
                            disabled={processing}
                            className="mt-4"
                            size="lg"
                          >
                            {processing ? 'Processing...' : 'Renew Subscription'}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-center space-x-2 text-primary">
                        <Clock02Icon className="h-8 w-8" />
                        <span className="text-2xl font-bold">Trial Active</span>
                      </div>
                      {subscription.trialEndAt && daysUntilExpiry !== null && (
                        <div className="space-y-2">
                          <p className="text-lg font-semibold">
                            {daysUntilExpiry} {daysUntilExpiry === 1 ? 'day' : 'days'} remaining
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Trial ends on {formatDate(subscription.trialEndAt)}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Subscription Offer */}
                    {monthlyPlan && (
                      <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 space-y-4 border border-primary/20">
                        <div className="space-y-2">
                          <div className="text-3xl font-bold text-foreground">
                            {formatCurrency(monthlyPlan.price)}
                          </div>
                          <p className="text-sm text-muted-foreground">Per month</p>
                        </div>
                        
                        <div className="text-left space-y-3">
                          <p className="font-semibold text-foreground">Includes everything:</p>
                          <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-success rounded-full"></div>
                              <span>Unlimited events & clients</span>
                            </li>
                            <li className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-success rounded-full"></div>
                              <span>Complete financial management</span>
                            </li>
                            <li className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-success rounded-full"></div>
                              <span>WhatsApp business integration</span>
                            </li>
                            <li className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-success rounded-full"></div>
                              <span>Staff & freelancer management</span>
                            </li>
                            <li className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-success rounded-full"></div>
                              <span>PDF reports & exports</span>
                            </li>
                          </ul>
                        </div>
                        
                        <Button 
                          onClick={handleActivation}
                          disabled={processing}
                          className="w-full h-10 lg:h-12 text-sm lg:text-lg"
                          size="lg"
                        >
                          {processing ? (
                            <>
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CreditCardIcon className="h-4 w-4 lg:h-5 lg:w-5 mr-2" />
                              <span className="hidden lg:inline">Subscribe Now - </span>
                              {formatCurrency(monthlyPlan.price)}/month
                            </>
                          )}
                        </Button>
                        
                        <p className="text-xs text-muted-foreground">
                          Secure payment via Razorpay • UPI, Cards, Net Banking accepted
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment History */}
        {currentFirmId && (
          <PaymentHistorySection firmId={currentFirmId} />
        )}

        {/* Terms and Privacy */}
        <div className="max-w-4xl mx-auto mt-8 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Terms of Service */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield01Icon className="h-5 w-5" />
                  <span>Terms of Service</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Monthly Access & Billing</h4>
                  <ul className="space-y-1 text-xs">
                    <li>• One-time monthly payments for system access</li>
                    <li>• No auto-renewal or mandate setup required</li>
                    <li>• Payment processed securely via Razorpay</li>
                    <li>• Trial period allows full system access</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">System Usage</h4>
                  <ul className="space-y-1 text-xs">
                    <li>• Unlimited events, clients, and staff management</li>
                    <li>• Data backup and export available anytime</li>
                    <li>• WhatsApp integration subject to WhatsApp policies</li>
                    <li>• Responsible use of system features required</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Account & Data</h4>
                  <ul className="space-y-1 text-xs">
                    <li>• Your studio data remains yours</li>
                    <li>• Account suspension for misuse</li>
                    <li>• Data accessible during paid periods</li>
                    <li>• Manual renewal required each month</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Privacy Policy */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield01Icon className="h-5 w-5" />
                  <span>Privacy Policy</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Data Collection</h4>
                  <ul className="space-y-1 text-xs">
                    <li>• Only business data you enter (events, clients, finances)</li>
                    <li>• Email and phone for account management</li>
                    <li>• Payment information processed by Razorpay</li>
                    <li>• No personal data beyond business operations</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Data Usage</h4>
                  <ul className="space-y-1 text-xs">
                    <li>• Your data used only for providing services</li>
                    <li>• No sharing with third parties except integrations</li>
                    <li>• Analytics for improving system performance</li>
                    <li>• WhatsApp integration for business communications</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Data Security</h4>
                  <ul className="space-y-1 text-xs">
                    <li>• End-to-end encryption for sensitive data</li>
                    <li>• Regular backups and security updates</li>
                    <li>• Industry-standard security practices</li>
                    <li>• You control data access and sharing</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center text-xs text-muted-foreground border-t pt-4">
            <p>By subscribing, you agree to these terms and privacy practices. Last updated: {new Date().toLocaleDateString('en-IN')}</p>
          </div>
        </div>

      </div>
    </TopNavbar>
  );
};

export default Subscription;