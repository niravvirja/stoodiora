import { useState, useCallback } from 'react';
import { 
  getPersonConflictDetails, 
  calculateEventDateRange, 
  DateRange,
  StaffAssignment 
} from '@/lib/staff-availability-utils';

interface ConflictingEvent {
  eventId: string;
  eventTitle?: string;
  role: string;
  dateRange: DateRange;
}

interface ConflictState {
  isOpen: boolean;
  staffName: string;
  role: string;
  conflictingEvents: ConflictingEvent[];
  onConfirm: () => void;
}

export const useRealTimeConflictDetection = (
  currentFirmId?: string,
  currentEventId?: string
) => {
  const [conflictState, setConflictState] = useState<ConflictState>({
    isOpen: false,
    staffName: '',
    role: '',
    conflictingEvents: [],
    onConfirm: () => {}
  });

  const checkForConflicts = useCallback(async (
    personId: string,
    personName: string,
    role: string,
    eventDate: string,
    totalDays: number = 1,
    currentAssignments: StaffAssignment[] = [],
    onConfirm: () => void
  ): Promise<boolean> => {
    if (!personId || !eventDate || !currentFirmId) {
      onConfirm();
      return true;
    }

    try {
      // Calculate event date range
      const eventDateRange = calculateEventDateRange({
        event_date: eventDate,
        total_days: totalDays
      });

      // Check for conflicts with both database and current form state
      const conflictDetails = await getPersonConflictDetails(
        personId,
        eventDateRange,
        currentEventId,
        currentFirmId,
        currentAssignments
      );

      if (conflictDetails.hasConflict && conflictDetails.conflictingEvents.length > 0) {
        // Show conflict dialog
        setConflictState({
          isOpen: true,
          staffName: personName,
          role: role,
          conflictingEvents: conflictDetails.conflictingEvents,
          onConfirm: () => {
            setConflictState(prev => ({ ...prev, isOpen: false }));
            onConfirm();
          }
        });
        return false; // Assignment blocked until user confirms
      } else {
        // No conflicts, proceed
        onConfirm();
        return true;
      }
    } catch (error) {
      console.error('Error checking conflicts:', error);
      // On error, allow assignment to proceed
      onConfirm();
      return true;
    }
  }, [currentFirmId, currentEventId]);

  const dismissConflictDialog = useCallback(() => {
    setConflictState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    conflictState,
    checkForConflicts,
    dismissConflictDialog
  };
};