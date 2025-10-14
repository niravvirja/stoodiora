
import { Document, Page, Text, View, pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { Event } from '@/types/studio';
import { sharedStyles, SharedPDFHeader, SharedPDFFooter } from '@/components/pdf/SharedPDFLayout';
import { formatDate } from '@/lib/date-utils';
import { supabase } from '@/integrations/supabase/client';
import { calculateEventBalance, calculateTotalPaid } from '@/lib/payment-calculator';
import { applyUniversalFilter } from '@/components/common/UniversalExportFilterLogic';

interface EventReportPDFProps {
  events: Event[];
  filterType?: string;
  filterValue?: string;
  firmData?: {
    name: string;
    description?: string;
    logo_url?: string;
    header_left_content?: string;
    footer_content?: string;
  };
}

const EventReportPDF = ({ events, filterType, filterValue, firmData }: EventReportPDFProps) => {
  const getFilterDescription = () => {
    if (filterType === 'status' && filterValue) {
      const statusLabels: Record<string, string> = {
        'confirmed': 'Confirmed Events',
        'completed': 'Completed Events', 
        'pending': 'Work Pending Events',
        'crew_incomplete': 'Staff Incomplete Events',
        'paid': 'Paid Events',
        'payment_pending': 'Payment Due Events',
        'upcoming': 'Upcoming Events',
        'photo_editing_done': 'Photo Editing Completed',
        'video_editing_done': 'Video Editing Completed'
      };
      return statusLabels[filterValue] || 'All Events';
    }
    
    if (filterType === 'type' && filterValue) {
      const typeLabels: Record<string, string> = {
        'wedding': 'Wedding Events',
        'pre_wedding': 'Pre-Wedding Events',
        'ring_ceremony': 'Ring Ceremony Events',
        'maternity': 'Maternity Photography Events',
        'others': 'Other Events'
      };
      return typeLabels[filterValue] || 'All Events';
    }
    
    if (filterType === 'role' && filterValue) {
      const roleLabels: Record<string, string> = {
        'photographer': 'Events with Photographers',
        'cinematographer': 'Events with Cinematographers',
        'editor': 'Events with Editors',
        'drone': 'Events with Drone Operators',
        'drone_pilot': 'Events with Drone Pilots'
      };
      return roleLabels[filterValue] || 'All Events';
    }
    
    if (filterType === 'misc' && filterValue) {
      const miscLabels: Record<string, string> = {
        'staff_complete': 'Events with Complete Staff',
        'staff_incomplete': 'Events with Incomplete Staff',
        'no_staff': 'Events with No Staff Assigned'
      };
      return miscLabels[filterValue] || 'All Events';
    }
    
    return 'All Events';
  };

  const getTableHeaders = () => {
    // Handle misc filter type (staff status filters)
    if (filterType === 'misc' && filterValue) {
      switch (filterValue) {
        case 'staff_incomplete':
          return [
            { text: 'Event', width: '30%' },
            { text: 'Date', width: '15%' },
            { text: 'Client', width: '20%' },
            { text: 'Required', width: '12%' },
            { text: 'Assigned', width: '12%' },
            { text: 'Pending', width: '11%' }
          ];
        case 'staff_complete':
          return [
            { text: 'Event', width: '30%' },
            { text: 'Date', width: '15%' },
            { text: 'Client', width: '25%' },
            { text: 'Total Staff', width: '15%' },
            { text: 'Roles', width: '15%' }
          ];
        case 'no_staff':
          return [
            { text: 'Event', width: '30%' },
            { text: 'Date', width: '15%' },
            { text: 'Client', width: '25%' },
            { text: 'Type', width: '15%' },
            { text: 'Amount', width: '15%' }
          ];
      }
    }
    
    // Handle role filter type
    if (filterType === 'role' && filterValue) {
      return [
        { text: 'Event', width: '25%' },
        { text: 'Date', width: '12%' },
        { text: 'Client', width: '20%' },
        { text: 'Role', width: '15%' },
        { text: 'Staff Count', width: '13%' },
        { text: 'Names', width: '15%' }
      ];
    }
    
    if (filterType === 'status' && filterValue) {
      switch (filterValue) {
        case 'crew_incomplete':
          return [
            { text: 'Event', width: '30%' },
            { text: 'Date', width: '15%' },
            { text: 'Client', width: '20%' },
            { text: 'Required', width: '12%' },
            { text: 'Assigned', width: '12%' },
            { text: 'Pending', width: '11%' }
          ];
        case 'paid':
        case 'payment_pending':
          return [
            { text: 'Event', width: '25%' },
            { text: 'Date', width: '12%' },
            { text: 'Client', width: '18%' },
            { text: 'Total Bill', width: '15%' },
            { text: 'Paid', width: '15%' },
            { text: 'Pending', width: '15%' }
          ];
        case 'pending':
          return [
            { text: 'Event', width: '30%' },
            { text: 'Date', width: '15%' },
            { text: 'Client', width: '25%' },
            { text: 'Photo Edit', width: '15%' },
            { text: 'Video Edit', width: '15%' }
          ];
        case 'photo_editing_done':
        case 'video_editing_done':
          return [
            { text: 'Event', width: '30%' },
            { text: 'Date', width: '15%' },
            { text: 'Client', width: '25%' },
            { text: 'Completion', width: '15%' },
            { text: 'Status', width: '15%' }
          ];
        default:
          return [
            { text: 'Event', width: '25%' },
            { text: 'Date', width: '12%' },
            { text: 'Client', width: '18%' },
            { text: 'Amount', width: '15%' },
            { text: 'Paid', width: '15%' },
            { text: 'Balance', width: '15%' }
          ];
      }
    }
    return [
      { text: 'Event', width: '25%' },
      { text: 'Date', width: '12%' },
      { text: 'Client', width: '18%' },
      { text: 'Amount', width: '15%' },
      { text: 'Paid', width: '15%' },
      { text: 'Balance', width: '15%' }
    ];
  };

  const getCrewBreakdown = (event: Event, type: 'required' | 'assigned' | 'pending') => {
    const assignments = (event as any).event_staff_assignments || [];
    
    // Try multiple paths to access quotation data
    let quotationData = null;
    
    // Check if quotation_source exists and has quotation_details
    if ((event as any).quotation_source?.[0]?.quotation_details) {
      quotationData = (event as any).quotation_source[0].quotation_details;
    }
    // Check if quotation_details is directly on event (processed)
    else if ((event as any).quotation_details) {
      quotationData = (event as any).quotation_details;
    }
    // Check if quotation_source is direct object
    else if ((event as any).quotation_source?.quotation_details) {
      quotationData = (event as any).quotation_source.quotation_details;
    }
    
    // Get required crew from quotation days data
    const getRequiredCrew = () => {
      if (!quotationData?.days || !Array.isArray(quotationData.days)) return {};
      
      const crewCount: any = {};
      
      quotationData.days.forEach((day: any) => {
        // Sum photographers across all days
        if (day.photographers && day.photographers > 0) {
          crewCount['Photographer'] = (crewCount['Photographer'] || 0) + day.photographers;
        }
        
        // Sum cinematographers across all days
        if (day.cinematographers && day.cinematographers > 0) {
          crewCount['Cinematographer'] = (crewCount['Cinematographer'] || 0) + day.cinematographers;
        }
        
        // Sum drone operators across all days
        if (day.drone && day.drone > 0) {
          crewCount['Drone Pilot'] = (crewCount['Drone Pilot'] || 0) + day.drone;
        }
      });
      
      // Check for same day editing - add if enabled in quotation
      if (quotationData.sameDayEditing) {
        crewCount['Same Day Editor'] = 1;
      }
      
      return crewCount;
    };

    // Count assigned crew by role
    const getAssignedCrew = () => {
      return assignments.reduce((acc: any, assignment: any) => {
        const role = assignment.role || 'General';
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {});
    };

    const requiredCrew = getRequiredCrew();
    const assignedCrew = getAssignedCrew();
    
    switch (type) {
      case 'required': {
        const breakdown = Object.entries(requiredCrew).map(([role, count]) => 
          `${count} ${role}${Number(count) > 1 ? 's' : ''}`
        );
        return breakdown.length > 0 ? breakdown.join(', ') : 'No crew specified';
      }
      case 'assigned': {
        const breakdown = Object.entries(assignedCrew).map(([role, count]) => 
          `${count} ${role}${Number(count) > 1 ? 's' : ''}`
        );
        return breakdown.length > 0 ? breakdown.join(', ') : 'None';
      }
      case 'pending': {
        const pending: any = {};
        Object.entries(requiredCrew).forEach(([role, required]) => {
          const assigned = assignedCrew[role] || 0;
          const pendingCount = Math.max(0, Number(required) - Number(assigned));
          if (pendingCount > 0) {
            pending[role] = pendingCount;
          }
        });
        const breakdown = Object.entries(pending).map(([role, count]) => 
          `${count} ${role}${Number(count) > 1 ? 's' : ''}`
        );
        return breakdown.length > 0 ? breakdown.join(', ') : 'None';
      }
      default:
        return '';
    }
  };

  const renderTableRow = (event: Event, index: number) => {
    const headers = getTableHeaders();
    const balance = calculateEventBalance(event as any);
    const paid = calculateTotalPaid(event as any);
    
    // Handle misc filter type (staff status filters)
    if (filterType === 'misc' && filterValue) {
      switch (filterValue) {
        case 'staff_incomplete': {
          // Calculate crew stats using the same logic as breakdown
          const assignments = (event as any).event_staff_assignments || [];
          
          // Use the same data access pattern as getCrewBreakdown
          let quotationData = null;
          if ((event as any).quotation_source?.[0]?.quotation_details) {
            quotationData = (event as any).quotation_source[0].quotation_details;
          } else if ((event as any).quotation_details) {
            quotationData = (event as any).quotation_details;
          } else if ((event as any).quotation_source?.quotation_details) {
            quotationData = (event as any).quotation_source.quotation_details;
          }
          
          // Calculate total required from quotation days
          let totalRequired = 0;
          if (quotationData?.days && Array.isArray(quotationData.days)) {
            const crewCount: any = {};
            quotationData.days.forEach((day: any) => {
              if (day.photographers && day.photographers > 0) {
                crewCount['Photographer'] = (crewCount['Photographer'] || 0) + day.photographers;
              }
              if (day.cinematographers && day.cinematographers > 0) {
                crewCount['Cinematographer'] = (crewCount['Cinematographer'] || 0) + day.cinematographers;
              }
              if (day.drone && day.drone > 0) {
                crewCount['Drone Pilot'] = (crewCount['Drone Pilot'] || 0) + day.drone;
              }
            });
            
            // Add same day editor if enabled in quotation
            if (quotationData.sameDayEditing) {
              crewCount['Same Day Editor'] = 1;
            }
            
            totalRequired = Object.values(crewCount as Record<string, number>).reduce((sum, count) => {
              return sum + (count || 0);
            }, 0);
          }
          
          const totalAssigned = assignments.length;
          const totalPending = Math.max(0, totalRequired - totalAssigned);
          
          return (
            <View key={event.id} style={[sharedStyles.tableRow, index % 2 === 0 && sharedStyles.tableRowAlt]}>
              <Text style={[sharedStyles.tableCell, { width: headers[0].width }]}>{event.title}</Text>
              <Text style={[sharedStyles.tableCell, { width: headers[1].width }]}>
                {(() => {
                  const startDate = new Date(event.event_date);
                  const totalDays = (event as any).total_days || 1;
                  
                  if (totalDays === 1) {
                    return formatDate(startDate);
                  } else {
                    const endDate = new Date(startDate);
                    endDate.setDate(startDate.getDate() + totalDays - 1);
                    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
                  }
                })()}
              </Text>
              <Text style={[sharedStyles.tableCell, { width: headers[2].width }]}>{event.client?.name || 'N/A'}</Text>
              
              {/* Required Column with breakdown */}
              <View style={[sharedStyles.tableCell, { width: headers[3].width }]}>
                <Text style={{ fontSize: 10, fontWeight: 600, marginBottom: 2 }}>{totalRequired}</Text>
                <Text style={{ fontSize: 7, color: '#666666', lineHeight: 1.2 }}>
                  ({getCrewBreakdown(event, 'required')})
                </Text>
              </View>
              
              {/* Assigned Column with breakdown */}
              <View style={[sharedStyles.tableCell, { width: headers[4].width }]}>
                <Text style={{ fontSize: 10, fontWeight: 600, marginBottom: 2 }}>{totalAssigned}</Text>
                <Text style={{ fontSize: 7, color: '#666666', lineHeight: 1.2 }}>
                  ({getCrewBreakdown(event, 'assigned')})
                </Text>
              </View>
              
              {/* Pending Column with breakdown */}
              <View style={[sharedStyles.tableCell, { width: headers[5].width }]}>
                <Text style={{ fontSize: 10, fontWeight: 600, marginBottom: 2 }}>{totalPending}</Text>
                <Text style={{ fontSize: 7, color: '#666666', lineHeight: 1.2 }}>
                  ({getCrewBreakdown(event, 'pending')})
                </Text>
              </View>
            </View>
          );
        }
        
        case 'staff_complete': {
          const assignments = (event as any).event_staff_assignments || [];
          const roleBreakdown = assignments.reduce((acc: any, assignment: any) => {
            const role = assignment.role || 'General';
            acc[role] = (acc[role] || 0) + 1;
            return acc;
          }, {});
          
          const rolesText = Object.entries(roleBreakdown)
            .map(([role, count]) => `${count} ${role}${Number(count) > 1 ? 's' : ''}`)
            .join(', ');
          
          return (
            <View key={event.id} style={[sharedStyles.tableRow, index % 2 === 0 && sharedStyles.tableRowAlt]}>
              <Text style={[sharedStyles.tableCell, { width: headers[0].width }]}>{event.title}</Text>
              <Text style={[sharedStyles.tableCell, { width: headers[1].width }]}>
                {(() => {
                  const startDate = new Date(event.event_date);
                  const totalDays = (event as any).total_days || 1;
                  
                  if (totalDays === 1) {
                    return formatDate(startDate);
                  } else {
                    const endDate = new Date(startDate);
                    endDate.setDate(startDate.getDate() + totalDays - 1);
                    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
                  }
                })()}
              </Text>
              <Text style={[sharedStyles.tableCell, { width: headers[2].width }]}>{event.client?.name || 'N/A'}</Text>
              <Text style={[sharedStyles.tableCell, { width: headers[3].width }]}>{assignments.length}</Text>
              <Text style={[sharedStyles.tableCell, { width: headers[4].width, fontSize: 8 }]}>{rolesText || 'None'}</Text>
            </View>
          );
        }
        
        case 'no_staff':
          return (
            <View key={event.id} style={[sharedStyles.tableRow, index % 2 === 0 && sharedStyles.tableRowAlt]}>
              <Text style={[sharedStyles.tableCell, { width: headers[0].width }]}>{event.title}</Text>
              <Text style={[sharedStyles.tableCell, { width: headers[1].width }]}>
                {(() => {
                  const startDate = new Date(event.event_date);
                  const totalDays = (event as any).total_days || 1;
                  
                  if (totalDays === 1) {
                    return formatDate(startDate);
                  } else {
                    const endDate = new Date(startDate);
                    endDate.setDate(startDate.getDate() + totalDays - 1);
                    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
                  }
                })()}
              </Text>
              <Text style={[sharedStyles.tableCell, { width: headers[2].width }]}>{event.client?.name || 'N/A'}</Text>
              <Text style={[sharedStyles.tableCell, { width: headers[3].width }]}>{event.event_type}</Text>
              <Text style={[sharedStyles.tableCell, { width: headers[4].width }]}>₹{(event.total_amount || 0).toLocaleString()}</Text>
            </View>
          );
      }
    }
    
    // Handle role filter type
    if (filterType === 'role' && filterValue) {
      const assignments = (event as any).event_staff_assignments || [];
      const roleMap: Record<string, string> = {
        'photographer': 'Photographer',
        'cinematographer': 'Cinematographer',
        'editor': 'Editor',
        'drone': 'Drone Pilot',
        'drone_pilot': 'Drone Pilot'
      };
      
      const targetRole = roleMap[filterValue] || filterValue;
      const roleAssignments = assignments.filter((a: any) => a.role === targetRole);
      const staffNames = roleAssignments.map((a: any) => {
        if (a.profiles) return a.profiles.full_name;
        if (a.freelancers) return a.freelancers.full_name;
        return 'Unknown';
      }).join(', ');
      
      return (
        <View key={event.id} style={[sharedStyles.tableRow, index % 2 === 0 && sharedStyles.tableRowAlt]}>
          <Text style={[sharedStyles.tableCell, { width: headers[0].width }]}>{event.title}</Text>
          <Text style={[sharedStyles.tableCell, { width: headers[1].width }]}>
            {(() => {
              const startDate = new Date(event.event_date);
              const totalDays = (event as any).total_days || 1;
              
              if (totalDays === 1) {
                return formatDate(startDate);
              } else {
                const endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + totalDays - 1);
                return `${formatDate(startDate)} - ${formatDate(endDate)}`;
              }
            })()}
          </Text>
          <Text style={[sharedStyles.tableCell, { width: headers[2].width }]}>{event.client?.name || 'N/A'}</Text>
          <Text style={[sharedStyles.tableCell, { width: headers[3].width }]}>{targetRole}</Text>
          <Text style={[sharedStyles.tableCell, { width: headers[4].width }]}>{roleAssignments.length}</Text>
          <Text style={[sharedStyles.tableCell, { width: headers[5].width, fontSize: 8 }]}>{staffNames || 'None'}</Text>
        </View>
      );
    }
    
    if (filterType === 'status' && filterValue) {
      switch (filterValue) {
        case 'crew_incomplete':
          // Calculate crew stats using the same logic as breakdown
          const assignments = (event as any).event_staff_assignments || [];
          
          // Use the same data access pattern as getCrewBreakdown
          let quotationData = null;
          if ((event as any).quotation_source?.[0]?.quotation_details) {
            quotationData = (event as any).quotation_source[0].quotation_details;
          } else if ((event as any).quotation_details) {
            quotationData = (event as any).quotation_details;
          } else if ((event as any).quotation_source?.quotation_details) {
            quotationData = (event as any).quotation_source.quotation_details;
          }
          
          // Calculate total required from quotation days
          let totalRequired = 0;
          if (quotationData?.days && Array.isArray(quotationData.days)) {
            const crewCount: any = {};
            quotationData.days.forEach((day: any) => {
              if (day.photographers && day.photographers > 0) {
                crewCount['Photographer'] = (crewCount['Photographer'] || 0) + day.photographers;
              }
              if (day.cinematographers && day.cinematographers > 0) {
                crewCount['Cinematographer'] = (crewCount['Cinematographer'] || 0) + day.cinematographers;
              }
              if (day.drone && day.drone > 0) {
                crewCount['Drone Pilot'] = (crewCount['Drone Pilot'] || 0) + day.drone;
              }
            });
            
            // Add same day editor if enabled in quotation
            if (quotationData.sameDayEditing) {
              crewCount['Same Day Editor'] = 1;
            }
            
            totalRequired = Object.values(crewCount as Record<string, number>).reduce((sum, count) => {
              return sum + (count || 0);
            }, 0);
          }
          
          const totalAssigned = assignments.length;
          const totalPending = Math.max(0, totalRequired - totalAssigned);
          
          return (
            <View key={event.id} style={[sharedStyles.tableRow, index % 2 === 0 && sharedStyles.tableRowAlt]}>
              <Text style={[sharedStyles.tableCell, { width: headers[0].width }]}>{event.title}</Text>
              <Text style={[sharedStyles.tableCell, { width: headers[1].width }]}>
                {(() => {
                  const startDate = new Date(event.event_date);
                  const totalDays = (event as any).total_days || 1;
                  
                  if (totalDays === 1) {
                    return formatDate(startDate);
                  } else {
                    const endDate = new Date(startDate);
                    endDate.setDate(startDate.getDate() + totalDays - 1);
                    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
                  }
                })()}
              </Text>
              <Text style={[sharedStyles.tableCell, { width: headers[2].width }]}>{event.client?.name || 'N/A'}</Text>
              
              {/* Required Column with breakdown */}
              <View style={[sharedStyles.tableCell, { width: headers[3].width }]}>
                <Text style={{ fontSize: 10, fontWeight: 600, marginBottom: 2 }}>{totalRequired}</Text>
                <Text style={{ fontSize: 7, color: '#666666', lineHeight: 1.2 }}>
                  ({getCrewBreakdown(event, 'required')})
                </Text>
              </View>
              
              {/* Assigned Column with breakdown */}
              <View style={[sharedStyles.tableCell, { width: headers[4].width }]}>
                <Text style={{ fontSize: 10, fontWeight: 600, marginBottom: 2 }}>{totalAssigned}</Text>
                <Text style={{ fontSize: 7, color: '#666666', lineHeight: 1.2 }}>
                  ({getCrewBreakdown(event, 'assigned')})
                </Text>
              </View>
              
              {/* Pending Column with breakdown */}
              <View style={[sharedStyles.tableCell, { width: headers[5].width }]}>
                <Text style={{ fontSize: 10, fontWeight: 600, marginBottom: 2 }}>{totalPending}</Text>
                <Text style={{ fontSize: 7, color: '#666666', lineHeight: 1.2 }}>
                  ({getCrewBreakdown(event, 'pending')})
                </Text>
              </View>
            </View>
          );
        
        case 'pending':
          return (
            <View key={event.id} style={[sharedStyles.tableRow, index % 2 === 0 && sharedStyles.tableRowAlt]}>
              <Text style={[sharedStyles.tableCell, { width: headers[0].width }]}>{event.title}</Text>
              <Text style={[sharedStyles.tableCell, { width: headers[1].width }]}>
                {(() => {
                  const startDate = new Date(event.event_date);
                  const totalDays = (event as any).total_days || 1;
                  
                  if (totalDays === 1) {
                    return formatDate(startDate);
                  } else {
                    const endDate = new Date(startDate);
                    endDate.setDate(startDate.getDate() + totalDays - 1);
                    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
                  }
                })()}
              </Text>
              <Text style={[sharedStyles.tableCell, { width: headers[2].width }]}>{event.client?.name || 'N/A'}</Text>
              <Text style={[sharedStyles.tableCell, { width: headers[3].width }]}>{event.photo_editing_status ? '✓' : '✗'}</Text>
              <Text style={[sharedStyles.tableCell, { width: headers[4].width }]}>{event.video_editing_status ? '✓' : '✗'}</Text>
            </View>
          );
        
        case 'photo_editing_done':
        case 'video_editing_done':
          return (
            <View key={event.id} style={[sharedStyles.tableRow, index % 2 === 0 && sharedStyles.tableRowAlt]}>
              <Text style={[sharedStyles.tableCell, { width: headers[0].width }]}>{event.title}</Text>
              <Text style={[sharedStyles.tableCell, { width: headers[1].width }]}>
                {(() => {
                  const startDate = new Date(event.event_date);
                  const totalDays = (event as any).total_days || 1;
                  
                  if (totalDays === 1) {
                    return formatDate(startDate);
                  } else {
                    const endDate = new Date(startDate);
                    endDate.setDate(startDate.getDate() + totalDays - 1);
                    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
                  }
                })()}
              </Text>
              <Text style={[sharedStyles.tableCell, { width: headers[2].width }]}>{event.client?.name || 'N/A'}</Text>
              <Text style={[sharedStyles.tableCell, { width: headers[3].width }]}>Completed</Text>
              <Text style={[sharedStyles.tableCell, { width: headers[4].width }]}>✓ Done</Text>
            </View>
          );
        
        default:
          return (
            <View key={event.id} style={[sharedStyles.tableRow, index % 2 === 0 && sharedStyles.tableRowAlt]}>
              <Text style={[sharedStyles.tableCell, { width: headers[0].width }]}>{event.title}</Text>
              <Text style={[sharedStyles.tableCell, { width: headers[1].width }]}>
                {(() => {
                  const startDate = new Date(event.event_date);
                  const totalDays = (event as any).total_days || 1;
                  
                  if (totalDays === 1) {
                    return formatDate(startDate);
                  } else {
                    const endDate = new Date(startDate);
                    endDate.setDate(startDate.getDate() + totalDays - 1);
                    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
                  }
                })()}
              </Text>
              <Text style={[sharedStyles.tableCell, { width: headers[2].width }]}>{event.client?.name || 'N/A'}</Text>
              <Text style={[sharedStyles.tableCell, { width: headers[3].width }]}>₹{(event.total_amount || 0).toLocaleString()}</Text>
              <Text style={[sharedStyles.tableCell, { width: headers[4].width }]}>₹{paid.toLocaleString()}</Text>
              <Text style={[sharedStyles.tableCell, { width: headers[5].width }]}>₹{balance.toLocaleString()}</Text>
            </View>
          );
      }
    }
    
    // Default rendering
    return (
      <View key={event.id} style={[sharedStyles.tableRow, index % 2 === 0 && sharedStyles.tableRowAlt]}>
        <Text style={[sharedStyles.tableCell, { width: headers[0].width }]}>{event.title}</Text>
        <Text style={[sharedStyles.tableCell, { width: headers[1].width }]}>
          {(() => {
            const startDate = new Date(event.event_date);
            const totalDays = (event as any).total_days || 1;
            
            if (totalDays === 1) {
              return formatDate(startDate);
            } else {
              const endDate = new Date(startDate);
              endDate.setDate(startDate.getDate() + totalDays - 1);
              return `${formatDate(startDate)} - ${formatDate(endDate)}`;
            }
          })()}
        </Text>
        <Text style={[sharedStyles.tableCell, { width: headers[2].width }]}>{event.client?.name || 'N/A'}</Text>
        <Text style={[sharedStyles.tableCell, { width: headers[3].width }]}>₹{(event.total_amount || 0).toLocaleString()}</Text>
        <Text style={[sharedStyles.tableCell, { width: headers[4].width }]}>₹{paid.toLocaleString()}</Text>
        <Text style={[sharedStyles.tableCell, { width: headers[5].width }]}>₹{balance.toLocaleString()}</Text>
      </View>
    );
  };

  const totalEvents = events.length;
  const totalAmount = events.reduce((sum, event) => sum + (event.total_amount || 0), 0);
  const totalBalance = events.reduce((sum, event) => sum + calculateEventBalance(event as any), 0);
  const totalPaid = events.reduce((sum, event) => sum + calculateTotalPaid(event as any), 0);
  const currentDate = formatDate(new Date());

  // Split events into chunks of 15 for better pagination
  const ROWS_PER_PAGE = 15;
  const eventChunks = [];
  for (let i = 0; i < events.length; i += ROWS_PER_PAGE) {
    eventChunks.push(events.slice(i, i + ROWS_PER_PAGE));
  }

  const hasEvents = events.length > 0;

  return (
    <Document>
      {/* Page 1: Header + Summary Only */}
      <Page size="A4" style={sharedStyles.page}>
        <SharedPDFHeader firmData={firmData} />
        <Text style={sharedStyles.title}>Event Report</Text>

        {/* Report Info */}
        <View style={sharedStyles.detailsContainer}>
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Report Information</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Generated:</Text>
              <Text style={sharedStyles.detailValue}>{currentDate}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Filter:</Text>
              <Text style={sharedStyles.detailValue}>{getFilterDescription()}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Total Events:</Text>
              <Text style={sharedStyles.detailValue}>{totalEvents}</Text>
            </View>
          </View>
          
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Financial Summary</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Total Amount:</Text>
              <Text style={sharedStyles.detailValue}>₹{totalAmount.toLocaleString()}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Amount Paid:</Text>
              <Text style={sharedStyles.detailValue}>₹{totalPaid.toLocaleString()}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Pending Balance:</Text>
              <Text style={sharedStyles.detailValue}>₹{totalBalance.toLocaleString()}</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* Event Tables - 15 rows per page */}
      {eventChunks.map((eventChunk, chunkIndex) => (
        <Page key={`event-${chunkIndex}`} size="A4" style={sharedStyles.page}>
          <Text style={sharedStyles.title}>
            Event Details {eventChunks.length > 1 ? `(Page ${chunkIndex + 1} of ${eventChunks.length})` : ''}
          </Text>
          
          <View style={sharedStyles.table}>
            <View style={sharedStyles.tableHeader}>
              {getTableHeaders().map((header, index) => (
                <Text key={index} style={[sharedStyles.tableCellHeader, { width: header.width }]}>
                  {header.text}
                </Text>
              ))}
            </View>
            
            {eventChunk.map((event, index) => renderTableRow(event, index + (chunkIndex * ROWS_PER_PAGE)))}
          </View>

          {/* Add footer to the last content page */}
          {chunkIndex === eventChunks.length - 1 && (
            <>
              <View style={{ flex: 1 }} />
              <SharedPDFFooter firmData={firmData} />
            </>
          )}
        </Page>
      ))}

      {/* If no events, add footer to first page */}
      {!hasEvents && (
        <>
          <View style={{ flex: 1 }} />
          <SharedPDFFooter firmData={firmData} />
        </>
      )}
    </Document>
  );
};

