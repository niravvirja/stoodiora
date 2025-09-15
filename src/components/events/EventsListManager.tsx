import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Calendar01Icon, RefreshIcon } from 'hugeicons-react';
import { Event, TaskFromDB, convertDbTaskToTask } from '@/types/studio';
import { getEventStatus } from '@/lib/event-status-utils';
import CleanEventFormDialog from './CleanEventFormDialog';
import EventPaymentCard from '@/components/payments/EventPaymentCard';
import { PageSkeleton } from '@/components/ui/skeleton';
import PaymentCard from '@/components/payments/PaymentCard';
import { useToast } from '@/hooks/use-toast';
import { generatePaymentInvoicePDF } from '@/components/payments/PaymentInvoicePDFRenderer';
import { shareEventDetails } from '@/lib/event-share-utils';
import { useFirmData } from '@/hooks/useFirmData';
import ShareOptionsDialog from '@/components/common/ShareOptionsDialog';
import { EmptyState } from '@/components/ui/empty-state';
import { EventDeleteConfirmation } from './EventDeleteConfirmation';
import { calculateTotalPaid } from '@/lib/payment-calculator';

const EventsListManager = () => {
  const { profile, currentFirmId } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [optimisticallyDeletedEvents, setOptimisticallyDeletedEvents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedEventForShare, setSelectedEventForShare] = useState<Event | null>(null);
  const [selectedEventForPayment, setSelectedEventForPayment] = useState<Event | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);

  const { toast } = useToast();
  const { firmData } = useFirmData();

  useEffect(() => {
    if (currentFirmId) {
      loadEvents();

      // Set up real-time listeners for payments, closing balances, and event updates
      const paymentsChannel = supabase
        .channel('payments-changes')
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
        .channel('closing-balances-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'event_closing_balances',
          filter: `firm_id=eq.${currentFirmId}`
        }, () => {
          loadEvents();
        })
        .subscribe();

      const eventsChannel = supabase
        .channel('events-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `firm_id=eq.${currentFirmId}`
        }, () => {
          loadEvents();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(paymentsChannel);
        supabase.removeChannel(closingBalancesChannel);
        supabase.removeChannel(eventsChannel);
      };
    }
  }, [currentFirmId]);

  const loadEvents = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          client:clients(*),
          quotation_source:quotations(
            id,
            title,
            quotation_details,
            amount,
            event_date
          ),
          event_staff_assignments(
            staff_id,
            freelancer_id,
            role,
            day_number,
            profiles(full_name),
            freelancer:freelancers(full_name)
          ),
          tasks(*, assigned_staff:profiles!tasks_assigned_to_fkey(full_name), freelancer:freelancers(full_name))
        `)
        .eq('firm_id', currentFirmId)
        .order('event_date', { ascending: false });

      // Separately fetch payments and closing balances to avoid relationship conflicts
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .eq('firm_id', currentFirmId);

      const { data: closingBalancesData } = await supabase
        .from('event_closing_balances')
        .select('*')
        .eq('firm_id', currentFirmId);

      if (error) {
        throw error;
      }

      // Convert the database tasks to proper Task objects and add quotation details
      const processedEvents = data?.map(event => {
        // Handle quotation_source properly - it could be an array or null
        let quotationDetails = null;
        let quotationSource = null;

        if (event.quotation_source) {
          if (Array.isArray(event.quotation_source) && event.quotation_source.length > 0) {
            quotationSource = event.quotation_source[0];
            quotationDetails = quotationSource.quotation_details;
          } else if (!Array.isArray(event.quotation_source)) {
            quotationSource = event.quotation_source;
            quotationDetails = (event.quotation_source as any).quotation_details;
          }
        }

        // Find payments for this event
        const eventPayments = paymentsData?.filter(payment => payment.event_id === event.id) || [];

        // Find closing balances for this event
        const eventClosingBalances = closingBalancesData?.filter(balance => balance.event_id === event.id) || [];

        return {
          ...event,
          quotation_details: quotationDetails,
          quotation_source: quotationSource,
          payments: eventPayments,
          event_closing_balances: eventClosingBalances,
          tasks: event.tasks?.map((task: TaskFromDB) => convertDbTaskToTask(task)) || []
        };
      }) || [];

      setEvents(processedEvents as any);

      // Clear optimistically deleted events that are no longer in the database
      setOptimisticallyDeletedEvents(prev => {
        const currentEventIds = new Set(processedEvents.map(e => e.id));
        const stillDeleted = new Set<string>();
        prev.forEach(deletedId => {
          if (!currentEventIds.has(deletedId)) {
            stillDeleted.add(deletedId);
          }
        });
        return stillDeleted;
      });

    } catch (error: any) {
      toast({
        title: "Error loading events",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setOptimisticallyDeletedEvents(new Set()); // Clear optimistic deletions on refresh
    await loadEvents();
    setRefreshing(false);
    toast({
      title: "Events refreshed",
      description: "Event data has been updated successfully.",
    });
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingEvent(null);
  };

  const handlePaymentRecord = (event: Event) => {
    setSelectedEventForPayment(event);
    setPaymentDialogOpen(true);
  };

  const handlePaymentCollected = () => {
    loadEvents();
    setPaymentDialogOpen(false);
    setSelectedEventForPayment(null);
  };

  const handleDownloadInvoice = async (event: Event) => {
    try {
      // Generate proper invoice ID for this event
      const { data: invoiceId } = await supabase.rpc('generate_invoice_id', { p_event_id: event.id });

      const paymentData = {
        id: `event-${event.id}`,
        event_id: event.id,
        amount: event.total_amount || 0,
        payment_method: 'Cash' as const,
        payment_date: new Date().toISOString(),
        invoice_id: invoiceId,
        event: event,
        firm_id: event.firm_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const result = await generatePaymentInvoicePDF(paymentData, firmData);
      if (result.success) {
        toast({
          title: "Invoice downloaded",
          description: "The payment invoice has been downloaded successfully.",
        });
      } else {
        throw new Error('PDF generation failed');
      }
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download the invoice.",
        variant: "destructive",
      });
    }
  };

  const handleShare = (event: Event) => {
    setSelectedEventForShare(event);
    setShareDialogOpen(true);
  };

  const handleDirectToClient = async () => {
    if (!selectedEventForShare) return;

    if (!selectedEventForShare.client?.phone) {
      toast({
        title: "No Phone Number",
        description: "Client doesn't have a phone number for WhatsApp sharing.",
        variant: "destructive"
      });
      return;
    }

    try {
      const result = await shareEventDetails(selectedEventForShare, firmData, 'direct');
      if (result.success) {
        toast({
          title: "Sent to Client!",
          description: `Event details sent to ${selectedEventForShare.client.name} via WhatsApp`
        });
      } else {
        toast({
          title: "WhatsApp Error",
          description: result.error || "Failed to send event details to client",
          variant: "destructive"
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send event details to client';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleCustomShare = async () => {
    if (!selectedEventForShare) return;

    try {
      const result = await shareEventDetails(selectedEventForShare, firmData, 'custom');
      if (result.success) {
        let title = "Shared Successfully!";
        let description = "Event details shared successfully";

        if ('method' in result) {
          const shareResult = result as any;
          if (shareResult.method === 'download') {
            title = "Download Complete!";
            description = "Event PDF downloaded successfully";
          } else if (shareResult.method === 'text_share_with_download') {
            title = "Shared with PDF!";
            description = "Event details shared and PDF downloaded for manual sharing";
          }
        }

        toast({
          title,
          description
        });
      } else {
        throw new Error('Share failed');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to share event details",
        variant: "destructive"
      });
    }
  };

  const handleDeleteEvent = (event: Event) => {
    setEventToDelete(event);
  };

  const handleOptimisticDelete = (eventId: string) => {
    setOptimisticallyDeletedEvents(prev => new Set([...prev, eventId]));
  };

  const handleEventDeleted = () => {
    // This will be called after background processes complete to refresh data
    loadEvents();
    setEventToDelete(null);
  };

  // Helper function to check crew completeness - defined before usage
  const checkEventCrewCompleteness = (event: Event) => {
    const eventWithStaff = event as any;

    // If no quotation details, consider it complete (not incomplete)
    const quotationDetails = eventWithStaff.quotation_details;
    if (!quotationDetails || !quotationDetails.days) return false;

    const staffAssignments = eventWithStaff.event_staff_assignments || [];
    const totalDays = eventWithStaff.total_days || 1;

    // Check each day for crew completeness
    for (let day = 1; day <= totalDays; day++) {
      const dayConfig = quotationDetails.days?.[day - 1];
      if (!dayConfig) continue;

      // Count actual assignments for this specific day
      const dayAssignments = staffAssignments.filter((assignment: any) =>
        assignment.day_number === day
      );

      // For legacy events without day_number, include them only for day 1 of single-day events
      const legacyAssignments = staffAssignments.filter((assignment: any) =>
        !assignment.day_number && totalDays === 1 && day === 1
      );

      const allDayAssignments = [...dayAssignments, ...legacyAssignments];

      const actualPhotographers = allDayAssignments.filter((a: any) => a.role === 'Photographer').length;
      const actualCinematographers = allDayAssignments.filter((a: any) => a.role === 'Cinematographer').length;
      const actualDronePilots = allDayAssignments.filter((a: any) => a.role === 'Drone Pilot').length;

      const requiredPhotographers = dayConfig.photographers || 0;
      const requiredCinematographers = dayConfig.cinematographers || 0;
      const requiredDrone = dayConfig.drone || 0;

      // If any requirement is not met, the event is crew incomplete
      if (actualPhotographers < requiredPhotographers ||
        actualCinematographers < requiredCinematographers ||
        actualDronePilots < requiredDrone) {
        return true;
      }
    }

    // All days have complete crew
    return false;
  };

  // Simplified: only exclude optimistically deleted events
  const processedEvents = useMemo(() => {
    return events.filter(event => !optimisticallyDeletedEvents.has(event.id));
  }, [events, optimisticallyDeletedEvents]);

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Events Grid */}
      {processedEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Calendar01Icon className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No events found</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            Get started by creating your first event
          </p>
          <Button className="rounded-full p-3" onClick={() => setCreateDialogOpen(true)}>
            Create Event
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {processedEvents.map((event) => (
            <EventPaymentCard
              key={event.id}
              event={event}
              onEdit={handleEditEvent}
              onPaymentClick={handlePaymentRecord}
              onDownloadInvoice={handleDownloadInvoice}
              onSendInvoice={handleShare}
              onDelete={handleDeleteEvent}
            />
          ))}
        </div>
      )}

      {/* Payment Collection Dialog */}
      {selectedEventForPayment && (
        <PaymentCard
          event={selectedEventForPayment}
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          onPaymentCollected={handlePaymentCollected}
        />
      )}

      <CleanEventFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={loadEvents}
      />

      <CleanEventFormDialog
        open={editDialogOpen}
        onOpenChange={handleCloseEditDialog}
        editingEvent={editingEvent}
        onSuccess={() => {
          loadEvents();
          handleCloseEditDialog();
        }}
      />

      <EventDeleteConfirmation
        event={eventToDelete}
        open={!!eventToDelete}
        onOpenChange={(open) => !open && setEventToDelete(null)}
        onSuccess={handleEventDeleted}
        onOptimisticDelete={handleOptimisticDelete}
      />

      <ShareOptionsDialog
        isOpen={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        onDirectToClient={handleDirectToClient}
        onCustomShare={handleCustomShare}
        title="Share Event Details"
      />
    </div>
  );
};

export default EventsListManager;