import { isCrewIncomplete } from './crew-completeness-utils';

export interface EventWithAssignments {
  id: string;
  title: string;
  quotation_source_id?: string | null;
  quotation_details?: any;
  event_staff_assignments?: Array<{
    role: string;
    staff_id?: string | null;
    freelancer_id?: string | null;
    day_number?: number;
  }>;
  total_days?: number;
  _dataLoaded?: boolean;
}

export function getEventStaffStatus(event: EventWithAssignments): 'complete' | 'incomplete' | 'none' {
  // Use the same logic as the red icon in EventPaymentCard
  const crewIncomplete = isCrewIncomplete(event as any);
  
  const assignments = event.event_staff_assignments || [];
  
  if (assignments.length === 0) {
    return 'none';
  }
  
  // If crew is incomplete according to quotation requirements, return incomplete
  if (crewIncomplete) {
    return 'incomplete';
  }
  
  return 'complete';
}

export function filterEventsByStaffStatus(events: EventWithAssignments[], statusFilter: string): EventWithAssignments[] {
  return events.filter(event => {
    const status = getEventStaffStatus(event);
    
    switch (statusFilter) {
      case 'staff_complete':
        return status === 'complete';
      case 'staff_incomplete':
        return status === 'incomplete';
      case 'no_staff':
        return status === 'none';
      default:
        return true;
    }
  });
}