import React, { useState, useMemo } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Add01Icon } from 'hugeicons-react';
import EventStats from './EventStats';
import CleanEventFormDialog from './CleanEventFormDialog';
import UniversalExportDialog from '@/components/common/UniversalExportDialog';
import { useEventExportConfig } from '@/hooks/useExportConfigs';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { UniversalFilterBar } from '@/components/common/UniversalFilterBar';
import { UniversalPagination } from '@/components/common/UniversalPagination';
import { useBackendFilters } from '@/hooks/useBackendFilters';
import { FILTER_CONFIGS } from '@/config/filter-configs';
import { EVENTS_FILTER_GROUPS } from '@/config/events-filter-groups';
import { PageTableSkeleton } from '@/components/ui/skeleton';
import EventTableView from './EventTableView';
import { filterEventsByStaffStatus } from '@/lib/staff-status-utils';
import { useEventQuotationSync } from '@/hooks/useEventQuotationSync';

const EventManagementWithFilters = () => {
  const { profile, currentFirmId } = useAuth();
  const { canCreateNew, canExport } = useSubscriptionAccess();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const filterState = useBackendFilters(FILTER_CONFIGS.events, {
    enableRealtime: true,
    pageSize: 50 // Standard UI pagination
  });

  const eventExportConfig = useEventExportConfig();

  const syncedEvents = useEventQuotationSync(filterState.data);

  // Apply client-side staff status filtering if needed
  const filteredEvents = useMemo(() => {
    let events = syncedEvents;

    // Apply staff status filters client-side
    const staffStatusFilters = filterState.activeFilters.filter(f =>
      ['staff_complete', 'staff_incomplete', 'no_staff'].includes(f)
    );

    if (staffStatusFilters.length > 0) {
      staffStatusFilters.forEach(filter => {
        events = filterEventsByStaffStatus(events, filter);
      });
    }

    return events;
  }, [syncedEvents, filterState.activeFilters]);

  // Simple function to handle create dialog success
  const handleCreateSuccess = () => {
    setCreateDialogOpen(false);
    filterState.refetch();
  };

  // CRITICAL FIX: Only show skeleton during the very first load, prevent flickering
  const isInitialLoad = filterState.loading && filterState.currentPage === 0 && filterState.data.length === 0;
  
  if (isInitialLoad) {
    return <PageTableSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Events
        </h1>
        <div className="flex gap-2">
          {filteredEvents.length > 0 && canExport && (
            <UniversalExportDialog 
              data={filteredEvents}
              config={eventExportConfig}
            />
          )}
          <Button
            onClick={() => setCreateDialogOpen(true)}
            size="icon"
            className="h-10 w-10 rounded-full"
            disabled={!canCreateNew}
          >
            <Add01Icon className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Stats - Independent from filters */}
      <EventStats />

      {/* Universal Filter Bar */}
      <UniversalFilterBar
        searchValue={filterState.searchTerm}
        onSearchChange={filterState.setSearchTerm}
        onSearchApply={filterState.handleSearchApply}
        onSearchClear={filterState.handleSearchClear}
        isSearchActive={filterState.isSearchActive}
        searchPlaceholder="Search events by title or venue..."
        
        sortBy={filterState.sortBy}
        sortOptions={FILTER_CONFIGS.events.sortOptions}
        onSortChange={filterState.setSortBy}
        sortOrder={filterState.sortOrder}
        onSortReverse={filterState.toggleSortOrder}
        
        activeFilters={filterState.activeFilters}
        filterOptions={FILTER_CONFIGS.events.filterOptions}
        onFiltersChange={filterState.setActiveFilters}
        
        totalCount={filterState.totalCount}
        filteredCount={filterState.filteredCount}
        loading={filterState.loading}
      />

      {/* Events Table View with filtered data */}
      <EventTableView 
        events={filteredEvents}
        loading={filterState.loading}
        paginationLoading={filterState.paginationLoading}
        onRefetch={filterState.refetch}
        onNewEvent={() => setCreateDialogOpen(true)}
      />

      {/* Pagination Controls */}
      <UniversalPagination
        currentPage={filterState.currentPage}
        totalCount={filterState.totalCount}
        filteredCount={filterState.filteredCount}
        pageSize={filterState.pageSize}
        allDataLoaded={filterState.allDataLoaded}
        loading={filterState.loading || filterState.paginationLoading}
        onLoadMore={filterState.loadMore}
        onPageChange={filterState.goToPage}
        onPageSizeChange={filterState.setPageSize}
        showLoadMore={true}
      />

      {/* Create Event Dialog */}
      <CleanEventFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
};

export default EventManagementWithFilters;