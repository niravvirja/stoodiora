import { Calendar01Icon, Location01Icon, UserIcon, CustomerService02Icon, Clock01Icon, CalendarCheckIn01Icon, Camera01Icon, VideoReplayIcon } from 'hugeicons-react';
import CentralizedCard from '@/components/common/CentralizedCard';
import { Badge } from '@/components/ui/badge';

interface AssignmentCardProps {
  assignment: {
    id: string;
    event_id: string;
    role: string;
    day_number: number;
    day_date: string | null;
    event?: {
      id: string;
      title: string;
      event_date: string;
      event_end_date: string | null;
      venue: string | null;
      description: string | null;
      event_type: string;
      client?: {
        name: string;
        phone: string;
      };
    };
  };
}

const AssignmentCard = ({ assignment }: AssignmentCardProps) => {
  const event = assignment.event;
  
  if (!event) return null;

  const eventDate = new Date(assignment.day_date || event.event_date);
  const isMultiDay = event.event_end_date && event.event_end_date !== event.event_date;
  
  // Format date
  const formattedDate = eventDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const metadata = [
    {
      icon: <Calendar01Icon className="h-3.5 w-3.5 text-primary" />,
      value: formattedDate
    },
    {
      icon: <Location01Icon className="h-3.5 w-3.5 text-primary" />,
      value: event.venue || 'Venue TBD'
    },
    {
      icon: <CustomerService02Icon className="h-3.5 w-3.5 text-primary" />,
      value: event.client?.name || 'Client'
    },
    {
      icon: <Camera01Icon className="h-3.5 w-3.5 text-primary" />,
      value: assignment.role
    },
    {
      icon: <VideoReplayIcon className="h-3.5 w-3.5 text-primary" />,
      value: event.event_type
    },
    ...(isMultiDay ? [{
      icon: <CalendarCheckIn01Icon className="h-3.5 w-3.5 text-primary" />,
      value: `Day ${assignment.day_number}`
    }] : [])
  ];

  const badges: Array<{ label: string; color?: string }> = [];

  return (
    <CentralizedCard
      title={event.title}
      badges={badges}
      description={event.description}
      metadata={metadata}
      actions={[]}
      className="rounded-2xl border border-border relative min-h-[450px] sm:min-h-[480px] overflow-hidden hover:shadow-lg transition-shadow duration-300"
    >
      {/* Client Contact Info - Bottom section */}
      {event.client && (
        <div className="absolute bottom-4 left-3 right-3">
          <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
            <div className="flex items-center space-x-2 text-sm">
              <CustomerService02Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{event.client.name}</p>
                <p className="text-xs text-muted-foreground">{event.client.phone}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </CentralizedCard>
  );
};

export default AssignmentCard;
