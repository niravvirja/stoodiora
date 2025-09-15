
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Event } from '@/types/studio';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getEventStatus } from '@/lib/event-status-utils';
import RefinedEventSheetTable from './RefinedEventSheetTable';
import { Button } from '@/components/ui/button';
import { File01Icon, Calendar01Icon } from 'hugeicons-react';
import { useFirmData } from '@/hooks/useFirmData';
import { useIsMobile } from '@/hooks/use-mobile';
import { UniversalPagination } from '@/components/common/UniversalPagination';

const EventSheetManagement = () => {
  const { currentFirmId } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(0);
  const { toast } = useToast();
  const { firmData: firm } = useFirmData();
  const isMobile = useIsMobile();


  useEffect(() => {
    if (currentFirmId) {
      loadEvents();
    }
  }, [currentFirmId]);

  const loadEvents = async () => {
    if (!currentFirmId) return;

    try {
      setLoading(true);
      // Fetch events first
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          client:clients(name, phone, email),
          event_closing_balances(closing_amount),
          quotation_source:quotations(
            id,
            quotation_details
          )
        `)
        .eq('firm_id', currentFirmId)
        .order('event_date', { ascending: false });

      // Fetch staff assignments separately
      let staffAssignmentsData = [];
      if (data) {
        const eventIds = data.map(event => event.id);
        const { data: assignmentsData } = await supabase
          .from('event_staff_assignments')
          .select(`
            *,
            staff:profiles(id, full_name, role),
            freelancer:freelancers!event_staff_assignments_freelancer_id_fkey(id, full_name, role, phone, email)
          `)
          .in('event_id', eventIds);

        staffAssignmentsData = assignmentsData || [];
      }

      // Fetch payments separately to avoid relationship conflicts
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .eq('firm_id', currentFirmId);

      if (error) throw error;

      // Process events to include quotation details and staff assignments
      const processedEvents = (data || []).map(event => {
        // Add staff assignments to each event
        const eventStaffAssignments = staffAssignmentsData.filter(
          assignment => assignment.event_id === event.id
        );

        return {
          ...event,
          quotation_details: (event.quotation_source as any)?.[0]?.quotation_details || null,
          event_staff_assignments: eventStaffAssignments,
          payments: paymentsData?.filter(payment => payment.event_id === event.id) || []
        };
      });

      setEvents(processedEvents as any);
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


  const handleOpenSpreadsheet = () => {
    if (firm?.spreadsheet_id) {
      const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${firm.spreadsheet_id}`;
      window.open(spreadsheetUrl, '_blank');

      toast({
        title: "Opening Spreadsheet",
        description: "Your studio spreadsheet is opening in a new tab",
      });
    } else {
      toast({
        title: "No Spreadsheet Found",
        description: "This firm doesn't have a spreadsheet configured yet",
        variant: "destructive",
      });
    }
  };

  const handleOpenCalendar = () => {
    if (firm?.calendar_id) {
      const calendarUrl = `https://calendar.google.com/calendar/u/0/r?cid=${firm.calendar_id}`;
      window.open(calendarUrl, '_blank');

      toast({
        title: "Opening Calendar",
        description: "Your studio calendar is opening in a new tab",
      });
    } else {
      toast({
        title: "No Calendar Found",
        description: "This firm doesn't have a calendar configured yet",
        variant: "destructive",
      });
    }
  };

  // Pagination calculations
  const paginatedEvents = useMemo(() => {
    const startIndex = currentPage * pageSize;
    const endIndex = startIndex + pageSize;
    return events.slice(startIndex, endIndex);
  }, [events, currentPage, pageSize]);

  const handleLoadMore = () => {
    setCurrentPage(prev => prev + 1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(0); // Reset to first page
  };

  if (loading && events.length === 0) {
    return (
      <RefinedEventSheetTable
        events={[]}
        loading={loading}
        onRefresh={loadEvents}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleOpenSpreadsheet}
            disabled={!firm?.spreadsheet_id}
            className="rounded-full p-3"
          >
            <File01Icon className={`h-4 w-4 ${firm?.spreadsheet_id ? 'text-emerald-600' : 'text-rose-600'}`} />
          </Button>

          <Button
            variant="outline"
            onClick={handleOpenCalendar}
            disabled={!firm?.calendar_id}
            className="rounded-full p-3"
          >
            <Calendar01Icon className={`h-4 w-4 ${firm?.calendar_id ? 'text-emerald-600' : 'text-rose-600'}`} />
          </Button>
        </div>
      </div>

      <RefinedEventSheetTable
        events={paginatedEvents}
        loading={loading}
        onRefresh={loadEvents}
      />

      {/* Pagination Controls */}
      <UniversalPagination
        currentPage={currentPage}
        totalCount={events.length}
        filteredCount={events.length}
        pageSize={pageSize}
        allDataLoaded={(currentPage + 1) * pageSize >= events.length}
        loading={loading}
        onLoadMore={handleLoadMore}
        onPageSizeChange={handlePageSizeChange}
        showLoadMore={true}
      />
    </div>
  );
};

export default EventSheetManagement;
