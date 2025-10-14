import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableStaffSelect } from '@/components/ui/searchable-staff-select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Camera02Icon, VideoReplayIcon, AdobePremierIcon, DroneIcon, UserGroupIcon, Add01Icon, Remove01Icon } from 'hugeicons-react';
import { Quotation } from '@/types/studio';
import { StaffAssignmentConflictDialog } from '@/components/ui/staff-assignment-conflict-dialog';
import { useAuth } from '@/components/auth/AuthProvider';
import { getQuotationSameDayEditing, parseQuotationDetails } from '@/lib/type-utils';
import { useRealTimeConflictDetection } from '@/hooks/useRealTimeConflictDetection';

interface Staff {
  id: string;
  full_name: string;
  role: string;
  mobile_number?: string;
  source: 'staff' | 'freelancer';
}

interface MultiDayAssignment {
  day: number;
  photographer_ids: string[];
  cinematographer_ids: string[];
  drone_pilot_ids: string[];
  same_day_editor_ids: string[];
  other_crew_ids: string[];
}

interface EventStaffAssignmentProps {
  multiDayAssignments: MultiDayAssignment[];
  totalDays: number;
  sameDayEditor: boolean;
  sameDayEditors: string[];
  otherCrewEnabled: boolean;
  photographers: Staff[];
  cinematographers: Staff[];
  editors: Staff[];
  dronePilots: Staff[];
  otherCrew: Staff[];
  selectedQuotation: Quotation | null;
  currentEvent: any;
  isEventFromQuotation: boolean;
  eventDate: string;
  eventEndDate?: string;
  onUpdateStaffAssignment: (dayIndex: number, field: string, slotIndex: number | null, value: string) => void;
  onAddStaffSlot: (dayIndex: number, field: 'photographer_ids' | 'cinematographer_ids' | 'drone_pilot_ids' | 'same_day_editor_ids' | 'other_crew_ids') => void;
  onRemoveStaffSlot: (dayIndex: number, field: 'photographer_ids' | 'cinematographer_ids' | 'drone_pilot_ids' | 'same_day_editor_ids' | 'other_crew_ids', slotIndex: number) => void;
  onToggleSameDayEditor: (checked: boolean) => void;
  onUpdateSameDayEditor: (index: number, value: string) => void;
  onAddSameDayEditor: () => void;
  onRemoveSameDayEditor: (index: number) => void;
  onToggleOtherCrew: (checked: boolean) => void;
}

