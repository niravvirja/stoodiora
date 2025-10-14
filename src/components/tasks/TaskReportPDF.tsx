import { Document, Page, Text, View, pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { Task } from '@/types/studio';
import { formatDate } from '@/lib/date-utils';
import { SharedPDFHeader, SharedPDFFooter, SimpleTable, sharedStyles } from '@/components/pdf/SharedPDFLayout';
import { supabase } from '@/integrations/supabase/client';
import { applyUniversalFilter } from '@/components/common/UniversalExportFilterLogic';

interface TaskReportProps {
  tasks: Task[];
  filterType: string;
  filterValue: string;
  firmData?: {
    name: string;
    description?: string;
    logo_url?: string;
    header_left_content?: string;
    footer_content?: string;
  };
}

const TaskReportDocument: React.FC<TaskReportProps> = ({ tasks, filterType, filterValue, firmData }) => {
  const currentDate = formatDate(new Date());
  
  const taskStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'Completed').length,
    inProgress: tasks.filter(t => t.status === 'In Progress').length,
    pending: tasks.filter(t => t.status === 'Waiting for Response').length,
    totalAmount: tasks.reduce((sum, task) => sum + (task.amount || 0), 0),
  };

  const getFilterDisplayText = () => {
    if (filterType === 'global') return 'All Tasks';
    if (filterType === 'staff') return `Staff: ${filterValue}`;
    if (filterType === 'status') return `Status: ${filterValue}`;
    return filterValue;
  };

  // Split tasks into chunks of 15 for better pagination
  const ROWS_PER_PAGE = 15;
  const taskChunks = [];
  const tableData = tasks.map(task => [
    task.title,
    task.task_type,
    task.status,
    task.priority,
    task.assigned_staff?.full_name || task.freelancer?.full_name || 'Unassigned',
    task.amount ? `₹${task.amount.toLocaleString()}` : '-'
  ]);

  for (let i = 0; i < tableData.length; i += ROWS_PER_PAGE) {
    taskChunks.push(tableData.slice(i, i + ROWS_PER_PAGE));
  }

  const hasTasks = tasks.length > 0;

  return (
    <Document>
      {/* Page 1: Header + Summary Only */}
      <Page size="A4" style={sharedStyles.page}>
        <SharedPDFHeader firmData={firmData} />

        <Text style={sharedStyles.title}>Task Report</Text>

        <View style={sharedStyles.detailsContainer}>
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Report Information</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Generated:</Text>
              <Text style={sharedStyles.detailValue}>{currentDate}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Total Tasks:</Text>
              <Text style={sharedStyles.detailValue}>{taskStats.total}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Filter:</Text>
              <Text style={sharedStyles.detailValue}>{getFilterDisplayText()}</Text>
            </View>
          </View>
          
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Task Statistics</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Completed:</Text>
              <Text style={sharedStyles.detailValue}>{taskStats.completed}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>In Progress:</Text>
              <Text style={sharedStyles.detailValue}>{taskStats.inProgress}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Pending:</Text>
              <Text style={sharedStyles.detailValue}>{taskStats.pending}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Total Amount:</Text>
              <Text style={sharedStyles.detailValue}>₹{taskStats.totalAmount.toLocaleString()}</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* Task Tables - 15 rows per page */}
      {taskChunks.map((chunk, chunkIndex) => (
        <Page key={`task-${chunkIndex}`} size="A4" style={sharedStyles.page}>
          <Text style={sharedStyles.title}>
            Task Details {taskChunks.length > 1 ? `(Page ${chunkIndex + 1} of ${taskChunks.length})` : ''}
          </Text>
          
          <SimpleTable
            headers={['Title', 'Type', 'Status', 'Priority', 'Assigned To', 'Amount']}
            rows={chunk}
          />

          {/* Add footer to the last content page */}
          {chunkIndex === taskChunks.length - 1 && (
            <>
              <View style={{ flex: 1 }} />
              <SharedPDFFooter firmData={firmData} />
            </>
          )}
        </Page>
      ))}

      {/* If no tasks, add footer to first page */}
      {!hasTasks && (
        <>
          <View style={{ flex: 1 }} />
          <SharedPDFFooter firmData={firmData} />
        </>
      )}
    </Document>
  );
};

export const generateTaskReportPDF = async (tasks: Task[], filterType: string, filterValue: string, firmData?: any) => {
  // ALWAYS fetch ALL tasks unconditionally for comprehensive PDF reporting
  let allTasks: any[] = [];
  
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
    
    // First try with relational data
    try {
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('tasks')
          .select(`
            *,
            assigned_staff:profiles!tasks_assigned_to_fkey(id, full_name, role),
            freelancer:freelancers!tasks_freelancer_id_fkey(id, full_name, role),
            event:events!tasks_event_id_fkey(id, title, event_date),
            created_by_profile:profiles!tasks_created_by_fkey(id, full_name)
          `)
          .eq('firm_id', firmId)
          .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allTasks.push(...data);
          page++;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }
      
      console.log(`PDF Export: Fetched ${allTasks.length} total tasks with relations`);
    } catch (relError) {
      console.warn('Failed to fetch with relations, trying without:', relError);
      // Fallback: fetch without relations
      allTasks = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('firm_id', firmId)
          .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allTasks.push(...data);
          page++;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }
      
      console.log(`PDF Export: Fetched ${allTasks.length} total tasks without relations`);
    }
  } catch (error) {
    console.error('Error fetching all tasks for PDF:', error);
    // Fallback: use the passed-in filtered data
    allTasks = tasks;
    console.warn('PDF Export: Using filtered data as fallback');
  }

  // Use provided firmData or fetch it if not provided
  if (!firmData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
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
      console.error('Error fetching firm data for PDF:', error);
    }
  }

  // Apply export filter to the fetched complete dataset
  const finalTasks = filterType ? applyUniversalFilter(allTasks, filterType, filterValue || '') : allTasks;
  
  const blob = await pdf(<TaskReportDocument tasks={finalTasks} filterType={filterType} filterValue={filterValue} firmData={firmData} />).toBlob();
  const fileName = `Task Report (${finalTasks.length} entries) ${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(blob, fileName);
};

export default generateTaskReportPDF;