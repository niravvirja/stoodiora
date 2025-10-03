import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Assignment {
  id: string;
  event_id: string;
  staff_id?: string;
  freelancer_id?: string;
  role: string;
  day_number: number;
  day_date?: string;
  staff_type?: string;
  created_at: string;
  updated_at: string;
  firm_id: string;
  // Related data
  event_title: string;
  event_date: string;
  event_end_date?: string;
  venue?: string;
  client_name?: string;
  total_days?: number;
  staff_name?: string;
  freelancer_name?: string;
}

export const useAssignments = () => {
  const { profile, user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const isAdmin = profile?.role === 'Admin';
  const { currentFirmId } = useAuth();

  const loadAssignments = async () => {
    try {
      setLoading(true);

      // Base query without implicit joins (no FKs in schema cache)
      let query = supabase
        .from('event_staff_assignments')
        .select('*');

      if (isAdmin && currentFirmId) {
        query = query.eq('firm_id', currentFirmId);
      } else if (profile?.id) {
        // For staff/freelancers, show only their assignments
        // Note: freelancer_id likely won't match profile.id but keep existing behavior
        query = query.or(`staff_id.eq.${profile.id},freelancer_id.eq.${profile.id}`);
      } else {
        setAssignments([]);
        setLoading(false);
        return;
      }

      query = query.order('day_date', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      const assignmentsRaw = (data || []) as any[];

      // Collect related IDs
      const eventIds = Array.from(new Set(assignmentsRaw.map(a => a.event_id).filter(Boolean)));
      const staffIds = Array.from(new Set(assignmentsRaw.map(a => a.staff_id).filter(Boolean)));
      const freelancerIds = Array.from(new Set(assignmentsRaw.map(a => a.freelancer_id).filter(Boolean)));

      // Fetch related data in parallel (best effort; ignore RLS errors for non-owners)
      const [eventsRes, profilesRes, freelancersRes] = await Promise.all([
        eventIds.length
          ? supabase
              .from('events')
              .select('id, title, event_date, event_end_date, venue, total_days, client_id')
              .in('id', eventIds as string[])
          : Promise.resolve({ data: [], error: null } as any),
        staffIds.length
          ? supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', staffIds as string[])
          : Promise.resolve({ data: [], error: null } as any),
        freelancerIds.length
          ? supabase
              .from('freelancers')
              .select('id, full_name')
              .in('id', freelancerIds as string[])
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      const eventsById = new Map<string, any>((eventsRes.data || []).map((e: any) => [e.id, e]));
      const clientIds = Array.from(
        new Set(
          ((eventsRes.data || []) as any[])
            .map((e: any) => e.client_id)
            .filter((id: any): id is string => typeof id === 'string')
        )
      ) as string[];

      let clientsById = new Map<string, any>();
      if (clientIds.length) {
        const clientsRes = await supabase
          .from('clients')
          .select('id, name')
          .in('id', clientIds);
        clientsById = new Map<string, any>((clientsRes.data || []).map((c: any) => [c.id, c]));
      }

      const profilesById = new Map<string, any>((profilesRes.data || []).map((p: any) => [p.id, p]));
      const freelancersById = new Map<string, any>((freelancersRes.data || []).map((f: any) => [f.id, f]));

      // Transform data to match Assignment interface
      const transformedAssignments: Assignment[] = assignmentsRaw.map((item: any) => {
        const event = eventsById.get(item.event_id);
        const client = event ? clientsById.get(event.client_id) : undefined;

        return {
          id: item.id,
          event_id: item.event_id,
          staff_id: item.staff_id,
          freelancer_id: item.freelancer_id,
          role: item.role,
          day_number: item.day_number,
          day_date: item.day_date,
          staff_type: item.staff_id ? 'staff' : 'freelancer',
          created_at: item.created_at,
          updated_at: item.updated_at,
          firm_id: item.firm_id,
          // Event data
          event_title: event?.title || 'Unknown Event',
          event_date: event?.event_date,
          event_end_date: event?.event_end_date,
          venue: event?.venue,
          client_name: client?.name,
          total_days: event?.total_days,
          // Staff/Freelancer data
          staff_name: item.staff_id ? profilesById.get(item.staff_id)?.full_name : undefined,
          freelancer_name: item.freelancer_id ? freelancersById.get(item.freelancer_id)?.full_name : undefined,
        };
      });

      setAssignments(transformedAssignments);
    } catch (error: any) {
      toast({
        title: 'Error loading assignments',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && profile) {
      loadAssignments();
    }
  }, [user, profile, isAdmin, currentFirmId]);

  return {
    assignments,
    loading,
    isAdmin,
    loadAssignments,
  };
};
