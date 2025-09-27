import React, { useState } from 'react';
import { Event } from '@/types/studio';
import EventPaymentCard from '@/components/payments/EventPaymentCard';
import { EmptyState } from '@/components/ui/empty-state';
import { Calendar01Icon } from 'hugeicons-react';
import { Button } from '@/components/ui/button';
import PaymentCard from '@/components/payments/PaymentCard';
import CleanEventFormDialog from './CleanEventFormDialog';
import ShareOptionsDialog from '@/components/common/ShareOptionsDialog';
import { EventDeleteConfirmation } from './EventDeleteConfirmation';
import { useToast } from '@/hooks/use-toast';
import { generatePaymentInvoicePDF } from '@/components/payments/PaymentInvoicePDFRenderer';
import { shareEventDetails } from '@/lib/event-share-utils';
import { useFirmData } from '@/hooks/useFirmData';
import EventFinancialSummaryDialog from '@/components/events/EventFinancialSummaryDialog';
import { useEventQuotationSync } from '@/hooks/useEventQuotationSync';

interface EventTableViewProps {
  events: Event[];
  loading?: boolean;
  paginationLoading?: boolean;
  onRefetch: () => void;
  onNewEvent?: () => void;
}

const EventTableView: React.FC<EventTableViewProps> = ({
  events,
  loading = false,
  paginationLoading = false,
  onRefetch,
  onNewEvent
}) => {
  // Sync quotation details for proper crew indicator functionality
  const syncedEvents = useEventQuotationSync(events);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedEventForShare, setSelectedEventForShare] = useState<Event | null>(null);
  const [selectedEventForPayment, setSelectedEventForPayment] = useState<Event | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [selectedEventForDetails, setSelectedEventForDetails] = useState<Event | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  // Loading states for individual events
  const [loadingStates, setLoadingStates] = useState<{[key: string]: {
    sharing?: boolean;
    viewing?: boolean;
    downloading?: boolean;
    editing?: boolean;
    crew?: boolean;
    deleting?: boolean;
  }}>({});

  const { toast } = useToast();
  const { firmData } = useFirmData();

  const handleEditEvent = async (event: Event) => {
    setLoadingStates(prev => ({ ...prev, [event.id]: { ...prev[event.id], editing: true } }));
    // Simulate brief loading for premium feel
    setTimeout(() => {
      setEditingEvent(event);
      setEditDialogOpen(true);
      setLoadingStates(prev => ({ ...prev, [event.id]: { ...prev[event.id], editing: false } }));
    }, 300);
  };

  const handleCrewDialog = async (event: Event) => {
    setLoadingStates(prev => ({ ...prev, [event.id]: { ...prev[event.id], crew: true } }));
    // Simulate brief loading for premium feel
    setTimeout(() => {
      // Find the crew dialog and open it - we need to pass this to the card
      setLoadingStates(prev => ({ ...prev, [event.id]: { ...prev[event.id], crew: false } }));
    }, 300);
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
    onRefetch();
    setPaymentDialogOpen(false);
    setSelectedEventForPayment(null);
  };

  const handleDownloadInvoice = async (event: Event) => {
    setLoadingStates(prev => ({ ...prev, [event.id]: { ...prev[event.id], downloading: true } }));
    try {
      const paymentData = {
        id: `event-${event.id}`,
        event_id: event.id,
        amount: event.total_amount || 0,
        payment_method: 'Cash' as const,
        payment_date: new Date().toISOString(),
        invoice_id: `INV-${event.id}`,
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
    } finally {
      setLoadingStates(prev => ({ ...prev, [event.id]: { ...prev[event.id], downloading: false } }));
    }
  };

  const handleShare = async (event: Event) => {
    setLoadingStates(prev => ({ ...prev, [event.id]: { ...prev[event.id], sharing: true } }));
    // Simulate brief loading for premium feel
    setTimeout(() => {
      setSelectedEventForShare(event);
      setShareDialogOpen(true);
      setLoadingStates(prev => ({ ...prev, [event.id]: { ...prev[event.id], sharing: false } }));
    }, 200);
  };

  const handleDirectToClient = async () => {
    if (!selectedEventForShare) return;

    if (!selectedEventForShare.client?.phone) {
      toast({
        title: "No Phone Number",
        description: "Client doesn't have a phone number for WhatsApp sharing. Please add client's phone number first.",
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
        setShareDialogOpen(false);
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
        toast({
          title: "Shared Successfully!",
          description: "Event details shared successfully"
        });
        setShareDialogOpen(false);
      } else {
        throw new Error(result.error || 'Share failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to share event details';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleDeleteEvent = async (event: Event) => {
    setLoadingStates(prev => ({ ...prev, [event.id]: { ...prev[event.id], deleting: true } }));
    // Simulate brief loading for premium feel
    setTimeout(() => {
      setEventToDelete(event);
      setLoadingStates(prev => ({ ...prev, [event.id]: { ...prev[event.id], deleting: false } }));
    }, 300);
  };

  const handleEventDeleted = () => {
    onRefetch();
    setEventToDelete(null);
  };

  const handleViewDetails = async (event: Event) => {
    setLoadingStates(prev => ({ ...prev, [event.id]: { ...prev[event.id], viewing: true } }));
    // Simulate brief loading for premium feel
    setTimeout(() => {
      setSelectedEventForDetails(event);
      setDetailsDialogOpen(true);
      setLoadingStates(prev => ({ ...prev, [event.id]: { ...prev[event.id], viewing: false } }));
    }, 300);
  };

  // Show loading skeleton if data is loading
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="w-full h-full flex flex-col bg-card border border-border shadow-sm aspect-[9/11] sm:aspect-[9/11] lg:aspect-[9/12] xl:aspect-[9/12] overflow-hidden animate-pulse rounded-lg">
            <div className="pb-3 px-4 pt-4 flex-shrink-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="h-5 w-3/4 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-muted rounded animate-pulse mt-1" />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="h-5 w-12 bg-muted rounded-full animate-pulse" />
                </div>
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-between px-4 pb-4 min-h-0">
              <div className="flex-1 space-y-3 min-h-0">
                <div className="flex items-center justify-between p-3 bg-primary/5 rounded border border-primary/20">
                  <div className="space-y-1">
                    <div className="h-3 w-12 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-muted/20 px-3 py-2 rounded">
                  <div className="h-3 w-3 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex flex-col items-center gap-1">
                    <div className="h-5 w-5 bg-muted rounded-full animate-pulse" />
                    <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              </div>
              <div className="pt-3 border-t border-muted flex-shrink-0">
                <div className="flex justify-evenly gap-2">
                  <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                  <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                  <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <EmptyState
        icon={Calendar01Icon}
        title="No Events Found"
        description="No events match your current search and filter criteria. Try adjusting your filters or create a new event."
        action={onNewEvent ? {
          label: "Create Event",
          onClick: onNewEvent
        } : undefined}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Events Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {syncedEvents.map((event) => (
          <EventPaymentCard
            key={event.id}
            event={event}
            onEdit={handleEditEvent}
            onPaymentClick={handlePaymentRecord}
            onViewDetails={handleViewDetails}
            onDownloadInvoice={handleDownloadInvoice}
            onSendInvoice={handleShare}
            onDelete={handleDeleteEvent}
            onCrewClick={handleCrewDialog}
            loadingStates={loadingStates[event.id]}
          />
        ))}
      </div>

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
        open={editDialogOpen}
        onOpenChange={handleCloseEditDialog}
        editingEvent={editingEvent}
        onSuccess={() => {
          onRefetch();
          handleCloseEditDialog();
        }}
      />

      <EventDeleteConfirmation
        event={eventToDelete}
        open={!!eventToDelete}
        onOpenChange={(open) => !open && setEventToDelete(null)}
        onSuccess={handleEventDeleted}
        onOptimisticDelete={() => {}} // Handle in parent component
      />

      <ShareOptionsDialog
        isOpen={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        onDirectToClient={handleDirectToClient}
        onCustomShare={handleCustomShare}
        title="Share Event Details"
        hasClientPhone={!!selectedEventForShare?.client?.phone}
      />

      <EventFinancialSummaryDialog
        event={selectedEventForDetails}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
      />
    </div>
  );
};

export default EventTableView;