
import { 
  Edit02Icon, 
  Download01Icon, 
  Share08Icon, 
  MoneyAdd01Icon,
  Location01Icon,
  ContactIcon,
  Calendar01Icon,
  KidIcon,
  FavouriteIcon,
  Diamond02Icon,
  MountainIcon,
  DashboardCircleAddIcon,
  UserGroupIcon,
  Delete02Icon,
  File01Icon,
  Building06Icon,
  Camera02Icon,
  CheckmarkCircle02Icon,
  HardDriveIcon,
  Loading03Icon
} from 'hugeicons-react';
import { Eye } from 'lucide-react';
import { Event } from '@/types/studio';
import CentralizedCard from '@/components/common/CentralizedCard';
import { formatEventDateRange } from '@/lib/date-utils';
import { getEventStatus } from '@/lib/event-status-utils';
import EventCrewDialog from '@/components/events/EventCrewDialog';
import { generateIndividualEventReport } from '@/components/events/IndividualEventReportPDF';
import BalanceDisplay from '@/components/ui/balance-display';
import { calculateTotalPaid } from '@/lib/payment-calculator';
import { useState, useMemo } from 'react';
import PDFDownloadOptionsDialog from '@/components/common/PDFDownloadOptionsDialog';
import { isCrewIncomplete } from '@/lib/crew-completeness-utils';

interface EventPaymentCardProps {
  event: Event;
  onEdit: (event: Event) => void;
  onPaymentClick: (event: Event) => void;
  onViewDetails: (event: Event) => void;
  onDownloadInvoice?: (event: Event) => void;
  onSendInvoice?: (event: Event) => void;
  onDelete?: (event: Event) => void;
  onCrewClick?: (event: Event) => void;
  loadingStates?: {
    sharing?: boolean;
    viewing?: boolean;
    downloading?: boolean;
    editing?: boolean;
    crew?: boolean;
    deleting?: boolean;
  };
}

import DiskManagementDialog from '@/components/events/DiskManagementDialog';

