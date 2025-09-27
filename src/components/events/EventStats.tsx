
import StatsGrid from '@/components/ui/stats-grid';
import { Calendar01Icon, DollarCircleIcon, Tick02Icon, CheckmarkCircle02Icon } from 'hugeicons-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useGlobalEventStats } from '@/hooks/useGlobalEventStats';

import { StatsSkeleton } from '@/components/ui/skeleton';

const EventStats = () => {
  const { currentFirmId } = useAuth();
  const { events, loading: globalLoading } = useGlobalEventStats();
  const [paymentBreakdowns, setPaymentBreakdowns] = useState<any>({});
  const [closedAmount, setClosedAmount] = useState(0);

  useEffect(() => {
    if (currentFirmId && events.length > 0) {
      fetchPaymentBreakdowns();
      fetchClosedAmount();
      
      // Set up real-time listener for closing balances
      const closingBalancesChannel = supabase
        .channel('event-stats-closing-balances')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'event_closing_balances',
          filter: `firm_id=eq.${currentFirmId}`
        }, () => {
          
          fetchClosedAmount();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(closingBalancesChannel);
      };
    }
  }, [currentFirmId, events]);

  const fetchPaymentBreakdowns = async () => {
    if (!currentFirmId) return;

    try {
      // Get payment breakdowns for events
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, payment_method, event_id')
        .eq('firm_id', currentFirmId)
        .in('event_id', events.map(e => e.id));

      const eventIds = events.map(e => e.id);
      const eventPayments = payments?.filter(p => eventIds.includes(p.event_id)) || [];

      // Calculate breakdown from payments table
      const paymentsBreakdown = eventPayments.reduce((acc, payment) => {
        if (payment.payment_method === 'Cash') {
          acc.cash += payment.amount || 0;
        } else {
          acc.digital += payment.amount || 0;
        }
        return acc;
      }, { cash: 0, digital: 0 });

      // CRITICAL: Also include advance amounts from events table
      const advanceBreakdown = events.reduce((acc, event) => {
        if (event.advance_amount && event.advance_amount > 0) {
          // Use the correct property name from the Event type
          const advancePaymentMethod = (event as any).advance_payment_method || 'Cash';
          if (advancePaymentMethod === 'Cash') {
            acc.cash += event.advance_amount;
          } else {
            acc.digital += event.advance_amount;
          }
        }
        return acc;
      }, { cash: 0, digital: 0 });

      // Combine payments + advance amounts for total revenue breakdown
      const totalRevenueBreakdown = {
        cash: paymentsBreakdown.cash + advanceBreakdown.cash,
        digital: paymentsBreakdown.digital + advanceBreakdown.digital
      };


      setPaymentBreakdowns({ totalRevenue: totalRevenueBreakdown });
    } catch (error) {
      // Error fetching payment breakdowns
    }
  };

  const fetchClosedAmount = async () => {
    if (!currentFirmId) return;

    try {
      const { data: closingBalances } = await supabase
        .from('event_closing_balances')
        .select('closing_amount, event_id')
        .eq('firm_id', currentFirmId)
        .in('event_id', events.map(e => e.id));

      const totalClosed = closingBalances?.reduce((sum, balance) => 
        sum + (balance.closing_amount || 0), 0) || 0;
      
      setClosedAmount(totalClosed);
    } catch (error) {
      // Error fetching closed amount
    }
  };

  const calculateEventStats = () => {
    const totalEvents = events.length;
    const totalRevenue = events.reduce((sum, event) => sum + (event.total_amount || 0), 0);
    const confirmedEvents = events.filter(e => e.total_amount && e.total_amount > 0).length;
    const completedEvents = events.filter(event => new Date(event.event_date) <= new Date()).length;

    return { totalEvents, totalRevenue, confirmedEvents, completedEvents };
  };

  const stats = calculateEventStats();

  if (globalLoading) {
    return <StatsSkeleton />;
  }

  return (
    <StatsGrid stats={[
      {
        title: "Total Events",
        value: stats.totalEvents,
        icon: <Calendar01Icon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary"
      },
      {
        title: "Total Revenue",
        value: `₹${stats.totalRevenue.toLocaleString()}`,
        icon: <DollarCircleIcon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary",
        paymentBreakdown: paymentBreakdowns.totalRevenue
      },
      {
        title: "Completed Events",
        value: stats.completedEvents,
        icon: <CheckmarkCircle02Icon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary"
      },
      {
        title: "Closed Amount",
        value: `₹${closedAmount.toLocaleString()}`,
        icon: <DollarCircleIcon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary"
      }
    ]} />
  );
};

export default EventStats;
