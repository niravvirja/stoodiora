import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Task } from '@/types/studio';
import { UnifiedDialog } from '@/components/ui/unified-dialog';
import { useAuth } from '@/components/auth/AuthProvider';
import { useDeletionValidation } from '@/hooks/useDeletionValidation';

interface TaskDeleteConfirmationProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const TaskDeleteConfirmation = ({ task, open, onOpenChange, onSuccess }: TaskDeleteConfirmationProps) => {
  const [deleting, setDeleting] = useState(false);
  const [validationDialog, setValidationDialog] = useState<any>(null);
  const { toast } = useToast();
  const { profile, currentFirmId } = useAuth();
  const { validateTaskDeletion } = useDeletionValidation();

  const handleDelete = async () => {
    if (!task || !currentFirmId) return;
    
    try {
      const validation = await validateTaskDeletion(task.id);
      
      if (!validation.canDelete) {
        setValidationDialog({
          title: validation.title,
          description: validation.description,
          variant: 'warning'
        });
        return;
      }

      setDeleting(true);
      
      // STEP 1: Delete from Google Sheets FIRST
      try {
        await supabase.functions.invoke('delete-item-from-google', {
          body: { 
            itemType: 'task', 
            itemId: task.id, 
            firmId: currentFirmId 
          }
        });
      } catch (error) {
        // Continue with database deletion even if Google Sheets fails
      }

      // STEP 2: Delete from database
      const { error: dbError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id);

      if (dbError) {
        throw dbError;
      }

      toast({
        title: "Task deleted successfully",
        description: `"${task.title}" has been removed from the system and Google Sheets.`,
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error deleting task",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!task) return null;

  return (
    <>
      <UnifiedDialog
        open={open}
        onOpenChange={(newOpen) => !deleting && onOpenChange(newOpen)}
        onConfirm={handleDelete}
        title="Delete Task"
        description={`Are you sure you want to delete "${task.title}"? This action cannot be undone and will remove the task from the system and Google Sheets.`}
        variant="destructive"
        confirmText={deleting ? "Deleting..." : "Delete Task"}
        loading={deleting}
      />
      
      {validationDialog && (
        <UnifiedDialog
          open={!!validationDialog}
          onOpenChange={() => setValidationDialog(null)}
          onConfirm={() => setValidationDialog(null)}
          title={validationDialog.title}
          description={validationDialog.description}
          variant={validationDialog.variant}
          confirmText="OK"
        />
      )}
    </>
  );
};