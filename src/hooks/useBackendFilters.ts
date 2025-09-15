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

  const buildQuery = useCallback((withPagination = true) => {
    if (!currentFirmId) return null;

    let query = supabase
      .from(config.tableName as any)
      .select(config.selectQuery || '*', { count: 'exact' });

    // Apply role-based filtering for tasks
    if (config.tableName === 'tasks') {
      const isAdmin = profile?.role === 'Admin';
      if (isAdmin) {
        // Admin sees all tasks for their firm
        query = query.eq('firm_id', currentFirmId);
      } else if (profile?.id) {
        // Staff only sees tasks assigned to them
        query = query.eq('assigned_to', profile.id);
      }
    } else {
      // For other tables, filter by firm_id
      query = query.eq('firm_id', currentFirmId);
    }

    // Apply search
    if (isSearchActive && debouncedSearchTerm.trim()) {
      const searchQuery = config.searchFields
        .map(field => `${field}.ilike.%${debouncedSearchTerm}%`)
        .join(',');
      query = query.or(searchQuery);
    }

    // Apply filters with proper grouping logic
    const roleFilters = activeFilters.filter(key => 
      ['photographer', 'cinematographer', 'editor', 'drone'].includes(key)
    );
    const otherFilters = activeFilters.filter(key => 
      !['photographer', 'cinematographer', 'editor', 'drone'].includes(key)
    );

    // Apply non-role filters individually (AND logic)
    otherFilters.forEach(filterKey => {
      const filterOption = config.filterOptions.find(f => f.key === filterKey);
      if (filterOption?.queryBuilder) {
        query = filterOption.queryBuilder(query);
      }
    });

    // Apply role filters with OR logic (only for tables that have a 'role' column)
    if (roleFilters.length > 0) {
      const roleConditions = roleFilters.map(roleKey => {
        if (roleKey === 'photographer') return "role.eq.Photographer";
        if (roleKey === 'cinematographer') return "role.eq.Cinematographer";
        if (roleKey === 'editor') return "role.eq.Editor";
        if (roleKey === 'drone') return "role.eq.Drone";
        return null;
      }).filter(Boolean);
      
      if (roleConditions.length > 0) {
        query = query.or(roleConditions.join(','));
      }
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    if (withPagination) {
      const from = currentPage * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
    }

    return query;
  }, [config, currentFirmId, isSearchActive, debouncedSearchTerm, activeFilters, sortBy, sortOrder, currentPage, pageSize]);

  const fetchData = useCallback(async (append = false) => {
    const query = buildQuery();
    if (!query) {
      setLoading(false);
      return;
    }

    try {
      if (!append) setLoading(true);
      
      const { data: result, error, count } = await query;
      
      if (error) throw error;
      
      if (append) {
        setData(prev => [...prev, ...(result || [])]);
      } else {
        setData(result || []);
      }
      
      setTotalCount(count || 0);
      setAllDataLoaded((result?.length || 0) < pageSize);
    } catch (error: any) {
      console.error('Error fetching filtered data:', error);
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
      if (!append) setData([]);
    } finally {
      setLoading(false);
    }
  }, [buildQuery, pageSize, toast]);

  const loadMore = useCallback(() => {
    if (!allDataLoaded && !loading) {
      setCurrentPage(prev => prev + 1);
    }
  }, [allDataLoaded, loading]);

  const resetPagination = useCallback(() => {
    setCurrentPage(0);
    setAllDataLoaded(false);
  }, []);

  // Reset pagination when page size changes
  useEffect(() => {
    setCurrentPage(0);
    setData([]);
    setAllDataLoaded(false);
  }, [pageSize]);

  // Reset pagination when filters change
  // Load initial data
  useEffect(() => {
    resetPagination();
  }, [isSearchActive, debouncedSearchTerm, activeFilters, sortBy, sortOrder, resetPagination]);

  // Fetch data when pagination resets or page changes
  useEffect(() => {
    if (currentPage === 0) {
      fetchData(false);
    } else {
      fetchData(true);
    }
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

    return () => {
      supabase.removeChannel(channel);
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

  // Optimized filter setters that reset pagination
  const setActiveFiltersOptimized = useCallback((filters: string[] | ((prev: string[]) => string[])) => {
    setActiveFilters(filters);
  }, []);

  const setSortByOptimized = useCallback((sort: string) => {
    setSortBy(sort);
  }, []);

  return {
    data,
    loading,
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
    pageSize,
    setPageSize,
    refetch: () => {
      resetPagination();
      fetchData(false);
    }
  };
};