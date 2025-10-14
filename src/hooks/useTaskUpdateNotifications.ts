import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TaskUpdateData {
  taskId: string;
  taskTitle: string;
  assignedTo?: string;
  freelancerId?: string;
  eventName?: string;
  firmId: string;
  updatedFields: string[];
}

export const useTaskUpdateNotifications = () => {
  const { toast } = useToast();

  const sendTaskUpdateNotification = async (data: TaskUpdateData) => {
    try {
      const notificationPayload = {
        notificationType: 'task_update' as const,
        taskTitle: data.taskTitle,
        eventName: data.eventName,
        firmId: data.firmId,
        updatedFields: data.updatedFields,
        staffId: data.assignedTo,
        freelancerId: data.freelancerId
      };

      // Send notification - BACKGROUND Fire and forget
      supabase.functions.invoke('send-staff-notification', {
        body: notificationPayload
      }).then(() => {
        toast({
          title: "Task update notification sent",
          description: "Notification sent successfully",
        });
        console.log('✅ Task update notification sent successfully');
      }).catch(error => {
        console.warn('⚠️ Failed to send task update notification:', error);
      });
      
      return { success: true };
    } catch (error) {
      console.warn('⚠️ Failed to send task update notification:', error);
      
      toast({
        title: "Notification error",
        description: "Failed to send task update notification",
        variant: "destructive",
      });
      
      return { success: false, error };
    }
  };

  return {
    sendTaskUpdateNotification
  };
};