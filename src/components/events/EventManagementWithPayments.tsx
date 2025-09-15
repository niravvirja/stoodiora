import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Add01Icon } from 'hugeicons-react';
import EventStats from './EventStats';
import EventsListManager from './EventsListManager';
import CleanEventFormDialog from './CleanEventFormDialog';
import UniversalExportDialog from '@/components/common/UniversalExportDialog';
import { useEventExportConfig } from '@/hooks/useExportConfigs';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { useIsMobile } from '@/hooks/use-mobile';


const EventManagementWithPayments = () => {
  const { profile, currentFirmId } = useAuth();
  const isMobile = useIsMobile();
  const eventExportConfig = useEventExportConfig();
  const { canCreateNew, canExport } = useSubscriptionAccess();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);


  // Simple function to handle create dialog success
  const handleCreateSuccess = () => {
    setCreateDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Events
        </h1>
        <div className="flex gap-2">
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

      {/* Events List Manager */}
      <EventsListManager />

      {/* Create Event Dialog */}
      <CleanEventFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
};

export default EventManagementWithPayments;
