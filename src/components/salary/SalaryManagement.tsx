import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserIcon, UserGroupIcon, GroupItemsIcon } from 'hugeicons-react';
import { useToast } from '@/hooks/use-toast';
import { PageTableSkeleton } from '@/components/ui/skeleton';
import SalaryStats from './SalaryStats';
import PaySalaryDialog from './PaySalaryDialog';
import SalaryHistoryDialog from './SalaryHistoryDialog';
import UniversalExportDialog from '@/components/common/UniversalExportDialog';
import { useSalaryExportConfig } from '@/hooks/useExportConfigs';
import { useSalaryData } from './hooks/useSalaryData';
import { useFreelancerSalaryData } from '@/components/freelancers/hooks/useFreelancerSalaryData';
import EventAssignmentRatesDialog from './EventAssignmentRatesDialog';
import FreelancerDetailedReportDialog from './FreelancerDetailedReportDialog';
import StaffDetailedReportDialog from './StaffDetailedReportDialog';
import SalaryCardView from './SalaryCardView';
import { SalaryTableView } from './SalaryTableView';
import { useIsMobile } from '@/hooks/use-mobile';
import { UniversalFilterBar } from '@/components/common/UniversalFilterBar';
import { UniversalPagination } from '@/components/common/UniversalPagination';
import { SortOption, FilterOption } from '@/hooks/useBackendFilters';