export const generateEventReportPDF = async (
  events: Event[],
  filterType?: string,
  filterValue?: string,
  firmData?: any
) => {
  // ALWAYS fetch ALL events unconditionally for comprehensive PDF reporting
  let allEvents: any[] = [];
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');
    
    const userFirmKey = `selectedFirmId_${user.id}`;
    let firmId = localStorage.getItem(userFirmKey) || localStorage.getItem('selectedFirmId');
    
    if (!firmId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_firm_id, firm_id')
        .eq('user_id', user.id)
        .single();
      firmId = profile?.current_firm_id || profile?.firm_id;
    }
    
    if (!firmId) throw new Error('No firm ID found');
    
    // First try with full relational data
    try {
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('events')
          .select(`
            *,
            client:clients(id, name, email, phone, address),
            payments:payments!payments_event_id_fkey(*),
            event_staff_assignments(
              *,
              profiles(id, full_name, role),
              freelancers(id, full_name, role)
            ),
            quotation_source:quotations!events_quotation_source_id_fkey(
              id,
              title,
              quotation_details
            )
          `)
          .eq('firm_id', firmId)
          .order('event_date', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allEvents.push(...data);
          page++;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }
      
      console.log(`PDF Export: Fetched ${allEvents.length} total events with full relations`);
    } catch (relError) {
      console.warn('Failed to fetch events with all relations, using provided dataset as fallback:', relError);
      // Prefer using the provided dataset which often already includes relations from the UI
      allEvents = Array.isArray(events) ? [...events] : [];
    }
  } catch (error) {
    console.error('Error fetching all events for PDF:', error);
    // Fallback: use the passed-in filtered data
    allEvents = events;
    console.warn('PDF Export: Using filtered data as fallback');
  }

  // Use provided firmData or fetch it if not provided
  if (!firmData) {
    try {
      // Try to get current user and their firm
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Try multiple ways to get firm ID
        const userFirmKey = `selectedFirmId_${user.id}`;
        let firmId = localStorage.getItem(userFirmKey) || localStorage.getItem('selectedFirmId');
        
        // If no localStorage, try getting from profile
        if (!firmId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('current_firm_id, firm_id')
            .eq('user_id', user.id)
            .single();
          
          firmId = profile?.current_firm_id || profile?.firm_id;
        }
        
        if (firmId) {
          const { data: firm, error } = await supabase
            .from('firms')
            .select('name, description, logo_url, header_left_content, footer_content')
            .eq('id', firmId)
            .single();
          
          if (!error && firm) {
            firmData = firm;
          }
        }
      }
    } catch (error) {
      // Error fetching firm data for PDF
    }
  }

  // Normalize structures for filter utilities (flatten quotation_details, ensure assignments)
  const normalizedEvents = (allEvents as any[]).map((e: any) => {
    const evt = { ...e };
    evt.event_staff_assignments = Array.isArray(evt.event_staff_assignments) ? evt.event_staff_assignments : [];
    if (!evt.quotation_details) {
      if (evt.quotation_source?.quotation_details) {
        evt.quotation_details = evt.quotation_source.quotation_details;
      } else if (Array.isArray(evt.quotation_source) && evt.quotation_source[0]?.quotation_details) {
        evt.quotation_details = evt.quotation_source[0].quotation_details;
      }
    }
    return evt;
  });

  const dataset = normalizedEvents;
  const finalEvents = filterType ? applyUniversalFilter(dataset as any[], filterType, filterValue || '') : dataset;
  
  const blob = await pdf(<EventReportPDF events={finalEvents} filterType={filterType} filterValue={filterValue} firmData={firmData} />).toBlob();
  const fileName = `Event Report (${finalEvents.length} entries) ${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(blob, fileName);
};
