import { useMemo } from 'react';
import { FILTER_CONFIGS } from '@/config/filter-configs';
import { ExportConfig } from '@/components/common/UniversalExportDialog';

interface UniversalExportConfigParams {
  entityName: string;
  title: string;
  exportFunction: (data: any[], filterType: string, filterValue: string, firmData?: any) => Promise<void>;
  getPreviewData: (data: any[], filterType: string, selectedValue: string) => {
    count: number;
    summary?: Record<string, any>;
  };
  additionalFilterTypes?: Array<{
    value: string;
    label: string;
    options?: Array<{ value: string; label: string }>;
  }>;
}

/**
 * Universal export config generator that automatically creates export configs
 * from centralized filter configurations, ensuring perfect consistency between
 * UI filters and export filters.
 */
export const useUniversalExportConfig = ({
  entityName,
  title,
  exportFunction,
  getPreviewData,
  additionalFilterTypes = []
}: UniversalExportConfigParams): ExportConfig => {
  return useMemo(() => {
    const filterConfig = FILTER_CONFIGS[entityName];
    
    if (!filterConfig) {
      console.warn(`No filter config found for entity: ${entityName}`);
      return {
        title,
        filterTypes: [{ value: 'all', label: `All ${title}` }],
        exportFunction,
        getPreviewData
      };
    }

    // Generate filter types from the centralized filter config
    const filterTypes = [
      { value: 'all', label: `All ${title}` }
    ];

    // Group filter options by logical categories
    const statusFilters: Array<{ value: string; label: string }> = [];
    const typeFilters: Array<{ value: string; label: string }> = [];
    const categoryFilters: Array<{ value: string; label: string }> = [];
    const priorityFilters: Array<{ value: string; label: string }> = [];
    const assignmentFilters: Array<{ value: string; label: string }> = [];
    const paymentFilters: Array<{ value: string; label: string }> = [];
    const editingFilters: Array<{ value: string; label: string }> = [];
    const roleFilters: Array<{ value: string; label: string }> = [];
    const miscFilters: Array<{ value: string; label: string }> = [];

    // Categorize filters based on their keys and labels
    filterConfig.filterOptions?.forEach(option => {
      const filterOption = { value: option.key, label: option.label };
      
      // Status-related filters
      if (option.key.includes('completed') || option.key.includes('pending') || 
          option.key.includes('progress') || option.key.includes('waiting') ||
          option.key.includes('accepted') || option.key.includes('declined') ||
          option.key.includes('hold') || option.key.includes('review') ||
          option.key.includes('reported') || option.key.includes('upcoming') ||
          option.key.includes('converted') || option.key.includes('valid') ||
          option.key.includes('expired')) {
        statusFilters.push(filterOption);
      }
      // Event/Task type filters
      else if (option.key.includes('wedding') || option.key.includes('maternity') ||
               option.key.includes('photo_editing') || option.key.includes('video_editing') ||
               option.key.includes('other_task') || option.key.includes('pre_wedding') ||
               option.key.includes('ring_ceremony') || option.key.includes('others')) {
        typeFilters.push(filterOption);
      }
      // Category filters (expenses, accounting, etc.)
      else if (option.key.includes('equipment') || option.key.includes('travel') ||
               option.key.includes('food') || option.key.includes('marketing') ||
               option.key.includes('maintenance') || option.key.includes('accommodation') ||
               option.key.includes('software') || option.key.includes('salary') ||
               option.key.includes('utilities') || option.key.includes('insurance') ||
               option.key.includes('bank_charges') || option.key.includes('taxes') ||
               option.key.includes('loan') || option.key.includes('emi') ||
               option.key.includes('revenue') || option.key.includes('income') ||
               option.key.includes('camera') || option.key.includes('lens') ||
               option.key.includes('lighting') || option.key.includes('audio') ||
               option.key.includes('drone') || option.key.includes('stabilizer') ||
               option.key.includes('gimbal') || option.key.includes('tripod') ||
               option.key.includes('storage') || option.key.includes('backup') ||
               option.key.includes('computer') || option.key.includes('office') ||
               option.key.includes('vehicle') || option.key.includes('studio') ||
               option.key.includes('rent') || option.key.includes('freelancer') ||
               (option.key.includes('other') && !option.key.includes('role') && !option.key.includes('task')) ||
               option.key.includes('custom') || option.key.includes('expense') ||
               entityName === 'accounting') {
        categoryFilters.push(filterOption);
      }
      // Priority filters
      else if (option.key.includes('priority') || option.key.includes('urgent')) {
        priorityFilters.push(filterOption);
      }
      // Assignment filters
      else if (option.key.includes('assigned') || option.key.includes('unassigned')) {
        assignmentFilters.push(filterOption);
      }
      // Payment filters
      else if (option.key.includes('paid') || option.key.includes('balance') ||
               option.key.includes('cash')) {
        paymentFilters.push(filterOption);
      }
      // Editing status filters
      else if (option.key.includes('editing') && !option.key.includes('photo_editing') && !option.key.includes('video_editing')) {
        editingFilters.push(filterOption);
      }
      // Role filters
      else if (option.key.includes('photographer') || option.key.includes('cinematographer') ||
               option.key.includes('editor') || option.key.includes('drone') ||
               option.key.includes('role')) {
        roleFilters.push(filterOption);
      }
      // Staff status filters
      else if (option.key.includes('staff')) {
        miscFilters.push(filterOption);
      }
      // Misc filters
      else {
        miscFilters.push(filterOption);
      }
    });

    // Add grouped filter types
    if (statusFilters.length > 0) {
      filterTypes.push({
        value: 'status',
        label: 'By Status',
        options: statusFilters
      } as { value: string; label: string; options: Array<{ value: string; label: string }> });
    }

    if (typeFilters.length > 0) {
      const typeLabel = entityName === 'events' ? 'By Event Type' : 
                       entityName === 'tasks' ? 'By Task Type' : 'By Type';
      filterTypes.push({
        value: 'type',
        label: typeLabel,
        options: typeFilters
      } as { value: string; label: string; options: Array<{ value: string; label: string }> });
    }

    if (categoryFilters.length > 0) {
      filterTypes.push({
        value: 'category',
        label: 'By Category',
        options: categoryFilters
      } as { value: string; label: string; options: Array<{ value: string; label: string }> });
    }

    if (priorityFilters.length > 0) {
      filterTypes.push({
        value: 'priority',
        label: 'By Priority',
        options: priorityFilters
      } as { value: string; label: string; options: Array<{ value: string; label: string }> });
    }

    if (assignmentFilters.length > 0) {
      filterTypes.push({
        value: 'assignment',
        label: 'By Assignment',
        options: assignmentFilters
      } as { value: string; label: string; options: Array<{ value: string; label: string }> });
    }

    if (paymentFilters.length > 0) {
      filterTypes.push({
        value: 'payment_status',
        label: 'By Payment Status',
        options: paymentFilters
      } as { value: string; label: string; options: Array<{ value: string; label: string }> });
    }

    if (editingFilters.length > 0) {
      filterTypes.push({
        value: 'editing_status',
        label: 'By Editing Status',
        options: editingFilters
      } as { value: string; label: string; options: Array<{ value: string; label: string }> });
    }

    if (roleFilters.length > 0) {
      filterTypes.push({
        value: 'role',
        label: 'By Role',
        options: roleFilters
      } as { value: string; label: string; options: Array<{ value: string; label: string }> });
    }

    if (miscFilters.length > 0) {
      filterTypes.push({
        value: 'misc',
        label: 'Other Filters',
        options: miscFilters
      } as { value: string; label: string; options: Array<{ value: string; label: string }> });
    }

    // Add any additional filter types specific to the entity
    filterTypes.push(...additionalFilterTypes);

    return {
      title,
      filterTypes,
      exportFunction,
      getPreviewData
    };
  }, [entityName, title, exportFunction, getPreviewData, additionalFilterTypes]);
};

