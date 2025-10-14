import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatFieldNames } from '@/lib/field-name-formatter';

interface EventUpdateData {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventType?: string;
  venue?: string;
  firmId: string;
  updatedFields: string[];
}

export const useEventUpdateNotifications = () => {
  const { toast } = useToast();

  const sendEventUpdateNotifications = async (eventData: EventUpdateData) => {
    try {
      console.log('📧 Starting event update notifications for:', eventData.eventTitle);

      // Get all staff assignments and client data
      const [staffData, clientData] = await Promise.all([
        // Get staff assignments with profile/freelancer details
        supabase
          .from('event_staff_assignments')
          .select('*')
          .eq('event_id', eventData.eventId),
        
        // Get client data via events table with event_type
        supabase
          .from('events')
          .select(`
            client_id,
            event_type,
            clients(name, phone, email)
          `)
          .eq('id', eventData.eventId)
          .single()
      ]);

      if (staffData.error) {
        console.error('❌ Error fetching staff data:', staffData.error);
        throw staffData.error;
      }

      if (clientData.error) {
        console.error('❌ Error fetching client data:', clientData.error);
        // Don't throw here, continue with staff notifications
      }

      // Map assignments to notification data with IDs instead of fetching contacts
      const staffList = (staffData.data || []).map((assignment: any) => ({
        staffId: assignment.staff_id,
        freelancerId: assignment.freelancer_id,
        role: assignment.role,
        dayNumber: assignment.day_number,
        client_name: clientData.data?.clients?.name || 'Unknown Client'
      }));

      console.log('📧 Found staff to notify:', staffList.length);
      console.log('📧 Client data:', clientData.data?.clients);

      if (staffList.length === 0 && !clientData.data?.clients) {
        console.log('📧 No staff or client to notify');
        return { success: true, message: 'No notifications needed' };
      }

      // Format updated fields to human-readable labels
      const formattedUpdatedFields = formatFieldNames(eventData.updatedFields);
      const eventType = clientData.data?.event_type || 'Event';

      // Send notifications using the staff notification function
      const notificationPromises = [];

      // Notify staff members
      if (staffList.length > 0) {
        for (const staff of staffList) {
          notificationPromises.push(
            supabase.functions.invoke('send-staff-notification', {
              body: {
                notificationType: 'event_update',
                eventName: eventData.eventTitle,
                eventType: eventType,
                eventDate: eventData.eventDate,
                venue: eventData.venue || '~',
                firmId: eventData.firmId,
                staffId: staff.staffId,
                freelancerId: staff.freelancerId,
                role: staff.role,
                dayNumber: staff.dayNumber,
                updatedFields: formattedUpdatedFields
              }
            })
          );
        }
      }

      // Notify client
      if (clientData.data?.clients?.phone) {
        notificationPromises.push(
          supabase.functions.invoke('send-event-confirmation', {
            body: {
              clientName: clientData.data.clients.name,
              clientPhone: clientData.data.clients.phone,
              eventName: eventData.eventTitle,
              eventType: eventType,
              eventDate: eventData.eventDate,
              venue: eventData.venue || '~',
              totalAmount: 0, // Not needed for update notification
              firmId: eventData.firmId,
              totalDays: 1, // Not needed for update notification
              eventEndDate: null,
              isUpdate: true,
              updatedFields: formattedUpdatedFields
            }
          })
        );
      }

      const results = await Promise.allSettled(notificationPromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;

      console.log('✅ Event update notifications sent successfully:', successCount);

      // Show success toast with notification details
      const totalRecipients = staffList.length + (clientData.data?.clients ? 1 : 0);
      toast({
        title: "Update notifications sent",
        description: `${successCount}/${totalRecipients} notification(s) sent for "${eventData.eventTitle}" update.`,
      });

      return { 
        success: true, 
        message: `Notifications sent to ${successCount} recipient(s)`,
        results 
      };

    } catch (error: any) {
      console.error('💥 Error in event update notifications:', error);
      
      toast({
        title: "Notification error",
        description: `Failed to send update notifications: ${error.message}`,
        variant: "destructive",
      });

      return { 
        success: false, 
        error: error.message 
      };
    }
  };

  return {
    sendEventUpdateNotifications
  };
};