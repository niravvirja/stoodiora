import { Assignment } from './hooks/useAssignments';
import { EmptyState } from '@/components/ui/empty-state';
import { Users, Calendar, MapPin, User } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import CentralizedCard from '@/components/common/CentralizedCard';
import { getEventStatus } from '@/lib/event-status-utils';

interface AssignmentTableViewProps {
  assignments: Assignment[];
  isAdmin: boolean;
}

export const AssignmentTableView = ({ assignments, isAdmin }: AssignmentTableViewProps) => {
  if (assignments.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No Assignments Found"
        description="No assignments match your current filters or you haven't been assigned to any events yet."
      />
    );
  }

  const formatAssignmentDate = (dayDate: string | null) => {
    if (!dayDate) return 'Date TBD';
    
    const date = new Date(dayDate);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short', 
      year: 'numeric'
    });
  };

  const getStatusBadge = (eventDate: string | null, dayDate: string | null) => {
    const checkDate = dayDate || eventDate;
    if (!checkDate) return null;
    
    // Create a mock event object to use getEventStatus
    const mockEvent = { 
      event_date: checkDate,
      event_end_date: checkDate // Single day assignment
    };
    const status = getEventStatus(mockEvent as any);
    
    return (
      <Badge 
        variant={status.label === 'COMPLETED' ? "default" : "secondary"}
        className={status.colorClass}
      >
        {status.label}
      </Badge>
    );
  };

  return (
    <>
      {/* Mobile View - Cards */}
      <div className="block md:hidden">
        <div className="grid gap-4 sm:grid-cols-2">
          {assignments.map((assignment) => {
            const metadata = [
              // Client name
              ...(assignment.client_name ? [{
                icon: <User className="h-4 w-4 text-primary" />,
                value: assignment.client_name
              }] : []),
              // Assignment date
              {
                icon: <Calendar className="h-4 w-4 text-primary" />,
                value: formatAssignmentDate(assignment.day_date),
                isDate: true
              },
              // Venue
              {
                icon: <MapPin className="h-4 w-4 text-primary" />,
                value: assignment.venue || '~'
              }
            ];

            return (
              <CentralizedCard
                key={assignment.id}
                title={assignment.event_title}
                badges={[]}
                metadata={metadata}
                actions={[]}
                className="rounded-2xl border border-border relative min-h-[400px]"
              >
                {/* Status indicator */}
                <div className="flex items-center justify-center pt-1">
                  {getStatusBadge(assignment.event_date, assignment.day_date)}
                </div>

                {/* Assignment details */}
                <div className="flex items-center justify-center gap-4 pt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    <span className="text-xs font-medium text-muted-foreground">{assignment.role?.toUpperCase()}</span>
                  </div>
                  {assignment.total_days && assignment.total_days > 1 && (
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-muted" />
                      <span className="text-xs font-medium text-muted-foreground">DAY {assignment.day_number}</span>
                    </div>
                  )}
                </div>

                {/* Assigned person */}
                <div className="flex items-center justify-center pt-2">
                  <div className="text-xs text-center">
                    <div className="font-medium">
                      {assignment.staff_name || assignment.freelancer_name || 'Unassigned'}
                    </div>
                    {assignment.staff_name && (
                      <div className="text-muted-foreground">Staff</div>
                    )}
                    {assignment.freelancer_name && (
                      <div className="text-muted-foreground">Freelancer</div>
                    )}
                  </div>
                </div>
              </CentralizedCard>
            );
          })}
        </div>
      </div>

      {/* Desktop View - Table */}
      <div className="hidden md:block">
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Event</TableHead>
                  <TableHead className="min-w-[120px]">Client</TableHead>
                  <TableHead className="min-w-[100px]">Role</TableHead>
                  <TableHead className="min-w-[80px]">Day</TableHead>
                  <TableHead className="min-w-[120px]">Assignment Date</TableHead>
                  <TableHead className="min-w-[150px]">Venue</TableHead>
                  <TableHead className="min-w-[120px]">Assigned To</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold text-foreground">
                          {assignment.event_title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {assignment.event_date && new Date(assignment.event_date).toLocaleDateString('en-IN')}
                          {assignment.total_days && assignment.total_days > 1 && (
                            <span className="ml-2">({assignment.total_days} days)</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <span className="text-sm">
                        {assignment.client_name || 'Not specified'}
                      </span>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {assignment.role}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-center">
                        <div className="text-sm font-medium">
                          {assignment.day_number}
                        </div>
                        {assignment.total_days && assignment.total_days > 1 && (
                          <div className="text-xs text-muted-foreground">
                            of {assignment.total_days}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        {formatAssignmentDate(assignment.day_date)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <span className="text-sm">
                        {assignment.venue || '~'}
                      </span>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        {assignment.staff_name || assignment.freelancer_name || 'Unassigned'}
                        {assignment.staff_name && (
                          <div className="text-xs text-muted-foreground">Staff</div>
                        )}
                        {assignment.freelancer_name && (
                          <div className="text-xs text-muted-foreground">Freelancer</div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {getStatusBadge(assignment.event_date, assignment.day_date)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </>
  );
};