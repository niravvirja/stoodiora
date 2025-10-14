import { useState, useMemo } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { PageSkeleton } from '@/components/ui/skeleton';
import AssignmentCard from './AssignmentCard';
import { useAssignments } from '@/hooks/useAssignments';
import { Calendar01Icon, Download02Icon } from 'hugeicons-react';
import { getEventStatus } from '@/lib/event-status-utils';
import AssignmentStats from './AssignmentStats';
import { Button } from '@/components/ui/button';
import { pdf } from '@react-pdf/renderer';
import AssignmentReportPDF from './AssignmentReportPDF';
import { useAuth } from '@/components/auth/AuthProvider';
import { useFirmData } from '@/hooks/useFirmData';
import { useToast } from '@/hooks/use-toast';

const AssignmentManagement = () => {
  const { assignments, loading } = useAssignments();
  const { profile } = useAuth();
  const { firmData } = useFirmData();
  const { toast } = useToast();
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Separate assignments into categories (mutually exclusive)
  const { upcomingAssignments, pendingAssignments, completedAssignments } = useMemo(() => {
    // Upcoming: Events happening within next 7 days or currently in progress
    const upcoming = assignments.filter(a => {
      if (!a.event) return false;
      const status = getEventStatus(a.event as any).label;
      return status === 'UPCOMING' || status === 'IN PROGRESS';
    });
    
    // Pending: Events scheduled more than 7 days from today
    const pending = assignments.filter(a => {
      if (!a.event) return false;
      const status = getEventStatus(a.event as any).label;
      return status === 'PENDING';
    });
    
    // Completed: Events that have already ended
    const completed = assignments.filter(a => {
      if (!a.event) return false;
      const status = getEventStatus(a.event as any).label;
      return status === 'COMPLETED';
    });
    
    return { 
      upcomingAssignments: upcoming, 
      pendingAssignments: pending,
      completedAssignments: completed 
    };
  }, [assignments]);

  const handleExportPDF = async () => {
    if (generatingPDF) return;
    
    setGeneratingPDF(true);
    try {
      const doc = (
        <AssignmentReportPDF
          assignments={assignments}
          firmData={firmData}
          generatedBy={profile?.full_name || 'Staff'}
        />
      );
      
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `assignments-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "PDF Generated",
        description: "Assignment report downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (loading) {
    return <PageSkeleton />;
  }

  if (assignments.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Assignments</h1>
        </div>
        <EmptyState
          icon={Calendar01Icon}
          title="No Assignments"
          description="You don't have any event assignments yet."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Assignments</h1>
        <Button
          onClick={handleExportPDF}
          size="icon"
          variant="outline"
          className="h-10 w-10 rounded-full"
          disabled={generatingPDF}
        >
          <Download02Icon className="h-5 w-5" />
        </Button>
      </div>

      {/* Stats */}
      <AssignmentStats assignments={assignments} loading={loading} />

      {/* Upcoming Section */}
      {upcomingAssignments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-center">Upcoming</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {upcomingAssignments.map((assignment) => (
              <AssignmentCard key={assignment.id} assignment={assignment} />
            ))}
          </div>
        </div>
      )}

      {/* Pending Section */}
      {pendingAssignments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-center">Pending</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pendingAssignments.map((assignment) => (
              <AssignmentCard key={assignment.id} assignment={assignment} />
            ))}
          </div>
        </div>
      )}

      {/* Completed Section */}
      {completedAssignments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-center">Completed</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {completedAssignments.map((assignment) => (
              <AssignmentCard key={assignment.id} assignment={assignment} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentManagement;