const EventStaffAssignment: React.FC<EventStaffAssignmentProps> = ({
  multiDayAssignments,
  totalDays,
  sameDayEditor,
  sameDayEditors: legacySameDayEditors,
  otherCrewEnabled,
  photographers,
  cinematographers,
  editors,
  dronePilots,
  otherCrew,
  selectedQuotation,
  currentEvent,
  isEventFromQuotation,
  eventDate,
  eventEndDate,
  onUpdateStaffAssignment,
  onAddStaffSlot,
  onRemoveStaffSlot,
  onToggleSameDayEditor,
  onUpdateSameDayEditor,
  onAddSameDayEditor,
  onRemoveSameDayEditor,
  onToggleOtherCrew
}) => {
  const { currentFirmId } = useAuth();
  const quotationHasSameDayEditing = getQuotationSameDayEditing(selectedQuotation?.quotation_details as string);
  
  // Use the real-time conflict detection hook
  const { conflictState, checkForConflicts, dismissConflictDialog } = useRealTimeConflictDetection(
    currentFirmId,
    currentEvent?.id
  );

  // SAME DAY EDITORS: These are regular editors who go to the event location on the same day
  // to do their editing work there. All data will be provided to them at the event location.
  // They are not a separate role - they're editors with a specific assignment type.
  const sameDayEditorsStaff = React.useMemo(() => 
    editors.filter(editor => editor.role === 'Editor' || editor.role === 'Same Day Editor'),
    [editors]
  );

  // Check for conflicts when assigning staff with real-time detection
  const handleStaffAssignment = async (dayIndex: number, field: string, slotIndex: number | null, value: string) => {
    if (!value || !eventDate) {
      onUpdateStaffAssignment(dayIndex, field, slotIndex, value);
      return;
    }

    // Find the person being assigned
    const allStaff = [...photographers, ...cinematographers, ...editors, ...sameDayEditorsStaff, ...dronePilots, ...otherCrew];
    const selectedPerson = allStaff.find(person => person.id === value);
    if (!selectedPerson) {
      onUpdateStaffAssignment(dayIndex, field, slotIndex, value);
      return;
    }

    // Determine role based on field
    let role = '';
    switch (field) {
      case 'photographer_ids':
        role = 'Photographer';
        break;
      case 'cinematographer_ids':
        role = 'Cinematographer';
        break;
      case 'drone_pilot_ids':
        role = 'Drone Pilot';
        break;
      case 'same_day_editor_ids':
        role = 'Same Day Editor';
        break;
      case 'other_crew_ids':
        role = 'Other';
        break;
      default:
        role = 'Unknown';
    }

    // Generate current assignments for conflict checking
    const currentAssignments = multiDayAssignments.flatMap((dayAssignment) => {
      const assignments = [];
      const eventDateObj = new Date(eventDate);
      const dayDate = new Date(eventDateObj);
      dayDate.setDate(eventDateObj.getDate() + (dayAssignment.day - 1));
      const dayDateString = dayDate.toISOString().split('T')[0];

      // Add all current assignments for this day
      dayAssignment.photographer_ids.forEach(id => {
        if (id) assignments.push({
          staff_id: [...photographers, ...editors].some(s => s.id === id) ? id : undefined,
          freelancer_id: [...cinematographers, ...dronePilots, ...otherCrew].some(f => f.id === id && f.source === 'freelancer') ? id : undefined,
          role: 'Photographer',
          day_number: dayAssignment.day,
          day_date: dayDateString,
          event_id: currentEvent?.id || 'new-event'
        });
      });

      dayAssignment.cinematographer_ids.forEach(id => {
        if (id) assignments.push({
          staff_id: [...photographers, ...editors].some(s => s.id === id) ? id : undefined,
          freelancer_id: [...cinematographers, ...dronePilots, ...otherCrew].some(f => f.id === id && f.source === 'freelancer') ? id : undefined,
          role: 'Cinematographer',
          day_number: dayAssignment.day,
          day_date: dayDateString,
          event_id: currentEvent?.id || 'new-event'
        });
      });

      dayAssignment.drone_pilot_ids.forEach(id => {
        if (id) assignments.push({
          staff_id: [...photographers, ...editors].some(s => s.id === id) ? id : undefined,
          freelancer_id: [...cinematographers, ...dronePilots, ...otherCrew].some(f => f.id === id && f.source === 'freelancer') ? id : undefined,
          role: 'Drone Pilot',
          day_number: dayAssignment.day,
          day_date: dayDateString,
          event_id: currentEvent?.id || 'new-event'
        });
      });

      dayAssignment.same_day_editor_ids.forEach(id => {
        if (id) assignments.push({
          staff_id: [...photographers, ...editors].some(s => s.id === id) ? id : undefined,
          freelancer_id: [...cinematographers, ...dronePilots, ...otherCrew].some(f => f.id === id && f.source === 'freelancer') ? id : undefined,
          role: 'Same Day Editor',
          day_number: dayAssignment.day,
          day_date: dayDateString,
          event_id: currentEvent?.id || 'new-event'
        });
      });

      dayAssignment.other_crew_ids.forEach(id => {
        if (id) assignments.push({
          staff_id: [...photographers, ...editors].some(s => s.id === id) ? id : undefined,
          freelancer_id: [...cinematographers, ...dronePilots, ...otherCrew].some(f => f.id === id && f.source === 'freelancer') ? id : undefined,
          role: 'Other',
          day_number: dayAssignment.day,
          day_date: dayDateString,
          event_id: currentEvent?.id || 'new-event'
        });
      });

      return assignments;
    });

    // Check for conflicts using the real-time detection hook
    await checkForConflicts(
      value,
      selectedPerson.full_name,
      role,
      eventDate,
      totalDays,
      currentAssignments,
      () => {
        // This callback runs when assignment is confirmed (no conflicts or user accepts conflicts)
        onUpdateStaffAssignment(dayIndex, field, slotIndex, value);
      }
    );
  };


  // Get all staff for a specific role (no filtering)
  const getAllStaffForRole = (role: 'photographer' | 'cinematographer' | 'editor' | 'same_day_editor' | 'drone_pilot' | 'other_crew') => {
    switch (role) {
      case 'photographer':
        return photographers;
      case 'cinematographer':
        return cinematographers;
      case 'editor':
        return editors;
      case 'same_day_editor':
        return sameDayEditorsStaff;
      case 'drone_pilot':
        return dronePilots;
      case 'other_crew':
        return otherCrew;
      default:
        return [];
    }
  };

  const isPersonAvailable = (personId: string, currentDayIndex: number, currentRole: string, currentSlotIndex?: number) => {
    // Check within current event's multi-day assignments
    for (let i = 0; i < multiDayAssignments.length; i++) {
      const assignment = multiDayAssignments[i];
      
      // Skip current assignment slot
      if (i === currentDayIndex && currentRole === 'photographer' && currentSlotIndex !== undefined) {
        const currentPhotographerIds = [...assignment.photographer_ids];
        currentPhotographerIds.splice(currentSlotIndex, 1);
        if (currentPhotographerIds.includes(personId)) return false;
      } else if (i === currentDayIndex && currentRole === 'cinematographer' && currentSlotIndex !== undefined) {
        const currentCinematographerIds = [...assignment.cinematographer_ids];
        currentCinematographerIds.splice(currentSlotIndex, 1);
        if (currentCinematographerIds.includes(personId)) return false;
      } else if (i === currentDayIndex && currentRole === 'same_day_editor' && currentSlotIndex !== undefined) {
        const currentSameDayEditorIds = [...assignment.same_day_editor_ids];
        currentSameDayEditorIds.splice(currentSlotIndex, 1);
        if (currentSameDayEditorIds.includes(personId)) return false;
      } else if (i === currentDayIndex && currentRole === 'other_crew' && currentSlotIndex !== undefined) {
        const currentOtherCrewIds = [...assignment.other_crew_ids];
        currentOtherCrewIds.splice(currentSlotIndex, 1);
        if (currentOtherCrewIds.includes(personId)) return false;
      } else {
        if (assignment.photographer_ids.includes(personId) ||
            assignment.cinematographer_ids.includes(personId) ||
            assignment.drone_pilot_ids.includes(personId) ||
            assignment.same_day_editor_ids.includes(personId) ||
            assignment.other_crew_ids.includes(personId)) {
          return false;
        }
      }
    }
    
    // For legacy same day editor validation (should be removed after migration)
    if (legacySameDayEditors.includes(personId)) return false;
    
    return true;
  };

  const shouldShowDronePilot = (dayIndex: number) => {
    const quotationDetails = parseQuotationDetails(selectedQuotation?.quotation_details as string);
    if (quotationDetails?.days) {
      const dayConfig = quotationDetails.days[dayIndex];
      return dayConfig?.drone > 0;
    }
    return !selectedQuotation; // Show if no quotation selected
  };

  const shouldShowSameDayEditor = (dayIndex: number) => {
    const quotationDetails = parseQuotationDetails(selectedQuotation?.quotation_details as string);
    // Show if quotation has same day editing enabled OR manual same day editor is enabled
    return quotationHasSameDayEditing || sameDayEditor;
  };

  const shouldShowOtherCrew = (dayIndex: number) => {
    const quotationDetails = parseQuotationDetails(selectedQuotation?.quotation_details as string);
    if (quotationDetails?.days) {
      const dayConfig = quotationDetails.days[dayIndex];
      return dayConfig?.otherCrew > 0;
    }
    return otherCrewEnabled; // Show if manually enabled
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
          <UserGroupIcon className="h-5 w-5" />
          Staff Assignment
        </h3>

        {/* Manual Same Day Editor Toggle - Only show when no quotation requirement */}
        {!quotationHasSameDayEditing && (
          <div className="flex items-center space-x-2">
            <Switch
              id="same-day-editor"
              checked={sameDayEditor}
              onCheckedChange={onToggleSameDayEditor}
            />
            <Label htmlFor="same-day-editor" className="text-sm font-medium">
              Enable Same Day Editor
            </Label>
          </div>
        )}

        {/* Manual Other Crew Toggle */}
        <div className="flex items-center space-x-2">
          <Switch
            id="other-crew"
            checked={otherCrewEnabled}
            onCheckedChange={onToggleOtherCrew}
          />
          <Label htmlFor="other-crew" className="text-sm font-medium">
            Enable Other Crew (Manager, Assistant, Support Staff)
          </Label>
        </div>

        {/* Multi-day Staff Assignment */}
        <div className="space-y-6">
          {multiDayAssignments.map((dayAssignment, dayIndex) => {
            return (
               <div key={dayAssignment.day} className="border rounded-lg p-4 bg-card">
                <h4 className="text-md font-medium mb-4 flex items-center gap-2">
                  📅 Day {dayAssignment.day} Staff Assignment
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Photographers */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Camera02Icon className="h-4 w-4" />
                      Photographers
                    </Label>
                    <div className="space-y-2">
                      {dayAssignment.photographer_ids.map((photographerId, slotIndex) => (
                        <div key={slotIndex} className="flex gap-2 items-center">
                          <SearchableStaffSelect
                            value={photographerId}
                            onValueChange={(value) => {
                              if (value === '__CLEAR__') {
                                value = '';
                              }
                              handleStaffAssignment(dayIndex, 'photographer_ids', slotIndex, value);
                            }}
                            staffOptions={getAllStaffForRole('photographer')
                              .map(photographer => ({
                                id: photographer.id,
                                full_name: photographer.full_name,
                                role: photographer.role
                              }))
                              .filter(person => {
                                const isCurrentSelection = person.id === photographerId;
                                return isCurrentSelection || isPersonAvailable(person.id, dayIndex, 'photographer', slotIndex);
                              })}
                            placeholder="Select photographer"
                            
                            className="rounded-full flex-1"
                            allowClear={true}
                          />
                          {dayAssignment.photographer_ids.length > 1 && !(currentEvent && isEventFromQuotation) && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onRemoveStaffSlot(dayIndex, 'photographer_ids', slotIndex)}
                              className="p-2 h-9 w-9 rounded-full"
                            >
                              <Remove01Icon className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {!(currentEvent && isEventFromQuotation) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onAddStaffSlot(dayIndex, 'photographer_ids')}
                          className="rounded-full w-full"
                        >
                          <Add01Icon className="h-4 w-4 mr-1" />
                          Add Photographer
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Cinematographers */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <VideoReplayIcon className="h-4 w-4" />
                      Cinematographers
                    </Label>
                    <div className="space-y-2">
                      {dayAssignment.cinematographer_ids.map((cinematographerId, slotIndex) => (
                        <div key={slotIndex} className="flex gap-2 items-center">
                          <SearchableStaffSelect
                            value={cinematographerId}
                            onValueChange={(value) => {
                              if (value === '__CLEAR__') {
                                value = '';
                              }
                              handleStaffAssignment(dayIndex, 'cinematographer_ids', slotIndex, value);
                            }}
                            staffOptions={getAllStaffForRole('cinematographer')
                              .map(cinematographer => ({
                                id: cinematographer.id,
                                full_name: cinematographer.full_name,
                                role: cinematographer.role
                              }))
                              .filter(person => {
                                const isCurrentSelection = person.id === cinematographerId;
                                return isCurrentSelection || isPersonAvailable(person.id, dayIndex, 'cinematographer', slotIndex);
                              })}
                            placeholder="Select cinematographer"
                            
                            className="rounded-full flex-1"
                            allowClear={true}
                          />
                          {dayAssignment.cinematographer_ids.length > 1 && !(currentEvent && isEventFromQuotation) && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onRemoveStaffSlot(dayIndex, 'cinematographer_ids', slotIndex)}
                              className="p-2 h-9 w-9 rounded-full"
                            >
                              <Remove01Icon className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {!(currentEvent && isEventFromQuotation) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onAddStaffSlot(dayIndex, 'cinematographer_ids')}
                          className="rounded-full w-full"
                        >
                          <Add01Icon className="h-4 w-4 mr-1" />
                          Add Cinematographer
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Drone Pilot - Conditional Rendering */}
                  {shouldShowDronePilot(dayAssignment.day - 1) && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <DroneIcon className="h-4 w-4" />
                        Drone Pilots
                      </Label>
                      <div className="space-y-2">
                        {dayAssignment.drone_pilot_ids.map((dronePilotId, slotIndex) => (
                          <div key={slotIndex} className="flex gap-2 items-center">
                            <SearchableStaffSelect
                              value={dronePilotId}
                              onValueChange={(value) => {
                                if (value === '__CLEAR__') {
                                  value = '';
                                }
                                handleStaffAssignment(dayIndex, 'drone_pilot_ids', slotIndex, value);
                              }}
                              staffOptions={getAllStaffForRole('drone_pilot')
                                .map(dronePilot => ({
                                  id: dronePilot.id,
                                  full_name: dronePilot.full_name,
                                  role: dronePilot.role
                                }))
                                .filter(person => {
                                  const isCurrentSelection = person.id === dronePilotId;
                                  return isCurrentSelection || isPersonAvailable(person.id, dayIndex, 'drone_pilot', slotIndex);
                                })}
                              placeholder="Select drone pilot"
                              className="rounded-full flex-1"
                              allowClear={true}
                            />
                            {dayAssignment.drone_pilot_ids.length > 1 && !(currentEvent && isEventFromQuotation) && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => onRemoveStaffSlot(dayIndex, 'drone_pilot_ids', slotIndex)}
                                className="p-2 h-9 w-9 rounded-full"
                              >
                                <Remove01Icon className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        {!(currentEvent && isEventFromQuotation) && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onAddStaffSlot(dayIndex, 'drone_pilot_ids')}
                            className="rounded-full w-full"
                          >
                            <Add01Icon className="h-4 w-4 mr-1" />
                            Add Drone Pilot
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                   {/* Same Day Editor - Conditional Rendering */}
                   {shouldShowSameDayEditor(dayAssignment.day - 1) && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <AdobePremierIcon className="h-4 w-4" />
                        Same Day Editor {quotationHasSameDayEditing && "(Required)"}
                      </Label>
                      <div className="space-y-2">
                        {dayAssignment.same_day_editor_ids?.map((editorId: string, slotIndex: number) => (
                          <div key={slotIndex} className="flex gap-2 items-center">
                            <SearchableStaffSelect
                              value={editorId}
                              onValueChange={(value) => {
                                if (value === '__CLEAR__') {
                                  value = '';
                                }
                                handleStaffAssignment(dayIndex, 'same_day_editor_ids', slotIndex, value);
                              }}
                              staffOptions={getAllStaffForRole('same_day_editor')
                                .filter(person => {
                                  const isCurrentSelection = person.id === editorId;
                                  return isCurrentSelection || isPersonAvailable(person.id, dayIndex, 'same_day_editor', slotIndex);
                                })
                                .map(editor => ({
                                  id: editor.id,
                                  full_name: editor.full_name,
                                  role: editor.role
                                }))}
                              placeholder="Select same day editor"
                              
                              className="rounded-full flex-1"
                              allowClear={true}
                              required={false}
                            />
                            {dayAssignment.same_day_editor_ids.length > 1 && !(currentEvent && isEventFromQuotation) && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => onRemoveStaffSlot(dayIndex, 'same_day_editor_ids', slotIndex)}
                                className="p-2 h-9 w-9 rounded-full"
                              >
                                <Remove01Icon className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        {!(currentEvent && isEventFromQuotation) && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onAddStaffSlot(dayIndex, 'same_day_editor_ids')}
                            className="rounded-full w-full"
                          >
                            <Add01Icon className="h-4 w-4 mr-1" />
                            Add Same Day Editor
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Other Crew - Conditional Rendering */}
                  {shouldShowOtherCrew(dayAssignment.day - 1) && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <UserGroupIcon className="h-4 w-4" />
                        Other Crew (Managers, Assistants, Support Staff)
                      </Label>
                      <div className="space-y-2">
                        {dayAssignment.other_crew_ids?.map((crewId: string, slotIndex: number) => (
                          <div key={slotIndex} className="flex gap-2 items-center">
                            <SearchableStaffSelect
                              value={crewId}
                              onValueChange={(value) => {
                                if (value === '__CLEAR__') {
                                  value = '';
                                }
                                handleStaffAssignment(dayIndex, 'other_crew_ids', slotIndex, value);
                              }}
                              staffOptions={getAllStaffForRole('other_crew')
                                .filter(person => {
                                  const isCurrentSelection = person.id === crewId;
                                  return isCurrentSelection || isPersonAvailable(person.id, dayIndex, 'other_crew', slotIndex);
                                })
                                .map(crew => ({
                                  id: crew.id,
                                  full_name: crew.full_name,
                                  role: crew.role
                                }))}
                              placeholder="Select crew member"
                              
                              className="rounded-full flex-1"
                              allowClear={true}
                            />
                            {dayAssignment.other_crew_ids.length > 1 && !(currentEvent && isEventFromQuotation) && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => onRemoveStaffSlot(dayIndex, 'other_crew_ids', slotIndex)}
                                className="p-2 h-9 w-9 rounded-full"
                              >
                                <Remove01Icon className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        {!(currentEvent && isEventFromQuotation) && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onAddStaffSlot(dayIndex, 'other_crew_ids')}
                            className="rounded-full w-full"
                          >
                            <Add01Icon className="h-4 w-4 mr-1" />
                            Add Other Crew
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <StaffAssignmentConflictDialog
            open={conflictState.isOpen}
            onOpenChange={dismissConflictDialog}
            staffName={conflictState.staffName}
            role={conflictState.role}
            conflictingEvents={conflictState.conflictingEvents}
            onConfirm={conflictState.onConfirm}
            onCancel={dismissConflictDialog}
          />
        </div>
      </div>
    </div>
  );
};

export default EventStaffAssignment;