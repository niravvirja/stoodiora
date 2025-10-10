import { Document, Page, Text, View, pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { Expense } from '@/types/studio';
import { formatDate } from '@/lib/date-utils';
import { SharedPDFHeader, SharedPDFFooter, SimpleTable, sharedStyles } from '@/components/pdf/SharedPDFLayout';
import { supabase } from '@/integrations/supabase/client';
import { applyUniversalFilter } from '@/components/common/UniversalExportFilterLogic';

interface ExpenseReportProps {
  expenses: Expense[];
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

const ExpenseReportDocument: React.FC<ExpenseReportProps> = ({ expenses, filterType, filterValue, firmData }) => {
  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;
  const currentDate = formatDate(new Date());
  
  const expenseStats = {
    total: expenses.length,
    totalAmount: expenses.reduce((sum, expense) => sum + expense.amount, 0),
    avgAmount: expenses.length > 0 ? expenses.reduce((sum, expense) => sum + expense.amount, 0) / expenses.length : 0,
  };

  const getFilterDisplayText = () => {
    if (filterType === 'global' || filterType === 'all') return 'All Expenses';
    
    // Category filters
    if (filterType === 'category') {
      const categoryLabels: Record<string, string> = {
        'equipment': 'Equipment Expenses',
        'travel': 'Travel Expenses',
        'food': 'Food Expenses',
        'marketing': 'Marketing Expenses',
        'maintenance': 'Maintenance Expenses'
      };
      return categoryLabels[filterValue] || `Category: ${filterValue}`;
    }
    
    // Event-based filters
    if (filterType === 'event') return `Event: ${filterValue}`;
    
    // Payment method filters
    if (filterType === 'payment_method') {
      if (filterValue === 'cash') return 'Cash Payments';
      if (filterValue === 'digital') return 'Digital Payments';
    }
    
    return filterValue || 'All Expenses';
  };

  const getTableHeaders = () => {
    // Category-specific expenses - focused view
    if (filterType === 'category') {
      return [
        { text: 'Date', width: '12%' },
        { text: 'Description', width: '35%' },
        { text: 'Amount', width: '15%' },
        { text: 'Payment', width: '15%' },
        { text: 'Event', width: '23%' }
      ];
    }
    
    // Event-based expenses
    if (filterType === 'event') {
      return [
        { text: 'Date', width: '12%' },
        { text: 'Description', width: '30%' },
        { text: 'Category', width: '18%' },
        { text: 'Amount', width: '15%' },
        { text: 'Payment', width: '15%' },
        { text: 'Notes', width: '10%' }
      ];
    }
    
    // Payment method view
    if (filterType === 'payment_method') {
      return [
        { text: 'Date', width: '12%' },
        { text: 'Description', width: '28%' },
        { text: 'Category', width: '18%' },
        { text: 'Amount', width: '15%' },
        { text: 'Reference', width: '15%' },
        { text: 'Event', width: '12%' }
      ];
    }
    
    // Default comprehensive view
    return [
      { text: 'Date', width: '10%' },
      { text: 'Description', width: '25%' },
      { text: 'Category', width: '15%' },
      { text: 'Amount', width: '13%' },
      { text: 'Payment', width: '12%' },
      { text: 'Event', width: '25%' }
    ];
  };

  const renderTableRow = (expense: Expense) => {
    // Category-specific
    if (filterType === 'category') {
      return [
        formatDate(new Date(expense.expense_date)),
        expense.description,
        formatCurrency(expense.amount),
        (expense as any).payment_method || 'Cash',
        (expense as any).event?.title || 'General'
      ];
    }
    
    // Event-based
    if (filterType === 'event') {
      return [
        formatDate(new Date(expense.expense_date)),
        expense.description,
        expense.category,
        formatCurrency(expense.amount),
        (expense as any).payment_method || 'Cash',
        (expense as any).notes?.substring(0, 30) || 'N/A'
      ];
    }
    
    // Payment method
    if (filterType === 'payment_method') {
      return [
        formatDate(new Date(expense.expense_date)),
        expense.description,
        expense.category,
        formatCurrency(expense.amount),
        (expense as any).reference_number || 'N/A',
        (expense as any).event?.title || 'General'
      ];
    }
    
    // Default
    return [
      formatDate(new Date(expense.expense_date)),
      expense.description,
      expense.category,
      formatCurrency(expense.amount),
      (expense as any).payment_method || 'Cash',
      (expense as any).event?.title || 'General'
    ];
  };

  const tableData = expenses.map(expense => renderTableRow(expense));

  // Split expenses into chunks of 15 for better pagination
  const ROWS_PER_PAGE = 15;
  const expenseChunks = [];
  for (let i = 0; i < tableData.length; i += ROWS_PER_PAGE) {
    expenseChunks.push(tableData.slice(i, i + ROWS_PER_PAGE));
  }

  const hasExpenses = expenses.length > 0;

  return (
    <Document>
      {/* Page 1: Header + Summary Only */}
      <Page size="A4" style={sharedStyles.page}>
        <SharedPDFHeader firmData={firmData} />

        <Text style={sharedStyles.title}>Expense Report</Text>

        <View style={sharedStyles.detailsContainer}>
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Report Information</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Generated:</Text>
              <Text style={sharedStyles.detailValue}>{currentDate}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Total Expenses:</Text>
              <Text style={sharedStyles.detailValue}>{expenseStats.total}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Filter:</Text>
              <Text style={sharedStyles.detailValue}>{getFilterDisplayText()}</Text>
            </View>
          </View>
        </View>

        <View style={sharedStyles.detailsContainer}>
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Financial Summary</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Total Amount:</Text>
              <Text style={sharedStyles.detailValue}>{formatCurrency(expenseStats.totalAmount)}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Average Amount:</Text>
              <Text style={sharedStyles.detailValue}>{formatCurrency(expenseStats.avgAmount)}</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* Expense Tables - 15 rows per page */}
      {expenseChunks.map((chunk, chunkIndex) => (
        <Page key={`expense-${chunkIndex}`} size="A4" style={sharedStyles.page}>
          <Text style={sharedStyles.title}>
            Expense Details {expenseChunks.length > 1 ? `(Page ${chunkIndex + 1} of ${expenseChunks.length})` : ''}
          </Text>

          <SimpleTable
            headers={getTableHeaders().map(h => h.text)}
            rows={chunk}
          />

          {/* Add footer to the last content page */}
          {chunkIndex === expenseChunks.length - 1 && (
            <>
              <View style={{ flex: 1 }} />
              <SharedPDFFooter firmData={firmData} />
            </>
          )}
        </Page>
      ))}

      {/* If no expenses, add footer to first page */}
      {!hasExpenses && (
        <>
          <View style={{ flex: 1 }} />
          <SharedPDFFooter firmData={firmData} />
        </>
      )}
    </Document>
  );
};

export const generateExpenseReportPDF = async (expenses: Expense[], filterType: string, filterValue: string, firmData?: any) => {
  // ALWAYS fetch ALL expenses unconditionally for comprehensive PDF reporting
  let allExpenses: any[] = [];
  
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
          .from('expenses')
          .select(`
            *,
            event:events(id, title, event_date),
            created_by_profile:profiles!expenses_created_by_fkey(id, full_name)
          `)
          .eq('firm_id', firmId)
          .order('expense_date', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allExpenses.push(...data);
          page++;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }
      
      console.log(`PDF Export: Fetched ${allExpenses.length} total expenses with relations`);
    } catch (relError) {
      console.warn('Failed to fetch with relations, trying without:', relError);
      // Fallback: fetch without relations
      allExpenses = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('expenses')
          .select('*')
          .eq('firm_id', firmId)
          .order('expense_date', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allExpenses.push(...data);
          page++;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }
      
      console.log(`PDF Export: Fetched ${allExpenses.length} total expenses without relations`);
    }
  } catch (error) {
    console.error('Error fetching all expenses for PDF:', error);
    // Fallback: use the passed-in filtered data
    allExpenses = expenses;
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
          
          if (!error) {
            firmData = firm;
          }
        }
      }
    } catch (error) {
      
    }
  }

  // Apply export filter to the fetched complete dataset
  const finalExpenses = filterType ? applyUniversalFilter(allExpenses, filterType, filterValue || '') : allExpenses;
  
  const blob = await pdf(<ExpenseReportDocument expenses={finalExpenses} filterType={filterType} filterValue={filterValue} firmData={firmData} />).toBlob();
  const fileName = `Expense Report (${finalExpenses.length} entries) ${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(blob, fileName);
};

export default generateExpenseReportPDF;