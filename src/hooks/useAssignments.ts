import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';

interface Assignment {
  id: string;
  event_id: string;
  staff_id: string | null;
  freelancer_id: string | null;
  role: string;
  day_number: number;
  day_date: string | null;
  staff_type: string | null;
  created_at: string;
  event?: {
    id: string;
    title: string;
    event_date: string;
    event_end_date: string | null;
    venue: string | null;
    description: string | null;
    event_type: string;
    client?: {
      name: string;
      phone: string;
    };
  };
}

export const useAssignments = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile, currentFirmId } = useAuth();
  const { toast } = useToast();

  const fetchAssignments = async () => {
    if (!profile?.id || !currentFirmId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch assignments for the current user
      const { data: assignmentsData, error } = await supabase
        .from('event_staff_assignments')
        .select(`
          *,
          event:events!event_id (
            id,
            title,
            event_date,
            event_end_date,
            venue,
            description,
            event_type,
            client:clients!client_id (
              name,
              phone
            )
          )
        `)
        .eq('staff_id', profile.id)
        .eq('firm_id', currentFirmId)
        .order('day_date', { ascending: true });

      if (error) throw error;

      setAssignments(assignmentsData || []);
    } catch (error: any) {
      console.error('Error fetching assignments:', error);
      toast({
        title: "Error loading assignments",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();

    // Set up real-time subscription
    const channel = supabase
      .channel('assignments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_staff_assignments',
          filter: `staff_id=eq.${profile?.id}`,
        },
        () => {
          fetchAssignments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, currentFirmId]);

  return {
    assignments,
    loading,
    refetch: fetchAssignments,
  };
};
