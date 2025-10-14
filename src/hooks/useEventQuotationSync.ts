import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to ensure events with quotation_source_id have their quotation_details populated
 * This is critical for crew indicator and assignment validation to work correctly
 */
export const useEventQuotationSync = (events: any[]) => {
  const [syncedEvents, setSyncedEvents] = useState(events);

  useEffect(() => {
    const syncQuotationDetails = async () => {
      // Immediately set current events to avoid UI flicker; enrich details asynchronously
      setSyncedEvents(events);

      if (!events || events.length === 0) {
        return;
      }

      // Find events that have quotation_source_id but no quotation_details
      const eventsNeedingSync = events.filter(event => 
        event.quotation_source_id && !event.quotation_details
      );

      if (eventsNeedingSync.length === 0) {
        return;
      }

      // Batch fetch quotation details for all events that need them
      const quotationIds = eventsNeedingSync.map(event => event.quotation_source_id);
      
      try {
        const { data: quotations, error } = await supabase
          .from('quotations')
          .select('id, quotation_details')
          .in('id', quotationIds);

        if (error) {
          console.error('Error fetching quotation details:', error);
          setSyncedEvents(events);
          return;
        }

        if (!quotations || quotations.length === 0) {
          setSyncedEvents(events);
          return;
        }

        // Create new events array with updated quotation details to trigger re-renders
        const updatedEvents = events.map(event => {
          if (!event.quotation_source_id || event.quotation_details) {
            return event;
          }
          
          const quotation = quotations.find(q => q.id === event.quotation_source_id);
          if (quotation?.quotation_details) {
            return {
              ...event,
              quotation_details: quotation.quotation_details,
              _dataLoaded: true // Mark as loaded to trigger crew completeness re-check
            };
          }
          
          return event;
        });

        setSyncedEvents(updatedEvents);

      } catch (error) {
        console.error('Error syncing quotation details:', error);
        setSyncedEvents(events);
      }
    };

    syncQuotationDetails();
  }, [events]);

  return syncedEvents;
};