/**
 * Helper function to create standard export configs for common entities
 */
export const createStandardExportConfig = (
  entityName: string,
  title: string,
  exportFn: (data: any[], filterType: string, filterValue: string, firmData?: any) => Promise<void>,
  previewFn: (data: any[]) => { count: number; summary?: Record<string, any> },
  additionalFilters?: Array<{ value: string; label: string; options?: Array<{ value: string; label: string }> }>
): ExportConfig => {
  const filterConfig = FILTER_CONFIGS[entityName];
  
  if (!filterConfig) {
    return {
      title,
      filterTypes: [{ value: 'all', label: `All ${title}` }],
      exportFunction: exportFn,
      getPreviewData: (data) => previewFn(data)
    };
  }

  // Use the universal config generator logic but as a standalone function
  const filterTypes = [{ value: 'all', label: `All ${title}` }];
  
  // Add categorized filters (simplified version)
  const categorizedFilters = new Map<string, Array<{ value: string; label: string }>>();
  
  filterConfig.filterOptions?.forEach(option => {
    const filterOption = { value: option.key, label: option.label };
    
    if (option.key.includes('completed') || option.key.includes('pending') || 
        option.key.includes('progress') || option.key.includes('waiting') ||
        option.key.includes('accepted') || option.key.includes('declined')) {
      if (!categorizedFilters.has('status')) categorizedFilters.set('status', []);
      categorizedFilters.get('status')!.push(filterOption);
    } else if (option.key.includes('priority') || option.key.includes('urgent')) {
      if (!categorizedFilters.has('priority')) categorizedFilters.set('priority', []);
      categorizedFilters.get('priority')!.push(filterOption);
    } else if (option.key.includes('equipment') || option.key.includes('travel') || option.key.includes('food')) {
      if (!categorizedFilters.has('category')) categorizedFilters.set('category', []);
      categorizedFilters.get('category')!.push(filterOption);
    }
  });

  // Convert categorized filters to filter types
  categorizedFilters.forEach((options, key) => {
    const label = key === 'status' ? 'By Status' :
                  key === 'priority' ? 'By Priority' :
                  key === 'category' ? 'By Category' : `By ${key}`;
    
    filterTypes.push({
      value: key,
      label,
      options
    } as { value: string; label: string; options: Array<{ value: string; label: string }> });
  });

  if (additionalFilters) {
    filterTypes.push(...additionalFilters);
  }

  return {
    title,
    filterTypes,
    exportFunction: exportFn,
    getPreviewData: (data) => previewFn(data)
  };
};