import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { SharedPDFHeader, SharedPDFFooter, SimpleTable, sharedStyles } from '@/components/pdf/SharedPDFLayout';
import { supabase } from '@/integrations/supabase/client';
import { applyUniversalFilter } from '@/components/common/UniversalExportFilterLogic';

// Define accounting entry types for better type safety
interface AccountingEntry {
  id: string;
  title: string;
  description: string;
  category: string;
  entry_type: string;
  amount: number;
  payment_method: string;
  entry_date: string;
  created_at: string;
  reflect_to_company: boolean;
}

interface AccountingReportProps {
  entries: AccountingEntry[];
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

// Define styles for the PDF
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  table: {
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    padding: 8,
    fontSize: 10,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    padding: 8,
    fontSize: 9,
  },
  col1: { width: '12%' },
  col2: { width: '25%' },
  col3: { width: '15%' },
  col4: { width: '10%' },
  col5: { width: '15%' },
  col6: { width: '13%' },
  col7: { width: '10%' },
  summarySection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f8f6f1',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#c4b28d',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#374151',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    fontSize: 11,
  },
  summaryLabel: {
    fontWeight: 'bold',
  },
  summaryValue: {
    textAlign: 'right',
  },
  creditAmount: {
    color: '#16a34a',
  },
  debitAmount: {
    color: '#dc2626',
  },
});

