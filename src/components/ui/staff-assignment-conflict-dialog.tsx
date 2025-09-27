import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">
            Staff Assignment Conflict
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            <span className="font-semibold text-primary">{staffName}</span> is already assigned to {conflictingEvents.length} other event{conflictingEvents.length > 1 ? 's' : ''} during this time.
            <br /><br />
            Do you want to assign them as <span className="font-semibold text-primary">{role}</span> anyway?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-primary text-primary-foreground hover:bg-primary/90">
            Assign Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}