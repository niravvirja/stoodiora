import { UnifiedDialog } from "./unified-dialog"
import { Copy } from "lucide-react"

interface DuplicateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventType: string;
  existingEventTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DuplicateEventDialog({
  open,
  onOpenChange,
  eventType,
  existingEventTitle,
  onConfirm,
  onCancel,
}: DuplicateEventDialogProps) {
  return (
    <UnifiedDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      onCancel={onCancel}
      variant="warning"
      title="Duplicate Event Type Detected"
      description={
        <>
          This client already has a <span className="font-semibold">{eventType}</span> event titled{' '}
          <span className="font-semibold">"{existingEventTitle}"</span>.
          <br /><br />
          Do you want to create another <span className="font-semibold">{eventType}</span> event for the same client?
        </>
      }
      confirmText="Create Anyway"
      cancelText="Cancel"
    />
  );
}