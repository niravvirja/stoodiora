import React, { useState, useMemo } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Add01Icon, Calendar01Icon } from 'hugeicons-react';
import EventStats from './EventStats';
import CleanEventFormDialog from './CleanEventFormDialog';
import UniversalExportDialog from '@/components/common/UniversalExportDialog';
import { useEventExportConfig } from '@/hooks/useExportConfigs';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { UniversalFilterBar } from '@/components/common/UniversalFilterBar';
import { UniversalPagination } from '@/components/common/UniversalPagination';
import { useBackendFilters } from '@/hooks/useBackendFilters';
import { FILTER_CONFIGS } from '@/config/filter-configs';
import { PageSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import EventTableView from './EventTableView';
import { filterEventsByStaffStatus } from '@/lib/staff-status-utils';

const EventManagementWithFilters = () => {
  const { currentFirmId } = useAuth();
  const { canCreateNew, canExport } = useSubscriptionAccess();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const filterState = useBackendFilters(FILTER_CONFIGS.events, {
    enableRealtime: true,
    pageSize: 50,
  });

  const eventExportConfig = useEventExportConfig();

  // Apply client-side staff status filtering if needed
  const filteredEvents = useMemo(() => {
    let events = filterState.data;

    const staffStatusFilters = filterState.activeFilters.filter(f =>
      ['staff_complete', 'staff_incomplete', 'no_staff'].includes(f)
    );

    if (staffStatusFilters.length > 0) {
      staffStatusFilters.forEach(filter => {
        events = filterEventsByStaffStatus(events, filter);
      });
    }

    return events;
  }, [filterState.data, filterState.activeFilters]);

  // Handle create success
  const handleCreateSuccess = () => {
    setCreateDialogOpen(false);
    filterState.refetch();
  };

  // ✅ Loading state (proper skeleton)
  if (!currentFirmId) {
    return <PageSkeleton />;
  }
  if (filterState.loading && filterState.data.length === 0) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Events</h1>
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

      {/* Stats */}
      <EventStats />

      {/* Filter Bar */}
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

      {/* ✅ Empty state handling */}
      {filteredEvents.length === 0 && !filterState.loading && !filterState.paginationLoading && currentFirmId ? (
        <EmptyState
          icon={Calendar01Icon}
          title="No Events Found"
          description="No events match your current search and filter criteria. Try adjusting your filters or create a new event."
          action={{
            label: "Create Event",
            onClick: () => setCreateDialogOpen(true),
          }}
        />
      ) : (
        <EventTableView
          events={filteredEvents}
          initialLoading={false}
          paginationLoading={filterState.paginationLoading}
          onRefetch={filterState.refetch}
          onNewEvent={() => setCreateDialogOpen(true)}
        />
      )}

      {/* Pagination */}
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