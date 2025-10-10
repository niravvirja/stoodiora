import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Add01Icon } from 'hugeicons-react';
import FreelancerFormDialog from './FreelancerFormDialog';
import FreelancerTableView from './FreelancerTableView';
import FreelancerStats from './FreelancerStats';
import { useFreelancers } from './hooks/useFreelancers';
import { Freelancer, FreelancerFormData } from '@/types/freelancer';
import { FilteredManagementCore } from '@/components/common/FilteredManagementCore';
import { UnifiedDialog } from '@/components/ui/unified-dialog';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { UniversalPagination } from '@/components/common/UniversalPagination';
import UniversalExportDialog from '@/components/common/UniversalExportDialog';
import { useFreelancerExportConfig } from '@/hooks/useExportConfigs';
import { useAuth } from '@/components/auth/AuthProvider';

const FreelancerManagement: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFreelancer, setSelectedFreelancer] = useState<Freelancer | null>(null);
  const refetchRef = useRef<(() => void) | null>(null);
  const { canCreateNew, canExport } = useSubscriptionAccess();
  const { profile } = useAuth();
  const freelancerExportConfig = useFreelancerExportConfig();
  
  // Initialize hook with refetch callback
  const { createFreelancer, updateFreelancer, deleteFreelancer, confirmDialog, setConfirmDialog } = useFreelancers(refetchRef.current || undefined);

  const handleAddNew = () => {
    setSelectedFreelancer(null);
    setDialogOpen(true);
  };

  const handleEdit = (freelancer: Freelancer) => {
    setSelectedFreelancer(freelancer);
    setDialogOpen(true);
  };

  const handleSubmit = async (data: FreelancerFormData) => {
    try {
      if (selectedFreelancer) {
        await updateFreelancer(selectedFreelancer.id, data);
      } else {
        await createFreelancer(data);
      }
      setDialogOpen(false);
      setSelectedFreelancer(null);
      refetchRef.current?.();
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFreelancer(id);
      refetchRef.current?.();
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  return (
    <FilteredManagementCore
      pageType="freelancers"
      searchPlaceholder="Search freelancers by name, email, phone..."
      renderHeader={({ data }) => (
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Freelancers</h1>
          <div className="flex items-center gap-2">
            {data.length > 0 && canExport && (
              <UniversalExportDialog 
                data={data}
                config={freelancerExportConfig}
              />
            )}
            <Button onClick={handleAddNew} className="rounded-full p-3" disabled={!canCreateNew}>
              <Add01Icon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      renderStats={() => (
        <FreelancerStats />
      )}
      renderContent={({ data, refetch, loadMore, allDataLoaded, currentPage, totalCount, filteredCount, pageSize, setPageSize, goToPage, loading, paginationLoading }) => {
        // Store refetch in ref for use in callbacks (safe to do in render)
        refetchRef.current = refetch;
        
        return (
          <>
            <FreelancerTableView
              freelancers={data}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAdd={handleAddNew}
              loading={loading}
              paginationLoading={paginationLoading}
            />
            
            <UniversalPagination
              currentPage={currentPage || 0}
              totalCount={totalCount || 0}
              filteredCount={filteredCount || 0}
              pageSize={pageSize || 50}
              allDataLoaded={allDataLoaded || false}
              loading={loading || paginationLoading || false}
              onLoadMore={loadMore || (() => {})}
              onPageChange={goToPage}
              showLoadMore={true}
              onPageSizeChange={setPageSize}
            />

            <FreelancerFormDialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) {
                  setSelectedFreelancer(null);
                }
              }}
              freelancer={selectedFreelancer}
              onSubmit={handleSubmit}
            />
            
            <UnifiedDialog
              open={confirmDialog.open}
              onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
              onConfirm={confirmDialog.onConfirm}
              title={confirmDialog.title}
              description={confirmDialog.description}
              variant={confirmDialog.variant}
              confirmText={confirmDialog.variant === 'destructive' ? 'Delete' : 'OK'}
              loading={confirmDialog.loading}
            />
          </>
        );
      }}
    />
  );
};

export default FreelancerManagement;
