import React, { useState } from 'react';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useFirmState } from '@/hooks/useFirmState';
import { useAuth } from '@/components/auth/AuthProvider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCardIcon, Alert01Icon, Cancel01Icon } from 'hugeicons-react';
import { useNavigate } from 'react-router-dom';

export const ExpiredSubscriptionNotice: React.FC = () => {
  // This component is no longer needed as SubscriptionStatusFloat handles all subscription notifications
  // To avoid redundant popups, we disable this component
  return null;
};