import { FILTER_CONFIGS } from '@/config/filter-configs';
import { quotationRequiresRole } from '@/lib/event-quotation-utils';
import { isCrewIncomplete } from '@/lib/crew-completeness-utils';

/**
 * Universal filter logic that uses the same backend filter configurations
 * Used by UniversalExportDialog to ensure consistent filtering across UI and exports
 */
export const applyUniversalFilter = (data: any[], filterType: string, selectedValue: string): any[] => {
  if (filterType === 'global' || filterType === 'all') {
    return data;
  }
  
  if (!selectedValue) return data;

  // Handle special cases that don't map to backend filters
  if (filterType === 'staff' || filterType === 'freelancers') {
    return applyStaffFreelancerFilter(data, filterType, selectedValue);
  }

  // Handle role-based filters for events
  if (filterType === 'role') {
    return applyEventRoleFilter(data, selectedValue);
  }

  // Handle staff status filters for events - use same logic as EventPaymentCard red crew icon
  if (filterType === 'misc' && ['staff_complete', 'staff_incomplete', 'no_staff'].includes(selectedValue)) {
    return data.filter(event => {
      const assignments = event.event_staff_assignments || [];
      const hasAssignments = assignments.length > 0;
      const crewIncomplete = isCrewIncomplete(event);
      
      switch (selectedValue) {
        case 'staff_complete':
          return hasAssignments && !crewIncomplete;
        case 'staff_incomplete':
          return crewIncomplete; // Same logic as red crew icon
        case 'no_staff':
          return !hasAssignments;
        default:
          return true;
      }
    });
  }

  // Delegate category filters to backend mapping (ensures enum-safe keys map correctly)
  if (filterType === 'category') {
    return applyBackendFilter(data, filterType, selectedValue);
  }

  if (filterType === 'event_type') {
    return data.filter(item => item.event_type === selectedValue);
  }

  if (filterType === 'type') {
    return applyEventTypeFilter(data, selectedValue);
  }

  // Use backend filter logic for all other filters
  return applyBackendFilter(data, filterType, selectedValue);
};

const applyStaffFreelancerFilter = (data: any[], filterType: string, selectedValue: string): any[] => {
  if (filterType === 'staff') {
    if (selectedValue === 'all_staff' || selectedValue === 'All Staff Members') return data;
    return data.filter(item => 
      item.assigned_to === selectedValue || 
      item.id === selectedValue || 
      item.full_name === selectedValue ||
      item.assigned_staff?.id === selectedValue ||
      item.assigned_staff?.full_name === selectedValue
    );
  }
  
  if (filterType === 'freelancers') {
    if (selectedValue === 'all_freelancers' || selectedValue === 'All Freelancers') return data;
    return data.filter(item => 
      item.freelancer_id === selectedValue ||
      item.id === selectedValue || 
      item.full_name === selectedValue ||
      item.freelancer?.id === selectedValue ||
      item.freelancer?.full_name === selectedValue
    );
  }
  
  return data;
};

const applyEventRoleFilter = (data: any[], selectedValue: string): any[] => {
  return data.filter(event => {
    // 1) Prefer quotation-based requirement check
    if (quotationRequiresRole(event, selectedValue)) return true;

    // 2) Fallback to current staff assignments
    const assignments = event.event_staff_assignments || [];
    const hasAssignment = (roles: string[]) => assignments.some((a: any) => roles.includes(a.role));

    switch (selectedValue) {
      case 'photographer':
        return hasAssignment(['Photographer']);
      case 'cinematographer':
        return hasAssignment(['Cinematographer']);
      case 'editor':
        return hasAssignment(['Editor', 'Same Day Editor']);
      case 'drone':
      case 'drone_pilot':
        return hasAssignment(['Drone Pilot', 'Drone']);
      case 'other_role':
        return assignments.some((a: any) => !['Photographer', 'Cinematographer', 'Editor', 'Same Day Editor', 'Drone Pilot', 'Drone'].includes(a.role));
      default:
        return false; // unknown role key - exclude
    }
  });
};

// Removed - now handled directly in applyUniversalFilter using isCrewIncomplete

