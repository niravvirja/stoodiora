import { UnifiedDialog } from "./unified-dialog"
import { Users } from "lucide-react"

interface ConflictingEvent {
  eventId: string;
  eventTitle?: string;
  role: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

interface StaffAssignmentConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffName: string;
  role: string;
  conflictingEvents: ConflictingEvent[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function StaffAssignmentConflictDialog({
  open,
  onOpenChange,
  staffName,
  role,
  conflictingEvents,
  onConfirm,
  onCancel,
}: StaffAssignmentConflictDialogProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const details = (
    <div className="space-y-2">
      <p className="font-medium text-foreground">Conflicting Events:</p>
      {conflictingEvents.slice(0, 3).map((conflict, idx) => (
        <div key={idx} className="text-xs space-y-1">
          <p className="font-medium">{conflict.eventTitle || 'Untitled Event'}</p>
          <p className="text-muted-foreground">
            Role: {conflict.role} • {formatDate(conflict.dateRange.startDate)} - {formatDate(conflict.dateRange.endDate)}
          </p>
        </div>
      ))}
      {conflictingEvents.length > 3 && (
        <p className="text-xs text-muted-foreground">
          +{conflictingEvents.length - 3} more conflict{conflictingEvents.length - 3 > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );

  return (
    <UnifiedDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      onCancel={onCancel}
      variant="conflict"
      title="Staff Assignment Conflict"
      description={
        <>
          <span className="font-semibold">{staffName}</span> is already assigned to{' '}
          <span className="font-semibold">{conflictingEvents.length}</span> other event
          {conflictingEvents.length > 1 ? 's' : ''} during this time.
          <br /><br />
          Do you want to assign them as <span className="font-semibold">{role}</span> anyway?
        </>
      }
      details={details}
      confirmText="Assign Anyway"
      cancelText="Cancel"
    />
  );
}