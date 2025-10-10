import { supabase } from '@/integrations/supabase/client';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface StaffAssignment {
  staff_id?: string;
  freelancer_id?: string;
  role: string;
  day_number: number;
  day_date: string;
  event_id: string;
}

export interface EventDateInfo {
  event_date: string;
  event_end_date?: string;
  total_days: number;
}

/**
 * Check if two date ranges overlap
 * @param range1 First date range
 * @param range2 Second date range
 * @returns true if the ranges overlap
 */
export const datesOverlap = (range1: DateRange, range2: DateRange): boolean => {
  const start1 = new Date(range1.startDate);
  const end1 = new Date(range1.endDate);
  const start2 = new Date(range2.startDate);
  const end2 = new Date(range2.endDate);

  // Check for overlap: 
  // - New event start date is between existing event's start and end date, OR
  // - New event end date is between existing event's start and end date, OR  
  // - New event fully covers existing event's date range, OR
  // - Existing event fully covers new event's date range
  return (
    (start1 >= start2 && start1 <= end2) ||  // New start is within existing range
    (end1 >= start2 && end1 <= end2) ||      // New end is within existing range
    (start1 <= start2 && end1 >= end2) ||    // New event covers existing event
    (start2 <= start1 && end2 >= end1)       // Existing event covers new event
  );
};

/**
 * Calculate the date range for an event based on event_date, total_days, and optional event_end_date
 * @param eventInfo Event date information
 * @returns DateRange object
 */
export const calculateEventDateRange = (eventInfo: EventDateInfo): DateRange => {
  const startDate = new Date(eventInfo.event_date);
  let endDate: Date;

  if (eventInfo.event_end_date) {
    endDate = new Date(eventInfo.event_end_date);
  } else {
    // Calculate end date based on total_days
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + (eventInfo.total_days - 1));
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
};

/**
 * Get all staff assignments for events that overlap with the given date range
 * @param dateRange The date range to check for conflicts
 * @param excludeEventId Optional event ID to exclude from the check (for editing existing events)
 * @param firmId The firm ID to filter assignments
 * @param currentEventAssignments Optional current event assignments to check against (for real-time conflict detection)
 * @returns Array of conflicting assignments
 */
export const getConflictingAssignments = async (
  dateRange: DateRange,
  excludeEventId?: string,
  firmId?: string,
  currentEventAssignments?: StaffAssignment[]
): Promise<StaffAssignment[]> => {
  try {
    let query = supabase
      .from('event_staff_assignments')
      .select(`
        staff_id,
        freelancer_id,
        role,
        day_number,
        day_date,
        event_id,
        events!inner(
          event_date,
          event_end_date,
          total_days,
          firm_id
        )
      `);

    // Filter by firm if provided
    if (firmId) {
      query = query.eq('events.firm_id', firmId);
    }

    // Exclude current event if editing
    if (excludeEventId) {
      query = query.neq('event_id', excludeEventId);
    }

    const { data: assignments, error } = await query;

    if (error) {
      console.error('Error fetching conflicting assignments:', error);
      return [];
    }

    if (!assignments) return [];

    // Filter assignments by date overlap
    const conflictingAssignments = assignments.filter(assignment => {
      const event = (assignment as any).events;
      const eventDateRange = calculateEventDateRange({
        event_date: event.event_date,
        event_end_date: event.event_end_date,
        total_days: event.total_days || 1
      });

      return datesOverlap(dateRange, eventDateRange);
    });

    let allConflicts = conflictingAssignments.map(assignment => ({
      staff_id: assignment.staff_id || '',
      freelancer_id: assignment.freelancer_id || '',
      role: assignment.role,
      day_number: assignment.day_number,
      day_date: assignment.day_date || '',
      event_id: assignment.event_id
    }));

    // Add current event assignments if provided (for real-time conflict detection)
    if (currentEventAssignments && currentEventAssignments.length > 0) {
      const currentEventConflicts = currentEventAssignments.filter(assignment => {
        // Check if assignment date overlaps with the target date range
        if (assignment.day_date) {
          const assignmentDate = new Date(assignment.day_date);
          const checkStart = new Date(dateRange.startDate);
          const checkEnd = new Date(dateRange.endDate);
          return assignmentDate >= checkStart && assignmentDate <= checkEnd;
        }
        return false;
      }).map(assignment => ({
        staff_id: assignment.staff_id || '',
        freelancer_id: assignment.freelancer_id || '',
        role: assignment.role,
        day_number: assignment.day_number,
        day_date: assignment.day_date || '',
        event_id: assignment.event_id
      }));
      
      allConflicts = [...allConflicts, ...currentEventConflicts];
    }

    return allConflicts;
  } catch (error) {
    console.error('Error in getConflictingAssignments:', error);
    return [];
  }
};

