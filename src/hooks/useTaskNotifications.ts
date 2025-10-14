import { supabase } from '@/integrations/supabase/client';

interface TaskNotificationData {
  taskId: string;
  taskTitle: string;
  assignedTo?: string;
  freelancerId?: string;
  eventName?: string;
  firmId: string;
  notificationType: 'task_assignment' | 'task_reported';
}

export const useTaskNotifications = () => {
  const sendTaskNotification = async (data: TaskNotificationData) => {
    try {
      const notificationPayload = {
        notificationType: data.notificationType,
        taskTitle: data.taskTitle,
        eventName: data.eventName,
        firmId: data.firmId,
        staffId: data.assignedTo,
        freelancerId: data.freelancerId
      };

      // Send notification - BACKGROUND Fire and forget
      supabase.functions.invoke('send-staff-notification', {
        body: notificationPayload
      }).then(() => {
        console.log('✅ Task notification sent successfully');
      }).catch(error => {
        console.warn('⚠️ Failed to send task notification:', error);
      });
      
      return { success: true };
    } catch (error) {
      console.warn('⚠️ Failed to send task notification:', error);
      return { success: false, error };
    }
  };

  return {
    sendTaskNotification
  };
};