const SalaryManagement = () => {
  const { currentFirmId } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Core states
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [selectedForAssignment, setSelectedForAssignment] = useState<any>(null);
  const [detailedReportOpen, setDetailedReportOpen] = useState(false);
  const [selectedForDetailedReport, setSelectedForDetailedReport] = useState<any>(null);
  const [staffDetailedReportOpen, setStaffDetailedReportOpen] = useState(false);
  const [selectedStaffForDetailedReport, setSelectedStaffForDetailedReport] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'staff' | 'freelancer'>('staff');

  // Data hooks
  const {
    staffData,
    totalStats,
    loading,
    refetch: refetchStaff
  } = useSalaryData();

  const {
    freelancerData,
    totalStats: freelancerStats,
    loading: freelancerLoading,
    refetch: refetchFreelancers
  } = useFreelancerSalaryData();

  // Combined data for salary page with mode filtering
  const combinedData = useMemo(() => {
    const staffWithType = (staffData || []).map(staff => ({ ...staff, type: 'staff' as const, category: 'Staff' }));
    const freelancersWithType = (freelancerData || []).map(freelancer => ({ ...freelancer, type: 'freelancer' as const, category: 'Freelancer' }));
    
    // Filter based on view mode
    if (viewMode === 'staff') {
      return staffWithType;
    } else {
      return freelancersWithType;
    }
  }, [staffData, freelancerData, viewMode]);

  // Mode-specific stats calculation with proper calculations
  const combinedStats = useMemo(() => {
    if (viewMode === 'staff') {
      // Only show staff data
      const staffTaskEarnings = staffData.reduce((sum, staff) => sum + (staff.task_earnings || 0), 0);
      const staffAssignmentEarnings = staffData.reduce((sum, staff) => sum + (staff.assignment_earnings || 0), 0);
      const staffTotalEarnings = staffData.reduce((sum, staff) => sum + (staff.total_earnings || 0), 0);
      const staffTotalPaid = staffData.reduce((sum, staff) => sum + (staff.paid_amount || 0), 0);
      const staffTotalPending = staffData.reduce((sum, staff) => sum + (staff.pending_amount || 0), 0);
      const staffCount = staffData.length;

      return {
        totalStaff: staffCount,
        totalFreelancers: 0,
        taskPaymentsTotal: staffTaskEarnings,
        assignmentRatesTotal: staffAssignmentEarnings,
        totalPaid: staffTotalPaid,
        totalPending: staffTotalPending,
        avgPerPerson: staffCount > 0 ? staffTotalEarnings / staffCount : 0,
        totalEarnings: staffTotalEarnings,
      };
    } else {
      // Only show freelancer data
      const freelancerTaskEarnings = freelancerData?.reduce((sum, f) => sum + (f.task_earnings || 0), 0) || 0;
      const freelancerAssignmentEarnings = freelancerData?.reduce((sum, f) => sum + (f.assignment_earnings || 0), 0) || 0;
      const freelancerTotalEarnings = freelancerData?.reduce((sum, f) => sum + (f.total_earnings || 0), 0) || 0;
      const freelancerTotalPaid = freelancerData?.reduce((sum, f) => sum + (f.paid_amount || 0), 0) || 0;
      const freelancerTotalPending = freelancerData?.reduce((sum, f) => sum + (f.pending_amount || 0), 0) || 0;
      const freelancerCount = freelancerData?.length || 0;

      return {
        totalStaff: 0,
        totalFreelancers: freelancerCount,
        taskPaymentsTotal: freelancerTaskEarnings,
        assignmentRatesTotal: freelancerAssignmentEarnings,
        totalPaid: freelancerTotalPaid,
        totalPending: freelancerTotalPending,
        avgPerPerson: freelancerCount > 0 ? freelancerTotalEarnings / freelancerCount : 0,
        totalEarnings: freelancerTotalEarnings,
      };
    }
  }, [staffData, freelancerData, viewMode]);

  const salaryExportConfig = useSalaryExportConfig(staffData || [], freelancerData || [], combinedStats);

  // Filter and pagination states
  const [searchValue, setSearchValue] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  // Sort and Filter options
  const sortOptions: SortOption[] = [
    { value: 'name', label: 'Name' },
    { value: 'role', label: 'Role' },
    { value: 'earnings', label: 'Earnings' },
    { value: 'pending', label: 'Pending Amount' },
  ];

  const filterOptions: FilterOption[] = [
    { key: 'staff', label: 'Staff Only', type: 'boolean' },
    { key: 'freelancer', label: 'Freelancers Only', type: 'boolean' },
    { key: 'has_pending', label: 'Has Pending Payments', type: 'boolean' },
  ];

  // Apply filters, search, and sorting
  const filteredData = useMemo(() => {
    let data = [...combinedData];

    // Apply search filter
    if (isSearchActive && searchValue.trim()) {
      const searchTerm = searchValue.toLowerCase().trim();
      data = data.filter(person => {
        const name = person.full_name?.toLowerCase() || '';
        const role = person.role?.toLowerCase() || '';
        const mobile = person.type === 'staff' ? (person as any).mobile_number?.toLowerCase() || '' : '';
        const phone = person.type === 'freelancer' ? (person as any).phone?.toLowerCase() || '' : '';
        const email = person.type === 'freelancer' ? (person as any).email?.toLowerCase() || '' : '';
        
        return name.includes(searchTerm) ||
               role.includes(searchTerm) ||
               mobile.includes(searchTerm) ||
               phone.includes(searchTerm) ||
               email.includes(searchTerm);
      });
    }

    // Apply type filters
    if (activeFilters.length > 0) {
      data = data.filter(person => {
        // If no type filters selected, show all
        const typeFilters = activeFilters.filter(f => ['staff', 'freelancer'].includes(f));
        const hasTypeFilter = typeFilters.length > 0;
        
        let typeMatch = !hasTypeFilter; // If no type filters, default to true
        if (hasTypeFilter) {
          typeMatch = typeFilters.some(filter => {
            if (filter === 'staff' && person.type === 'staff') return true;
            if (filter === 'freelancer' && person.type === 'freelancer') return true;
            return false;
          });
        }

        // Apply pending payments filter
        let pendingMatch = true;
        if (activeFilters.includes('has_pending')) {
          pendingMatch = (person.pending_amount || 0) > 0;
        }

        return typeMatch && pendingMatch;
      });
    }

    // Apply sorting
    data = [...data].sort((a, b) => {
      let valueA: any, valueB: any;
      
      switch (sortBy) {
        case 'name':
          valueA = a.full_name || '';
          valueB = b.full_name || '';
          break;
        case 'role':
          valueA = a.role || '';
          valueB = b.role || '';
          break;
        case 'earnings':
          valueA = a.total_earnings || 0;
          valueB = b.total_earnings || 0;
          break;
        case 'pending':
          valueA = a.pending_amount || 0;
          valueB = b.pending_amount || 0;
          break;
        default:
          valueA = a.full_name || '';
          valueB = b.full_name || '';
      }

      if (typeof valueA === 'string') {
        const comparison = valueA.localeCompare(valueB);
        return sortOrder === 'asc' ? comparison : -comparison;
      } else {
        const comparison = valueA - valueB;
        return sortOrder === 'asc' ? comparison : -comparison;
      }
    });

    return data;
  }, [combinedData, isSearchActive, searchValue, activeFilters, sortBy, sortOrder]);

  // Pagination
  const paginatedData = useMemo(() => {
    const startIndex = currentPage * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, pageSize]);

  // Group paginated data by category
  const groupedData = useMemo(() => {
    const grouped: { [key: string]: any[] } = {};
    paginatedData.forEach(person => {
      const category = person.category;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(person);
    });
    return grouped;
  }, [paginatedData]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [searchValue, isSearchActive, activeFilters, sortBy, sortOrder, viewMode]);

  // Event handlers
  const handlePaySalary = (person: any) => {
    if ((person.pending_amount || 0) <= 0) {
      toast({
        title: "No pending amount",
        description: `${person.full_name} has no pending payments to process.`,
        variant: "destructive",
      });
      return;
    }
    if (person.type === 'freelancer') {
      setSelectedStaff({ ...person, is_freelancer: true });
    } else {
      setSelectedStaff(person);
    }
    setPayDialogOpen(true);
  };

  const handleViewHistory = (person: any) => {
    if (person.type === 'freelancer') {
      setSelectedStaff({ ...person, is_freelancer: true });
    } else {
      setSelectedStaff(person);
    }
    setHistoryDialogOpen(true);
  };

  const handleViewDetailedReport = (person: any) => {
    if (person.type === 'freelancer') {
      setSelectedForDetailedReport(person);
      setDetailedReportOpen(true);
    } else {
      setSelectedStaffForDetailedReport(person);
      setStaffDetailedReportOpen(true);
    }
  };

  const handleAssignmentRates = (person: any) => {
    if (person.type === 'freelancer') {
      setSelectedForAssignment({ ...person, is_freelancer: true });
    } else {
      setSelectedForAssignment(person);
    }
    setAssignmentDialogOpen(true);
  };

  const onPaymentSuccess = () => {
    refetchStaff();
    refetchFreelancers();
    setPayDialogOpen(false);
  };

  const refetchAll = () => {
    refetchStaff();
    refetchFreelancers();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
        e.preventDefault();
        refetchAll();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [refetchAll]);

  if (!currentFirmId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center">
          <CardContent>
            <UserIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Firm Selected</h3>
            <p className="text-muted-foreground">Please select a firm to view salary information.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading || freelancerLoading) {
    return <PageTableSkeleton />;
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Salary Management</h1>
        <div className="flex items-center gap-3">
          {/* Mode Switcher Icons - Only 2 modes */}
          <div className="flex items-center gap-1 rounded-full border p-1">
            <Button
              variant={viewMode === 'staff' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('staff')}
              className="h-8 w-8 rounded-full p-0"
              title="Staff Only"
            >
              <UserIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'freelancer' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('freelancer')}
              className="h-8 w-8 rounded-full p-0"
              title="Freelancers Only"
            >
              <UserGroupIcon className="h-4 w-4" />
            </Button>
          </div>
          
          <UniversalExportDialog
            data={filteredData}
            config={salaryExportConfig}
            key={`export-${filteredData.length}`}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4">
        <SalaryStats
          stats={combinedStats}
          loading={loading || freelancerLoading}
          mode={viewMode === 'freelancer' ? 'freelancers' : 'staff'}
        />
      </div>

      {/* Filter Bar */}
      <UniversalFilterBar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onSearchApply={() => setIsSearchActive(true)}
        onSearchClear={() => { setSearchValue(''); setIsSearchActive(false); }}
        isSearchActive={isSearchActive}
        searchPlaceholder="Search staff and freelancers..."
        sortBy={sortBy}
        sortOptions={sortOptions}
        onSortChange={setSortBy}
        sortOrder={sortOrder}
        onSortReverse={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
        activeFilters={activeFilters}
        filterOptions={filterOptions}
        onFiltersChange={setActiveFilters}
        totalCount={combinedData.length}
        filteredCount={filteredData.length}
        loading={loading || freelancerLoading}
      />

      {/* Content by Category */}
      <div className="space-y-6">
        {Object.entries(groupedData).map(([category, people]) => (
          <div key={category} className="space-y-4">
            {/* Category Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">{category}</h2>
              <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                {people.length} {people.length === 1 ? 'person' : 'people'}
              </span>
            </div>

            {/* Category Content */}
            {isMobile ? (
              <SalaryCardView
                data={people}
                type="mixed"
                onPaySalary={handlePaySalary}
                onViewHistory={handleViewHistory}
                onAssignmentRates={handleAssignmentRates}
                onDetailedReport={handleViewDetailedReport}
                loading={false}
              />
            ) : (
              <SalaryTableView
                data={people}
                type="mixed"
                onPaySalary={handlePaySalary}
                onViewHistory={handleViewHistory}
                onAssignmentRates={handleAssignmentRates}
                onDetailedReport={handleViewDetailedReport}
              />
            )}
          </div>
        ))}

        {/* Empty State */}
        {filteredData.length === 0 && (
          <div className="text-center py-12">
            <UserIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Data Found</h3>
            <p className="text-muted-foreground">
              {isSearchActive || activeFilters.length > 0 
                ? "No staff or freelancers match your current filters."
                : "No staff or freelancers found."}
            </p>
          </div>
        )}
      </div>

      {/* Pagination - Same as other pages */}
      <UniversalPagination
        currentPage={currentPage}
        totalCount={filteredData.length}
        filteredCount={filteredData.length}
        pageSize={pageSize}
        allDataLoaded={true}
        loading={loading || freelancerLoading}
        onLoadMore={() => {}}
        onPageSizeChange={setPageSize}
        showLoadMore={true}
      />

      {/* Dialogs */}
      {payDialogOpen && (
        <PaySalaryDialog
          open={payDialogOpen}
          onOpenChange={setPayDialogOpen}
          staff={selectedStaff}
          onSuccess={onPaymentSuccess}
        />
      )}

      {historyDialogOpen && (
        <SalaryHistoryDialog
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
          staff={selectedStaff}
        />
      )}

      {assignmentDialogOpen && (
        <EventAssignmentRatesDialog
          open={assignmentDialogOpen}
          onOpenChange={setAssignmentDialogOpen}
          staff={selectedForAssignment}
          onSuccess={refetchAll}
        />
      )}

      {detailedReportOpen && (
        <FreelancerDetailedReportDialog
          open={detailedReportOpen}
          onOpenChange={setDetailedReportOpen}
          freelancer={selectedForDetailedReport}
        />
      )}

      {staffDetailedReportOpen && (
        <StaffDetailedReportDialog
          open={staffDetailedReportOpen}
          onOpenChange={setStaffDetailedReportOpen}
          staff={selectedStaffForDetailedReport}
        />
      )}
    </>
  );
};

export default SalaryManagement;