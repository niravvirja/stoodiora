import { UnifiedDialog } from "./unified-dialog"
import { AlertCircle } from "lucide-react"

interface FinancialValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onOk: () => void;
}

export function FinancialValidationDialog({
  open,
  onOpenChange,
  title,
  description,
  onOk,
}: FinancialValidationDialogProps) {
  return (
    <UnifiedDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onOk}
      variant="warning"
      title={title}
      description={description}
      confirmText="OK, I'll Fix It"
      cancelText="Close"
    />
  );
}