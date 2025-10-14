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

      // Group filters by the field they operate on to use OR logic within groups
      const filterGroups: Record<string, { values: string[], filterKeys: string[] }> = {};
      
      // Define field mappings for filters that should use OR logic
      const fieldMappings: Record<string, { field: string, value: string }> = {
        // Freelancers role filters
        'freelancer_photographer': { field: 'role', value: 'Photographer' },
        'freelancer_cinematographer': { field: 'role', value: 'Cinematographer' },
        'freelancer_drone_pilot': { field: 'role', value: 'Drone Pilot' },
        'freelancer_editor': { field: 'role', value: 'Editor' },
        'other_role': { field: 'role', value: 'Other' },
        
        // Staff/Assignments role filters
        'photographer': { field: 'role', value: 'Photographer' },
        'cinematographer': { field: 'role', value: 'Cinematographer' },
        'editor': { field: 'role', value: 'Editor' },
        'drone': { field: 'role', value: 'Drone Pilot' },
        
        // Accounting entry_type filters
        'credit': { field: 'entry_type', value: 'Credit' },
        'debit': { field: 'entry_type', value: 'Debit' },
        'assets': { field: 'entry_type', value: 'Assets' },
        
        // Accounting category filters - Assets
        'cameras': { field: 'category', value: 'Cameras' },
        'lenses': { field: 'category', value: 'Lenses' },
        'lighting_equipment': { field: 'category', value: 'Lighting Equipment' },
        'audio_equipment': { field: 'category', value: 'Audio Equipment' },
        'drones': { field: 'category', value: 'Drones' },
        'stabilizers': { field: 'category', value: 'Stabilizers & Gimbals' },
        'tripods': { field: 'category', value: 'Tripods & Stands' },
        'storage': { field: 'category', value: 'Storage & Backup' },
        'computer': { field: 'category', value: 'Computer & Software' },
        'office_equipment': { field: 'category', value: 'Office Equipment' },
        'vehicles': { field: 'category', value: 'Vehicles' },
        
        // Accounting category filters - Debits
        'studio_rent': { field: 'category', value: 'Studio Rent' },
        'utilities': { field: 'category', value: 'Utilities' },
        'marketing_expense': { field: 'category', value: 'Marketing' },
        'insurance': { field: 'category', value: 'Insurance' },
        'maintenance_expense': { field: 'category', value: 'Maintenance' },
        'travel_expense': { field: 'category', value: 'Travel' },
        'staff_salary': { field: 'category', value: 'Staff Salary' },
        'freelancer_payment': { field: 'category', value: 'Freelancer Payment' },
        'bank_charges': { field: 'category', value: 'Bank Charges' },
        'taxes': { field: 'category', value: 'Taxes' },
        'loan_emi': { field: 'category', value: 'Loan & EMI' },
        
        // Accounting category filters - Credits
        'event_revenue': { field: 'category', value: 'Event Revenue' },
        'other_income': { field: 'category', value: 'Other Income' },
        'other_expense': { field: 'category', value: 'Other Expense' },
        'custom': { field: 'category', value: 'Custom' },
        
        // Task status filters
        'completed': { field: 'status', value: 'Completed' },
        'in_progress': { field: 'status', value: 'In Progress' },
        'pending': { field: 'status', value: 'Pending' },
        'waiting_response': { field: 'status', value: 'Waiting for Response' },
        'accepted': { field: 'status', value: 'Accepted' },
        'declined': { field: 'status', value: 'Declined' },
        'on_hold': { field: 'status', value: 'On Hold' },
        'under_review': { field: 'status', value: 'Under Review' },
        'reported': { field: 'status', value: 'Reported' },
        
        // Task priority filters
        'urgent_priority': { field: 'priority', value: 'Urgent' },
        'medium_priority': { field: 'priority', value: 'Medium' },
        'low_priority': { field: 'priority', value: 'Low' },
        
        // Task type filters
        'photo_editing': { field: 'task_type', value: 'Photo Editing' },
        'video_editing': { field: 'task_type', value: 'Video Editing' },
        'other_task': { field: 'task_type', value: 'Other' },
        
        // Event type filters
        'wedding': { field: 'event_type', value: 'Wedding' },
        'pre_wedding': { field: 'event_type', value: 'Pre-Wedding' },
        'ring_ceremony': { field: 'event_type', value: 'Ring-Ceremony' },
        'maternity': { field: 'event_type', value: 'Maternity Photography' },
        'others': { field: 'event_type', value: 'Others' },
        
        // Expense category filters
        'equipment': { field: 'category', value: 'Equipment' },
        'travel': { field: 'category', value: 'Travel' },
        'food': { field: 'category', value: 'Food' },
        'salary': { field: 'category', value: 'Salary' },
        'marketing': { field: 'category', value: 'Marketing' },
        'maintenance': { field: 'category', value: 'Maintenance' },
        'accommodation': { field: 'category', value: 'Accommodation' },
        'software': { field: 'category', value: 'Software' },
        'other': { field: 'category', value: 'Other' },
        
        // Expense payment method filters
        'cash_payment': { field: 'payment_method', value: 'Cash' },
        'digital_payment': { field: 'payment_method', value: 'Digital' },
      };

      // Group filters that operate on the same field
      const groupedFilters: string[] = [];
      otherFilters.forEach(filterKey => {
        const mapping = fieldMappings[filterKey];
        if (mapping) {
          groupedFilters.push(filterKey);
          if (!filterGroups[mapping.field]) {
            filterGroups[mapping.field] = { values: [], filterKeys: [] };
          }
          filterGroups[mapping.field].values.push(mapping.value);
          filterGroups[mapping.field].filterKeys.push(filterKey);
        }
      });

      // Apply grouped filters using .in() for OR logic
      Object.entries(filterGroups).forEach(([field, group]) => {
        if (group.values.length > 0) {
          query = query.in(field, group.values);
        }
      });

      // Apply remaining filters individually
      const remainingFilters = otherFilters.filter(key => !groupedFilters.includes(key));
      
      // Handle special mutual exclusions for quotations
      let finalRemainingFilters = remainingFilters;
      if (config.tableName === 'quotations') {
        const hasConverted = remainingFilters.includes('converted');
        const hasPending = remainingFilters.includes('pending');
        const hasExpired = remainingFilters.includes('expired');
        const hasValid = remainingFilters.includes('valid');

        finalRemainingFilters = remainingFilters.filter(key => {
          if (hasConverted && key === 'pending') return false;
          if (hasPending && key === 'converted') return false;
          if (hasExpired && key === 'valid') return false;
          if (hasValid && key === 'expired') return false;
          return true;
        });
      }

      finalRemainingFilters.forEach(filterKey => {
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
