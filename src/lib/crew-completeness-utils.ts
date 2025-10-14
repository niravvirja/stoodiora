/**
 * Enterprise-grade crew completeness validation utilities
 * Handles proper logic flow for determining if event crew requirements are met
 */

import { EnhancedEvent, QuotationDetails, StaffAssignment, DayConfig, hasQuotationDetails, isEventDataComplete } from '@/types/enterprise-event-types';

interface CrewCompleteness {
  isComplete: boolean;
  reason?: string;
  missingCrew?: {
    day: number;
    role: string;
    required: number;
    assigned: number;
  }[];
}

/**
 * Checks if an event's crew assignments meet quotation requirements
 * @param event - The event to check
 * @returns CrewCompleteness status with detailed breakdown
 */
export function checkEventCrewCompleteness(event: any): CrewCompleteness {
  // Convert to enhanced event type for type safety
  const enhancedEvent = event as EnhancedEvent;
  
  // Rule 1: Events without quotation_source_id are always complete (no requirements to check)
  if (!enhancedEvent.quotation_source_id) {
    return {
      isComplete: true,
      reason: 'No quotation requirements to check'
    };
  }
  
  // Rule 2: If quotation_details are missing, consider complete for now (avoid false positives)
  if (!hasQuotationDetails(enhancedEvent)) {
    return {
      isComplete: true,
      reason: 'Quotation details not loaded - assuming complete'
    };
  }
  
  const quotationDetails = enhancedEvent.quotation_details!;
  const staffAssignments = enhancedEvent.event_staff_assignments || [];
  const totalDays = enhancedEvent.total_days || 1;
  
  // Rule 3: Check each day's requirements vs actual assignments
  const missingCrew: CrewCompleteness['missingCrew'] = [];
  
  // Only check if quotation has day configurations
  if (!quotationDetails.days || !Array.isArray(quotationDetails.days)) {
    return {
      isComplete: true,
      reason: 'No day-wise crew requirements found'
    };
  }
  
  for (let day = 1; day <= totalDays; day++) {
    const dayConfig = quotationDetails.days[day - 1];
    
    if (!dayConfig) continue;
    
    // Count actual assignments for this specific day
    const dayAssignments = staffAssignments.filter(
      (assignment: StaffAssignment) => assignment.day_number === day
    );
    
    const actualCounts = {
      photographers: dayAssignments.filter(a => a.role === 'Photographer').length,
      cinematographers: dayAssignments.filter(a => a.role === 'Cinematographer').length,
      dronePilots: dayAssignments.filter(a => a.role === 'Drone Pilot').length,
      sameDayEditors: dayAssignments.filter(a => a.role === 'Same Day Editor').length
    };
    
    const requiredCounts = {
      photographers: dayConfig.photographers || 0,
      cinematographers: dayConfig.cinematographers || 0,
      dronePilots: dayConfig.drone || 0,
      sameDayEditors: dayConfig.sameDayEditors || (quotationDetails.sameDayEditing ? 1 : 0)
    };
    
    // Only check roles that have requirements > 0
    const roles = [
      { name: 'Photographer', actual: actualCounts.photographers, required: requiredCounts.photographers },
      { name: 'Cinematographer', actual: actualCounts.cinematographers, required: requiredCounts.cinematographers },
      { name: 'Drone Pilot', actual: actualCounts.dronePilots, required: requiredCounts.dronePilots },
      { name: 'Same Day Editor', actual: actualCounts.sameDayEditors, required: requiredCounts.sameDayEditors }
    ].filter(role => role.required > 0); // Only check roles with requirements
    
    for (const role of roles) {
      if (role.actual < role.required) {
        missingCrew.push({
          day,
          role: role.name,
          required: role.required,
          assigned: role.actual
        });
      }
    }
  }
  
  return {
    isComplete: missingCrew.length === 0,
    reason: missingCrew.length > 0 ? 'Crew assignments incomplete' : 'All crew requirements met',
    missingCrew: missingCrew.length > 0 ? missingCrew : undefined
  };
}

/**
 * Simple boolean check for crew completeness (backward compatibility)
 * @param event - The event to check
 * @returns true if crew is incomplete (needs red icon), false if complete
 */
export function isCrewIncomplete(event: any): boolean {
  const result = checkEventCrewCompleteness(event);
  return !result.isComplete;
}