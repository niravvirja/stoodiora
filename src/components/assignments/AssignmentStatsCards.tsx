import StatsGrid from '@/components/ui/stats-grid';
import { 
  Calendar01Icon, 
  UserGroupIcon, 
  Camera01Icon, 
  VideoReplayIcon
} from 'hugeicons-react';
import { Assignment } from './hooks/useAssignments';

interface AssignmentStatsCardsProps {
  assignments: Assignment[];
}

export const AssignmentStatsCards = ({ assignments }: AssignmentStatsCardsProps) => {
  const totalAssignments = assignments.length;
  
  // Count assignments by role
  const photographerAssignments = assignments.filter(a => a.role === 'Photographer').length;
  const cinematographerAssignments = assignments.filter(a => a.role === 'Cinematographer').length;
  const editorAssignments = assignments.filter(a => a.role === 'Editor').length;
  
  // Count unique events
  const uniqueEvents = new Set(assignments.map(a => a.event_id)).size;
  
  // Count upcoming assignments (future events)
  const today = new Date().toISOString().split('T')[0];
  const upcomingAssignments = assignments.filter(a => 
    a.event_date && a.event_date >= today
  ).length;

  const stats = [
    {
      title: 'Total Assignments',
      value: totalAssignments,
      icon: <UserGroupIcon className="w-full h-full" />,
      colorClass: 'bg-blue-500/20 text-blue-600'
    },
    {
      title: 'Unique Events',
      value: uniqueEvents,
      icon: <Calendar01Icon className="w-full h-full" />,
      colorClass: 'bg-green-500/20 text-green-600'
    },
    {
      title: 'Upcoming',
      value: upcomingAssignments,
      icon: <Calendar01Icon className="w-full h-full" />,
      colorClass: 'bg-orange-500/20 text-orange-600'
    },
    {
      title: 'Photography',
      value: photographerAssignments,
      icon: <Camera01Icon className="w-full h-full" />,
      colorClass: 'bg-purple-500/20 text-purple-600'
    },
    {
      title: 'Cinematography',
      value: cinematographerAssignments,
      icon: <VideoReplayIcon className="w-full h-full" />,
      colorClass: 'bg-red-500/20 text-red-600'
    }
  ];

  // Only show 4 stats on smaller screens, 5 on larger
  const displayStats = stats.slice(0, 4);

  return <StatsGrid stats={displayStats} />;
};