const applyEventTypeFilter = (data: any[], selectedValue: string): any[] => {
  switch (selectedValue) {
    case 'wedding':
      return data.filter(item => item.event_type === 'Wedding');
    case 'pre_wedding':
      return data.filter(item => item.event_type === 'Pre-Wedding');
    case 'ring_ceremony':
      return data.filter(item => item.event_type === 'Ring-Ceremony');
    case 'maternity':
      return data.filter(item => item.event_type === 'Maternity Photography');
    case 'others':
      return data.filter(item => item.event_type === 'Others');
    default:
      return data;
  }
};

const applyBackendFilter = (data: any[], filterType: string, selectedValue: string): any[] => {
  // Apply filter based on the selectedValue (which is the filter key)
  return data.filter(item => applyStatusFilter(item, selectedValue));
};

const applyStatusFilter = (item: any, filterKey: string): boolean => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  switch (filterKey) {
    // Client filters
    case 'has_email':
      return item.email && item.email.trim() !== '';
      
    case 'has_address':
      return item.address && item.address.trim() !== '';
      
    case 'recent':
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(item.created_at) >= weekAgo;

    // Event type filters
    case 'wedding':
      return item.event_type === 'Wedding';
      
    case 'pre_wedding':
      return item.event_type === 'Pre-Wedding';
      
    case 'ring_ceremony':
      return item.event_type === 'Ring-Ceremony';
      
    case 'maternity':
      return item.event_type === 'Maternity Photography';
      
    case 'others':
      return item.event_type === 'Others';

    // Event status filters
    case 'upcoming':
      if (item.event_date) {
        return new Date(item.event_date) > today;
      }
      return false;
      
    case 'completed':
      if (item.event_date) {
        return new Date(item.event_date) <= today;
      }
      return item.status === 'Completed';
      
    case 'this_month':
      if (item.event_date || item.expense_date || item.entry_date) {
        const dateField = item.event_date || item.expense_date || item.entry_date;
        const itemDate = new Date(dateField);
        const now = new Date();
        return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
      }
      return false;

    case 'last_month':
      if (item.expense_date || item.entry_date) {
        const dateField = item.expense_date || item.entry_date;
        const itemDate = new Date(dateField);
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
        return itemDate.getMonth() === lastMonth.getMonth() && itemDate.getFullYear() === lastMonth.getFullYear();
      }
      return false;
      
    case 'fully_paid':
      return (item.balance_amount || 0) === 0;
      
    case 'has_balance':
      return (item.balance_amount || 0) > 0;
      
    case 'photo_editing_done':
      return item.photo_editing_status === true;
      
    case 'video_editing_done':
      return item.video_editing_status === true;

    // Staff status filters - now handled in applyUniversalFilter to avoid conflicts
    case 'staff_incomplete':
    case 'staff_complete': 
    case 'no_staff':
      // These are handled in applyUniversalFilter to use consistent isCrewIncomplete logic
      return isCrewIncomplete(item);

    // Task status filters
    case 'in_progress':
      return item.status === 'In Progress';
      
    case 'waiting_response':
      return item.status === 'Waiting for Response';
      
    case 'accepted':
      return item.status === 'Accepted';
      
    case 'declined':
      return item.status === 'Declined';
      
    case 'under_review':
      return item.status === 'Under Review';
      
    case 'on_hold':
      return item.status === 'On Hold';
      
    case 'reported':
      return item.status === 'Reported';

    // Task priority filters
    case 'high_priority':
      return ['High', 'Urgent'].includes(item.priority);
      
    case 'urgent_priority':
      return item.priority === 'Urgent';
      
    case 'medium_priority':
      return item.priority === 'Medium';
      
    case 'low_priority':
      return item.priority === 'Low';

    // Task type filters
    case 'photo_editing':
      return item.task_type === 'Photo Editing';
      
    case 'video_editing':
      return item.task_type === 'Video Editing';
      
    case 'other_task':
      return item.task_type === 'Other';

    // Task assignment filters
    case 'assigned':
      return item.assigned_to || item.freelancer_id;
      
    case 'unassigned':
      return !item.assigned_to && !item.freelancer_id;

    // Quotation status filters
    case 'converted':
      return item.converted_to_event !== null && item.converted_to_event !== undefined;
      
    case 'pending':
      return item.converted_to_event === null || item.converted_to_event === undefined;
      
    case 'valid':
      if (!item.valid_until) return true;
      return new Date(item.valid_until) >= today;
      
    case 'expired':
      if (!item.valid_until) return false;
      return new Date(item.valid_until) < today;

    // Expense category filters
    case 'equipment':
      return item.category === 'Equipment';
    case 'travel':
      return item.category === 'Travel';
    case 'food':
      return item.category === 'Food';
    case 'salary':
      return item.category === 'Salary';
    case 'marketing':
      return item.category === 'Marketing';
    case 'maintenance':
      return item.category === 'Maintenance';
    case 'accommodation':
      return item.category === 'Accommodation';
    case 'software':
      return item.category === 'Software';
    case 'other':
      return item.category === 'Other';

    // Payment method filters
    case 'cash_payment':
      return item.payment_method === 'Cash';
    case 'digital_payment':
      return item.payment_method === 'Digital';

    // Expense type filters
    case 'event_based':
      return item.event_id !== null && item.event_id !== undefined;
    case 'general_expense':
      return item.event_id === null || item.event_id === undefined;

    // Amount filters
    case 'high_amount':
      return (item.amount || 0) > 10000;

    // Receipt filters
    case 'has_receipt':
      return item.receipt_url !== null && item.receipt_url !== undefined;

    // Role filters (for freelancers/staff)
    case 'photographer':
      return item.role === 'Photographer';
    case 'cinematographer':
      return item.role === 'Cinematographer';
    case 'editor':
      return item.role === 'Editor';
    case 'drone':
    case 'drone_pilot':
      return item.role === 'Drone Pilot' || item.role === 'Drone';
    case 'other_role':
      return item.role === 'Other';

    // Accounting entry type filters
    case 'credit':
      return item.entry_type === 'Credit';
    case 'debit':
      return item.entry_type === 'Debit';
    case 'assets':
      return item.entry_type === 'Assets';
    
    // Accounting category filters - Assets
    case 'cameras':
      return item.category === 'Cameras';
    case 'lenses':
      return item.category === 'Lenses';
    case 'lighting_equipment':
      return item.category === 'Lighting Equipment';
    case 'audio_equipment':
      return item.category === 'Audio Equipment';
    case 'drones':
      return item.category === 'Drones';
    case 'stabilizers':
      return item.category === 'Stabilizers & Gimbals';
    case 'tripods':
      return item.category === 'Tripods & Stands';
    case 'storage':
      return item.category === 'Storage & Backup';
    case 'computer':
      return item.category === 'Computer & Software';
    case 'office_equipment':
      return item.category === 'Office Equipment';
    case 'vehicles':
      return item.category === 'Vehicles';
    
    // Accounting category filters - Debits
    case 'studio_rent':
      return item.category === 'Studio Rent';
    case 'utilities':
      return item.category === 'Utilities';
    case 'marketing_expense':
      return item.category === 'Marketing';
    case 'insurance':
      return item.category === 'Insurance';
    case 'maintenance_expense':
      return item.category === 'Maintenance';
    case 'travel_expense':
      return item.category === 'Travel';
    case 'staff_salary':
      return item.category === 'Staff Salary';
    case 'freelancer_payment':
      return item.category === 'Freelancer Payment';
    case 'bank_charges':
      return item.category === 'Bank Charges';
    case 'taxes':
      return item.category === 'Taxes';
    case 'loan_emi':
      return item.category === 'Loan & EMI';
    
    // Accounting category filters - Credits
    case 'event_revenue':
      return item.category === 'Event Revenue';
    case 'other_income':
      return item.category === 'Other Income';
    case 'other_expense':
      return item.category === 'Other Expense';
    case 'custom':
      return item.category === 'Custom';
    
    // Accounting other filters
    case 'reflect_to_company':
      return item.reflect_to_company === true;

    // Payment status filters (for salary)
    case 'has_payments':
      return (item.staff_payments && item.staff_payments.length > 0) || 
             (item.freelancer_payments && item.freelancer_payments.length > 0);
    case 'no_payments':
      return (!item.staff_payments || item.staff_payments.length === 0) && 
             (!item.freelancer_payments || item.freelancer_payments.length === 0);

    // Admin exclusion filter
    case 'admin_excluded':
      return item.role !== 'Admin';

    default:
      return true;
  }
};

/**
 * Get filter display label for the export dialog
 */
export const getFilterDisplayLabel = (filterType: string, selectedValue: string, filterConfig: any): string => {
  if (filterType === 'global' || filterType === 'all') {
    return filterConfig?.label || 'All Items';
  }
  
  if (!selectedValue) return 'Unknown';
  
  const option = filterConfig?.options?.find((opt: any) => opt.value === selectedValue);
  return option?.label || selectedValue;
};