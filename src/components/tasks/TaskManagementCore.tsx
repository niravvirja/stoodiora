
import React, { useState, useCallback } from 'react';
import { PageTableSkeleton } from '@/components/ui/skeleton';
import { Task } from '@/types/studio';
import { TaskFormDialog } from './TaskFormDialog';
import { useTaskExportConfig } from '@/hooks/useExportConfigs';
import { useTasks } from './hooks/useTasks';
import { TaskManagementHeader } from './TaskManagementHeader';
import { TaskStatsCards } from './TaskStatsCards';
import { TaskContent } from './TaskContent';
import { useIsMobile } from '@/hooks/use-mobile';
import { UniversalFilterBar } from '@/components/common/UniversalFilterBar';
import { UniversalPagination } from '@/components/common/UniversalPagination';
import { useBackendFilters } from '@/hooks/useBackendFilters';
import { FILTER_CONFIGS } from '@/config/filter-configs';

const TaskManagementCore = React.memo(() => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const isMobile = useIsMobile();

  const {
    events,
    staffMembers,
    freelancers,
    loading: tasksHookLoading,
    isAdmin,
    updateTaskStatus
  } = useTasks();

  const filterState = useBackendFilters(FILTER_CONFIGS.tasks);
  const taskExportConfig = useTaskExportConfig(staffMembers);

  const handleTaskSuccess = useCallback(async () => {
    filterState.refetch();
    setIsDialogOpen(false);
    setEditingTask(null);
  }, [filterState]);

  const handleEdit = useCallback((task: Task) => {
    setEditingTask(task);
    setIsDialogOpen(true);
  }, []);

  const handleNewTask = useCallback(() => {
    setEditingTask(null);
    setIsDialogOpen(true);
  }, []);

  if (filterState.loading && !filterState.data.length) {
    return <PageTableSkeleton />;
  }

  return (
    <div className="space-y-6">
      <TaskManagementHeader
        isAdmin={isAdmin}
        hasData={filterState.data.length > 0}
        exportConfig={taskExportConfig}
        tasks={filterState.data}
        onCreateTask={handleNewTask}
      />

      <TaskStatsCards />

      {/* Universal Filter Bar */}
      <UniversalFilterBar
        searchValue={filterState.searchTerm}
        onSearchChange={filterState.setSearchTerm}
        onSearchApply={filterState.handleSearchApply}
        onSearchClear={filterState.handleSearchClear}
        isSearchActive={filterState.isSearchActive}
        searchPlaceholder="Search tasks..."
        
        sortBy={filterState.sortBy}
        sortOptions={FILTER_CONFIGS.tasks.sortOptions}
        onSortChange={filterState.setSortBy}
        sortOrder={filterState.sortOrder}
        onSortReverse={filterState.toggleSortOrder}
        
        activeFilters={filterState.activeFilters}
        filterOptions={FILTER_CONFIGS.tasks.filterOptions}
        onFiltersChange={filterState.setActiveFilters}
        
        totalCount={filterState.totalCount}
        filteredCount={filterState.filteredCount}
        loading={filterState.loading}
      />

      <TaskContent
        tasks={filterState.data}
        isAdmin={isAdmin}
        onEdit={handleEdit}
        onStatusChange={filterState.refetch}
        onUpdateTaskStatus={updateTaskStatus}
        onCreateTask={handleNewTask}
      />

      {/* Pagination Controls */}
      <UniversalPagination
        currentPage={filterState.currentPage}
        totalCount={filterState.totalCount}
        filteredCount={filterState.filteredCount}
        pageSize={filterState.pageSize}
        allDataLoaded={filterState.allDataLoaded}
        loading={filterState.loading}
        onLoadMore={filterState.loadMore}
        onPageSizeChange={filterState.setPageSize}
        showLoadMore={true}
      />

      {isAdmin && (
        <TaskFormDialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingTask(null);
            }
          }}
          onSuccess={handleTaskSuccess}
          editingTask={editingTask}
          events={events}
          staffMembers={staffMembers}
        />
      )}
    </div>
  );
});

TaskManagementCore.displayName = 'TaskManagementCore';

export default TaskManagementCore;