/**
 * Check if a specific staff member or freelancer is available for the given date range
 * @param personId Staff or freelancer ID
 * @param dateRange Date range to check
 * @param excludeEventId Optional event ID to exclude (for editing)
 * @param firmId Firm ID to filter assignments
 * @returns Promise<boolean> - true if available, false if conflicts exist
 */
export const isPersonAvailable = async (
  personId: string,
  dateRange: DateRange,
  excludeEventId?: string,
  firmId?: string,
  currentEventAssignments?: StaffAssignment[]
): Promise<boolean> => {
  if (!personId) return true;

  const conflictingAssignments = await getConflictingAssignments(dateRange, excludeEventId, firmId, currentEventAssignments);
  
  // Check if this person is assigned to any conflicting events
  return !conflictingAssignments.some(assignment => 
    assignment.staff_id === personId || assignment.freelancer_id === personId
  );
};

/**
 * Get staff/freelancers with conflict information for a given date range
 * @param people Array of staff/freelancers to check
 * @param dateRange Date range to check conflicts for
 * @param excludeEventId Optional event ID to exclude (for editing)
 * @param firmId Firm ID to filter assignments
 * @returns Promise<Array> - people with conflict information
 */
export const getStaffWithConflictInfo = async <T extends { id: string; full_name: string }>(
  people: T[],
  dateRange: DateRange,
  excludeEventId?: string,
  firmId?: string,
  currentEventAssignments?: StaffAssignment[]
): Promise<Array<T & { hasConflict: boolean; conflictingEvents?: any[] }>> => {
  if (!people.length) return [];

  const conflictingAssignments = await getConflictingAssignments(dateRange, excludeEventId, firmId, currentEventAssignments);
  
  // Create map of person IDs to their conflicts
  const conflictMap = new Map<string, any[]>();
  
  for (const assignment of conflictingAssignments) {
    const personId = assignment.staff_id || assignment.freelancer_id;
    if (personId) {
      if (!conflictMap.has(personId)) {
        conflictMap.set(personId, []);
      }
      conflictMap.get(personId)!.push(assignment);
    }
  }

  // Return people with conflict information
  return people.map(person => ({
    ...person,
    hasConflict: conflictMap.has(person.id),
    conflictingEvents: conflictMap.get(person.id) || []
  }));
};

/**
 * Filter people to only return those who are available for the given date range
 * @param people Array of staff/freelancers to filter
 * @param dateRange Date range to check availability for
 * @param excludeEventId Optional event ID to exclude (for editing)
 * @param firmId Firm ID to filter assignments
 * @returns Promise<Array> - only available people
 */