const AccountingReportDocument: React.FC<AccountingReportProps> = ({ 
  entries, 
  filterType,
  filterValue,
  firmData 
}) => {
  // Calculate summary statistics - separate Credits, Debits, and Assets
  const totalCredits = entries
    .filter(entry => entry.entry_type === 'Credit')
    .reduce((sum, entry) => sum + (entry.amount || 0), 0);
  
  const totalDebits = entries
    .filter(entry => entry.entry_type === 'Debit')
    .reduce((sum, entry) => sum + (entry.amount || 0), 0);
  
  const totalAssets = entries
    .filter(entry => entry.entry_type === 'Assets')
    .reduce((sum, entry) => sum + (entry.amount || 0), 0);
  
  const netBalance = totalCredits + totalAssets - totalDebits;

  // Group entries by category AND entry type for accurate insights
  const categorySummary = entries.reduce((acc, entry) => {
    const category = entry.category || 'Other';
    if (!acc[category]) {
      acc[category] = { credits: 0, debits: 0, assets: 0, count: 0 };
    }
    
    if (entry.entry_type === 'Credit') {
      acc[category].credits += entry.amount || 0;
    } else if (entry.entry_type === 'Debit') {
      acc[category].debits += entry.amount || 0;
    } else if (entry.entry_type === 'Assets') {
      acc[category].assets += entry.amount || 0;
    }
    acc[category].count += 1;
    
    return acc;
  }, {} as Record<string, { credits: number; debits: number; assets: number; count: number }>);
  
  const getFilterDisplayText = () => {
    if (filterType === 'all' || filterType === 'global') return 'All Accounting Entries';
    
    // Entry type filters
    if (filterType === 'entry_type' || ['credit', 'debit', 'assets'].includes(filterValue)) {
      if (filterValue === 'credit') return 'Credit Entries';
      if (filterValue === 'debit') return 'Debit Entries';
      if (filterValue === 'assets') return 'Asset Entries';
    }
    
    // Category filters
    if (filterType === 'category') return `Category: ${filterValue}`;
    
    // Time filters
    if (filterValue === 'this_month') return 'This Month';
    if (filterValue === 'last_month') return 'Last Month';
    
    // Payment method filters
    if (filterValue === 'cash_payment') return 'Cash Payments';
    if (filterValue === 'digital_payment') return 'Digital Payments';
    
    // Other filters
    if (filterValue === 'reflect_to_company') return 'Reflects to Company';
    
    return filterValue || 'All Entries';
  };

  const getTableHeaders = () => {
    // Credit entries - focus on income details
    if (filterValue === 'credit') {
      return [
        { text: 'Date', width: '12%' },
        { text: 'Title', width: '25%' },
        { text: 'Category', width: '18%' },
        { text: 'Amount', width: '15%' },
        { text: 'Payment Method', width: '15%' },
        { text: 'Company', width: '15%' }
      ];
    }
    
    // Debit entries - focus on expenses
    if (filterValue === 'debit') {
      return [
        { text: 'Date', width: '12%' },
        { text: 'Title', width: '25%' },
        { text: 'Category', width: '18%' },
        { text: 'Amount', width: '15%' },
        { text: 'Payment Method', width: '15%' },
        { text: 'Description', width: '15%' }
      ];
    }
    
    // Assets - focus on asset tracking
    if (filterValue === 'assets') {
      return [
        { text: 'Date', width: '12%' },
        { text: 'Title', width: '28%' },
        { text: 'Category', width: '18%' },
        { text: 'Amount', width: '15%' },
        { text: 'Description', width: '27%' }
      ];
    }
    
    // Category specific - streamlined view
    if (filterType === 'category') {
      return [
        { text: 'Date', width: '12%' },
        { text: 'Title', width: '28%' },
        { text: 'Type', width: '12%' },
        { text: 'Amount', width: '15%' },
        { text: 'Payment Method', width: '15%' },
        { text: 'Description', width: '18%' }
      ];
    }
    
    // Default - comprehensive view
    return [
      { text: 'Date', width: '10%' },
      { text: 'Title', width: '22%' },
      { text: 'Category', width: '15%' },
      { text: 'Type', width: '10%' },
      { text: 'Amount', width: '13%' },
      { text: 'Payment', width: '12%' },
      { text: 'Company', width: '8%' },
      { text: 'Description', width: '10%' }
    ];
  };

  const renderTableRow = (entry: AccountingEntry) => {
    const headers = getTableHeaders();
    
    // Credit entries
    if (filterValue === 'credit') {
      return [
        formatDate(entry.entry_date),
        entry.title || 'N/A',
        entry.category,
        formatAmount(entry.amount),
        entry.payment_method,
        entry.reflect_to_company ? 'Yes' : 'No'
      ];
    }
    
    // Debit entries
    if (filterValue === 'debit') {
      return [
        formatDate(entry.entry_date),
        entry.title || 'N/A',
        entry.category,
        formatAmount(entry.amount),
        entry.payment_method,
        entry.description || 'N/A'
      ];
    }
    
    // Assets
    if (filterValue === 'assets') {
      return [
        formatDate(entry.entry_date),
        entry.title || 'N/A',
        entry.category,
        formatAmount(entry.amount),
        entry.description || 'N/A'
      ];
    }
    
    // Category specific
    if (filterType === 'category') {
      return [
        formatDate(entry.entry_date),
        entry.title || 'N/A',
        entry.entry_type,
        formatAmount(entry.amount),
        entry.payment_method,
        entry.description || 'N/A'
      ];
    }
    
    // Default comprehensive view
    return [
      formatDate(entry.entry_date),
      entry.title || 'N/A',
      entry.category,
      entry.entry_type,
      formatAmount(entry.amount),
      entry.payment_method,
      entry.reflect_to_company ? 'Yes' : 'No',
      entry.description?.substring(0, 30) || 'N/A'
    ];
  };

  const formatAmount = (amount: number): string => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch {
      return dateString;
    }
  };

  const currentDate = formatDate(new Date().toISOString());
  const firmName = firmData?.name || 'Firm';

  // Dynamic table data based on filter
  const tableHeaders = getTableHeaders().map(h => h.text);
  const tableData = entries.map(entry => renderTableRow(entry));

  // Split entries into chunks of 15 for better pagination
  const ROWS_PER_PAGE = 15;
  const entryChunks = [];
  for (let i = 0; i < tableData.length; i += ROWS_PER_PAGE) {
    entryChunks.push(tableData.slice(i, i + ROWS_PER_PAGE));
  }

  const hasEntries = entries.length > 0;

  return (
    <Document>
      {/* Page 1: Header + Summary Only */}
      <Page size="A4" style={sharedStyles.page}>
        <SharedPDFHeader firmData={firmData} />

        <Text style={sharedStyles.title}>Accounting Report</Text>

        <View style={sharedStyles.detailsContainer}>
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Report Information</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Generated:</Text>
              <Text style={sharedStyles.detailValue}>{currentDate}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Total Entries:</Text>
              <Text style={sharedStyles.detailValue}>{entries.length}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Filter:</Text>
              <Text style={sharedStyles.detailValue}>{getFilterDisplayText()}</Text>
            </View>
          </View>
          
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Financial Summary</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Total Credits:</Text>
              <Text style={sharedStyles.detailValue}>{formatAmount(totalCredits)}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Total Debits:</Text>
              <Text style={sharedStyles.detailValue}>{formatAmount(totalDebits)}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Total Assets:</Text>
              <Text style={sharedStyles.detailValue}>{formatAmount(totalAssets)}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Net Balance:</Text>
              <Text style={sharedStyles.detailValue}>{formatAmount(netBalance)}</Text>
            </View>
          </View>
        </View>

        {/* Category Breakdown */}
        {Object.keys(categorySummary).length > 0 && (
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>Category Breakdown</Text>
            {Object.entries(categorySummary).map(([category, data]) => (
              <View key={category} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{category} ({data.count} entries):</Text>
                <Text style={styles.summaryValue}>
                  {data.credits > 0 && `Credits: ${formatAmount(data.credits)}`}
                  {data.credits > 0 && data.debits > 0 && ' | '}
                  {data.debits > 0 && `Debits: ${formatAmount(data.debits)}`}
                  {(data.credits > 0 || data.debits > 0) && data.assets > 0 && ' | '}
                  {data.assets > 0 && `Assets: ${formatAmount(data.assets)}`}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Page>

      {/* Accounting Entry Tables - 15 rows per page */}
      {entryChunks.map((chunk, chunkIndex) => (
        <Page key={`entry-${chunkIndex}`} size="A4" style={sharedStyles.page}>
          <Text style={sharedStyles.title}>
            Accounting Entries {entryChunks.length > 1 ? `(Page ${chunkIndex + 1} of ${entryChunks.length})` : ''}
          </Text>
          
          <SimpleTable
            headers={tableHeaders}
            rows={chunk}
          />

          {/* Add footer to the last content page */}
          {chunkIndex === entryChunks.length - 1 && (
            <>
              <View style={{ flex: 1 }} />
              <SharedPDFFooter firmData={firmData} />
            </>
          )}
        </Page>
      ))}

      {/* If no entries, add footer to first page */}
      {!hasEntries && (
        <>
          <View style={{ flex: 1 }} />
          <SharedPDFFooter firmData={firmData} />
        </>
      )}
    </Document>
  );
};

export const generateAccountingReportPDF = async (
  entries: AccountingEntry[],
  filterType: string,
  filterValue: string,
  firmData?: any
) => {
  // ALWAYS fetch ALL accounting entries unconditionally for comprehensive PDF reporting
  let allEntries: any[] = [];
  
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
    
    // Fetch ALL accounting entries in batches of 1000 to handle large datasets
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const { data, error } = await supabase
        .from('accounting_entries')
        .select('*')
        .eq('firm_id', firmId)
        .order('entry_date', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        allEntries.push(...data);
        page++;
        hasMore = data.length === pageSize;
      } else {
        hasMore = false;
      }
    }
    
    console.log(`PDF Export: Fetched ${allEntries.length} total accounting entries unconditionally`);
  } catch (error) {
    console.error('Error fetching all accounting entries for PDF:', error);
    // Fallback: use the passed-in filtered data
    allEntries = entries;
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
  const finalEntries = filterType ? applyUniversalFilter(allEntries, filterType, filterValue || '') : allEntries;
  
  const blob = await pdf(<AccountingReportDocument entries={finalEntries} filterType={filterType} filterValue={filterValue} firmData={firmData} />).toBlob();
  const fileName = `Accounting Report (${finalEntries.length} entries) ${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(blob, fileName);
};