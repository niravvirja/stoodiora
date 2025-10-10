import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Event } from '@/types/studio';

export const useGlobalEventStats = () => {
  const { currentFirmId } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentFirmId) {
      fetchGlobalEvents();

      // Set up real-time listeners for global stats
      const eventsChannel = supabase
        .channel('global-events-stats')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `firm_id=eq.${currentFirmId}`
        }, () => {
          fetchGlobalEvents();
        })
        .subscribe();

      const paymentsChannel = supabase
        .channel('global-payments-stats')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `firm_id=eq.${currentFirmId}`
        }, () => {
          fetchGlobalEvents();
        })
        .subscribe();

      const closingBalancesChannel = supabase
        .channel('global-closing-balances-stats')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'event_closing_balances',
          filter: `firm_id=eq.${currentFirmId}`
        }, () => {
          fetchGlobalEvents();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(eventsChannel);
        supabase.removeChannel(paymentsChannel);
        supabase.removeChannel(closingBalancesChannel);
      };
    }
  }, [currentFirmId]);

  const fetchGlobalEvents = async () => {
    if (!currentFirmId) return;

    try {
      setLoading(true);

      // Fetch ALL events for global stats with complete data for crew calculations
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          client:clients(id, name, email, phone, address),
          event_staff_assignments(
            *,
            profiles(id, full_name, role),
            freelancers(id, full_name, role)
          ),
          quotation_source:quotations(id, quotation_details),
          payments:payments!payments_event_id_fkey(*),
          event_closing_balances(*)
        `)
        .eq('firm_id', currentFirmId)
        .order('event_date', { ascending: false });

      if (error) throw error;
      setEvents((data as unknown as Event[]) || []);
    } catch (error) {
      console.error('Error fetching global event stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return { events, loading };
};