const EventPaymentCard = ({ event, onEdit, onPaymentClick, onViewDetails, onDownloadInvoice, onSendInvoice, onDelete, onCrewClick, loadingStates }: EventPaymentCardProps) => {
  const [crewDialogOpen, setCrewDialogOpen] = useState(false);
  const [diskDialogOpen, setDiskDialogOpen] = useState(false);
  const [pdfDownloadDialogOpen, setPdfDownloadDialogOpen] = useState(false);
  
  // Use loading states from parent if provided, otherwise maintain local state
  const isSharing = loadingStates?.sharing || false;
  const isViewing = loadingStates?.viewing || false;
  const isDownloading = loadingStates?.downloading || false;
  const isEditing = loadingStates?.editing || false;
  const isCrewLoading = loadingStates?.crew || false;
  const isDeleting = loadingStates?.deleting || false;
  const getEventTypeIcon = (eventType: string) => {
    const iconConfig = {
      'Wedding': <FavouriteIcon className="h-3.5 w-3.5" />,
      'Pre-Wedding': <MountainIcon className="h-3.5 w-3.5" />,
      'Ring-Ceremony': <Diamond02Icon className="h-3.5 w-3.5" />,
      'Maternity Photography': <KidIcon className="h-3.5 w-3.5" />,
      'Birthday': <KidIcon className="h-3.5 w-3.5" />,
      'Corporate': <Building06Icon className="h-3.5 w-3.5" />,
      'Product': <Camera02Icon className="h-3.5 w-3.5" />,
      'Portrait': <ContactIcon className="h-3.5 w-3.5" />,
      'Other': <DashboardCircleAddIcon className="h-3.5 w-3.5" />
    };
    return iconConfig[eventType as keyof typeof iconConfig] || iconConfig.Other;
  };

  const getEventTypeIconStyle = (eventType: string) => {
    const iconStyles = {
      'Wedding': 'bg-wedding-color text-white',
      'Pre-Wedding': 'bg-pre-wedding-color text-white',
      'Ring-Ceremony': 'bg-ring-ceremony-color text-white',
      'Maternity Photography': 'bg-maternity-color text-white',
      'Birthday': 'bg-maternity-color text-white',
      'Corporate': 'bg-ring-ceremony-color text-white',
      'Product': 'bg-maternity-color text-white',
      'Portrait': 'bg-pre-wedding-color text-white',
      'Other': 'bg-others-color text-white'
    };
    return iconStyles[eventType as keyof typeof iconStyles] || iconStyles.Other;
  };

  // Helper function to create staff display for proper ordering
  const createStaffDisplay = (staffAssignments: any[], role: string, totalDays: number) => {
    const dayGroups: { [key: number]: string[] } = {};
    
    staffAssignments.forEach((assignment: any) => {
      const day = assignment.day_number || 1;
      const assignmentRole = assignment.role;
      const name = assignment.profiles?.full_name;
      
      if (assignmentRole === role && name) {
        if (!dayGroups[day]) dayGroups[day] = [];
        dayGroups[day].push(name);
      }
    });
    
    const dayEntries = [];
    for (let day = 1; day <= totalDays; day++) {
      if (dayGroups[day]?.length > 0) {
        const dayStr = day.toString().padStart(2, '0');
        const staffList = dayGroups[day].join(', ');
        dayEntries.push(`${dayStr}: ${staffList}`);
      }
    }
    
    return dayEntries.length > 0 ? (
      <div className="space-y-0.5">
        {dayEntries.map((entry, index) => (
          <div key={index} className="text-sm font-medium leading-tight">
            {entry}
          </div>
        ))}
      </div>
    ) : null;
  };

  const staffAssignments = (event as any).event_staff_assignments || [];
  const totalDays = (event as any).total_days || 1;


  const eventStatus = getEventStatus(event);

  // Enhanced metadata in specific order: STATUS, CLIENT, DATE, VENUE (always show all)
  const metadata = [
    // Status (always show)
    {
      icon: <CheckmarkCircle02Icon className="h-3.5 w-3.5 text-primary" />,
      value: eventStatus.label
    },
    // Client (always show)
    {
      icon: <ContactIcon className="h-3.5 w-3.5 text-primary" />,
      value: event.client?.name || '~'
    },
    // Event Date (always show)
    {
      icon: <Calendar01Icon className="h-3.5 w-3.5 text-primary" />,
      value: formatEventDateRange(event.event_date, totalDays, (event as any).event_end_date),
      isDate: true
    },
    // Venue (always show)
    {
      icon: <Location01Icon className="h-3.5 w-3.5 text-primary" />,
      value: event.venue || '~'
    }
  ];

  // Optimized crew completeness check with memoization for performance
  const crewIncomplete = useMemo(() => {
    return isCrewIncomplete(event as any);
  }, [(event as any).id, (event as any).quotation_source_id, (event as any).quotation_details, (event as any).event_staff_assignments, (event as any).total_days, (event as any)._dataLoaded]);

  const handleViewDetails = async () => {
    if (onViewDetails) {
      await onViewDetails(event);
    }
  };

  const handleCrewClick = async () => {
    if (onCrewClick) {
      await onCrewClick(event);
    }
    setCrewDialogOpen(true);
  };

  const handleDownloadInvoice = async () => {
    if (onDownloadInvoice) {
      await onDownloadInvoice(event);
    }
  };

  const handleDownloadEventReport = async () => {
    await generateIndividualEventReport(event as any);
  };

  const handleShare = async () => {
    if (onSendInvoice) {
      await onSendInvoice(event);
    }
  };

  const actions = [
    { 
      label: 'View', 
      onClick: handleViewDetails, 
      variant: 'outline' as const, 
      icon: isViewing ? (
        <Loading03Icon className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Eye className="h-3.5 w-3.5 text-foreground" strokeWidth={1.5} />
      ),
      disabled: isViewing
    },
    { 
      label: 'Edit', 
      onClick: () => onEdit(event), 
      variant: 'outline' as const, 
      icon: isEditing ? (
        <Loading03Icon className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Edit02Icon className="h-3.5 w-3.5 text-foreground" strokeWidth={1.5} />
      ),
      disabled: isEditing
    },
    { 
      label: 'Crew', 
      onClick: handleCrewClick, 
      variant: 'outline' as const, 
      icon: isCrewLoading ? (
        <Loading03Icon className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <UserGroupIcon className={`h-3.5 w-3.5 ${crewIncomplete ? 'text-white' : 'text-foreground'}`} strokeWidth={1.5} />
      ),
      className: crewIncomplete ? 'border-red-500 bg-red-500 hover:bg-red-600 text-white' : '',
      disabled: isCrewLoading
    },
    { label: 'Disk', onClick: () => setDiskDialogOpen(true), variant: 'outline' as const, icon: <HardDriveIcon className="h-3.5 w-3.5 text-foreground" strokeWidth={1.5} /> },
    { label: 'Collect', onClick: () => onPaymentClick(event), variant: 'outline' as const, icon: <MoneyAdd01Icon className="h-3.5 w-3.5 text-foreground" strokeWidth={1.5} /> },
    ...(onDownloadInvoice ? [{ 
      label: 'Download', 
      onClick: () => setPdfDownloadDialogOpen(true), 
      variant: 'outline' as const, 
      icon: isDownloading ? (
        <Loading03Icon className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download01Icon className="h-3.5 w-3.5 text-foreground" strokeWidth={1.5} />
      ),
      disabled: isDownloading
    }] : []),
    ...(onSendInvoice ? [{ 
      label: 'Share', 
      onClick: handleShare, 
      variant: 'outline' as const, 
      icon: isSharing ? (
        <Loading03Icon className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Share08Icon className="h-3.5 w-3.5 text-foreground" strokeWidth={1.5} />
      ),
      disabled: isSharing
    }] : []),
    ...(onDelete ? [{ 
      label: 'Delete', 
      onClick: () => onDelete(event), 
      variant: 'outline' as const, 
      icon: isDeleting ? (
        <Loading03Icon className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Delete02Icon className="h-3.5 w-3.5 text-destructive" strokeWidth={1.5} />
      ),
      disabled: isDeleting
    }] : [])
  ];

  return (
    <>
      <CentralizedCard
        title={event.title}
        metadata={metadata}
        actions={actions}
        className="rounded-2xl border border-border relative min-h-[500px] sm:min-h-[520px]"
      >
        {/* Event Type Icon */}
        <div className="absolute top-4 right-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getEventTypeIconStyle(event.event_type)}`}>
            {getEventTypeIcon(event.event_type)}
          </div>
        </div>
        
        {/* Progress indicators - with labels */}
        <div className="flex items-center justify-center gap-4 pt-2">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${event.photo_editing_status ? 'bg-primary' : 'bg-muted'}`} />
            <span className="text-xs font-medium text-muted-foreground">PHOTO</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${event.video_editing_status ? 'bg-primary' : 'bg-muted'}`} />
            <span className="text-xs font-medium text-muted-foreground">VIDEO</span>
          </div>
        </div>
        
        {/* Amount section - single row format: Total - Paid = Balance */}
        <div className="absolute bottom-20 left-0 right-0 px-3">
          <div className="w-full bg-card border-2 border-primary/30 rounded-full px-5 py-2.5">
            <div className="flex items-center justify-center gap-4 text-sm font-bold">
              <span className="text-primary">₹{event.total_amount?.toLocaleString('en-IN') || '0'}</span>
              <span className="text-muted-foreground/60">-</span>
              <span className="text-orange-500">₹{calculateTotalPaid(event as any).toLocaleString('en-IN')}</span>
              <span className="text-muted-foreground/60">=</span>
              <div className="text-green-600">
                <BalanceDisplay event={event as any} showIcon={true} size="sm" />
              </div>
            </div>
          </div>
        </div>
      </CentralizedCard>

      <EventCrewDialog
        event={event}
        open={crewDialogOpen}
        onOpenChange={setCrewDialogOpen}
      />
      <DiskManagementDialog
        event={event}
        open={diskDialogOpen}
        onOpenChange={setDiskDialogOpen}
      />
      <PDFDownloadOptionsDialog
        isOpen={pdfDownloadDialogOpen}
        onOpenChange={setPdfDownloadDialogOpen}
        onDownloadInvoice={handleDownloadInvoice}
        onDownloadEventReport={handleDownloadEventReport}
        title="Download PDF"
      />
    </>
  );
};

export default EventPaymentCard;
