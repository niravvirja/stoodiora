import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';

// Debounce utility
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export interface FilterOption {
  key: string;
  label: string;
  type: 'boolean' | 'select' | 'date_range';
  options?: string[];
  queryBuilder?: (query: any, value?: any) => any;
}

export interface SortOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  tableName: string;
  searchFields: string[];
  sortOptions: SortOption[];
  filterOptions: FilterOption[];
  defaultSort?: string;
  selectQuery?: string;
  pageSize?: number;
  enableRealtime?: boolean;
}

interface UseBackendFiltersOptions {
  pageSize?: number;
  enableRealtime?: boolean;
  initialFilters?: string[];
  initialSearchTerm?: string;
}

export const useBackendFilters = (config: FilterConfig, options: UseBackendFiltersOptions = {}) => {
  const { currentFirmId, profile } = useAuth();
  const { toast } = useToast();
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(options.initialSearchTerm || '');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>(options.initialFilters || []);
  const [sortBy, setSortBy] = useState(config.defaultSort || 'created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [allDataLoaded, setAllDataLoaded] = useState(false);
  const [pageSize, setPageSize] = useState(options.pageSize || config.pageSize || 50);

  // Debounced search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const fetchData = useCallback(async (append = false, isPagination = false) => {
    if (!currentFirmId) {
      setLoading(false);
      setPaginationLoading(false);
      return;
    }

    try {
      if (isPagination) {
        setPaginationLoading(true);
      } else if (!append) {
        // Only show loading skeleton on first load when there's no data
        if (isFirstLoad && data.length === 0) {
          setLoading(true);
        }
      }

      // Extract role filters
      const roleFilters = activeFilters.filter(key => 
        ['photographer', 'cinematographer', 'editor', 'drone'].includes(key)
      );

      // For events with role filters, first query assignments to get event IDs
      let eventIdsFilter: string[] | null = null;
      if (config.tableName === 'events' && roleFilters.length > 0) {
        const roleMap: Record<string, string> = {
          photographer: 'Photographer',
          cinematographer: 'Cinematographer',
          editor: 'Editor',
          drone: 'Drone'
        };

        const roleConditions = roleFilters.map(key => roleMap[key]);
        
        const { data: assignments, error: assignmentError } = await supabase
          .from('event_staff_assignments')
          .select('event_id')
          .eq('firm_id', currentFirmId)
          .in('role', roleConditions);

        if (assignmentError) {
          throw assignmentError;
        }

        // Get unique event IDs
        eventIdsFilter = [...new Set(assignments?.map(a => a.event_id) || [])];
        
        // If no events match, set empty array (will return no results)
        if (eventIdsFilter.length === 0) {
          eventIdsFilter = ['00000000-0000-0000-0000-000000000000'];
        }
      }

      // Build main query
      let query = supabase
        .from(config.tableName as any)
        .select(config.selectQuery || '*', { count: 'exact' });

      // Apply role-based filtering for tasks
      if (config.tableName === 'tasks') {
        const isAdmin = profile?.role === 'Admin';
        if (isAdmin) {
          query = query.eq('firm_id', currentFirmId);
        } else if (profile?.id) {
          query = query.eq('assigned_to', profile.id);
        }
      } else if (config.tableName === 'event_staff_assignments') {
        const isAdmin = profile?.role === 'Admin';
        if (isAdmin) {
          query = query.eq('firm_id', currentFirmId);
        } else if (profile?.id) {
          query = query.or(`staff_id.eq.${profile.id},freelancer_id.eq.${profile.id}`);
        }
      } else {
        query = query.eq('firm_id', currentFirmId);
      }

      // Apply event ID filter if we have role filters
      if (eventIdsFilter) {
        query = query.in('id', eventIdsFilter);
      }

      // Quotations: enforce precise, mutually exclusive status/validity logic
      if (config.tableName === 'quotations') {
        const today = new Date().toISOString().split('T')[0];
        const isConverted = activeFilters.includes('converted');
        const isPending = activeFilters.includes('pending');
        const isExpired = activeFilters.includes('expired');
        const isValid = activeFilters.includes('valid');

        if (isConverted) {
          query = query.not('converted_to_event', 'is', null);
        } else {
          query = query.is('converted_to_event', null);

          if (isExpired) {
            query = query.lt('valid_until', today);
          } else if (isValid || isPending) {
            query = query.or(`valid_until.is.null,valid_until.gte.${today}`);
          } else {
            query = query.or(`valid_until.is.null,valid_until.gte.${today}`);
          }
        }
      }

      // Apply search
      if (isSearchActive && debouncedSearchTerm.trim()) {
        const safeTerm = debouncedSearchTerm.trim().replace(/[,(\)]/g, ' ');
        const baseFields = config.searchFields.map(field => `${field}.ilike.%${safeTerm}%`);
        if (baseFields.length > 0) {
          query = query.or(baseFields.join(','));
        }

        if (config.tableName === 'events' || config.tableName === 'quotations') {
          query = query.or(`name.ilike.%${safeTerm}%`, { foreignTable: 'clients' });
        }
      }

      // Apply other filters (excluding role and staff status filters)
      const staffStatusFilters = activeFilters.filter(key =>
        ['staff_incomplete', 'staff_complete', 'no_staff'].includes(key)
      );
      const otherFilters = activeFilters.filter(key => 
        !['photographer', 'cinematographer', 'editor', 'drone', 'staff_incomplete', 'staff_complete', 'no_staff'].includes(key)
      );

      // Apply non-role filters with mutual exclusions
      const hasConverted = otherFilters.includes('converted');
      const hasPending = otherFilters.includes('pending');
      const hasExpired = otherFilters.includes('expired');
      const hasValid = otherFilters.includes('valid');

      const sanitizedOtherFilters = otherFilters.filter(key => {
        if (hasConverted && key === 'pending') return false;
        if (hasPending && key === 'converted') return false;
        if (hasExpired && key === 'valid') return false;
        if (hasValid && key === 'expired') return false;
        return true;
      });

      const finalOtherFilters = config.tableName === 'quotations'
        ? sanitizedOtherFilters.filter(k => !['converted','pending','valid','expired'].includes(k))
        : sanitizedOtherFilters;

      finalOtherFilters.forEach(filterKey => {
        const filterOption = config.filterOptions.find(f => f.key === filterKey);
        if (filterOption?.queryBuilder) {
          query = filterOption.queryBuilder(query);
        }
      });

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const from = currentPage * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data: result, error, count } = await query;
      
      if (error) throw error;
      
      // Process results
      let processedResult = result || [];
      if (config.tableName === 'events' && processedResult.length > 0) {
        processedResult = processedResult.map((event: any) => ({
          ...event,
          _dataLoaded: true,
          quotation_details: event.quotation_source?.[0]?.quotation_details || event.quotation_details
        }));
      }
      
      if (append) {
        setData(prev => [...prev, ...processedResult]);
      } else {
        setData(processedResult);
      }
      
      setTotalCount(count || 0);
      setAllDataLoaded((processedResult?.length || 0) < pageSize);
      
      // Mark first load as complete
      if (isFirstLoad) {
        setIsFirstLoad(false);
      }
    } catch (error: any) {
      console.error('Error fetching filtered data:', error);
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
      if (!append) setData([]);
    } finally {
      if (isPagination) {
        setPaginationLoading(false);
      } else {
        setLoading(false);
      }
    }
  }, [config, currentFirmId, profile, isSearchActive, debouncedSearchTerm, activeFilters, sortBy, sortOrder, currentPage, pageSize, toast]);

  const loadMore = useCallback(() => {
    if (!allDataLoaded && !loading) {
      setCurrentPage(prev => prev + 1);
    }
  }, [allDataLoaded, loading]);

  const resetPagination = useCallback(() => {
    setCurrentPage(0);
    setAllDataLoaded(false);
  }, []);

  const goToPage = useCallback((page: number) => {
    const maxPage = Math.ceil(totalCount / pageSize) - 1;
    const validPage = Math.max(0, Math.min(page, maxPage));
    
    if (validPage !== currentPage && totalCount > 0) {
      setCurrentPage(validPage);
      setAllDataLoaded(false);
    }
  }, [currentPage, totalCount, pageSize]);

  const setPageSizeWithReset = useCallback((newPageSize: number) => {
    setCurrentPage(0);
    setAllDataLoaded(false);
    setPageSize(newPageSize);
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    resetPagination();
  }, [isSearchActive, debouncedSearchTerm, activeFilters, sortBy, sortOrder, resetPagination]);

  // Fetch data when pagination resets or page changes
  useEffect(() => {
    const isPagination = currentPage > 0 && data.length > 0;
    fetchData(false, isPagination);
  }, [currentPage, fetchData]);

  // Real-time subscriptions
  useEffect(() => {
    if (!options.enableRealtime || !currentFirmId) return;

    const channel = supabase
      .channel(`${config.tableName}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: config.tableName,
          filter: `firm_id=eq.${currentFirmId}`,
        },
        () => {
          resetPagination();
        }
      )
      .subscribe();

    // For events table, also listen to payments and closing balances
    let paymentsChannel: any = null;
    let closingBalancesChannel: any = null;

    if (config.tableName === 'events') {
      paymentsChannel = supabase
        .channel('payments_changes_for_events')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'payments',
            filter: `firm_id=eq.${currentFirmId}`,
          },
          () => {
            resetPagination();
          }
        )
        .subscribe();

      closingBalancesChannel = supabase
        .channel('closing_balances_changes_for_events')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'event_closing_balances',
            filter: `firm_id=eq.${currentFirmId}`,
          },
          () => {
            resetPagination();
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(channel);
      if (paymentsChannel) supabase.removeChannel(paymentsChannel);
      if (closingBalancesChannel) supabase.removeChannel(closingBalancesChannel);
    };
  }, [config.tableName, currentFirmId, options.enableRealtime, resetPagination]);

  const handleSearchApply = useCallback(() => {
    if (searchTerm.trim()) {
      setIsSearchActive(true);
    }
  }, [searchTerm]);

  const handleSearchClear = useCallback(() => {
    setSearchTerm('');
    setIsSearchActive(false);
  }, []);

  const toggleSortOrder = useCallback(() => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  }, []);

  const setActiveFiltersOptimized = useCallback((filters: string[] | ((prev: string[]) => string[])) => {
    const newFilters = typeof filters === 'function' ? filters(activeFilters) : filters;
    if (JSON.stringify(newFilters) !== JSON.stringify(activeFilters)) {
      setActiveFilters(newFilters);
    }
  }, [activeFilters]);

  const setSortByOptimized = useCallback((sort: string) => {
    setSortBy(sort);
  }, [setSortBy]);

  return {
    data,
    loading,
    paginationLoading,
    searchTerm,
    setSearchTerm,
    isSearchActive,
    handleSearchApply,
    handleSearchClear,
    activeFilters,
    setActiveFilters: setActiveFiltersOptimized,
    sortBy,
    setSortBy: setSortByOptimized,
    sortOrder,
    toggleSortOrder,
    totalCount,
    filteredCount: totalCount,
    currentPage,
    allDataLoaded,
    loadMore,
    goToPage,
    pageSize,
    setPageSize: setPageSizeWithReset,
    refetch: () => {
      resetPagination();
      fetchData(false, false);
    }
  };
};