export const filterAvailablePeople = async <T extends { id: string }>(
  people: T[],
  dateRange: DateRange,
  excludeEventId?: string,
  firmId?: string
): Promise<T[]> => {
  if (!people.length) return [];

  const conflictingAssignments = await getConflictingAssignments(dateRange, excludeEventId, firmId);
  
  // Create set of person IDs with conflicts
  const conflictingPersonIds = new Set<string>();
  
  for (const assignment of conflictingAssignments) {
    const personId = assignment.staff_id || assignment.freelancer_id;
    if (personId) {
      conflictingPersonIds.add(personId);
    }
  }

  // Return only people who don't have conflicts
  return people.filter(person => !conflictingPersonIds.has(person.id));
};

/**
 * Get detailed conflict information for a person
 * @param personId Staff or freelancer ID
 * @param dateRange Date range to check
 * @param excludeEventId Optional event ID to exclude
 * @param firmId Firm ID to filter assignments
 * @returns Promise with conflict details
 */
export const getPersonConflictDetails = async (
  personId: string,
  dateRange: DateRange,
  excludeEventId?: string,
  firmId?: string,
  currentEventAssignments?: StaffAssignment[]
): Promise<{
  hasConflict: boolean;
  conflictingEvents: Array<{
    eventId: string;
    eventTitle?: string;
    role: string;
    dateRange: DateRange;
  }>;
}> => {
  if (!personId) {
    return { hasConflict: false, conflictingEvents: [] };
  }

  try {
    let query = supabase
      .from('event_staff_assignments')
      .select(`
        staff_id,
        freelancer_id,
        role,
        event_id,
        events!inner(
          id,
          title,
          event_date,
          event_end_date,
          total_days,
          firm_id
        )
      `)
      .or(`staff_id.eq.${personId},freelancer_id.eq.${personId}`);

    if (firmId) {
      query = query.eq('events.firm_id', firmId);
    }

    if (excludeEventId) {
      query = query.neq('event_id', excludeEventId);
    }

    const { data: assignments, error } = await query;

    if (error) {
      console.error('Error fetching person conflicts:', error);
      return { hasConflict: false, conflictingEvents: [] };
    }

    if (!assignments) {
      return { hasConflict: false, conflictingEvents: [] };
    }

    let conflictingEvents = assignments
      .map(assignment => {
        const event = (assignment as any).events;
        const eventDateRange = calculateEventDateRange({
          event_date: event.event_date,
          event_end_date: event.event_end_date,
          total_days: event.total_days || 1
        });

        const hasOverlap = datesOverlap(dateRange, eventDateRange);

        return {
          assignment,
          event,
          eventDateRange,
          hasOverlap
        };
      })
      .filter(item => item.hasOverlap)
      .map(item => ({
        eventId: item.event.id,
        eventTitle: item.event.title,
        role: item.assignment.role,
        dateRange: item.eventDateRange
      }));

    // Add current event assignments if provided (for real-time conflict detection)
    if (currentEventAssignments && currentEventAssignments.length > 0) {
      const currentEventConflicts = currentEventAssignments
        .filter(assignment => {
          // Check if this assignment is for the same person
          const isForThisPerson = assignment.staff_id === personId || assignment.freelancer_id === personId;
          
          // Check if assignment date overlaps with the target date range
          if (isForThisPerson && assignment.day_date) {
            const assignmentDate = new Date(assignment.day_date);
            const checkStart = new Date(dateRange.startDate);
            const checkEnd = new Date(dateRange.endDate);
            return assignmentDate >= checkStart && assignmentDate <= checkEnd;
          }
          return false;
        })
        .map(assignment => ({
          eventId: assignment.event_id,
          eventTitle: 'Current Event (Unsaved)',
          role: assignment.role,
          dateRange: {
            startDate: assignment.day_date || dateRange.startDate,
            endDate: assignment.day_date || dateRange.endDate
          }
        }));
      
      conflictingEvents = [...conflictingEvents, ...currentEventConflicts];
    }

    return {
      hasConflict: conflictingEvents.length > 0,
      conflictingEvents
    };
  } catch (error) {
    console.error('Error in getPersonConflictDetails:', error);
    return { hasConflict: false, conflictingEvents: [] };
  }
};