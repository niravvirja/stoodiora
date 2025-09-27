import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { CheckmarkCircle01Icon, CreditCardIcon, Calendar01Icon, DollarCircleIcon } from 'hugeicons-react';

interface PaymentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: {
    id: string;
    amount: number;
    currency: string;
    paid_at: string;
    status: string;
    razorpay_payment_id: string;
    razorpay_order_id: string;
  };
}

export const PaymentDetailsDialog: React.FC<PaymentDetailsDialogProps> = ({
  open,
  onOpenChange,
  payment,
}) => {
  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const endDate = new Date(payment.paid_at);
  endDate.setMonth(endDate.getMonth() + 1); // Always 1 month for monthly subscription

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
        <DialogTitle className="flex items-center space-x-3">
            <CheckmarkCircle01Icon className="h-6 w-6 text-success" />
            <span>Payment Details</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Badge */}
          <div className="flex justify-center">
            <Badge className="bg-success/20 text-success border-success/50 px-4 py-2 text-sm font-medium">
              Payment Successful
            </Badge>
          </div>

          {/* Payment Overview */}
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <DollarCircleIcon className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-muted-foreground">Amount Paid</span>
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(payment.amount, payment.currency)}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Calendar01Icon className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-muted-foreground">Subscription</span>
                  </div>
                  <p className="text-lg font-semibold">
                    Monthly Subscription
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Valid for 1 month
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transaction Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <CreditCardIcon className="h-5 w-5 text-primary" />
              <span>Transaction Information</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Payment ID</label>
                  <p className="text-sm font-mono bg-muted/50 p-2 rounded border break-all">
                    {payment.razorpay_payment_id}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Order ID</label>
                  <p className="text-sm font-mono bg-muted/50 p-2 rounded border break-all">
                    {payment.razorpay_order_id}
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Activation Date</label>
                  <p className="text-sm p-2">{formatDate(payment.paid_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Valid Until</label>
                  <p className="text-sm p-2">{formatDate(endDate.toISOString())}</p>
                </div>
              </div>
            </div>

            {/* Remove signature section for simplified interface */}
          </div>

          {/* Additional Information */}
          <Card className="bg-muted/30 border-muted">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <CheckmarkCircle01Icon className="h-5 w-5 text-success mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Monthly Subscription Activated</p>
                  <p className="text-xs text-muted-foreground">
                    Your monthly subscription is now active until {formatDate(endDate.toISOString())}. 
                    You'll need to renew before this date to continue using the service.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};