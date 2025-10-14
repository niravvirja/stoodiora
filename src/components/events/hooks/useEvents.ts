
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Event } from '@/types/studio';

export const useEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataReadyForRender, setDataReadyForRender] = useState(false);
  const { profile } = useAuth();

  const { currentFirmId } = useAuth();

  const loadEvents = async () => {
    if (!currentFirmId) return;

    setLoading(true);
    setDataReadyForRender(false);
    
    try {
      // Load events with quotation details, payments, and closing balances inline
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          client:clients(
            id,
            name,
            email,
            phone,
            address,
            firm_id,
            created_at,
            updated_at,
            notes
          ),
          quotation_source:quotations(
            id,
            quotation_details
          ),
          payments(*),
          event_closing_balances(*)
        `)
        .eq('firm_id', currentFirmId)
        .order('event_date', { ascending: false });

      if (error) {
        throw error;
      }

      // Fetch staff assignments and missing quotation details in parallel
      const eventIds = data?.map(event => event.id) || [];
      const eventsNeedingQuotationDetails = data?.filter(event => 
        event.quotation_source_id && !(event.quotation_source as any)?.[0]?.quotation_details
      ) || [];

      const [staffAssignmentsResponse, quotationDetailsResponse] = await Promise.allSettled([
        // Fetch staff assignments
        eventIds.length > 0 ? supabase
          .from('event_staff_assignments')
          .select(`
            *,
            staff:profiles!event_staff_assignments_staff_id_fkey(id, full_name, role),
            freelancer:freelancers!event_staff_assignments_freelancer_id_fkey(id, full_name, role, phone, email)
          `)
          .in('event_id', eventIds) : Promise.resolve({ data: [] }),
        
        // Fetch missing quotation details
        eventsNeedingQuotationDetails.length > 0 ? supabase
          .from('quotations')
          .select('id, quotation_details')
          .in('id', eventsNeedingQuotationDetails.map(e => e.quotation_source_id)) : Promise.resolve({ data: [] })
      ]);

      const staffAssignmentsData = staffAssignmentsResponse.status === 'fulfilled' 
        ? staffAssignmentsResponse.value?.data || [] 
        : [];
      
      const quotationDetailsData = quotationDetailsResponse.status === 'fulfilled' 
        ? quotationDetailsResponse.value?.data || [] 
        : [];

      // Process events with all required data loaded
      const processedEvents = (data || []).map(event => {
        // Add staff assignments to each event
        const eventStaffAssignments = staffAssignmentsData.filter(
          assignment => assignment.event_id === event.id
        );
        
        // Get quotation details from inline query or separate fetch
        let quotationDetails = (event.quotation_source as any)?.[0]?.quotation_details || null;
        
        // If not found inline and event has quotation_source_id, get from separate fetch
        if (!quotationDetails && event.quotation_source_id) {
          const quotationData = quotationDetailsData.find(q => q.id === event.quotation_source_id);
          quotationDetails = quotationData?.quotation_details || null;
        }
        
        return {
          ...event,
          quotation_details: quotationDetails,
          event_staff_assignments: eventStaffAssignments,
          _dataLoaded: true // Mark as fully loaded for crew completeness check
        };
      });
      
      // Only set state when ALL data is loaded and processed
      setEvents(processedEvents as unknown as Event[]);
      setDataReadyForRender(true);
    } catch (error: any) {
      // Error handling - removed console.log for performance
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();

    if (!currentFirmId) return;

    // Set up real-time listeners for events, payments, and closing balances
    const eventsChannel = supabase
      .channel('events-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'events',
        filter: `firm_id=eq.${currentFirmId}`
      }, () => {
        loadEvents();
      })
      .subscribe();

    const paymentsChannel = supabase
      .channel('payments-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payments',
        filter: `firm_id=eq.${currentFirmId}`
      }, () => {
        loadEvents();
      })
      .subscribe();

    const closingBalancesChannel = supabase
      .channel('closing-balances-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'event_closing_balances',
        filter: `firm_id=eq.${currentFirmId}`
      }, () => {
        loadEvents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(closingBalancesChannel);
    };
  }, [currentFirmId]);

  return {
    events,
    loading,
    loadEvents,
    dataReadyForRender
  };
};
