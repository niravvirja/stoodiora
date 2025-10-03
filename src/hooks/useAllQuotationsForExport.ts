import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Quotation } from '@/types/studio';

export const useAllQuotationsForExport = () => {
  const { currentFirmId } = useAuth();
  const [allQuotations, setAllQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentFirmId) {
      fetchAllQuotations();
    }
  }, [currentFirmId]);

  const fetchAllQuotations = async () => {
    if (!currentFirmId) return;

    try {
      setLoading(true);

      // Fetch ALL quotations for export (no pagination limit)
      const { data, error } = await supabase
        .from('quotations')
        .select(`
          *,
          client:clients(*),
          event:events(id, title)
        `)
        .eq('firm_id', currentFirmId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllQuotations(data || []);
    } catch (error) {
      console.error('Error fetching all quotations for export:', error);
    } finally {
      setLoading(false);
    }
  };

  return { allQuotations, loading };
};