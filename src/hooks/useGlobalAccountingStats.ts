import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

export const useGlobalAccountingStats = () => {
  const { currentFirmId } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentFirmId) {
      fetchGlobalEntries();

      // Set up real-time listener for global accounting stats
      const entriesChannel = supabase
        .channel('global-accounting-stats')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'accounting_entries',
          filter: `firm_id=eq.${currentFirmId}`
        }, () => {
          fetchGlobalEntries();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(entriesChannel);
      };
    }
  }, [currentFirmId]);

  const fetchGlobalEntries = async () => {
    if (!currentFirmId) return;

    try {
      setLoading(true);

      // Fetch ALL accounting entries in batches of 1000
      let allEntries: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('accounting_entries')
          .select('*')
          .eq('firm_id', currentFirmId)
          .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allEntries.push(...data);
          page++;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      console.log(`Global Accounting Stats: Fetched ${allEntries.length} total entries`);
      setEntries(allEntries);
    } catch (error) {
      console.error('Error fetching global accounting stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return { entries, loading };
};
