import StatsGrid from '@/components/ui/stats-grid';
import { Calendar01Icon, CheckmarkCircle02Icon, Clock01Icon, CalendarCheckIn01Icon } from 'hugeicons-react';
import { useMemo } from 'react';
import { getEventStatus } from '@/lib/event-status-utils';
import { StatsSkeleton } from '@/components/ui/skeleton';

interface AssignmentStatsProps {
  assignments: any[];
  loading: boolean;
}

const AssignmentStats = ({ assignments, loading }: AssignmentStatsProps) => {
  const stats = useMemo(() => {
    const totalEvents = assignments.length;
    
    const upcomingEvents = assignments.filter(a => {
      if (!a.event) return false;
      const status = getEventStatus(a.event).label;
      return ['PENDING', 'UPCOMING', 'IN PROGRESS'].includes(status);
    }).length;
    
    const pendingEvents = assignments.filter(a => {
      if (!a.event) return false;
      const status = getEventStatus(a.event).label;
      return status === 'PENDING';
    }).length;
    
    const completedEvents = assignments.filter(a => {
      if (!a.event) return false;
      const status = getEventStatus(a.event).label;
      return status === 'COMPLETED';
    }).length;

    return { totalEvents, upcomingEvents, pendingEvents, completedEvents };
  }, [assignments]);

  if (loading) {
    return <StatsSkeleton />;
  }

  return (
    <StatsGrid stats={[
      {
        title: "Total Events",
        value: stats.totalEvents,
        icon: <Calendar01Icon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary"
      },
      {
        title: "Upcoming",
        value: stats.upcomingEvents,
        icon: <CalendarCheckIn01Icon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary"
      },
      {
        title: "Pending",
        value: stats.pendingEvents,
        icon: <Clock01Icon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary"
      },
      {
        title: "Completed",
        value: stats.completedEvents,
        icon: <CheckmarkCircle02Icon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary"
      }
    ]} />
  );
};

export default AssignmentStats;
